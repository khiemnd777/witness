import type { Chapter } from "../../game/quest/QuestTypes";
import type { QuestStep } from "../../game/quest/QuestTypes";
import type { ObjectiveHint, SceneInteraction } from "../../game/scene/ChapterScene";
import type { InventoryState } from "../../game/inventory/InventoryTypes";
import type { SpiritualStats } from "../../shared/constants/stats";

type HudProps = {
  chapter: Chapter;
  stats: SpiritualStats;
  inventory: InventoryState;
  nearestInteraction: SceneInteraction | null;
  objectiveHint: ObjectiveHint | null;
  currentStep: QuestStep | null;
};

export function Hud({
  chapter,
  stats,
  inventory,
  nearestInteraction,
  objectiveHint,
  currentStep
}: HudProps) {
  return (
    <section className="hud" aria-label="Game status">
      <div>
        <p className="eyebrow">Chapter {chapter.number}</p>
        <h1>{chapter.title}</h1>
        <p>{chapter.location}</p>
      </div>

      <div className="stats-strip">
        {Object.entries(stats).map(([stat, value]) => (
          <span key={stat}>
            {stat} <strong>{value}</strong>
          </span>
        ))}
      </div>

      <div className="inventory-strip">
        <strong>Inventory</strong>
        <span>
          {inventory.items.length > 0
            ? inventory.items.map((item) => item.name).join(", ")
            : "Empty"}
        </span>
      </div>

      {objectiveHint && (
        <div className="objective-compass">
          <div
            className="objective-arrow"
            style={{ transform: `rotate(${objectiveHint.angleRadians}rad)` }}
            aria-hidden="true"
          >
            ^
          </div>
          <div>
            <strong>{Math.max(1, Math.round(objectiveHint.distance))}m</strong>
            <span>{objectiveHint.label}</span>
          </div>
        </div>
      )}

      <div className={`interaction-prompt ${nearestInteraction ? "is-visible" : ""}`}>
        {nearestInteraction
          ? `Press E - ${nearestInteraction.label}`
          : currentStep
            ? currentStep.instruction
            : "Explore the area"}
      </div>
    </section>
  );
}
