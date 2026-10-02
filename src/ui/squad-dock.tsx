import type { CSSProperties } from "react";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState } from "../data/types.ts";
import {
  canFinalize,
  formationOutsiders,
  groupCounts,
  positionShort,
  squadLimit,
  squadProblems,
} from "../logic/selection.ts";
import { groupPositions } from "./group-order.ts";
import { Pitch } from "./pitch.tsx";
import { UI_TEXT as text } from "./text.ts";

export function SquadDock({
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
        ? text.missing(issue.count, text.groupShort[issue.group])
        : text.excess(issue.count, text.groupShort[issue.group]),
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
