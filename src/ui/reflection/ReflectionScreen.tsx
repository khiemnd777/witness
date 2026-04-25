import type { BibleReference } from "../../content/schemas/BibleReference";
import type { Chapter, Quest } from "../../game/quest/QuestTypes";
import type { SpiritualStats } from "../../shared/constants/stats";

type ReflectionScreenProps = {
  chapter: Chapter;
  quests: Quest[];
  bibleReferences: BibleReference[];
  stats: SpiritualStats;
  onReset: () => void;
  onMainMenu: () => void;
};

export function ReflectionScreen({
  chapter,
  quests,
  bibleReferences,
  stats,
  onReset,
  onMainMenu
}: ReflectionScreenProps) {
  return (
    <section className="reflection-screen" aria-label="Chapter reflection">
      <div className="reflection-content">
        <p className="eyebrow">Chapter Complete</p>
        <h1>{chapter.title}</h1>
        <p>{chapter.theme}</p>

        <div className="reflection-grid">
          {quests.map((quest) => (
            <article key={quest.id}>
              <h2>{quest.reflection?.theme ?? quest.title}</h2>
              <p>{quest.reflection?.message}</p>
            </article>
          ))}
        </div>

        <div className="reference-list">
          {bibleReferences.map((reference) => (
            <p key={reference.id}>
              <strong>{reference.passage}</strong> - {reference.summary}
            </p>
          ))}
        </div>

        <div className="stats-strip is-large">
          {Object.entries(stats).map(([stat, value]) => (
            <span key={stat}>
              {stat} <strong>{value}</strong>
            </span>
          ))}
        </div>

        <div className="reflection-actions">
          <button type="button" onClick={onReset}>
            Restart Chapter
          </button>
          <button type="button" onClick={onMainMenu}>
            Chapter Select
          </button>
        </div>
      </div>
    </section>
  );
}
