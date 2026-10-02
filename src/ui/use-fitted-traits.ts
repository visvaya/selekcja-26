import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { countLines, hiddenTraitCount } from "./fit-traits.ts";
import { useWidthChange } from "./use-width-change.ts";

const TRAIT_WIDTH_STEP_PX = 1;

function visibleLines(row: HTMLElement): number {
  return countLines(
    [...row.children]
      .filter((child) => !(child as HTMLElement).hidden)
      .map((child) => (child as HTMLElement).offsetTop),
  );
}

// Lines of the row after hiding k tags from the end (never the first), with "+N" shown for
// k > 0. Hidden states are set on the DOM for measuring and restored before returning.
function measureLineCounts(row: HTMLElement): number[] {
  const tags = [...row.querySelectorAll<HTMLElement>(".tag:not(.tag-more)")];
  const more = row.querySelector<HTMLElement>(".tag-more");
  const saved = tags.map((tag) => tag.hidden);
  const savedMore = more?.hidden ?? true;
  const counts: number[] = [];
  for (let hide = 0; hide < Math.max(1, tags.length); hide += 1) {
    tags.forEach((tag, index) => {
      tag.hidden = index >= tags.length - hide;
    });
    if (more) more.hidden = hide === 0;
    const lines = visibleLines(row);
    counts.push(lines);
    if (lines <= 1) break;
  }
  tags.forEach((tag, index) => {
    tag.hidden = saved[index] ?? false;
  });
  if (more) more.hidden = savedMore;
  return counts;
}

// Keeps a strip's trait row on one line: tags from the end hide behind "+N", which opens the
// whole row; `signature` changes whenever the set of tags does.
export function useFittedTraits(
  rowRef: RefObject<HTMLDivElement | null>,
  signature: string,
) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(0);
  const fit = useCallback(() => {
    const row = rowRef.current;
    if (!row || open) return;
    setHidden(hiddenTraitCount(measureLineCounts(row)));
  }, [rowRef, open]);
  useLayoutEffect(fit, [fit, signature]);
  useWidthChange(rowRef, TRAIT_WIDTH_STEP_PX, fit);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  return { open, hidden: open ? 0 : hidden, toggle };
}
