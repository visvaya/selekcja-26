import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  chooseNameForm,
  fitsWidth,
  shortName,
  type NameForm,
} from "./fit-name.ts";
import { useKeepFocus } from "./use-keep-focus.ts";
import { useWidthChange } from "./use-width-change.ts";

const NAME_WIDTH_STEP_PX = 0.5;

const px = (value: string) => Number.parseFloat(value) || 0;

// Content-box width in fractional pixels; clientWidth would round and wrongly truncate.
function contentWidth(element: HTMLElement): number {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const edges = style
    ? px(style.paddingLeft) +
      px(style.paddingRight) +
      px(style.borderLeftWidth) +
      px(style.borderRightWidth)
    : 0;
  return element.getBoundingClientRect().width - edges;
}

// Natural width of `text` in an invisible probe with the name's own class.
function naturalWidth(
  parent: HTMLElement,
  className: string,
  text: string,
): number {
  const probe = parent.ownerDocument.createElement("span");
  probe.className = `${className} fit-probe`;
  probe.textContent = text;
  parent.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

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
