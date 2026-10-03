import type { GameState, Player, PlayerId } from "../data/types.ts";
import { positionShort } from "../logic/selection.ts";
import { experienceScore, groupScore, modelScore } from "../logic/scoring.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

export function ComparisonDialog({
  left,
  right,
  state,
  onClose,
  onToggle,
  onClearComparison,
  restoreFocusFallback,
}: {
  left: Player;
  right: Player;
  state: GameState;
  onClose: () => void;
  onToggle: (id: PlayerId) => void;
  onClearComparison: () => void;
  restoreFocusFallback: () => void;
}) {
  const rows: [string, number, number][] = [
    [text.selectionScore, modelScore(left, state), modelScore(right, state)],
    [text.playerMetrics.quality, left.ov, right.ov],
    [text.playerMetrics.form, left.form, right.form],
    [text.playerMetrics.fitness, left.fit, right.fit],
    [text.profileMetrics[5], experienceScore(left), experienceScore(right)],
    [text.profileMetrics[6], left.chem, right.chem],
    [text.profileMetrics[7], groupScore(left), groupScore(right)],
    [text.playerMetrics.tactics, left.tact, right.tact],
  ];
  return (
    <GameDialog
      form="drawer"
      className="compare-dialog"
      title={text.comparisonTitle}
      eyebrow={text.comparisonEyebrow}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      footer={
        <>
          <button
            className="primary start-button"
            onClick={() => {
              onClearComparison();
              onClose();
            }}
          >
            {text.clearComparison}
          </button>
          <button className="action-button start-button" onClick={onClose}>
            {text.returnWithoutClearing}
          </button>
        </>
      }
    >
      <div className="compare-grid">
        {[left, right].map((player) => (
          <div className="compare-card" key={player.id}>
            <span className="pos">{positionShort(player)}</span>
            <h3>{player.name}</h3>
            <small>{player.club}</small>
            <button
              className="select-btn compare-select"
              onClick={() => onToggle(player.id)}
            >
              {state.selected.has(player.id) ? text.removeShort : text.select}
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
    </GameDialog>
  );
}
