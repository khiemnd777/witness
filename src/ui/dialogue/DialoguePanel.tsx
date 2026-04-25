import { useMemo, useState } from "react";
import type { Dialogue, DialogueChoice } from "../../game/dialogue/DialogueTypes";

type DialoguePanelProps = {
  dialogue: Dialogue;
  onChoice: (choice: DialogueChoice) => void;
  onComplete: () => void;
  onClose: () => void;
};

export function DialoguePanel({ dialogue, onChoice, onComplete, onClose }: DialoguePanelProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const line = dialogue.lines[lineIndex];
  const isLastLine = lineIndex >= dialogue.lines.length - 1;

  const choiceSummary = useMemo(() => {
    if (!line.choices) return null;
    return line.choices.map((choice) => choice.text).join(" / ");
  }, [line.choices]);

  const advance = () => {
    if (isLastLine) {
      onComplete();
      return;
    }
    setLineIndex((current) => current + 1);
  };

  return (
    <section className="dialogue-panel" aria-label={dialogue.title}>
      <div className="dialogue-header">
        <p className="eyebrow">{dialogue.title}</p>
        <button type="button" onClick={onClose} aria-label="Close dialogue">
          X
        </button>
      </div>

      <h2>{line.speaker}</h2>
      {line.text && <p>{line.text}</p>}

      {line.choices ? (
        <div className="choice-list" aria-label={choiceSummary ?? "Dialogue choices"}>
          {line.choices.map((choice) => (
            <button
              key={choice.text}
              type="button"
              onClick={() => {
                onChoice(choice);
                advance();
              }}
            >
              {choice.text}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="primary-action" onClick={advance}>
          {isLastLine ? "Close" : "Continue"}
        </button>
      )}
    </section>
  );
}
