import { useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  players,
  positionOrder,
  priorities,
  systems,
} from "../data/catalog.ts";
import { APP_CONFIG, GAME_RULES } from "../data/constants.ts";
import type {
  DetailedPosition,
  FinalReport,
  GameState,
  GroupPosition,
  Player,
  SortId,
} from "../data/types.ts";
import { fillSquadRandomly } from "../logic/random-squad.ts";
import {
  experienceScore,
  groupScore,
  modelScore,
  trialImpact,
} from "../logic/scoring.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { clearGame, loadGame, saveGame } from "../logic/storage.ts";
import { buildFinalReport } from "../logic/report.ts";
import {
  canFinalize,
  detailedCounts,
  detailedPositions,
  formationOutsiders,
  pendingCampEvent,
  groupCounts,
  positionShort,
  preferredFoot,
  riskLevel,
  selectedPlayers,
  slotCount,
  squadLimit,
  squadProblems,
  visiblePlayers,
} from "../logic/selection.ts";
import { UI_TEXT as text } from "./text.ts";

type ModalState =
  | { kind: "profile"; name: string }
  | { kind: "comparison" }
  | { kind: "outsiders" }
  | { kind: "campReport" }
  | { kind: "message"; title: string; description: string };

const filterPositions: ("ALL" | DetailedPosition)[] = [
  "ALL",
  "BR",
  "LO",
  "LŚO",
  "ŚO",
  "PŚO",
  "PO",
  "LWO",
  "DP",
  "ŚP",
  "OP",
  "PWO",
  "LS",
  "N",
  "PS",
];
const groupPositions: GroupPosition[] = ["BR", "OBR", "POM", "ATA"];

// A player stuck with a broken save can open the game with ?reset to start over.
// The parameter is removed only after the save is cleared, so a StrictMode re-run
// cannot load the old save in between.
async function loadOrResetGame(): Promise<GameState | null> {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(APP_CONFIG.saveResetQueryParam)) return loadGame();
  await clearGame();
  url.searchParams.delete(APP_CONFIG.saveResetQueryParam);
  window.history.replaceState(window.history.state, "", url);
  return null;
}

function randomSeed(): number {
  const value = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(value);
  return value[0] || 2028;
}

function GameDialog({
  title,
  children,
  onClose,
  blocking = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  blocking?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previouslyFocused?.focus();
  }, [title]);
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !blocking) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = [
      ...(dialogRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not([disabled])",
      ) ?? []),
    ];
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <div className="modal-wrap" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  state,
  onToggle,
  onProfile,
  onCompare,
}: {
  player: Player;
  state: GameState;
  onToggle: (name: string) => void;
  onProfile: (name: string) => void;
  onCompare: (name: string) => void;
}) {
  const chosen = state.selected.has(player.name);
  const compared = state.compare.includes(player.name);
  const trial = state.trial[player.name];
  const impact = trialImpact(player, state);
  const metrics = [
    [text.playerMetrics.quality, player.ov],
    [text.playerMetrics.form, player.form],
    [text.playerMetrics.fitness, player.fit],
    [text.playerMetrics.tactics, player.tact],
  ] as const;
  return (
    <article
      className={`player ${chosen ? "selected" : ""} ${compared ? "compare-on" : ""}`}
    >
      <div className="player-top">
        <span className="pos">{positionShort(player)}</span>
        <div>
          <h3>{player.name}</h3>
          <div className="meta">
            {player.club} • {player.age} {text.yearsOld}
          </div>
          <div className="tags">
            {player.roles.slice(0, 3).map((role) => (
              <span className="tag" key={role}>
                {role}
              </span>
            ))}
            {player.flags && <span className="tag alert">{player.flags}</span>}
            {state.stage === "final" && trial && (
              <span className={`tag ${impact < 0 ? "alert" : ""}`}>
                {text.campResult}: {text.trialNotes[trial.note] ?? trial.note} (
                {impact >= 0 ? "+" : ""}
                {impact})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="score" title={text.selectionScore}>
        {modelScore(player, state)}
      </div>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>
              {label}
              <b>{value}</b>
            </span>
            <progress
              value={value}
              max={GAME_RULES.ratingMaximumPoints}
              aria-label={`${label}: ${value}`}
            />
          </div>
        ))}
      </div>
      <div className="player-actions">
        <button
          className="select-btn"
          aria-pressed={chosen}
          onClick={() => onToggle(player.name)}
        >
          {chosen ? text.selected : text.select}
        </button>
        <button className="profile-btn" onClick={() => onProfile(player.name)}>
          {text.profile}
        </button>
        <button
          className="compare-btn"
          aria-pressed={compared}
          onClick={() => onCompare(player.name)}
        >
          {compared ? text.compared : text.compare}
        </button>
      </div>
    </article>
  );
}

function Pitch({ state }: { state: GameState }) {
  const system = systems.find((candidate) => candidate.id === state.system)!;
  const accessibleSlots = system.shape
    .flat()
    .map((position) =>
      text.occupied(slotCount(state, position), text.positions[position]),
    )
    .join(". ");
  return (
    <div
      className="mini-pitch"
      role="img"
      aria-label={`${text.systems[state.system].name}. ${text.pitchDescription} ${accessibleSlots}`}
    >
      <div className="formation-label">
        <i aria-hidden="true" />
        {text.systems[state.system].name} • {text.availablePlayers}
      </div>
      {system.shape.map((row, index) => (
        <div className="pitch-row" key={index}>
          {row.map((position, slot) => (
            <span
              className="pitch-node"
              key={`${position}-${slot}`}
              title={text.occupied(
                slotCount(state, position),
                text.positions[position],
              )}
            >
              <small>{position}</small>
              <b>{slotCount(state, position)}</b>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function SquadDock({
  state,
  expanded,
  onExpand,
  onOutsiders,
  onFinalize,
}: {
  state: GameState;
  expanded: boolean;
  onExpand: () => void;
  onOutsiders: () => void;
  onFinalize: () => void;
}) {
  const counts = groupCounts(state),
    requirements = GAME_RULES[state.stage].minimumPlayersByGroup;
  const issues = squadProblems(state),
    outsiders = formationOutsiders(state);
  const groups = Object.entries(
    outsiders.reduce<Record<string, number>>((result, player) => {
      const key = positionShort(player);
      return { ...result, [key]: (result[key] ?? 0) + 1 };
    }, {}),
  )
    .map(([position, count]) => `${position} ×${count}`)
    .join(" · ");
  const progress = Math.min(
    GAME_RULES.ratingMaximumPoints,
    (state.selected.size / squadLimit(state)) * GAME_RULES.ratingMaximumPoints,
  );
  const issueText = issues
    .map((issue) =>
      issue.kind === "missing"
        ? text.missing(issue.count, issue.group)
        : text.excess(issue.count, issue.group),
    )
    .join(" • ");
  return (
    <aside className="dock" aria-label={text.yourSquad}>
      <div
        className={`dock-breakdown ${expanded ? "" : "hidden"}`}
        id="dockBreakdown"
      >
        <div className="dock-summary">
          {groupPositions.map((group) => {
            const missing = Math.max(0, requirements[group] - counts[group]);
            const excess =
              state.stage === "final" && group === "BR"
                ? Math.max(0, counts[group] - requirements[group])
                : 0;
            return (
              <div
                className={missing ? "need" : excess ? "over" : "ok"}
                key={group}
              >
                <small>{text.groups[group]}</small>
                <b>
                  {counts[group]} /{" "}
                  {state.stage === "final" && group === "BR"
                    ? text.exact
                    : text.minimum}{" "}
                  {requirements[group]}
                </b>
                <span>
                  {missing
                    ? text.missingShort(missing)
                    : excess
                      ? text.excessShort(excess)
                      : text.fulfilled}
                </span>
              </div>
            );
          })}
        </div>
        <div className="pitch-panel">
          <Pitch state={state} />
          {outsiders.length > 0 && (
            <button
              className="formation-outsiders"
              onClick={onOutsiders}
              aria-label={text.outOfFormationTitle(outsiders.length)}
            >
              <div>
                <strong>{text.outOfFormationTitle(outsiders.length)}</strong>
                <small>{groups}</small>
              </div>
              <span className="outside-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="dock-inner">
        <div
          className="count-ring"
          style={{ "--progress": `${progress}%` } as CSSProperties}
        >
          <b>
            {state.selected.size}/{squadLimit(state)}
          </b>
        </div>
        <button
          className="dock-copy"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls="dockBreakdown"
        >
          <b>
            {state.selected.size < squadLimit(state)
              ? text.remaining(squadLimit(state) - state.selected.size)
              : canFinalize(state)
                ? text.stages[state.stage].completed
                : issueText}
          </b>
          <small>
            {issueText ||
              (outsiders.length
                ? text.outOfFormationCount(outsiders.length)
                : text.dockCoverage)}
          </small>
        </button>
        <button
          className="finalize"
          disabled={!canFinalize(state)}
          onClick={onFinalize}
        >
          {text.stages[state.stage].finalize}
        </button>
      </div>
    </aside>
  );
}

function ReportScreen({
  report,
  onRestart,
  onUndo,
}: {
  report: FinalReport;
  onRestart: () => void;
  onUndo: () => void;
}) {
  const effect =
    report.luck > GAME_RULES.tournament.favorableLuckThresholdPoints
      ? text.luck.positive
      : report.luck < GAME_RULES.tournament.unfavorableLuckThresholdPoints
        ? text.luck.negative
        : text.luck.neutral;
  return (
    <section className="result">
      <div className="result-hero">
        <div className="eyebrow result-eyebrow">{text.reportEyebrow}</div>
        <div className="grade">{report.grade}</div>
        <h1>{report.stage}</h1>
        <p>
          {text.pointsInGroup(report.points)} {effect} {report.story.outcome}
        </p>
        <div className="outcomes">
          <div className="outcome">
            <small>{text.reportKpis.quality}</small>
            <b>{Math.round(report.quality)}</b>
          </div>
          <div className="outcome">
            <small>{text.reportKpis.chemistry}</small>
            <b>{Math.round(report.chem)}</b>
          </div>
          <div className="outcome">
            <small>{text.reportKpis.roles}</small>
            <b>{Math.round(report.coverage)}%</b>
          </div>
        </div>
      </div>
      <div className="report">
        <h2>{text.tournamentProgress}</h2>
        <ul>
          {report.story.matches.map((match, index) => (
            <li key={index}>{match}</li>
          ))}
        </ul>
        <p>
          <b>{text.lastMatch}</b> {report.story.last}
        </p>
      </div>
      <div className="report">
        <h2>{text.strengths}</h2>
        <ul>
          {(report.strengths.length
            ? report.strengths
            : [text.noStrengths]
          ).map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className="report">
        <h2>{text.weaknesses}</h2>
        <ul>
          {(report.weak.length ? report.weak : [text.noWeaknesses]).map(
            (reason, index) => (
              <li key={index}>{reason}</li>
            ),
          )}
        </ul>
      </div>
      <div className="report">
        <h2>{text.yourSquad}</h2>
        {groupPositions.map((group) => (
          <div className="squad-group" key={group}>
            <h3>{text.groups[group]}</h3>
            <div className="squad-list">
              {report.s
                .filter((player) => player.pos === group)
                .sort(
                  (left, right) =>
                    positionOrder[detailedPositions(left)[0]!] -
                    positionOrder[detailedPositions(right)[0]!],
                )
                .map((player) => (
                  <span className="squad-pill" key={player.name}>
                    <b>{positionShort(player)}</b> {player.name}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      <button className="action-button" onClick={onUndo}>
        {text.undo}
      </button>
      <button className="primary restart" onClick={onRestart}>
        {text.restart}
      </button>
      <p className="fineprint">{text.simulationDisclaimer}</p>
    </section>
  );
}

export function GameApp() {
  const [state, dispatch] = useReducer(reduceGameState, 0, () =>
    createInitialState(randomSeed()),
  );
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadOrResetGame().then((saved) => {
      if (active) {
        if (saved) dispatch({ type: "hydrate", state: saved });
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) void saveGame(state);
  }, [state, ready]);
  useEffect(() => {
    if (ready) window.scrollTo(0, 0);
  }, [state.stage, state.started, state.report, ready]);

  if (!ready)
    return (
      <div className="loading" role="status">
        {text.loading}
      </div>
    );

  const pendingEvent = pendingCampEvent(state);
  const selected = selectedPlayers(state);
  const detailed = detailedCounts(state);
  const risk = riskLevel(state);
  const activeModal = pendingEvent
    ? { kind: "event" as const, event: pendingEvent }
    : modal;

  function togglePlayer(name: string) {
    if (!state.selected.has(name) && state.selected.size >= squadLimit(state)) {
      setModal({
        kind: "message",
        title: text.fullSquadTitle,
        description: text.fullSquadMessage,
      });
      return;
    }
    dispatch({ type: "togglePlayer", name, limit: squadLimit(state) });
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
    dispatch({
      type: "autoFill",
      selected: result.selected,
      seed: result.seed,
    });
  }
  function undo() {
    dispatch({ type: "undo" });
    setModal(null);
    setExpanded(false);
  }
  function comparePlayer(name: string) {
    const willCompare = !state.compare.includes(name);
    dispatch({ type: "toggleCompare", name });
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
      const event = activeModal.event,
        copy = text.events[event.id];
      return (
        <GameDialog title={copy.title} onClose={close} blocking>
          <div className="eyebrow">{text.eventEyebrow}</div>
          <p>{copy.description}</p>
          {copy.choices.map((choice, index) => (
            <button
              className="decision"
              key={choice.title}
              onClick={() =>
                dispatch({
                  type: "resolveEvent",
                  id: event.id,
                  effects: event.choices[index]!,
                })
              }
            >
              <b>{choice.title}</b>
              <small>{choice.description}</small>
            </button>
          ))}
          <button className="action-button" onClick={undo}>
            {text.undo}
          </button>
        </GameDialog>
      );
    }
    if (activeModal.kind === "message")
      return (
        <GameDialog title={activeModal.title} onClose={close}>
          <div className="eyebrow">{text.notice}</div>
          <p>{activeModal.description}</p>
          <button className="primary start-button" onClick={close}>
            {text.understood}
          </button>
        </GameDialog>
      );
    if (activeModal.kind === "campReport") {
      const ranked = players
        .filter((player) => state.campSquad.has(player.name))
        .sort(
          (left, right) =>
            (state.trial[right.name]?.delta ?? 0) -
            (state.trial[left.name]?.delta ?? 0),
        );
      const best = ranked
          .slice(0, 3)
          .map((player) => player.name)
          .join(", "),
        doubts = ranked
          .slice(-2)
          .map((player) => player.name)
          .join(" i ");
      return (
        <GameDialog title={text.campReportTitle} onClose={close}>
          <div className="eyebrow">{text.campReportEyebrow}</div>
          <p>{text.campReportBody(best, doubts)}</p>
          <button className="primary start-button" onClick={close}>
            {text.continueToFinal}
          </button>
        </GameDialog>
      );
    }
    if (activeModal.kind === "outsiders") {
      const outsiders = formationOutsiders(state);
      return (
        <GameDialog
          title={text.outOfFormationTitle(outsiders.length)}
          onClose={close}
        >
          <div className="eyebrow">{text.outOfFormationEyebrow}</div>
          <p>{text.outOfFormationExplanation}</p>
          {outsiders.map((player) => (
            <button
              className="decision"
              key={player.name}
              onClick={() => setModal({ kind: "profile", name: player.name })}
            >
              <b>{player.name}</b>
              <small>
                {positionShort(player)} • {player.club}
              </small>
            </button>
          ))}
          <button className="close start-button" onClick={close}>
            {text.returnToPitch}
          </button>
        </GameDialog>
      );
    }
    if (activeModal.kind === "profile") {
      const player = players.find(
        (candidate) => candidate.name === activeModal.name,
      );
      if (!player) return null;
      const foot = preferredFoot(player),
        trial = state.trial[player.name],
        impact = trialImpact(player, state);
      const metrics = [
        modelScore(player, state),
        player.ov,
        player.form,
        player.fit,
        player.tact,
        experienceScore(player),
        player.chem,
        groupScore(player),
      ];
      return (
        <GameDialog title={player.name} onClose={close}>
          <div className="eyebrow">{text.profile}</div>
          <div className="profile-head">
            <p>
              {player.club} • {player.age} {text.yearsOld}
            </p>
            <div className="profile-score">{modelScore(player, state)}</div>
          </div>
          <div className="profile-positions">
            {detailedPositions(player).map((position) => (
              <span className="tag" key={position}>
                <b>{position}</b> {text.positions[position]}
              </span>
            ))}
            <span className="tag">
              <b>{foot === "both" ? text.foot.both : text.foot.lead}</b>{" "}
              {foot !== "both" && text.foot[foot].toLocaleLowerCase("pl")}
            </span>
          </div>
          <div className="tags">
            {player.roles.map((role) => (
              <span className="tag" key={role}>
                {role}
              </span>
            ))}
            {player.flags && <span className="tag alert">{player.flags}</span>}
            {trial && (
              <span className={`tag ${impact < 0 ? "alert" : ""}`}>
                {text.campResult}: {text.trialNotes[trial.note] ?? trial.note} •{" "}
                {impact >= 0 ? "+" : ""}
                {impact}
              </span>
            )}
          </div>
          <div className="profile-metrics">
            {text.profileMetrics.map((label, index) => (
              <div className="profile-metric" key={label}>
                <small>{label}</small>
                <b>{metrics[index]}</b>
              </div>
            ))}
          </div>
          <button
            className="primary start-button"
            onClick={() => togglePlayer(player.name)}
          >
            {state.selected.has(player.name)
              ? text.removeFromSquad
              : text.addToSquad}
          </button>
          <button className="close start-button" onClick={close}>
            {text.returnToList}
          </button>
        </GameDialog>
      );
    }
    if (activeModal.kind === "comparison" && state.compare.length === 2) {
      const left = players.find((player) => player.name === state.compare[0]),
        right = players.find((player) => player.name === state.compare[1]);
      if (!left || !right) return null;
      const rows: [string, number, number][] = [
        [
          text.selectionScore,
          modelScore(left, state),
          modelScore(right, state),
        ],
        [text.playerMetrics.quality, left.ov, right.ov],
        [text.playerMetrics.form, left.form, right.form],
        [text.playerMetrics.fitness, left.fit, right.fit],
        [text.profileMetrics[5], experienceScore(left), experienceScore(right)],
        [text.profileMetrics[6], left.chem, right.chem],
        [text.profileMetrics[7], groupScore(left), groupScore(right)],
        [text.playerMetrics.tactics, left.tact, right.tact],
      ];
      return (
        <GameDialog title={text.comparisonTitle} onClose={close}>
          <div className="eyebrow">{text.comparisonEyebrow}</div>
          <div className="compare-grid">
            {[left, right].map((player) => (
              <div className="compare-card" key={player.name}>
                <span className="pos">{positionShort(player)}</span>
                <h3>{player.name}</h3>
                <small>{player.club}</small>
                <button
                  className="select-btn compare-select"
                  onClick={() => togglePlayer(player.name)}
                >
                  {state.selected.has(player.name)
                    ? text.removeShort
                    : text.select}
                </button>
              </div>
            ))}
            {rows.map(([label, first, second]) => (
              <div className="comparison-row" key={label}>
                <b className={first > second ? "better" : ""}>{first}</b>
                <span>{label}</span>
                <b className={second > first ? "better" : ""}>{second}</b>
              </div>
            ))}
          </div>
          <button
            className="primary start-button"
            onClick={() => {
              dispatch({ type: "clearCompare" });
              close();
            }}
          >
            {text.clearComparison}
          </button>
          <button className="close start-button" onClick={close}>
            {text.returnWithoutClearing}
          </button>
        </GameDialog>
      );
    }
    return null;
  }

  const stageText = text.stages[state.stage];
  const currentSystem = text.systems[state.system];
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">26</span> {text.brand}
          </div>
          <div className="phase">
            {state.report
              ? text.resultPhase
              : state.started
                ? stageText.phase
                : text.introPhase}
          </div>
        </div>
      </header>
      <main className="main">
        {state.report ? (
          <ReportScreen
            report={state.report}
            onUndo={undo}
            onRestart={() => {
              dispatch({ type: "reset", seed: randomSeed() });
              setModal(null);
              setExpanded(false);
            }}
          />
        ) : !state.started ? (
          <section className="start">
            <div className="eyebrow">{text.introEyebrow}</div>
            <h1 className="hero-title">{text.introTitle}</h1>
            <p className="lead">{text.introLead}</p>
            <div className="brief">
              <h2>{text.briefTitle}</h2>
              <div className="brief-grid">
                <div className="brief-stat">
                  <b>{players.length}</b>
                  <span>{text.candidateCount}</span>
                </div>
                <div className="brief-stat">
                  <b>{Object.keys(text.stages).length}</b>
                  <span>{text.campCount}</span>
                </div>
                <div className="brief-stat">
                  <b>
                    {GAME_RULES.camp.squadSizePlayers} →{" "}
                    {GAME_RULES.final.squadSizePlayers}
                  </b>
                  <span>{text.rosterTransition}</span>
                </div>
                <div className="brief-stat">
                  <b>{GAME_RULES.groupMatchesCount}</b>
                  <span>{text.groupMatches}</span>
                </div>
              </div>
            </div>
            <div className="choice-title">{text.systemChoice}</div>
            <div className="choice-grid">
              {systems.map((system) => (
                <button
                  className={`choice ${state.system === system.id ? "selected" : ""}`}
                  aria-pressed={state.system === system.id}
                  key={system.id}
                  onClick={() =>
                    dispatch({ type: "setSystem", value: system.id })
                  }
                >
                  <span className="radio" aria-hidden="true" />
                  <span>
                    <b>{text.systems[system.id].name}</b>
                    <small>{text.systems[system.id].description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="choice-title">{text.priorityChoice}</div>
            <div className="choice-grid">
              {priorities.map((priority) => (
                <button
                  className={`choice ${state.priority === priority ? "selected" : ""}`}
                  aria-pressed={state.priority === priority}
                  key={priority}
                  onClick={() =>
                    dispatch({ type: "setPriority", value: priority })
                  }
                >
                  <span className="radio" aria-hidden="true" />
                  <span>
                    <b>{text.priorities[priority].name}</b>
                    <small>{text.priorities[priority].description}</small>
                  </span>
                </button>
              ))}
            </div>
            <button
              className="primary start-button"
              onClick={() => dispatch({ type: "start" })}
            >
              {text.start}
            </button>
            {state.history.length > 0 && (
              <button className="action-button" onClick={undo}>
                {text.undo}
              </button>
            )}
            <p className="fineprint">{text.disclaimer}</p>
          </section>
        ) : (
          <section>
            <div className="game-head">
              <div>
                <div className="eyebrow">
                  {stageText.eyebrow} • {currentSystem.name} •{" "}
                  {stageText.suffix}
                </div>
                <h1>{stageText.heading}</h1>
                <p>{stageText.hint}</p>
              </div>
              <div className="kpis">
                <div className="kpi">
                  <span>{text.kpis.quality}</span>
                  <b>
                    {selected.length
                      ? Math.round(
                          selected.reduce((sum, player) => sum + player.ov, 0) /
                            selected.length +
                            state.effects.quality,
                        )
                      : text.emptyValue}
                  </b>
                </div>
                <div className="kpi">
                  <span>{text.kpis.fit}</span>
                  <b>
                    {selected.length
                      ? `${Math.round(selected.reduce((sum, player) => sum + player.tact, 0) / selected.length)}%`
                      : text.emptyValue}
                  </b>
                </div>
                <div className="kpi">
                  <span>{text.kpis.risk}</span>
                  <b>{text.risk[risk]}</b>
                </div>
              </div>
            </div>
            <div className="game-actions">
              <button
                className="action-button"
                onClick={autoFill}
                disabled={state.selected.size >= squadLimit(state)}
              >
                {text.autoFill}
              </button>
              <button
                className="action-button"
                onClick={undo}
                disabled={!state.history.length}
              >
                {text.undo}
              </button>
            </div>
            <div className="toolbar">
              <input
                className="search"
                type="search"
                value={state.query}
                onChange={(event) =>
                  dispatch({ type: "setQuery", value: event.target.value })
                }
                placeholder={text.searchPlaceholder}
                aria-label={text.searchLabel}
              />
              <div className="filters" aria-label={text.filterLabel}>
                {filterPositions.map((position) => (
                  <button
                    className={`chip ${state.filter === position ? "active" : ""}`}
                    aria-pressed={state.filter === position}
                    key={position}
                    title={
                      position === "ALL"
                        ? text.filtersAll
                        : text.positions[position]
                    }
                    onClick={() =>
                      dispatch({ type: "setFilter", value: position })
                    }
                  >
                    {position === "ALL" ? text.filtersAll : position} (
                    {position === "ALL" ? selected.length : detailed[position]})
                  </button>
                ))}
              </div>
            </div>
            <div className="section-label">
              <h2>
                {state.filter === "ALL"
                  ? text.allCandidates
                  : text.positions[state.filter]}
              </h2>
              <select
                className="sort"
                aria-label={text.sortLabel}
                value={state.sort}
                onChange={(event) =>
                  dispatch({
                    type: "setSort",
                    value: event.target.value as SortId,
                  })
                }
              >
                {(Object.keys(text.sort) as SortId[]).map((sort) => (
                  <option key={sort} value={sort}>
                    {text.sort[sort]}
                  </option>
                ))}
              </select>
            </div>
            <div className="players">
              {visiblePlayers(state).map((player) => (
                <PlayerCard
                  key={player.name}
                  player={player}
                  state={state}
                  onToggle={togglePlayer}
                  onProfile={(name) => setModal({ kind: "profile", name })}
                  onCompare={comparePlayer}
                />
              ))}
              {visiblePlayers(state).length === 0 && (
                <div className="report">{text.noCandidates}</div>
              )}
            </div>
          </section>
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
