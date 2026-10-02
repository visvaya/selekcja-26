import { useId, useRef, type CSSProperties } from "react";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player, PlayerId } from "../data/types.ts";
import { modelScore, trialImpact } from "../logic/scoring.ts";
import { PositionBadge } from "./position-badge.tsx";
import { stripTraits } from "./player-tags.tsx";
import { scoreBand } from "./score-band.ts";
import { splitName } from "./fit-name.ts";
import { useFittedClub } from "./use-fitted-club.ts";
import { useFittedName } from "./use-fitted-name.ts";
import { useFittedTraits } from "./use-fitted-traits.ts";
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
  const namePopoverId = useId();
  const clubPopoverId = useId();
  const chosen = state.selected.has(player.id);
  const compared = state.compare.includes(player.id);
  const impact = trialImpact(player, state);
  const score = modelScore(player, state);
  const { first, last } = splitName(player.name);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const tagsRef = useRef<HTMLDivElement | null>(null);
  const name = useFittedName(headingRef, first, last);
  const clubClipped = useFittedClub(metaRef, player.club);
  const traits = stripTraits(player, state);
  const fitted = useFittedTraits(
    tagsRef,
    traits.map((trait) => trait.key).join("|"),
  );
  const firstHidden = traits.length - fitted.hidden;
  const hiddenFlags = traits
    .slice(firstHidden)
    .filter((trait) => trait.kind === "flag").length;
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
          <h3 ref={headingRef}>
            {name.shortened ? (
              <button
                type="button"
                className="name-trunc"
                popoverTarget={namePopoverId}
                aria-label={text.shortName(name.shown, name.full)}
                data-first={first}
                data-last={last}
              >
                {name.shown}
              </button>
            ) : (
              <span className="name-trunc" data-first={first} data-last={last}>
                {name.shown}
              </span>
            )}
          </h3>
          {name.shortened && (
            <div className="name-popover" id={namePopoverId} popover="auto">
              {name.full}
            </div>
          )}
          <div className="meta" ref={metaRef}>
            {clubClipped ? (
              <button
                type="button"
                className="meta-club"
                popoverTarget={clubPopoverId}
              >
                {player.club}
              </button>
            ) : (
              <span className="meta-club">{player.club}</span>
            )}
            <span className="meta-age">{` • ${text.age(player.age)}`}</span>
          </div>
          {clubClipped && (
            <div className="name-popover" id={clubPopoverId} popover="auto">
              {player.club}
            </div>
          )}
        </div>
      </div>
      <div className="tags" ref={tagsRef}>
        {traits.map((trait, index) => (
          <span
            className={tagClass(trait, impact)}
            key={trait.key}
            hidden={index >= firstHidden}
          >
            {trait.label}
          </span>
        ))}
        <button
          type="button"
          className={
            hiddenFlags > 0 ? "tag tag-more tag-more-alert" : "tag tag-more"
          }
          hidden={!fitted.open && fitted.hidden === 0}
          aria-expanded={fitted.open}
          aria-label={
            fitted.open
              ? text.collapseTraitsName
              : text.moreTraits(fitted.hidden, hiddenFlags)
          }
          onClick={fitted.toggle}
        >
          {fitted.open
            ? text.collapseTraits
            : text.positionMore(Math.max(fitted.hidden, 1))}
        </button>
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
