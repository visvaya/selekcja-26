import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { players } from "../data/catalog.ts";
import { APP_CONFIG } from "../data/constants.ts";
import type { GameState, PlayerId } from "../data/types.ts";
import { fillSquadRandomly } from "../logic/random-squad.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { clearGame, loadGame, saveGame } from "../logic/storage.ts";
import type { LoadedSave } from "../logic/save-format.ts";
import { createLatestRequestTracker } from "../logic/latest-request.ts";
import { initialSaveStatus, reduceSaveStatus } from "../logic/save-status.ts";
import { SaveStatusBanner } from "./save-status-banner.tsx";
import { usePopoverAnchoring } from "./use-popover-anchoring.ts";
import { LiveAnnouncer } from "./live-announcer.tsx";
import { AppHeader } from "./app-header.tsx";
import { StartScreen } from "./start-screen.tsx";
import { EventDialog } from "./event-dialog.tsx";
import { MessageDialog } from "./message-dialog.tsx";
import { CampReportDialog } from "./camp-report-dialog.tsx";
import { OutsidersDialog } from "./outsiders-dialog.tsx";
import { ProfileDialog } from "./profile-dialog.tsx";
import { ComparisonDialog } from "./comparison-dialog.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { buildFinalReport } from "../logic/report.ts";
import {
  canFinalize,
  formationOutsiders,
  pendingCampEvent,
  selectedPlayers,
  squadLimit,
} from "../logic/selection.ts";
import { SelectionScreen } from "./selection-screen.tsx";
import { SquadDock } from "./squad-dock.tsx";
import { ReportScreen } from "./report-screen.tsx";
import { UI_TEXT as text } from "./text.ts";

type ModalState =
  | { kind: "profile"; id: PlayerId }
  | { kind: "comparison" }
  | { kind: "outsiders" }
  | { kind: "campReport" }
  | { kind: "confirmNewGame" }
  | { kind: "message"; title: string; description: string };

// A player stuck with a broken save can open the game with ?reset to start over.
// The parameter is removed only after the save is cleared, so a StrictMode re-run
// cannot load the old save in between.
async function loadOrResetGame(): Promise<LoadedSave> {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(APP_CONFIG.saveResetQueryParam)) return loadGame();
  await clearGame();
  url.searchParams.delete(APP_CONFIG.saveResetQueryParam);
  window.history.replaceState(window.history.state, "", url);
  return { state: null, discardedForRulesChange: false };
}

function randomSeed(): number {
  const value = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(value);
  return value[0] || APP_CONFIG.fallbackSeed;
}

export function GameApp() {
  usePopoverAnchoring();
  const [state, dispatch] = useReducer(reduceGameState, 0, () =>
    createInitialState(randomSeed()),
  );
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [saveStatus, dispatchSaveStatus] = useReducer(
    reduceSaveStatus,
    initialSaveStatus,
  );
  // Guards against an older save's result overwriting a newer one when two saves overlap
  // (e.g. a slow failing save followed quickly by a retry): only the latest request's result
  // is ever dispatched. Held in a ref so it is created once and stays stable across renders
  // (a ref, unlike plain render-scope state, is exempt from the exhaustive-deps lint rule).
  const saveRequestsRef = useRef(createLatestRequestTracker());
  // The current screen's main heading (start, camp/final list, or the report). Only one of
  // the three is ever mounted at a time, so a single tabIndex={-1} target is enough to give
  // every full-screen transition somewhere safe to send focus.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useCallback(() => headingRef.current?.focus(), []);
  // The list's "Cofnij" button: focus target after clearing the squad, because the clicked
  // button becomes disabled and would otherwise drop focus to the page.
  const undoRef = useRef<HTMLButtonElement>(null);
  // Screen-reader announcements for actions that change the squad without moving focus
  // (undo, a successful random fill, resolving a camp event). Local UI state, never saved,
  // no undo step. flushSync commits the empty string as its own render before the real
  // message is set, so an identical announcement (e.g. undoing twice in a row) still mutates
  // the live region's text content and gets read out again instead of being silently
  // skipped by React's same-value bailout.
  const [announcement, setAnnouncement] = useState("");
  function announce(message: string) {
    flushSync(() => setAnnouncement(""));
    setAnnouncement(message);
  }

  function runSave(nextState: GameState) {
    const isLatest = saveRequestsRef.current.begin();
    void saveGame(nextState).then((result) => {
      if (isLatest()) dispatchSaveStatus({ type: "saveResult", result });
    });
  }

  useEffect(() => {
    let active = true;
    void loadOrResetGame().then((saved) => {
      if (active) {
        if (saved.state) dispatch({ type: "hydrate", state: saved.state });
        if (saved.discardedForRulesChange)
          setModal({
            kind: "message",
            title: text.rulesChangedTitle,
            description: text.rulesChangedDiscarded,
          });
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) runSave(state);
  }, [state, ready]);
  useEffect(() => {
    if (ready) window.scrollTo(0, 0);
  }, [state.stage, state.started, state.report, ready]);
  const pendingEvent = pendingCampEvent(state);
  // Moves focus to the new screen's heading after a full-screen transition (start, undo,
  // restart, finishing a stage) that is not itself opening a dialog. A dialog manages its own
  // focus entry, so this checks the live DOM (rather than the `modal`/`pendingEvent` state)
  // for one being open right now and steps aside if so; that also means closing a dialog on
  // its own (Escape, a close button) does not re-run this and steal focus back from the
  // opener that GameDialog's own cleanup just restored it to, since only the screen itself
  // (not the dialog state) is a dependency here.
  useEffect(() => {
    if (!ready || document.querySelector('[role="dialog"]')) return;
    headingRef.current?.focus();
  }, [state.stage, state.started, state.report, ready]);

  if (!ready)
    return (
      <div className="loading" role="status">
        {text.loading}
      </div>
    );

  const selected = selectedPlayers(state);
  const activeModal = pendingEvent
    ? { kind: "event" as const, event: pendingEvent }
    : modal;

  function togglePlayer(id: PlayerId) {
    if (!state.selected.has(id) && state.selected.size >= squadLimit(state)) {
      setModal({
        kind: "message",
        title: text.fullSquadTitle,
        description: text.fullSquadMessage,
      });
      return;
    }
    dispatch({ type: "togglePlayer", id, limit: squadLimit(state) });
  }
  function autoFill() {
    const result = fillSquadRandomly(state);
    if (!result.ok) {
      setModal({
        kind: "message",
        title: text.autoFillErrorTitle,
        description: text.autoFillErrors[result.reason],
      });
      return;
    }
    const added = result.selected.size - state.selected.size;
    dispatch({
      type: "autoFill",
      selected: result.selected,
      seed: result.seed,
    });
    announce(
      text.announcements.autoFill(
        added,
        result.selected.size,
        squadLimit(state),
      ),
    );
  }
  function retrySave() {
    runSave(state);
  }
  function dismissSaveIssue() {
    dispatchSaveStatus({ type: "dismiss" });
  }
  function undo() {
    const next = reduceGameState(state, { type: "undo" });
    if (next !== state)
      announce(text.announcements.undo(next.selected.size, squadLimit(next)));
    dispatch({ type: "undo" });
    setModal(null);
    setExpanded(false);
  }
  function clearSquad() {
    if (state.selected.size === 0) return;
    // flushSync commits the cleared squad (and the enabled "Cofnij") before focus moves.
    flushSync(() => dispatch({ type: "clearSquad" }));
    announce(text.announcements.clearSquad);
    undoRef.current?.focus();
  }
  function restart() {
    dispatch({ type: "reset", seed: randomSeed() });
    setModal(null);
    setExpanded(false);
  }
  function comparePlayer(id: PlayerId) {
    const willCompare = !state.compare.includes(id);
    dispatch({ type: "toggleCompare", id });
    if (willCompare) setModal({ kind: "comparison" });
  }
  function finishStage() {
    if (!canFinalize(state) || pendingEvent) return;
    if (state.stage === "camp") {
      dispatch({ type: "completeCamp", squad: selected });
      setExpanded(false);
      setModal({ kind: "campReport" });
      return;
    }
    const { report, seed } = buildFinalReport(state, text);
    dispatch({ type: "finish", report, seed });
    setModal(null);
    setExpanded(false);
  }

  function renderModal() {
    if (!activeModal) return null;
    const close = () => setModal(null);
    if (activeModal.kind === "event") {
      const event = activeModal.event;
      return (
        <EventDialog
          event={event}
          onClose={close}
          onChoose={(index, choiceTitle) => {
            dispatch({
              type: "resolveEvent",
              id: event.id,
              effects: event.choices[index]!,
            });
            announce(text.announcements.eventResolved(choiceTitle));
          }}
          onUndo={undo}
          restoreFocusFallback={focusHeading}
        />
      );
    }
    if (activeModal.kind === "message")
      return (
        <MessageDialog
          title={activeModal.title}
          description={activeModal.description}
          onClose={close}
          restoreFocusFallback={focusHeading}
        />
      );
    if (activeModal.kind === "confirmNewGame") {
      const copy = text.confirmNewGame;
      return (
        <ConfirmDialog
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          cancelLabel={copy.cancel}
          onConfirm={restart}
          onClose={close}
          restoreFocusFallback={focusHeading}
        />
      );
    }
    if (activeModal.kind === "campReport")
      return (
        <CampReportDialog
          state={state}
          onClose={close}
          restoreFocusFallback={focusHeading}
        />
      );
    if (activeModal.kind === "outsiders") {
      const outsiders = formationOutsiders(state);
      return (
        <OutsidersDialog
          outsiders={outsiders}
          onClose={close}
          onOpenProfile={(id) => setModal({ kind: "profile", id })}
          restoreFocusFallback={focusHeading}
        />
      );
    }
    if (activeModal.kind === "profile") {
      const player = players.find(
        (candidate) => candidate.id === activeModal.id,
      );
      if (!player) return null;
      return (
        <ProfileDialog
          player={player}
          state={state}
          onClose={close}
          onToggle={togglePlayer}
          restoreFocusFallback={focusHeading}
        />
      );
    }
    if (activeModal.kind === "comparison" && state.compare.length === 2) {
      const left = players.find((player) => player.id === state.compare[0]),
        right = players.find((player) => player.id === state.compare[1]);
      if (!left || !right) return null;
      return (
        <ComparisonDialog
          left={left}
          right={right}
          state={state}
          onClose={close}
          onToggle={togglePlayer}
          onClearComparison={() => dispatch({ type: "clearCompare" })}
          restoreFocusFallback={focusHeading}
        />
      );
    }
    return null;
  }

  const stageText = text.stages[state.stage];
  return (
    <div className="app">
      <LiveAnnouncer message={announcement} />
      <SaveStatusBanner
        status={saveStatus}
        onRetry={retrySave}
        onDismiss={dismissSaveIssue}
      />
      <AppHeader
        phase={
          state.report
            ? text.resultPhase
            : state.started
              ? stageText.phase
              : text.introPhase
        }
      />
      <main className="main">
        {state.report ? (
          <ReportScreen
            report={state.report}
            onRestart={restart}
            headingRef={headingRef}
          />
        ) : !state.started ? (
          <StartScreen
            system={state.system}
            canUndo={state.history.length > 0}
            headingRef={headingRef}
            onSystem={(value) => dispatch({ type: "setSystem", value })}
            onStart={() => dispatch({ type: "start" })}
            onUndo={undo}
          />
        ) : (
          <SelectionScreen
            state={state}
            headingRef={headingRef}
            onAutoFill={autoFill}
            onUndo={undo}
            onClearSquad={clearSquad}
            onNewGame={() => setModal({ kind: "confirmNewGame" })}
            undoRef={undoRef}
            onList={(patch) => dispatch({ type: "setList", patch })}
            onToggle={togglePlayer}
            onProfile={(id) => setModal({ kind: "profile", id })}
            onCompare={comparePlayer}
          />
        )}
      </main>
      {state.started && !state.report && (
        <SquadDock
          state={state}
          expanded={expanded}
          onExpand={() => setExpanded((open) => !open)}
          onOutsiders={() => setModal({ kind: "outsiders" })}
          onFinalize={finishStage}
        />
      )}
      {renderModal()}
    </div>
  );
}
