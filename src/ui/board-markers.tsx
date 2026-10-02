import type { GameState } from "../data/types.ts";
import { boardMarkers } from "../logic/squad-board.ts";
import type { GroupTally } from "../logic/squad-board.ts";
import { groupPlayersText } from "./board-summary.ts";
import { UI_TEXT as text } from "./text.ts";

function MarkerRow({
  kind,
  label,
  byGroup,
}: {
  kind: "outside" | "excess";
  label: string;
  byGroup: GroupTally;
}) {
  return (
    <div
      className={`dock-outside-marker${kind === "excess" ? " dock-excess-marker" : ""}`}
    >
      <span className="dock-slot-group-label">
        <span className={`dock-${kind}-icon`} />
        {label}
      </span>
      <span className="dock-outside-detail">{groupPlayersText(byGroup)}</span>
    </div>
  );
}

// The rows under the slot groups: players outside the formation and players over the
// limit. Rendered inside the aria-hidden slot block; the stage button's reason and the
// outsiders button name carry the same facts to assistive technology.
export function BoardMarkers({ state }: { state: GameState }) {
  const { outside, excess } = boardMarkers(state);
  return (
    <>
      {outside.total > 0 && (
        <MarkerRow
          kind="outside"
          label={text.outsideMarker(outside.total)}
          byGroup={outside.byGroup}
        />
      )}
      {excess.total > 0 && (
        <MarkerRow
          kind="excess"
          label={text.excessMarker(excess.total)}
          byGroup={excess.byGroup}
        />
      )}
    </>
  );
}
