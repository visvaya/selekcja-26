import { useRef } from "react";
import type { GameState } from "../data/types.ts";
import {
  formationOutsiders,
  squadLimit,
  squadProblems,
} from "../logic/selection.ts";
import { boardHeadline } from "./board-summary.ts";
import { CountRing } from "./count-ring.tsx";
import { FinalizeButton } from "./finalize-button.tsx";
import { Pitch } from "./pitch.tsx";
import { PitchOutsiders } from "./pitch-outsiders.tsx";
import { SlotSquares } from "./slot-squares.tsx";
import { UI_TEXT as text } from "./text.ts";
import { useDockHeight } from "./use-dock-height.ts";

function Chevron() {
  return (
    <svg
      className="dock-copy-chevron"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The phone squad bar: ring, toggle and stage button, with the board breakdown above it.
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
  const barRef = useRef<HTMLDivElement>(null);
  useDockHeight(barRef, true);
  const outsiders = formationOutsiders(state);
  const issueText = squadProblems(state)
    .map((issue) =>
      issue.kind === "missing"
        ? text.missing(issue.count, text.groupShort[issue.group])
        : text.excess(issue.count, text.groupShort[issue.group]),
    )
    .join(" • ");
  return (
    <aside className="dock" aria-label={text.yourSquad}>
      <div className="dock-breakdown" id="dockBreakdown" hidden={!expanded}>
        <SlotSquares state={state} />
        <div className="pitch-panel">
          <Pitch state={state} />
          <PitchOutsiders players={outsiders} onOpen={onOutsiders} />
        </div>
      </div>
      <div className="dock-inner" ref={barRef}>
        <CountRing count={state.selected.size} limit={squadLimit(state)} />
        <button
          type="button"
          className="dock-copy"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls="dockBreakdown"
        >
          <b>
            {boardHeadline(state)}
            <Chevron />
          </b>
          <small>
            {issueText ||
              (outsiders.length
                ? text.outOfFormationCount(outsiders.length)
                : text.dockCoverage)}
          </small>
        </button>
        <FinalizeButton state={state} onFinalize={onFinalize} />
      </div>
    </aside>
  );
}
