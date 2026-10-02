import { useId } from "react";
import { players } from "../data/catalog.ts";
import type { GameState, ListFilters, SortId } from "../data/types.ts";
import { LIST_HEADING_ID } from "./list-heading-id.ts";
import { UI_TEXT as text } from "./text.ts";
import { useLiveCount } from "./use-live-count.ts";

function Tick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-field list-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

// List head: the heading with the visible count (announced after a pause), the sort and the
// "Tylko..." ticks ("Tylko z marcowego zgrupowania" only at the final stage).
export function ListHeading({
  state,
  title,
  visibleCount,
  onList,
}: {
  state: GameState;
  title: string;
  visibleCount: number;
  onList: (patch: Partial<ListFilters>) => void;
}) {
  const sortId = useId();
  const announcement = useLiveCount(visibleCount);
  const list = state.list;
  return (
    <div className="section-label">
      <div className="list-heading">
        <h2 id={LIST_HEADING_ID} tabIndex={-1}>
          {title}
        </h2>
        <span className="list-count">
          {text.visibleCount(visibleCount, players.length)}
        </span>
        <span className="visually-hidden" role="status">
          {announcement}
        </span>
      </div>
      <div className="sort-field">
        <label htmlFor={sortId}>{text.sortVisibleLabel}</label>
        <span className="select-wrap">
          <select
            id={sortId}
            className="sort"
            value={list.sort}
            onChange={(event) => onList({ sort: event.target.value as SortId })}
          >
            {(Object.keys(text.sort) as SortId[]).map((sort) => (
              <option key={sort} value={sort}>
                {text.sort[sort]}
              </option>
            ))}
          </select>
          <span className="select-chevron" aria-hidden="true" />
        </span>
      </div>
      <div
        className="list-toggles"
        role="group"
        aria-label={text.onlyGroupLabel}
      >
        <Tick
          label={text.onlySelected(state.selected.size)}
          checked={list.onlySelected}
          onChange={(onlySelected) => onList({ onlySelected })}
        />
        {state.stage === "final" && (
          <Tick
            label={text.onlyCamp(state.campSquad.size)}
            checked={list.onlyCamp}
            onChange={(onlyCamp) => onList({ onlyCamp })}
          />
        )}
      </div>
    </div>
  );
}
