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
  selectedPlayers,
  squadLimit,
} from "../logic/selection.ts";
import { GAME_HEADING_ID, GameHead } from "./game-head.tsx";
import { PlayerCard } from "./player-card.tsx";
import { SideColumn } from "./side-column.tsx";
import { UI_TEXT as text } from "./text.ts";
import { useMediaQuery } from "./use-media-query.ts";

const WIDE_LAYOUT_QUERY = "(min-width: 1024px)";

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
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY);
  const selected = selectedPlayers(state);
  const detailed = detailedCounts(state);
  // The chip row shows a single position at most; several positions press no chip.
  const positions = state.list.positions;
  const activeFilter: "ALL" | DetailedPosition | null =
    positions.length === 0
      ? "ALL"
      : positions.length === 1
        ? positions[0]!
        : null;
  const actions = (
    <div className={`game-actions${wide ? " side-actions" : ""}`}>
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
  );
  return (
    <div className="screen-layout">
      <section aria-labelledby={GAME_HEADING_ID}>
        <GameHead state={state} headingRef={headingRef} showKpis={!wide} />
        {!wide && actions}
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
                  position === "ALL"
                    ? text.filtersAll
                    : text.positions[position]
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
      {wide && <SideColumn state={state}>{actions}</SideColumn>}
    </div>
  );
}
