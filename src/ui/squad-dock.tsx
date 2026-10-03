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
import { UI_CONFIG } from "./ui-config.ts";
import { useBarHide } from "./use-bar-hide.ts";
import { useDockHeight } from "./use-dock-height.ts";
import { useMediaQuery } from "./use-media-query.ts";
import { useScrollLock } from "./use-scroll-lock.ts";
import { useSheetDrag } from "./use-sheet-drag.ts";
import { useSheetSlide } from "./use-sheet-slide.ts";
import { openPopovers } from "./open-popovers.ts";

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
  handleRef,
}: {
  state: GameState;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOutsiders: () => void;
  onFinalize: () => void;
  actions: ReactNode;
  toggleRef: RefObject<HTMLButtonElement | null>;
  // Shared with the dialogs' focus fallback while the sheet is open.
  handleRef: RefObject<HTMLButtonElement | null>;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const descriptionId = useId();
  useDockHeight(barRef, true);
  useScrollLock(expanded);
  useScrim(scrimRef, expanded);
  useSheetSlide({ sheetRef, bodyRef, scrimRef, open: expanded });
  useBarHide({ dockRef, open: expanded });
  const canDrag = useMediaQuery(UI_CONFIG.sheetDragQuery);
  const drag = useSheetDrag({
    handleRef,
    sheetRef,
    enabled: expanded && canDrag,
    onClose: closeByUser,
  });
  useEffect(() => {
    if (!expanded) return;
    for (const popover of openPopovers()) popover.hidePopover();
    handleRef.current?.focus({ preventScroll: true });
  }, [expanded, handleRef]);

  const outsiders = formationOutsiders(state);
  const description = boardToggleDescription(state);

  // Every close first ends a drag in progress; a close driven by the screen ends it when
  // the drag hook is disabled.
  function closeByUser() {
    drag.cancel();
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
        className="phone-dock-scrim"
        aria-hidden="true"
        ref={scrimRef}
        onClick={closeByUser}
      />
      {/* Escape is handled where focus is: inside the open sheet. The role is dynamic. */}
      {/* React's className drops the imperative is-away when expanded changes: intended. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`dock phone-dock${expanded ? " is-open" : ""}`}
        role={expanded ? "dialog" : "complementary"}
        aria-modal={expanded ? true : undefined}
        aria-label={expanded ? text.sheetTitle : text.yourSquad}
        ref={dockRef}
        onKeyDown={handleKeyDown}
      >
        <div className="phone-dock-more" id={sheetId} ref={sheetRef}>
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
