import type { Quest, QuestStep } from "../../game/quest/QuestTypes";

type QuestTrackerProps = {
  quest: Quest | null;
  currentStep: QuestStep | null;
};

export function QuestTracker({ quest, currentStep }: QuestTrackerProps) {
  if (!quest) return null;

  return (
    <aside className="quest-tracker" aria-label="Quest tracker">
      <p className="eyebrow">Active Quest</p>
      <h2>{quest.title}</h2>
      <p>{quest.description}</p>
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
