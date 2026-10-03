import { useId, type MouseEvent } from "react";
import type { GameState } from "../data/types.ts";
import { canFinalize, squadLimit } from "../logic/selection.ts";
import { boardReason } from "./board-summary.ts";
import { focusSelf } from "./focus-self.ts";
import { UI_TEXT as text } from "./text.ts";

// Never `disabled`, so it stays focusable and explains itself: while blocked it is
// aria-disabled, described by the reason and does nothing when activated. The status node
// speaks the reason only once the squad is full but still blocked.
export function FinalizeButton({
  state,
  onFinalize,
}: {
  state: GameState;
  onFinalize: () => void;
}) {
  const reasonId = useId();
  const ready = canFinalize(state);
  const reason = boardReason(state);
  const fullButBlocked = !ready && state.selected.size >= squadLimit(state);
  return (
    <>
      <button
        type="button"
        className="finalize"
        aria-disabled={ready ? undefined : true}
        aria-describedby={ready ? undefined : reasonId}
        onClick={
          ready
            ? (event: MouseEvent<HTMLButtonElement>) => {
                focusSelf(event);
                onFinalize();
              }
            : undefined
        }
      >
        {text.stages[state.stage].finalize}
      </button>
      <span id={reasonId} className="visually-hidden">
        {reason}
      </span>
      <span role="status" className="visually-hidden">
        {fullButBlocked ? reason : ""}
      </span>
    </>
  );
}
