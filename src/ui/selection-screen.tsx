import { useState, type RefObject } from "react";
import type {
  DetailedPosition,
  GameState,
  ListFilters,
  PlayerId,
  SortId,
} from "../data/types.ts";
import { visiblePlayers } from "../logic/list-filters.ts";
import {
  detailedCounts,
  selectedPlayers,
  squadLimit,
} from "../logic/selection.ts";
import { FiltersPanel } from "./filters-panel.tsx";
import { GameActions } from "./game-actions.tsx";
import { GAME_HEADING_ID, GameHead } from "./game-head.tsx";
import { LIST_HEADING_ID } from "./list-heading-id.ts";
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
  onClearSquad,
  onNewGame,
  undoRef,
  onList,
  onToggle,
  onProfile,
  onCompare,
}: {
  state: GameState;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAutoFill: () => void;
  onUndo: () => void;
  onClearSquad: () => void;
  onNewGame: () => void;
  undoRef: RefObject<HTMLButtonElement | null>;
  onList: (patch: Partial<ListFilters>) => void;
  onToggle: (id: PlayerId) => void;
  onProfile: (id: PlayerId) => void;
  onCompare: (id: PlayerId) => void;
}) {
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY);
  // Screen state, not saved: the panel starts collapsed on every visit.
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    <GameActions
      canUndo={state.history.length > 0}
      canAutoFill={state.selected.size < squadLimit(state)}
      canClear={state.selected.size > 0}
      onUndo={onUndo}
      onAutoFill={onAutoFill}
      onClear={onClearSquad}
      onNewGame={onNewGame}
      undoRef={undoRef}
      className={wide ? "side-actions" : undefined}
    />
  );
  return (
    <div className="screen-layout">
      <section aria-labelledby={GAME_HEADING_ID}>
        <GameHead state={state} headingRef={headingRef} showKpis={!wide} />
        {!wide && actions}
        <FiltersPanel
          state={state}
          open={filtersOpen}
          onToggle={() => setFiltersOpen((open) => !open)}
          onList={onList}
        >
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
                onClick={() =>
                  onList({ positions: position === "ALL" ? [] : [position] })
                }
              >
                {position === "ALL" ? text.filtersAll : position} (
                {position === "ALL" ? selected.length : detailed[position]})
              </button>
            ))}
          </div>
        </FiltersPanel>
        <div className="section-label">
          <h2 id={LIST_HEADING_ID} tabIndex={-1}>
            {activeFilter === "ALL" || activeFilter === null
              ? text.allCandidates
              : text.positions[activeFilter]}
          </h2>
          <select
            className="sort"
            aria-label={text.sortLabel}
            value={state.list.sort}
            onChange={(event) => onList({ sort: event.target.value as SortId })}
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
