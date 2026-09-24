import { players } from "../data/catalog.ts";
import type { GameState } from "../data/types.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

export function CampReportDialog({
  state,
  onClose,
  restoreFocusFallback,
}: {
  state: GameState;
  onClose: () => void;
  restoreFocusFallback: () => void;
}) {
  const ranked = players
    .filter((player) => state.campSquad.has(player.id))
    .sort(
      (left, right) =>
        (state.trial[right.id]?.delta ?? 0) -
        (state.trial[left.id]?.delta ?? 0),
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
    <GameDialog
      title={text.campReportTitle}
      eyebrow={text.campReportEyebrow}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
    >
      <p>{text.campReportBody(best, doubts)}</p>
      <button className="primary start-button" onClick={onClose}>
        {text.continueToFinal}
      </button>
    </GameDialog>
  );
}
