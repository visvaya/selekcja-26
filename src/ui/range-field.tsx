import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { RangeBounds, RangeId } from "../data/types.ts";
import {
  commitRange,
  fillPercent,
  normalizeRange,
  parseRangeInput,
  stepValue,
  type RangeScale,
} from "./range-input.ts";
import { UI_TEXT as text } from "./text.ts";

type Side = "min" | "max";

interface Drafts {
  min: string;
  max: string;
}

// Stored bounds are shown as stored, even outside the current scale, so the fields always show
// what the filter applies; only the track fill clamps.
const show = (bounds: RangeBounds): Drafts => ({
  min: bounds.min === null ? "" : String(bounds.min),
  max: bounds.max === null ? "" : String(bounds.max),
});

const readDraft = (draft: string): number | null => {
  const value = parseRangeInput(draft);
  return value === "invalid" ? null : value;
};

const draftBounds = (drafts: Drafts): RangeBounds => ({
  min: readDraft(drafts.min),
  max: readDraft(drafts.max),
});

const isEmpty = (bounds: RangeBounds): boolean =>
  bounds.min === null && bounds.max === null;

const sameBounds = (left: RangeBounds, right: RangeBounds): boolean =>
  left.min === right.min && left.max === right.max;

// Steps a focused number field with the mouse wheel. The listener is added natively with
// `passive: false`, so the page does not scroll while the wheel changes the value.
function useWheelStep(
  ref: RefObject<HTMLInputElement | null>,
  onStep: (direction: 1 | -1) => void,
) {
  const latest = useRef(onStep);
  useEffect(() => {
    latest.current = onStep;
  });
  useEffect(() => {
    const input = ref.current;
    if (!input) return undefined;
    const listener = (event: WheelEvent) => {
      if (input.ownerDocument.activeElement !== input || event.deltaY === 0)
        return;
      event.preventDefault();
      latest.current(event.deltaY < 0 ? 1 : -1);
    };
    input.addEventListener("wheel", listener, { passive: false });
    return () => input.removeEventListener("wheel", listener);
  }, [ref]);
}

// One range filter: two number fields ("od", "do") are the keyboard and screen reader control;
// two pointer-only handles over the track write into them. Typing is free; a value is clamped
// and committed on blur or Enter, a step (arrows, wheel) and a released handle commit at once.
export function RangeField({
  id,
  label,
  scale,
  bounds,
  signed,
  version,
  onCommit,
}: {
  id: RangeId;
  label: string;
  scale: RangeScale;
  bounds: RangeBounds;
  signed: boolean;
  version: object;
  onCommit: (bounds: RangeBounds) => void;
}) {
  const [drafts, setDrafts] = useState<Drafts>(() => show(bounds));
  const [dragging, setDragging] = useState(false);
  const committed = useRef<RangeBounds>(bounds);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  // `version` changes identity whenever this field's stored bounds change (or the filters are
  // cleared). A change this field caused itself is skipped (it keeps showing a stepped scale end, stored as null); any other change
  // (clearing the panel, a reload) replaces the drafts with the stored bounds.
  const echo = useRef(false);
  useEffect(() => {
    if (echo.current) {
      echo.current = false;
      return;
    }
    committed.current = bounds;
    setDrafts(show(bounds));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reset only on a new version
  }, [version]);

  // Steps always report; a blur or Enter that changes nothing stays quiet.
  function commit(next: Drafts, edited: Side, always = false) {
    const normal = normalizeRange(draftBounds(next), edited, scale);
    setDrafts({
      min: normal.min === null ? "" : String(normal.min),
      max: normal.max === null ? "" : String(normal.max),
    });
    const stored = commitRange(normal, edited, scale);
    if (!always && sameBounds(stored, committed.current)) return;
    // an unset field that stays unset gets no new version, so no echo is expected
    echo.current = !(isEmpty(stored) && isEmpty(committed.current));
    committed.current = stored;
    onCommit(stored);
  }

  function step(side: Side, direction: 1 | -1) {
    const value = stepValue(readDraft(drafts[side]), direction, scale);
    commit({ ...drafts, [side]: String(value) }, side, true);
  }

  useWheelStep(minRef, (direction) => step("min", direction));
  useWheelStep(maxRef, (direction) => step("max", direction));

  function onKeyDown(side: Side, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(side, event.key === "ArrowUp" ? 1 : -1);
    } else if (event.key === "Enter") {
      commit(drafts, side);
    }
  }

  function onBlur(side: Side, input: HTMLInputElement) {
    // Text a number field cannot read (a lone "-") reports value "" with badInput, so the draft
    // is already "" and React sees no change to render; the visible text has to be cleared on
    // the element itself.
    if (input.validity.badInput) input.value = "";
    commit(drafts, side);
  }

  const live = draftBounds(drafts);
  const fill = fillPercent(live, scale);
  const isSet = fill.from > 0 || fill.to < 100;
  const handleFrom = Math.round(
    scale.min + ((scale.max - scale.min) * fill.from) / 100,
  );
  const handleTo = Math.round(
    scale.min + ((scale.max - scale.min) * fill.to) / 100,
  );

  function drag(side: Side, raw: string) {
    const value = Number(raw);
    const next =
      side === "min" ? Math.min(value, handleTo) : Math.max(value, handleFrom);
    setDrafts({ ...drafts, [side]: String(next) });
  }

  function release(side: Side) {
    if (!dragging) return;
    setDragging(false);
    commit(drafts, side, true);
  }

  // A drag can end away from the handle (pointer released outside, no pointerup on it); the
  // native change event of the range input still marks the end, so it commits too.
  const minHandle = useRef<HTMLInputElement>(null);
  const maxHandle = useRef<HTMLInputElement>(null);
  const latestRelease = useRef(release);
  useEffect(() => {
    latestRelease.current = release;
  });
  useEffect(() => {
    const pairs = [
      [minHandle.current, "min"],
      [maxHandle.current, "max"],
    ] as const;
    const listeners = pairs.map(([handle, side]) => {
      const listener = () => latestRelease.current(side);
      handle?.addEventListener("change", listener);
      return () => handle?.removeEventListener("change", listener);
    });
    return () => listeners.forEach((remove) => remove());
  }, []);

  const fieldClass = [
    "range-field",
    dragging ? "is-dragging" : "",
    handleFrom === handleTo && handleFrom > (scale.min + scale.max) / 2
      ? "is-low-on-top"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const numberInput = (side: Side) => (
    <label>
      <span className="visually-hidden">
        {side === "min" ? text.rangeFrom(label) : text.rangeTo(label)}
      </span>
      <input
        ref={side === "min" ? minRef : maxRef}
        type="number"
        name={`${id}-${side}`}
        inputMode={signed ? undefined : "numeric"}
        min={scale.min}
        max={scale.max}
        step={1}
        placeholder={String(side === "min" ? scale.min : scale.max)}
        value={drafts[side]}
        onChange={(event) =>
          setDrafts({ ...drafts, [side]: event.target.value })
        }
        onKeyDown={(event) => onKeyDown(side, event)}
        onBlur={(event) => onBlur(side, event.currentTarget)}
      />
    </label>
  );

  const handle = (side: Side) => (
    <input
      type="range"
      aria-hidden="true"
      tabIndex={-1}
      min={scale.min}
      max={scale.max}
      step={1}
      value={side === "min" ? handleFrom : handleTo}
      ref={side === "min" ? minHandle : maxHandle}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
      }}
      onChange={(event) => drag(side, event.target.value)}
      onPointerUp={() => release(side)}
      onPointerCancel={() => release(side)}
    />
  );

  return (
    <div className={fieldClass}>
      <div className="range-field-head">
        <span className="range-field-label">{label}</span>
      </div>
      <div className="range-field-inputs">
        {numberInput("min")}
        <span className="range-field-sep" aria-hidden="true">
          –
        </span>
        {numberInput("max")}
      </div>
      <div className="range-slider">
        <span className="range-track" aria-hidden="true">
          <span
            className={isSet ? "range-track-fill is-set" : "range-track-fill"}
            style={
              {
                "--from": `${fill.from}%`,
                "--to": `${fill.to}%`,
              } as CSSProperties
            }
          />
        </span>
        {handle("min")}
        {handle("max")}
      </div>
    </div>
  );
}
