import type { GameState } from "../data/types.ts";
import { formationOutsiders, squadLimit } from "../logic/selection.ts";
import { boardHeadline } from "./board-summary.ts";
import { CountRing } from "./count-ring.tsx";
import { FinalizeButton } from "./finalize-button.tsx";
import { Pitch } from "./pitch.tsx";
import { PitchOutsiders } from "./pitch-outsiders.tsx";
import { SlotSquares } from "./slot-squares.tsx";
import { UI_TEXT as text } from "./text.ts";

// The desktop squad board (from 1024 px): a named, focusable region that never collapses,
// so the headline is plain text and the breakdown is always shown.
export function SideBoard({
  state,
  onOutsiders,
  onFinalize,
}: {
  state: GameState;
  onOutsiders: () => void;
  onFinalize: () => void;
}) {
  return (
    <div
      className="dock"
      role="region"
      // The board scrolls inside itself, so keyboard users must be able to focus it.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-label={text.boardRegion[state.stage]}
    >
      <div className="dock-inner">
        <CountRing count={state.selected.size} limit={squadLimit(state)} />
        <SlotSquares state={state} />
        <div className="dock-copy">
          <b>{boardHeadline(state)}</b>
        </div>
        <FinalizeButton state={state} onFinalize={onFinalize} />
      </div>
      <div className="dock-breakdown">
        <div className="pitch-panel">
          <Pitch state={state} />
          <PitchOutsiders
            players={formationOutsiders(state)}
            onOpen={onOutsiders}
          />
        </div>
      </div>
    </div>
  );
}
