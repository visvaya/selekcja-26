import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { chooseNameForm, fitsWidth, shortName } from "./fit-name.ts";
import { contentWidth, naturalWidth } from "./fit-measure.ts";
import { useWidthChange } from "./use-width-change.ts";

const LABEL_WIDTH_STEP_PX = 0.5;

// Fits a plain-text name into its own element: the full name, else "initial + surname" (CSS
// ellipsises it when even that does not fit). Unlike useFittedName it always renders text.
export function useFittedLabel(
  ref: RefObject<HTMLElement | null>,
  first: string,
  last: string,
  className: string,
): string {
  const full = first ? `${first} ${last}` : last;
  const short = shortName(first, last);
  const [shown, setShown] = useState(full);
  const fit = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const available = contentWidth(element);
    const form = chooseNameForm({
      full,
      short,
      fits: (text) =>
        fitsWidth(naturalWidth(element, className, text), available),
    });
    setShown(form === "short" ? short : full);
  }, [ref, full, short, className]);
  useLayoutEffect(fit, [fit]);
  useWidthChange(ref, LABEL_WIDTH_STEP_PX, fit);
  return shown;
}
