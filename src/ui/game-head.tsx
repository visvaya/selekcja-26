import type { RefObject } from "react";
import type { GameState } from "../data/types.ts";
import { riskLevel, selectedPlayers } from "../logic/selection.ts";
import { UI_TEXT as text } from "./text.ts";

export const GAME_HEADING_ID = "game-heading";

// The three squad indicators. The head shows them inline on narrow screens; from 1024 px
// the side column shows them instead.
export function Kpis({
  state,
  className,
}: {
  state: GameState;
  className: string;
}) {
  const selected = selectedPlayers(state);
  const risk = riskLevel(state);
  return (
    <div className={`kpis ${className}`}>
      <div className="kpi">
        <span>{text.kpis.quality}</span>
        <b>
          {selected.length
            ? Math.round(
                selected.reduce((sum, player) => sum + player.ov, 0) /
                  selected.length +
                  state.effects.quality,
              )
            : text.emptyValue}
        </b>
      </div>
      <div className="kpi">
        <span>{text.kpis.fit}</span>
        <b>
          {selected.length
            ? `${Math.round(selected.reduce((sum, player) => sum + player.tact, 0) / selected.length)}%`
            : text.emptyValue}
        </b>
      </div>
      <div className="kpi">
        <span>{text.kpis.risk}</span>
        <b>{text.risk[risk]}</b>
      </div>
    </div>
  );
}

export function GameHead({
  state,
  headingRef,
  showKpis,
}: {
  state: GameState;
  headingRef: RefObject<HTMLHeadingElement | null>;
  showKpis: boolean;
}) {
  const stageText = text.stages[state.stage];
  return (
    <div className="game-head">
      <h1 id={GAME_HEADING_ID} ref={headingRef} tabIndex={-1}>
        {stageText.heading}
      </h1>
      <dl className="game-facts">
        <div>
          <dt>{text.facts.term}</dt>
          <dd>{stageText.term}</dd>
        </div>
        <div>
          <dt>{text.facts.formation}</dt>
          <dd>{text.systems[state.system].name}</dd>
        </div>
      </dl>
      <p>{stageText.hint}</p>
      {showKpis && <Kpis state={state} className="kpis-inline" />}
    </div>
  );
}
