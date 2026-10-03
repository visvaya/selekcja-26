import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { GameState } from "../data/types.ts";
import { formationOutsiders, squadLimit } from "../logic/selection.ts";
import {
  boardHeadline,
  boardToggleDescription,
  boardToggleName,
} from "./board-summary.ts";
import { CountRing } from "./count-ring.tsx";
import { FinalizeButton } from "./finalize-button.tsx";
import { focusSelf } from "./focus-self.ts";
import { Kpis } from "./game-head.tsx";
import { Pitch } from "./pitch.tsx";
import { PitchOutsiders } from "./pitch-outsiders.tsx";
import { SlotSquares } from "./slot-squares.tsx";
import { UI_TEXT as text } from "./text.ts";
import { useDockHeight } from "./use-dock-height.ts";
import { useScrollLock } from "./use-scroll-lock.ts";

function Chevron() {
  return (
    <svg
      className="dock-copy-chevron"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Open popovers (a list strip's menu): the sheet closes them on opening and leaves Escape
// to them. Engines without the :popover-open selector have none.
function openPopovers(): HTMLElement[] {
  try {
    return [...document.querySelectorAll<HTMLElement>(":popover-open")];
  } catch {
    return [];
  }
}

// The scrim keeps the page behind the open sheet still: wheel and touch scrolling stop on
// it (non-passive listeners, React's own are passive) and a tap closes the sheet.
function useScrim(
  ref: RefObject<HTMLDivElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const scrim = ref.current;
    if (!scrim || !active) return;
    const block = (event: Event) => event.preventDefault();
    scrim.addEventListener("wheel", block, { passive: false });
    scrim.addEventListener("touchmove", block, { passive: false });
    return () => {
      scrim.removeEventListener("wheel", block);
      scrim.removeEventListener("touchmove", block);
    };
  }, [ref, active]);
}

// The phone squad board below 1024 px: a pinned bar (count, toggle, stage button) that
// opens a modal sheet with the KPIs, the slot squares, the pitch and the game actions.
// One element plays both roles, so focus and the sheet's content survive the switch.
// `onClose` is a user close (handle, scrim, Escape, toggle): focus returns to the toggle.
// A close driven by the screen only sets `expanded` to false and leaves focus alone.
export function SquadDock({
  state,
  expanded,
  onToggle,
  onClose,
  onOutsiders,
  onFinalize,
  actions,
  toggleRef,
}: {
  state: GameState;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOutsiders: () => void;
  onFinalize: () => void;
  actions: ReactNode;
  toggleRef: RefObject<HTMLButtonElement | null>;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const descriptionId = useId();
  useDockHeight(barRef, true);
  useScrollLock(expanded);
  useScrim(scrimRef, expanded);
  useEffect(() => {
    if (!expanded) return;
    for (const popover of openPopovers()) popover.hidePopover();
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    handleRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  const outsiders = formationOutsiders(state);
  const description = boardToggleDescription(state);

  function closeByUser() {
    onClose();
    toggleRef.current?.focus({ preventScroll: true });
  }
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !expanded) return;
    if (event.defaultPrevented || openPopovers().length > 0) return;
    event.preventDefault();
    closeByUser();
  }

  return (
    <>
      <div
        className={`phone-dock-scrim${expanded ? " is-visible" : ""}`}
        aria-hidden="true"
        hidden={!expanded}
        ref={scrimRef}
        onClick={closeByUser}
      />
      {/* Escape is handled where focus is: inside the open sheet. The role is dynamic. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`dock phone-dock${expanded ? " is-open" : ""}`}
        role={expanded ? "dialog" : "complementary"}
        aria-modal={expanded ? true : undefined}
        aria-label={expanded ? text.sheetTitle : text.yourSquad}
        onKeyDown={handleKeyDown}
      >
        <div className="phone-dock-more" id={sheetId} hidden={!expanded}>
          <div className="phone-dock-sheet-head">
            <button
              type="button"
              className="phone-dock-handle"
              aria-label={text.sheetHandle}
              ref={handleRef}
              onClick={closeByUser}
            >
              <span aria-hidden="true" />
            </button>
          </div>
          <div className="phone-dock-body" ref={bodyRef}>
            <Kpis state={state} className="phone-dock-kpis" />
            <SlotSquares state={state} />
            <div className="pitch-panel">
              <Pitch state={state} />
              <PitchOutsiders players={outsiders} onOpen={onOutsiders} />
            </div>
            {actions}
          </div>
        </div>
        <div className="phone-dock-bar" ref={barRef}>
          <CountRing count={state.selected.size} limit={squadLimit(state)} />
          <button
            type="button"
            className="dock-copy phone-dock-toggle"
            ref={toggleRef}
            aria-expanded={expanded}
            aria-controls={sheetId}
            aria-label={boardToggleName(state, expanded)}
            aria-describedby={description ? descriptionId : undefined}
            onClick={(event) => {
              focusSelf(event);
              if (expanded) closeByUser();
              else onToggle();
            }}
          >
            <b>
              {boardHeadline(state)}
              <Chevron />
            </b>
            <span className="dock-copy-hint">
              {expanded ? text.dockHint.open : text.dockHint.closed}
            </span>
            {description && (
              <span className="visually-hidden" id={descriptionId}>
                {description}
              </span>
            )}
          </button>
          <FinalizeButton state={state} onFinalize={onFinalize} />
        </div>
      </div>
    </>
  );
}
