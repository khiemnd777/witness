import { useEffect, useMemo, useRef, useState } from "react";
import { loadChapterContent, loadChapterManifest } from "../content/loaders/contentLoader";
import type { DialogueChoice } from "../game/dialogue/DialogueTypes";
import { GameEngine } from "../game/engine/GameEngine";
import { GameSession, type GameSessionSnapshot } from "../game/session/GameSession";
import type { SceneInteraction } from "../game/scene/ChapterScene";
import { DialoguePanel } from "../ui/dialogue/DialoguePanel";
import { Hud } from "../ui/hud/Hud";
import { ToastStack } from "../ui/hud/ToastStack";
import { MainMenu } from "../ui/menu/MainMenu";
import { QuestTracker } from "../ui/quest/QuestTracker";
import { ReflectionScreen } from "../ui/reflection/ReflectionScreen";
import { useGameStore } from "./store";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const pendingDialogueInteractionRef = useRef<SceneInteraction | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState("chapter_01");
  const [hasStarted, setHasStarted] = useState(false);

  const {
    content,
    chapterManifest,
    save,
    activeQuest,
    currentStep,
    activeDialogue,
    inventory,
    nearestInteraction,
    objectiveHint,
    toasts,
    chapterComplete,
    error,
    setContent,
    setChapterManifest,
    setSave,
    setQuestState,
    setActiveDialogue,
    setInventory,
    setNearestInteraction,
    setObjectiveHint,
    pushToast,
    dismissToast,
    setChapterComplete,
    setError
  } = useGameStore();

  const activeInteractionIds = useMemo(() => {
    if (!currentStep) return [];
    if (currentStep.type === "talk" && currentStep.npcId) return [`npc:${currentStep.npcId}`];
    if (currentStep.type === "collect" && currentStep.itemId) return [`item:${currentStep.itemId}`];
    if (currentStep.type === "give_item" && currentStep.target) {
      return [`give_item:${currentStep.target}:${currentStep.itemId ?? ""}`];
    }
    if (currentStep.type === "go_to" && currentStep.target) return [`location:${currentStep.target}`];
    if (currentStep.type === "observe" && currentStep.target) return [`observe:${currentStep.target}`];
    return [];
  }, [currentStep]);

  useEffect(() => {
    let cancelled = false;

    loadChapterManifest()
      .then((manifest) => {
        if (!cancelled) setChapterManifest(manifest);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, [setChapterManifest, setError]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setActiveDialogue(null);
    setNearestInteraction(null);
    setObjectiveHint(null);

    loadChapterContent(selectedChapterId)
      .then((loaded) => {
        if (cancelled) return;
        const nextSession = new GameSession(loaded);
        setContent(loaded);
        setSession(nextSession);
        applySnapshot(nextSession.getSnapshot());
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedChapterId,
    setActiveDialogue,
    setContent,
    setError,
    setInventory,
    setNearestInteraction,
    setObjectiveHint,
    setQuestState,
    setSave
  ]);

  useEffect(() => {
    if (!hasStarted || !canvasRef.current || !content) return;

    const engine = new GameEngine(canvasRef.current, content.chapter.id, {
      onInteract: handleInteraction,
      onNearestInteractionChange: setNearestInteraction,
      onObjectiveHintChange: setObjectiveHint
    });
    engineRef.current = engine;
    engine.start();
    engine.setActiveInteractionIds(activeInteractionIds);
    engine.setCollectedItemIds(inventory.items.map((item) => item.id));
    engine.setWorldStateIds(getWorldStateIds());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [content, hasStarted, setNearestInteraction, setObjectiveHint]);

  useEffect(() => {
    engineRef.current?.setActiveInteractionIds(activeInteractionIds);
  }, [activeInteractionIds]);

  useEffect(() => {
    engineRef.current?.setCollectedItemIds(inventory.items.map((item) => item.id));
  }, [inventory]);

  useEffect(() => {
    engineRef.current?.setWorldStateIds(getWorldStateIds());
  }, [save]);

  const getWorldStateIds = () => {
    if (!save) return [];
    const ids: string[] = [];
    if (
      save.currentQuestCompletedStepIds.includes("prepare_stable") ||
      save.completedQuestIds.includes("chapter_01_quest_01")
    ) {
      ids.push("stable_prepared");
    }
    if (
      save.currentQuestCompletedStepIds.includes("lead_travelers") ||
      save.completedQuestIds.includes("chapter_01_quest_01")
    ) {
      ids.push("travelers_led_to_stable");
    }
    if (
      save.currentQuestCompletedStepIds.includes("observe_star") ||
      save.completedQuestIds.includes("chapter_01_quest_03") ||
      save.completedQuestIds.includes("chapter_01_quest_04")
    ) {
      ids.push("infant_jesus_born");
    }
    return ids;
  };

  const applySnapshot = (snapshot: GameSessionSnapshot) => {
    setSave(snapshot.save);
    setQuestState(snapshot.activeQuest, snapshot.currentStep);
    setInventory(snapshot.inventory);
    setChapterComplete(snapshot.chapterComplete);
  };

  const handleInteraction = (interaction: SceneInteraction | null) => {
    if (!interaction || !session) return;

    const dialogueId = session.getDialogueIdForInteraction(interaction);
    if (dialogueId) {
      pendingDialogueInteractionRef.current = interaction;
      setActiveDialogue(session.getDialogue(dialogueId));
      return;
    }

    completeInteraction(interaction);
  };

  const completeInteraction = (interaction: SceneInteraction) => {
    if (!session) return;
    const result = session.handleInteraction(interaction);
    applySnapshot(result.snapshot);
    for (const message of result.messages) {
      pushToast(message);
    }
  };

  const completeDialogueInteraction = () => {
    const pendingInteraction = pendingDialogueInteractionRef.current;
    pendingDialogueInteractionRef.current = null;
    setActiveDialogue(null);

    if (pendingInteraction) {
      completeInteraction(pendingInteraction);
    }
  };

  const closeDialogueEarly = () => {
    pendingDialogueInteractionRef.current = null;
    setActiveDialogue(null);
  };

  const handleDialogueChoice = (choice: DialogueChoice) => {
    if (!session) return;
    applySnapshot(session.applyDialogueChoice(choice));
  };

  const resetProgress = () => {
    if (!session) return;
    applySnapshot(session.reset());
    setActiveDialogue(null);
    pendingDialogueInteractionRef.current = null;
  };

  const returnToMainMenu = () => {
    setHasStarted(false);
    setActiveDialogue(null);
    pendingDialogueInteractionRef.current = null;
  };

  const selectChapter = (chapterId: string) => {
    if (chapterId === selectedChapterId) return;
    setHasStarted(false);
    engineRef.current?.dispose();
    engineRef.current = null;
    pendingDialogueInteractionRef.current = null;
    setSelectedChapterId(chapterId);
  };

  if (error) {
    return <div className="system-message">Failed to start game: {error}</div>;
  }

  if (!content || !save || !session) {
    return <div className="system-message">Loading chapter...</div>;
  }

  return (
    <main className="game-shell">
      {!hasStarted && (
        <MainMenu
          chapter={content.chapter}
          chapters={chapterManifest}
          selectedChapterId={selectedChapterId}
          onSelectChapter={selectChapter}
          onStart={() => setHasStarted(true)}
          onReset={resetProgress}
        />
      )}

      <canvas ref={canvasRef} className="game-canvas" />

      {hasStarted && (
        <>
          <Hud
            chapter={content.chapter}
            stats={save.stats}
            inventory={inventory}
            nearestInteraction={nearestInteraction}
            objectiveHint={objectiveHint}
            currentStep={currentStep}
          />
          <QuestTracker quest={activeQuest} currentStep={currentStep} />
        </>
      )}

      {activeDialogue && (
        <DialoguePanel
          dialogue={activeDialogue}
          onChoice={handleDialogueChoice}
          onComplete={completeDialogueInteraction}
          onClose={closeDialogueEarly}
        />
      )}

      <ToastStack messages={toasts} onDismiss={dismissToast} />

      {chapterComplete && (
        <ReflectionScreen
          chapter={content.chapter}
          quests={content.quests}
          bibleReferences={content.bibleReferences}
          stats={save.stats}
          onReset={resetProgress}
          onMainMenu={returnToMainMenu}
        />
      )}
    </main>
  );
}
