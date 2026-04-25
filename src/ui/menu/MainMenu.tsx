import type { Chapter } from "../../game/quest/QuestTypes";
import type { ChapterManifestEntry } from "../../content/schemas/ChapterManifest";

type MainMenuProps = {
  chapter: Chapter;
  chapters: ChapterManifestEntry[];
  selectedChapterId: string;
  onSelectChapter: (chapterId: string) => void;
  onStart: () => void;
  onReset: () => void;
};

export function MainMenu({
  chapter,
  chapters,
  selectedChapterId,
  onSelectChapter,
  onStart,
  onReset
}: MainMenuProps) {
  return (
    <section className="main-menu">
      <div className="menu-content">
        <p className="eyebrow">The Witness</p>
        <h1>Journey with Jesus</h1>
        <p>{chapter.summary}</p>

        <div className="chapter-select" aria-label="Chapter select">
          {chapters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === selectedChapterId ? "is-selected" : ""}
              disabled={!entry.available}
              onClick={() => onSelectChapter(entry.id)}
            >
              <strong>Chapter {entry.number}</strong>
              <span>{entry.title}</span>
            </button>
          ))}
        </div>

        <div className="menu-actions">
          <button type="button" className="primary-action" onClick={onStart}>
            Begin Chapter {chapter.number}
          </button>
          <button type="button" onClick={onReset}>
            Reset Save
          </button>
        </div>
      </div>
    </section>
  );
}
