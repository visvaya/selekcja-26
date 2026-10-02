import { useId, useRef } from "react";
import { players } from "../data/catalog.ts";
import type { GameState, ListFilters } from "../data/types.ts";
import {
  catalogueCounts,
  FILTER_POSITIONS,
  togglePosition,
} from "../logic/list-filters.ts";
import { detailedCounts } from "../logic/selection.ts";
import { UI_TEXT as text } from "./text.ts";
import { useEdgeFade } from "./use-edge-fade.ts";

// Position chips: several positions at once; "Wszyscy" clears the choice. Each chip shows
// called-up players over catalogue players for its position.
export function PositionChips({
  state,
  onList,
}: {
  state: GameState;
  onList: (patch: Partial<ListFilters>) => void;
}) {
  const labelId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const fade = useEdgeFade(rowRef);
  const picked = detailedCounts(state);
  const totals = catalogueCounts();
  const chosen = state.list.positions;
  const allPressed = chosen.length === 0;
  return (
    <>
      <span className="filters-plain-label" id={labelId}>
        {text.positionChipsLabel}
      </span>
      <div
        ref={rowRef}
        className={`filters ${fade}`.trim()}
        role="group"
        aria-labelledby={labelId}
      >
        <button
          type="button"
          className={allPressed ? "chip active" : "chip"}
          aria-pressed={allPressed}
          aria-label={text.chipAllName(state.selected.size, players.length)}
          onClick={() => onList({ positions: [] })}
        >
          {text.chip(text.filtersAll, state.selected.size, players.length)}
        </button>
        {FILTER_POSITIONS.map((position) => {
          const pressed = chosen.includes(position);
          return (
            <button
              type="button"
              key={position}
              className={pressed ? "chip active" : "chip"}
              aria-pressed={pressed}
              aria-label={text.chipName(
                position,
                picked[position],
                totals[position],
                text.positions[position].toLocaleLowerCase("pl"),
              )}
              onClick={() =>
                onList({ positions: togglePosition(chosen, position) })
              }
            >
              {text.chip(position, picked[position], totals[position])}
            </button>
          );
        })}
      </div>
    </>
  );
}
