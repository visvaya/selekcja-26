import type { RefObject } from "react";
import type {
  DetailedPosition,
  GameState,
  PlayerId,
  SortId,
} from "../data/types.ts";
import { visiblePlayers } from "../logic/list-filters.ts";
import {
  detailedCounts,
  riskLevel,
  selectedPlayers,
  squadLimit,
} from "../logic/selection.ts";
import { PlayerCard } from "./player-card.tsx";
import { UI_TEXT as text } from "./text.ts";

const filterPositions: ("ALL" | DetailedPosition)[] = [
  "ALL",
  "BR",
  "LO",
  "LŚO",
  "ŚO",
  "PŚO",
  "PO",
  "LWO",
  "DP",
  "ŚP",
  "OP",
  "PWO",
  "LS",
  "N",
  "PS",
];

export function SelectionScreen({
  state,
  headingRef,
  onAutoFill,
  onUndo,
  onQuery,
  onFilter,
  onSort,
  onToggle,
  onProfile,
  onCompare,
}: {
  state: GameState;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAutoFill: () => void;
  onUndo: () => void;
  onQuery: (value: string) => void;
  onFilter: (value: "ALL" | DetailedPosition) => void;
  onSort: (value: SortId) => void;
  onToggle: (id: PlayerId) => void;
  onProfile: (id: PlayerId) => void;
  onCompare: (id: PlayerId) => void;
}) {
  const stageText = text.stages[state.stage];
  const currentSystem = text.systems[state.system];
  const selected = selectedPlayers(state);
  const detailed = detailedCounts(state);
  const risk = riskLevel(state);
  // The chip row shows a single position at most; several positions press no chip.
  const positions = state.list.positions;
  const activeFilter: "ALL" | DetailedPosition | null =
    positions.length === 0
      ? "ALL"
      : positions.length === 1
        ? positions[0]!
        : null;
  return (
    <section>
      <div className="game-head">
        <div>
          <div className="eyebrow">
            {stageText.eyebrow} • {currentSystem.name} • {stageText.suffix}
          </div>
          <h1 ref={headingRef} tabIndex={-1}>
            {stageText.heading}
          </h1>
          <p>{stageText.hint}</p>
        </div>
        <div className="kpis">
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
      </div>
      <div className="game-actions">
        <button
          className="action-button"
          onClick={onAutoFill}
          disabled={state.selected.size >= squadLimit(state)}
        >
          {text.autoFill}
        </button>
        <button
          className="action-button"
          onClick={onUndo}
          disabled={!state.history.length}
        >
          {text.undo}
        </button>
      </div>
      <div className="toolbar">
        <input
          className="search"
          type="search"
          value={state.list.query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={text.searchPlaceholder}
          aria-label={text.searchLabel}
        />
        <div className="filters" aria-label={text.filterLabel}>
          {filterPositions.map((position) => (
            <button
              className={`chip ${activeFilter === position ? "active" : ""}`}
              aria-pressed={activeFilter === position}
              key={position}
              title={
                position === "ALL" ? text.filtersAll : text.positions[position]
              }
              onClick={() => onFilter(position)}
            >
              {position === "ALL" ? text.filtersAll : position} (
              {position === "ALL" ? selected.length : detailed[position]})
            </button>
          ))}
        </div>
      </div>
      <div className="section-label">
        <h2>
          {activeFilter === "ALL" || activeFilter === null
            ? text.allCandidates
            : text.positions[activeFilter]}
        </h2>
        <select
          className="sort"
          aria-label={text.sortLabel}
          value={state.list.sort}
          onChange={(event) => onSort(event.target.value as SortId)}
        >
          {(Object.keys(text.sort) as SortId[]).map((sort) => (
            <option key={sort} value={sort}>
              {text.sort[sort]}
            </option>
          ))}
        </select>
      </div>
      <div className="players">
        {visiblePlayers(state).map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            state={state}
            onToggle={onToggle}
            onProfile={onProfile}
            onCompare={onCompare}
          />
        ))}
        {visiblePlayers(state).length === 0 && (
          <div className="report">{text.noCandidates}</div>
        )}
      </div>
    </section>
  );
}
