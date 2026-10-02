import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  chooseNameForm,
  fitsWidth,
  shortName,
  type NameForm,
} from "./fit-name.ts";
import { contentWidth, naturalWidth } from "./fit-measure.ts";
import { useKeepFocus } from "./use-keep-focus.ts";
import { useWidthChange } from "./use-width-change.ts";

const NAME_WIDTH_STEP_PX = 0.5;

// Fits a strip name into its heading: the full name, else "initial + surname" as a popover
// button (CSS ellipsises it when even that does not fit).
export function useFittedName(
  headingRef: RefObject<HTMLHeadingElement | null>,
  first: string,
  last: string,
) {
  const findName = useCallback(
    () =>
      headingRef.current?.querySelector<HTMLElement>(
        ".name-trunc:not(.fit-probe)",
      ) ?? null,
    [headingRef],
  );
  const [form, setForm] = useState<NameForm>("full");
  const prepare = useKeepFocus(findName, form);
  const full = first ? `${first} ${last}` : last;
  const short = shortName(first, last);
  const fit = useCallback(() => {
    const heading = headingRef.current;
    const name = findName();
    if (!heading || !name) return;
    const available = contentWidth(heading);
    const next = chooseNameForm({
      full,
      short,
      fits: (text) =>
        fitsWidth(naturalWidth(heading, "name-trunc", text), available),
    });
    if ((next === "short") === (name.tagName === "BUTTON")) return;
    prepare();
    setForm(next);
  }, [headingRef, full, short, findName, prepare]);
  useLayoutEffect(fit, [fit]);
  useWidthChange(headingRef, NAME_WIDTH_STEP_PX, fit);
  return {
    shortened: form === "short",
    full,
    shown: form === "short" ? short : full,
  };
}
