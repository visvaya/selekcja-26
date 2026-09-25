import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player, PlayerId } from "../data/types.ts";
import { modelScore, trialImpact } from "../logic/scoring.ts";
import { positionShort } from "../logic/selection.ts";
import { FlagTag, RoleTags, TrialTag } from "./player-tags.tsx";
import { UI_TEXT as text } from "./text.ts";

export function PlayerCard({
  player,
  state,
  onToggle,
  onProfile,
  onCompare,
}: {
  player: Player;
  state: GameState;
  onToggle: (id: PlayerId) => void;
  onProfile: (id: PlayerId) => void;
  onCompare: (id: PlayerId) => void;
}) {
  const chosen = state.selected.has(player.id);
  const compared = state.compare.includes(player.id);
  const trial = state.trial[player.id];
  const impact = trialImpact(player, state);
  const metrics = [
    [text.playerMetrics.quality, player.ov],
    [text.playerMetrics.form, player.form],
    [text.playerMetrics.fitness, player.fit],
    [text.playerMetrics.tactics, player.tact],
  ] as const;
  return (
    <article
      className={`player ${chosen ? "selected" : ""} ${compared ? "compare-on" : ""}`}
    >
      <div className="player-top">
        <span className="pos">{positionShort(player)}</span>
        <div>
          <h3>{player.name}</h3>
          <div className="meta">
            {player.club} • {text.age(player.age)}
          </div>
          <div className="tags">
            <RoleTags roles={player.roles} limit={3} />
            <FlagTag flag={player.flag} />
            {state.stage === "final" && trial && (
              <TrialTag note={trial.note} impact={impact} format="card" />
            )}
          </div>
        </div>
      </div>
      <div className="score" title={text.selectionScore}>
        {modelScore(player, state)}
      </div>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>
              {label}
              <b>{value}</b>
            </span>
            <progress
              value={value}
              max={GAME_RULES.ratingMaximumPoints}
              aria-label={`${label}: ${value}`}
            />
          </div>
        ))}
      </div>
      <div className="player-actions">
        <button
          className="select-btn"
          aria-pressed={chosen}
          onClick={() => onToggle(player.id)}
        >
          {chosen ? text.selected : text.select}
        </button>
        <button className="profile-btn" onClick={() => onProfile(player.id)}>
          {text.profile}
        </button>
        <button
          className="compare-btn"
          aria-pressed={compared}
          onClick={() => onCompare(player.id)}
        >
          {compared ? text.compared : text.compare}
        </button>
      </div>
    </article>
  );
}
