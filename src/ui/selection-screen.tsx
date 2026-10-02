import { useRef, useState, type RefObject } from "react";
import type { GameState, ListFilters, PlayerId } from "../data/types.ts";
import { clearAllFilters, visiblePlayers } from "../logic/list-filters.ts";
import { squadLimit } from "../logic/selection.ts";
import { EmptyList } from "./empty-list.tsx";
import { FiltersPanel } from "./filters-panel.tsx";
import { GameActions } from "./game-actions.tsx";
import { GAME_HEADING_ID, GameHead } from "./game-head.tsx";
import { ListHeading } from "./list-heading.tsx";
import { PlayerCard } from "./player-card.tsx";
import { PositionChips } from "./position-chips.tsx";
import { SideColumn } from "./side-column.tsx";
import { UI_TEXT as text } from "./text.ts";
import { useMediaQuery } from "./use-media-query.ts";

const WIDE_LAYOUT_QUERY = "(min-width: 1024px)";

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
  const searchRef = useRef<HTMLInputElement>(null);
  const positions = state.list.positions;
  // A single chosen position names the list; none or several keep the general heading.
  const title =
    positions.length === 1 ? text.positions[positions[0]!] : text.allCandidates;
  const visible = visiblePlayers(state);
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
          searchRef={searchRef}
        >
          <PositionChips state={state} onList={onList} />
        </FiltersPanel>
        <ListHeading
          state={state}
          title={title}
          visibleCount={visible.length}
          onList={onList}
        />
        <div className="players">
          {visible.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              state={state}
              onToggle={onToggle}
              onProfile={onProfile}
              onCompare={onCompare}
            />
          ))}
          {visible.length === 0 && (
            <EmptyList
              onClearAll={() => onList(clearAllFilters(state.list.sort))}
              searchRef={searchRef}
            />
          )}
        </div>
      </section>
      {wide && <SideColumn state={state}>{actions}</SideColumn>}
    </div>
  );
}
