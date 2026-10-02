import type { GameState, GroupPosition } from "../data/types.ts";
import { slotGroups } from "../logic/squad-board.ts";
import type { SlotSquare } from "../logic/squad-board.ts";
import { BoardMarkers } from "./board-markers.tsx";
import { slotGroupLabelText } from "./board-summary.ts";
import { POSITION_GROUP_CLASS } from "./position-badge.tsx";

// "pos-gk" -> "gk": the slot groups share the position badge's hue names.
const hueOf = (group: GroupPosition): string =>
  POSITION_GROUP_CLASS[group].replace(/^pos-/, "");

function squareClass(square: SlotSquare, inPool: boolean): string {
  const fill = inPool && square.group ? ` fill-${hueOf(square.group)}` : "";
  switch (square.kind) {
    case "outside":
      return `filled outside${fill}`;
    case "filled":
      return `filled${fill}`;
    default:
      return square.kind;
  }
}

// One group of squares per position group plus the free pool, then the markers. The
// headline and the stage button's reason say the same in words, so the block is hidden
// from assistive technology.
export function SlotSquares({ state }: { state: GameState }) {
  return (
    <div className="dock-slots" aria-hidden="true">
      {slotGroups(state).map((group) => {
        const inPool = group.id === "free";
        return (
          <div
            key={group.id}
            className={`dock-slot-group dock-slot-group-${inPool ? "free" : hueOf(group.id as GroupPosition)}`}
          >
            <span className="dock-slot-group-label">
              {slotGroupLabelText(group)}
            </span>
            <span className="dock-slot-group-squares">
              {group.squares.map((square, index) => (
                <span key={index} className={squareClass(square, inPool)} />
              ))}
            </span>
          </div>
        );
      })}
      <BoardMarkers state={state} />
    </div>
  );
}
