import { useId } from "react";
import type { GameState, Player, PlayerId } from "../data/types.ts";
import { preferredFoot } from "../logic/selection.ts";
import {
  experienceScore,
  groupScore,
  modelScore,
  trialImpact,
} from "../logic/scoring.ts";
import { GameDialog } from "./game-dialog.tsx";
import { Meter } from "./meter.tsx";
import { stripTraits, tagClass } from "./player-tags.tsx";
import { PositionBadge } from "./position-badge.tsx";
import { scoreBand } from "./score-band.ts";
import { UI_TEXT as text } from "./text.ts";

// The seven attributes in the order of text.profileMetrics.
function attributeValues(player: Player): number[] {
  return [
    player.ov,
    player.form,
    player.fit,
    player.tact,
    experienceScore(player),
    player.chem,
    groupScore(player),
  ];
}

export function ProfileDialog({
  player,
  state,
  onClose,
  onToggle,
  restoreFocusFallback,
}: {
  player: Player;
  state: GameState;
  onClose: () => void;
  onToggle: (id: PlayerId) => void;
  restoreFocusFallback: () => void;
}) {
  const popoverId = useId();
  const score = modelScore(player, state);
  const impact = trialImpact(player, state);
  const values = attributeValues(player);
  return (
    <GameDialog
      form="drawer"
      className="profile-dialog"
      title={player.name}
      eyebrow={text.profile}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      footer={
        <>
          <button
            className="primary start-button"
            onClick={() => onToggle(player.id)}
          >
            {state.selected.has(player.id)
              ? text.removeFromSquad
              : text.addToSquad}
          </button>
          <button className="action-button start-button" onClick={onClose}>
            {text.returnToList}
          </button>
        </>
      }
      titleRow={
        <>
          <p className="profile-head">
            {player.club} • {text.age(player.age)}
          </p>
          <div className="profile-score">
            <b className={`score-${scoreBand(score)}`}>{score}</b>
            <span className="score-label">{text.selectionScore}</span>
          </div>
        </>
      }
    >
      <dl className="profile-facts">
        <div className="profile-fact">
          <dt>{text.profilePositions}</dt>
          <dd>
            <PositionBadge player={player} popoverId={popoverId} />
          </dd>
        </div>
        <div className="profile-fact">
          <dt>{text.footLegend}</dt>
          <dd>{text.leadFoot[preferredFoot(player)]}</dd>
        </div>
        <div className="profile-fact">
          <dt>{text.traitsLegend}</dt>
          <dd className="profile-fact-chips">
            {stripTraits(player, state).map((trait) => (
              <span className={tagClass(trait, impact)} key={trait.key}>
                {trait.label}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <p className="profile-section-label">{text.profileAttributes}</p>
      <div className="profile-metrics">
        {text.profileMetrics.map((label, index) => (
          <div className="profile-metric" key={label}>
            <small>{label}</small>
            <b>{values[index]}</b>
            <Meter label={label} value={values[index]!} />
          </div>
        ))}
      </div>
    </GameDialog>
  );
}
