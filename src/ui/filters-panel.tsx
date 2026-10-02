import { useId, type ReactNode } from "react";
import type { GameState, ListFilters, RoleId } from "../data/types.ts";
import {
  appliedCriteriaCount,
  clearDetailFilters,
} from "../logic/list-filters.ts";
import { LIST_HEADING_ID } from "./list-heading-id.ts";
import { UI_TEXT as text } from "./text.ts";
import { TRAIT_FILTER_ORDER } from "./trait-filter-order.ts";

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function toggledTraits(
  traits: readonly RoleId[],
  trait: RoleId,
  checked: boolean,
): RoleId[] {
  return checked
    ? [...traits.filter((item) => item !== trait), trait]
    : traits.filter((item) => item !== trait);
}

// Toolbar of the candidate list: search, the "Filtry szczegółowe" disclosure and its panel
// (lead foot, traits, ranges). `children` follow the panel (the position chips).
export function FiltersPanel({
  state,
  open,
  onToggle,
  onList,
  children,
}: {
  state: GameState;
  open: boolean;
  onToggle: () => void;
  onList: (patch: Partial<ListFilters>) => void;
  children?: ReactNode;
}) {
  const panelId = useId();
  const list = state.list;
  const count = appliedCriteriaCount(list, state.stage);
  return (
    <div className="toolbar">
      <div className="search-row">
        <input
          className="search"
          type="search"
          value={list.query}
          onChange={(event) => onList({ query: event.target.value })}
          placeholder={text.searchPlaceholder}
          aria-label={text.searchLabel}
        />
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            count > 0 ? text.detailFiltersActive(count) : text.detailFilters
          }
          onClick={onToggle}
        >
          {text.detailFilters}
          {count > 0 && (
            <span className="filters-count" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      </div>
      <div className="filters-panel" id={panelId} hidden={!open}>
        <a className="skip-link" href={`#${LIST_HEADING_ID}`}>
          {text.skipToList}
        </a>
        <div className="filters-panel-grid">
          <fieldset className="filter-group filter-group-leg">
            <legend>{text.footLegend}</legend>
            <p className="filter-hint">{text.footHint}</p>
            <Checkbox
              label={text.footLeft}
              checked={list.foot.left}
              onChange={(left) => onList({ foot: { ...list.foot, left } })}
            />
            <Checkbox
              label={text.footRight}
              checked={list.foot.right}
              onChange={(right) => onList({ foot: { ...list.foot, right } })}
            />
          </fieldset>
          <fieldset className="filter-group filter-group-traits">
            <legend>{text.traitsLegend}</legend>
            <div className="filter-traits-grid">
              {TRAIT_FILTER_ORDER.map((trait) => (
                <Checkbox
                  key={trait}
                  label={text.roles[trait]}
                  checked={list.traits.includes(trait)}
                  onChange={(checked) =>
                    onList({
                      traits: toggledTraits(list.traits, trait, checked),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="filter-group filter-group-ranges">
            <legend>{text.rangesLegend}</legend>
          </fieldset>
        </div>
        <div className="filters-panel-actions">
          <button
            type="button"
            className="action-button"
            onClick={() => onList(clearDetailFilters())}
          >
            {text.clearFilters}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
