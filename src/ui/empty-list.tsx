import type { RefObject } from "react";
import { UI_TEXT as text } from "./text.ts";

// Shown instead of the list when nothing matches; "Wyczyść filtry" clears every narrowing
// filter and returns focus to the search field (this card disappears with the empty list).
export function EmptyList({
  onClearAll,
  searchRef,
}: {
  onClearAll: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="noCandidates">
      <p>{text.noCandidates}</p>
      <p className="fineprint">{text.noCandidatesHint}</p>
      <button
        type="button"
        className="action-button"
        onClick={() => {
          onClearAll();
          searchRef.current?.focus();
        }}
      >
        {text.clearFilters}
      </button>
    </div>
  );
}
