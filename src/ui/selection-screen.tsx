import { useRef, useState, type ReactNode, type RefObject } from "react";
import type { GameState, ListFilters, PlayerId } from "../data/types.ts";
import { clearAllFilters, visiblePlayers } from "../logic/list-filters.ts";
import { EmptyList } from "./empty-list.tsx";
import { FiltersPanel } from "./filters-panel.tsx";
import { GAME_HEADING_ID, GameHead } from "./game-head.tsx";
import { ListHeading } from "./list-heading.tsx";
import { PlayerCard } from "./player-card.tsx";
import { PositionChips } from "./position-chips.tsx";
import { SideBoard } from "./side-board.tsx";
import { SideColumn } from "./side-column.tsx";
import { UI_TEXT as text } from "./text.ts";

export function SelectionScreen({
  state,
  headingRef,
  actions,
  onList,
  onToggle,
  onProfile,
  onCompare,
  wide,
  onOutsiders,
  onFinalize,
  sideBoardRef,
}: {
  state: GameState;
  headingRef: RefObject<HTMLHeadingElement | null>;
  // The game actions, shown in the side column from 1024 px (the phone sheet below).
  actions: ReactNode;
  onList: (patch: Partial<ListFilters>) => void;
  onToggle: (id: PlayerId) => void;
  onProfile: (id: PlayerId) => void;
  onCompare: (id: PlayerId) => void;
  wide: boolean;
  onOutsiders: () => void;
  onFinalize: () => void;
  sideBoardRef?: RefObject<HTMLDivElement | null>;
}) {
  // Screen state, not saved: the panel starts collapsed on every visit.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const positions = state.list.positions;
  // A single chosen position names the list; none or several keep the general heading.
  const title =
    positions.length === 1 ? text.positions[positions[0]!] : text.allCandidates;
  const visible = visiblePlayers(state);
  return (
    <div className="screen-layout">
      <section aria-labelledby={GAME_HEADING_ID}>
        <GameHead state={state} headingRef={headingRef} />
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
      {wide && (
        <SideColumn
          state={state}
          board={
            <SideBoard
              state={state}
              onOutsiders={onOutsiders}
              onFinalize={onFinalize}
              regionRef={sideBoardRef}
            />
          }
        >
          {actions}
        </SideColumn>
      )}
    </div>
  );
}
