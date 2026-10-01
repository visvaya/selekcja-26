import { players } from "../data/catalog.ts";
import type { GameState } from "../data/types.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";
import { joinNames } from "./text/plural.ts";

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
  const best = joinNames(ranked.slice(0, 3).map((player) => player.name)),
    doubts = joinNames(ranked.slice(-2).map((player) => player.name));
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
