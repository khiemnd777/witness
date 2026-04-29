import { useState } from "react";
import type { Quest, QuestStep } from "../../game/quest/QuestTypes";

type QuestTrackerProps = {
  quest: Quest | null;
  currentStep: QuestStep | null;
};

export function QuestTracker({ quest, currentStep }: QuestTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!quest) return null;

  return (
    <aside className={`quest-tracker ${isExpanded ? "is-expanded" : ""}`} aria-label="Quest tracker">
      {currentStep && (
        <button
          className="quest-summary"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
        >
          <span>{currentStep.instruction}</span>
          <span className="quest-summary-indicator" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </span>
        </button>
      )}
      <button
        className="quest-close"
        type="button"
        aria-label="Close quest details"
        onClick={() => setIsExpanded(false)}
      >
        X
      </button>
      <p className="eyebrow">Active Quest</p>
      <h2>{quest.title}</h2>
      <p>{quest.description}</p>
      {currentStep && <p className="quest-current-step">{currentStep.instruction}</p>}
      <ol>
        {quest.steps.map((step) => (
          <li
            key={step.id}
            className={`${step.completed ? "is-complete" : ""} ${
              currentStep?.id === step.id ? "is-current" : ""
            }`}
          >
            {step.instruction}
          </li>
        ))}
      </ol>
    </aside>
  );
}
