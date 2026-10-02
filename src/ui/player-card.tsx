import { useId, type CSSProperties } from "react";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player, PlayerId } from "../data/types.ts";
import { modelScore, trialImpact } from "../logic/scoring.ts";
import { PositionBadge } from "./position-badge.tsx";
import { stripTraits } from "./player-tags.tsx";
import { scoreBand } from "./score-band.ts";
import { UI_TEXT as text } from "./text.ts";
import type { Trait } from "./trait-order.ts";

function tagClass(trait: Trait, impact: number): string {
  if (trait.kind === "flag") return "tag alert";
  if (trait.kind === "role") return "tag";
  if (impact > 0) return "tag tag-camp camp-plus";
  if (impact < 0) return "tag tag-camp camp-minus";
  return "tag tag-camp";
}

const tint = (value: number) =>
  ({ "--tint": `var(--meter-${scoreBand(value)})` }) as CSSProperties;

function splitName(name: string): { first: string; last: string } {
  const space = name.indexOf(" ");
  return space < 0
    ? { first: "", last: name }
    : { first: name.slice(0, space), last: name.slice(space + 1) };
}

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
  const popoverId = useId();
  const chosen = state.selected.has(player.id);
  const compared = state.compare.includes(player.id);
  const impact = trialImpact(player, state);
  const score = modelScore(player, state);
  const { first, last } = splitName(player.name);
  const selectLabel = chosen ? text.selectedName : text.select;
  const compareLabel = compared ? text.compared : text.compare;
  const metrics = [
    [text.playerMetrics.quality, player.ov],
    [text.playerMetrics.form, player.form],
    [text.playerMetrics.fitness, player.fit],
    [text.playerMetrics.tactics, player.tact],
  ] as const;
  const classes = [
    "player",
    chosen ? "selected" : "",
    compared ? "compare-on" : "",
  ].filter(Boolean);
  return (
    <article className={classes.join(" ")}>
      <div className="player-top">
        <PositionBadge player={player} popoverId={popoverId} />
        <div>
          <h3>
            <span className="name-trunc" data-first={first} data-last={last}>
              {player.name}
            </span>
          </h3>
          <div className="meta">
            <span className="meta-club">{player.club}</span>
            <span className="meta-age">{` • ${text.age(player.age)}`}</span>
          </div>
        </div>
      </div>
      <div className="tags">
        {stripTraits(player, state).map((trait) => (
          <span className={tagClass(trait, impact)} key={trait.key}>
            {trait.label}
          </span>
        ))}
      </div>
      <div className="score">
        <span className="score-label">{text.selectionScore}</span>
        <b className={`score-${scoreBand(score)}`}>{score}</b>
      </div>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>
              {label}
              <b>{value}</b>
            </span>
            <progress
              style={tint(value)}
              value={value}
              max={GAME_RULES.ratingMaximumPoints}
              aria-label={`${label}: ${value}`}
            />
          </div>
        ))}
      </div>
      <div className="player-actions">
        <button
          type="button"
          className="select-btn"
          aria-pressed={chosen}
          aria-label={text.playerAction(selectLabel, player.name)}
          onClick={() => onToggle(player.id)}
        >
          {chosen ? text.selected : text.select}
        </button>
        <button
          type="button"
          className="profile-btn"
          aria-label={text.playerAction(text.profile, player.name)}
          onClick={() => onProfile(player.id)}
        >
          {text.profile}
        </button>
        <button
          type="button"
          className="compare-btn"
          aria-pressed={compared}
          aria-label={text.playerAction(compareLabel, player.name)}
          onClick={() => onCompare(player.id)}
        >
          {compareLabel}
        </button>
      </div>
    </article>
  );
}
