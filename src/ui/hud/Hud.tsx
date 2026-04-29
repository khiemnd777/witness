import { useState } from "react";
import type { Chapter } from "../../game/quest/QuestTypes";
import type { QuestStep } from "../../game/quest/QuestTypes";
import type { ObjectiveHint, SceneInteraction } from "../../game/scene/ChapterScene";
import type { InventoryState } from "../../game/inventory/InventoryTypes";
import type { SpiritualStat, SpiritualStats } from "../../shared/constants/stats";

type HudProps = {
  chapter: Chapter;
  stats: SpiritualStats;
  inventory: InventoryState;
  nearestInteraction: SceneInteraction | null;
  objectiveHint: ObjectiveHint | null;
  currentStep: QuestStep | null;
  usesTouchControls?: boolean;
};

export function Hud({
  chapter,
  stats,
  inventory,
  nearestInteraction,
  objectiveHint,
  currentStep,
  usesTouchControls = false
}: HudProps) {
  const [activeDetailPanel, setActiveDetailPanel] = useState<"stats" | "inventory" | null>(null);
  const inventoryLabel =
    inventory.items.length > 0 ? inventory.items.map((item) => item.name).join(", ") : "Empty";
  const hasReachedObjective = objectiveHint ? objectiveHint.distance <= 2 : false;

  const toggleDetailPanel = (panel: "stats" | "inventory") => {
    setActiveDetailPanel((current) => (current === panel ? null : panel));
  };

  return (
    <section className="hud" aria-label="Game status">
      <div className="hud-panel hud-panel--chapter">
        <p className="eyebrow">Chapter {chapter.number}</p>
        <h1>{chapter.title}</h1>
        <p>{chapter.location}</p>
      </div>

      <button
        className="hud-panel stats-strip hud-expand-button"
        type="button"
        aria-label="Open spiritual statistics"
        aria-expanded={activeDetailPanel === "stats"}
        onClick={() => toggleDetailPanel("stats")}
      >
        {Object.entries(stats).map(([stat, value]) => (
          <span className="stats-chip" key={stat} title={`${stat}: ${value}`}>
            <span className="stat-icon" aria-hidden="true">
              {STAT_ICONS[stat as SpiritualStat]}
            </span>
            <span className="stat-name">{stat}</span> <strong>{value}</strong>
          </span>
        ))}
        <span className="hud-panel-indicator" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </span>
      </button>

      <button
        className="hud-panel inventory-strip hud-expand-button"
        type="button"
        aria-label="Open inventory"
        aria-expanded={activeDetailPanel === "inventory"}
        onClick={() => toggleDetailPanel("inventory")}
      >
        <strong>Inventory</strong>
        <span>{inventoryLabel}</span>
        <span className="hud-panel-indicator" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </span>
      </button>

      {activeDetailPanel === "stats" && (
        <div className="hud-panel hud-detail-panel stats-detail-panel">
          <button
            className="hud-detail-close"
            type="button"
            aria-label="Close statistics"
            onClick={() => setActiveDetailPanel(null)}
          >
            X
          </button>
          <strong>Statistics</strong>
          <dl>
            {Object.entries(stats).map(([stat, value]) => (
              <div key={stat}>
                <dt>
                  <span className="stat-icon" aria-hidden="true">
                    {STAT_ICONS[stat as SpiritualStat]}
                  </span>
                  {stat}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {activeDetailPanel === "inventory" && (
        <div className="hud-panel hud-detail-panel inventory-detail-panel">
          <button
            className="hud-detail-close"
            type="button"
            aria-label="Close inventory"
            onClick={() => setActiveDetailPanel(null)}
          >
            X
          </button>
          <strong>Inventory</strong>
          {inventory.items.length > 0 ? (
            <ul>
              {inventory.items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          ) : (
            <p>Empty</p>
          )}
        </div>
      )}

      {objectiveHint && (
        <div className="hud-panel objective-compass">
          <div
            className={`objective-arrow ${hasReachedObjective ? "is-arrived" : ""}`}
            style={{
              transform: hasReachedObjective ? undefined : `rotate(${objectiveHint.angleRadians}rad)`
            }}
            aria-hidden="true"
          >
            {hasReachedObjective ? (
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              "^"
            )}
          </div>
          <div>
            <strong>{Math.max(1, Math.round(objectiveHint.distance))}m</strong>
            <span>{objectiveHint.label}</span>
          </div>
        </div>
      )}

      <div className={`hud-panel interaction-prompt ${nearestInteraction ? "is-visible" : ""}`}>
        {nearestInteraction
          ? `${usesTouchControls ? "Tap" : "Press E"} - ${nearestInteraction.label}`
          : currentStep
            ? currentStep.instruction
            : "Explore the area"}
      </div>
    </section>
  );
}

const STAT_ICONS: Record<SpiritualStat, string> = {
  faith: "✦",
  love: "♥",
  humility: "○",
  wisdom: "◇",
  courage: "▲"
};
