type MelodyNote = {
  pitch: string | null;
  beats: number;
  velocity?: number;
};

const AWAY_IN_A_MANGER_MELODY: MelodyNote[] = [
  { pitch: "G4", beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "D4", beats: 1 },
  { pitch: "C4", beats: 2 },
  { pitch: "C4", beats: 1 },
  { pitch: "D4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "G4", beats: 2 },
  { pitch: null, beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "A4", beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "D4", beats: 2 },
  { pitch: "D4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "D4", beats: 2 },
  { pitch: null, beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "D4", beats: 1 },
  { pitch: "C4", beats: 2 },
  { pitch: "C4", beats: 1 },
  { pitch: "D4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "G4", beats: 2 },
  { pitch: null, beats: 1 },
  { pitch: "A4", beats: 1 },
  { pitch: "G4", beats: 1 },
  { pitch: "F4", beats: 1 },
  { pitch: "E4", beats: 1 },
  { pitch: "D4", beats: 1 },
  { pitch: "C4", beats: 3 }
];

const CHORDS = [
  ["C3", "G3", "E4"],
  ["F3", "C4", "A4"],
  ["G3", "D4", "B4"],
  ["C3", "G3", "E4"]
];

export class ChapterMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextStartTime = 0;
  private isPlaying = false;
  private readonly beatSeconds = 0.74;
  private readonly lookAheadMs = 350;

  async start() {
    if (this.isPlaying) return;
    this.context = this.context ?? new AudioContext();
    this.master = this.master ?? this.createMasterGain(this.context);

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.isPlaying = true;
    this.master.gain.setTargetAtTime(0.18, this.context.currentTime, 0.6);
    this.nextStartTime = this.context.currentTime + 0.08;
    this.scheduleLoop();
    this.schedulerId = window.setInterval(() => this.scheduleLoop(), this.lookAheadMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.35);
    }
  }

  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private createMasterGain(context: AudioContext) {
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    master.gain.setTargetAtTime(0.18, context.currentTime, 0.6);
    return master;
  }

  private scheduleLoop() {
    if (!this.isPlaying || !this.context || !this.master) return;
    const scheduleUntil = this.context.currentTime + 1.6;

    while (this.nextStartTime < scheduleUntil) {
      const duration = this.schedulePhrase(this.nextStartTime);
      this.nextStartTime += duration;
    }
  }

  private schedulePhrase(startTime: number) {
    if (!this.context || !this.master) return 0;
    let cursor = startTime;

    AWAY_IN_A_MANGER_MELODY.forEach((note, index) => {
      const duration = note.beats * this.beatSeconds;
      if (note.pitch) {
        this.playTone(note.pitch, cursor, duration * 0.92, 0.16 * (note.velocity ?? 1), "triangle");
      }
      if (index % 6 === 0) {
        const chord = CHORDS[Math.floor(index / 6) % CHORDS.length];
        chord.forEach((pitch, chordIndex) => {
          this.playTone(pitch, cursor, this.beatSeconds * 5.6, 0.045 - chordIndex * 0.006, "sine");
        });
      }
      cursor += duration;
    });

    return cursor - startTime + this.beatSeconds * 2;
  }

  private playTone(
    pitch: string,
    startTime: number,
    duration: number,
    gainValue: number,
    type: OscillatorType
  ) {
    if (!this.context || !this.master) return;
    const frequency = this.frequencyForPitch(pitch);
    if (!frequency) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.04);
    gain.gain.setTargetAtTime(gainValue * 0.62, startTime + duration * 0.45, duration * 0.45);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.04);
  }

  private frequencyForPitch(pitch: string) {
    const match = pitch.match(/^([A-G])(#|b)?(\d)$/);
    if (!match) return null;
    const [, note, accidental, octaveRaw] = match;
    const semitoneByNote: Record<string, number> = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11
    };
    const octave = Number(octaveRaw);
    const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
    const midi = (octave + 1) * 12 + semitoneByNote[note] + accidentalOffset;
    return 440 * 2 ** ((midi - 69) / 12);
  }
}
