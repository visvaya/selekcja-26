import type { GameState, Player, PlayerId } from "../data/types.ts";
import { detailedPositions, preferredFoot } from "../logic/selection.ts";
import {
  experienceScore,
  groupScore,
  modelScore,
  trialImpact,
} from "../logic/scoring.ts";
import { GameDialog } from "./game-dialog.tsx";
import { FlagTag, RoleTags, TrialTag } from "./player-tags.tsx";
import { UI_TEXT as text } from "./text.ts";

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
  const foot = preferredFoot(player),
    trial = state.trial[player.id],
    impact = trialImpact(player, state);
  const metrics = [
    modelScore(player, state),
    player.ov,
    player.form,
    player.fit,
    player.tact,
    experienceScore(player),
    player.chem,
    groupScore(player),
  ];
  return (
    <GameDialog
      title={player.name}
      eyebrow={text.profile}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
    >
      <div className="profile-head">
        <p>
          {player.club} • {text.age(player.age)}
        </p>
        <div className="profile-score">{modelScore(player, state)}</div>
      </div>
      <div className="profile-positions">
        {detailedPositions(player).map((position) => (
          <span className="tag" key={position}>
            <b>{position}</b> {text.positions[position]}
          </span>
        ))}
        <span className="tag">
          <b>{foot === "both" ? text.foot.both : text.foot.lead}</b>{" "}
          {foot !== "both" && text.foot[foot].toLocaleLowerCase("pl")}
        </span>
      </div>
      <div className="tags">
        <RoleTags roles={player.roles} />
        <FlagTag flag={player.flag} />
        {trial && (
          <TrialTag note={trial.note} impact={impact} format="profile" />
        )}
      </div>
      <div className="profile-metrics">
        {text.profileMetrics.map((label, index) => (
          <div className="profile-metric" key={label}>
            <small>{label}</small>
            <b>{metrics[index]}</b>
          </div>
        ))}
      </div>
      <button
        className="primary start-button"
        onClick={() => onToggle(player.id)}
      >
        {state.selected.has(player.id) ? text.removeFromSquad : text.addToSquad}
      </button>
      <button className="close start-button" onClick={onClose}>
        {text.returnToList}
      </button>
    </GameDialog>
  );
}
