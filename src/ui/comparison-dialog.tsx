import { useId, useRef, type CSSProperties, type RefObject } from "react";
import { flushSync } from "react-dom";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player, PlayerId } from "../data/types.ts";
import {
  canSelectBoth,
  preferredFoot,
  squadLimit,
} from "../logic/selection.ts";
import {
  comparisonRows,
  splitTraits,
  type ComparisonMetricId,
  type H2hRow,
  type H2hSide,
} from "./comparison-model.ts";
import { GameDialog } from "./game-dialog.tsx";
import { stripTraits } from "./player-tags.tsx";
import { PositionBadge } from "./position-badge.tsx";
import { scoreBand } from "./score-band.ts";
import { UI_TEXT as text } from "./text.ts";
import type { Trait } from "./trait-order.ts";

const [quality, form, fitness, tactics, experience, chemistry, groupImpact] =
  text.profileMetrics;
const ROW_LABELS: Readonly<Record<ComparisonMetricId, string>> = {
  selectionScore: text.selectionScore,
  quality,
  form,
  fitness,
  tactics,
  experience,
  chemistry,
  groupImpact,
};

const percent = (value: number) =>
  Math.min(100, (value / GAME_RULES.ratingMaximumPoints) * 100);

function Value({ side, score }: { side: H2hSide; score: boolean }) {
  const classes = ["h2h-value"];
  if (side.better) classes.push("better");
  if (score) classes.push(`score-${scoreBand(side.value)}`);
  return (
    <b className={classes.join(" ")}>
      {side.diff !== null && <small className="h2h-diff">+{side.diff}</small>}
      <span>{side.value}</span>
    </b>
  );
}

function MetricRow({ row }: { row: H2hRow }) {
  const score = row.id === "selectionScore";
  const classes = ["h2h-row"];
  if (score) classes.push("h2h-row-score");
  if (row.tie) classes.push("is-tie");
  const bars = {
    "--progress-left": percent(row.left.value),
    "--progress-right": percent(row.right.value),
  } as CSSProperties;
  return (
    <div className={classes.join(" ")}>
      <span className="h2h-label">{ROW_LABELS[row.id]}</span>
      <div className="h2h-values">
        <Value side={row.left} score={score} />
        <div className="h2h-bar" style={bars}>
          <span className="h2h-bar-left">
            <i className={row.left.better || row.tie ? "better" : undefined} />
          </span>
          <span className="h2h-bar-right">
            <i className={row.right.better || row.tie ? "better" : undefined} />
          </span>
        </div>
        <Value side={row.right} score={score} />
      </div>
    </div>
  );
}

function TraitList({
  shared,
  own,
  right,
}: {
  shared: Trait[];
  own: Trait[];
  right?: boolean;
}) {
  return (
    <div className={right ? "h2h-edge-list h2h-edge-right" : "h2h-edge-list"}>
      {shared.map((trait) => (
        <span className="tag tag-shared" key={trait.key}>
          {trait.label}
        </span>
      ))}
      {own.map((trait) => (
        <span className="tag tag-own" key={trait.key}>
          {trait.label}
        </span>
      ))}
    </div>
  );
}

function CompareCard({
  player,
  chosen,
  onToggle,
  onOpenProfile,
  selectRef,
}: {
  player: Player;
  chosen: boolean;
  onToggle: (id: PlayerId) => void;
  onOpenProfile: (id: PlayerId) => void;
  selectRef?: RefObject<HTMLButtonElement | null>;
}) {
  const popoverId = useId();
  return (
    <div className="compare-card">
      <PositionBadge player={player} popoverId={popoverId} />
      <div className="compare-card-name">
        <h3>{player.name}</h3>
        <small className="meta card-meta">
          <span className="meta-club">{player.club}</span>
          <span className="meta-age">{` • ${text.age(player.age)}`}</span>
        </small>
      </div>
      <button
        type="button"
        className="select-btn compare-select"
        aria-pressed={chosen}
        aria-label={text.playerAction(text.select, player.name)}
        ref={selectRef}
        onClick={() => onToggle(player.id)}
      >
        {chosen ? text.selectedName : text.select}
      </button>
      <button
        type="button"
        className="profile-btn compare-profile"
        aria-label={text.playerAction(text.profile, player.name)}
        onClick={() => onOpenProfile(player.id)}
      >
        {text.profile}
      </button>
    </div>
  );
}

export function ComparisonDialog({
  left,
  right,
  state,
  onClose,
  onToggle,
  onSelectBoth,
  onOpenProfile,
  onClearComparison,
  restoreFocusFallback,
}: {
  left: Player;
  right: Player;
  state: GameState;
  onClose: () => void;
  onToggle: (id: PlayerId) => void;
  onSelectBoth: () => void;
  onOpenProfile: (id: PlayerId) => void;
  onClearComparison: () => void;
  restoreFocusFallback: () => void;
}) {
  const reasonId = useId();
  const firstSelectRef = useRef<HTMLButtonElement>(null);
  const both = canSelectBoth(state, [left.id, right.id], squadLimit(state));
  const traits = splitTraits(
    stripTraits(left, state),
    stripTraits(right, state),
  );
  const sharedNames = traits.shared.map((trait) => trait.label).join(", ");
  function selectBoth() {
    if (both !== "ready") return;
    // the button unmounts with the call-up, so focus moves to the first card's select button
    flushSync(onSelectBoth);
    firstSelectRef.current?.focus();
  }
  return (
    <GameDialog
      form="drawer"
      className="compare-dialog"
      title={text.comparisonEyebrow}
      titleAsEyebrow
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      footer={
        <>
          {both !== "absent" && (
            <button
              type="button"
              className="primary start-button"
              aria-label={text.selectBothName(left.name, right.name)}
              aria-disabled={both === "blocked" ? true : undefined}
              aria-describedby={both === "blocked" ? reasonId : undefined}
              onClick={selectBoth}
            >
              {text.selectBoth}
            </button>
          )}
          {both === "blocked" && (
            <p className="compare-reason" id={reasonId}>
              {text.selectBothBlocked}
            </p>
          )}
          <button
            type="button"
            className="action-button start-button"
            onClick={() => {
              onClearComparison();
              onClose();
            }}
          >
            {text.clearComparison}
          </button>
          <button
            type="button"
            className="action-button start-button"
            onClick={onClose}
          >
            {text.returnWithoutClearing}
          </button>
        </>
      }
    >
      <div className="compare-grid">
        <CompareCard
          player={left}
          chosen={state.selected.has(left.id)}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
          selectRef={firstSelectRef}
        />
        <CompareCard
          player={right}
          chosen={state.selected.has(right.id)}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
        />
        <div className="h2h">
          {comparisonRows(left, right, state).map((row) => (
            <MetricRow row={row} key={row.id} />
          ))}
          <div className="h2h-row h2h-text">
            <span className="h2h-label">{text.footLegend}</span>
            <div className="h2h-edges">
              <span className="h2h-fact">
                {text.leadFoot[preferredFoot(left)]}
              </span>
              <span className="h2h-fact">
                {text.leadFoot[preferredFoot(right)]}
              </span>
            </div>
          </div>
          <div className="h2h-row h2h-text">
            <span className="h2h-label">{text.traitsLegend}</span>
            <div className="h2h-edges">
              <TraitList shared={traits.shared} own={traits.leftOwn} />
              <TraitList shared={traits.shared} own={traits.rightOwn} right />
            </div>
            {sharedNames && (
              <p className="visually-hidden">
                {text.sharedTraits(sharedNames)}
              </p>
            )}
          </div>
        </div>
      </div>
    </GameDialog>
  );
}
