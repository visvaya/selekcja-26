import { useEffect, useRef } from "react";
import type { SaveStatus } from "../logic/save-status.ts";
import { visibleSaveIssue } from "../logic/save-status.ts";
import { UI_TEXT as text } from "./text.ts";

// The topbar (and the in-game toolbar below it) is also `position: sticky`, pinned under this
// banner's height. Rather than stack two sticky elements directly (independent sticky siblings
// both pinned to the viewport top would overlap once scrolled, since neither knows about the
// other's height), this measures the sticky wrapper's own rendered height and exposes it as a
// custom property that styles.css adds to the topbar's and toolbar's `top`. When no issue is
// shown the wrapper has no visible box, so the offset is 0 and both sit at their usual position.
function useBannerOffset(visible: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!element || !visible) {
      root.style.setProperty("--save-banner-offset", "0px");
      return;
    }
    const applyHeight = () => {
      root.style.setProperty(
        "--save-banner-offset",
        `${element.getBoundingClientRect().height}px`,
      );
    };
    applyHeight();
    // ResizeObserver is unavailable in the jsdom test environment; the initial measurement
    // above still runs there, only live re-measurement on text reflow is skipped.
    if (typeof ResizeObserver === "undefined") {
      return () => root.style.setProperty("--save-banner-offset", "0px");
    }
    const observer = new ResizeObserver(applyHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.setProperty("--save-banner-offset", "0px");
    };
  }, [visible]);
  return ref;
}

export function SaveStatusBanner({
  status,
  onRetry,
  onDismiss,
}: {
  status: SaveStatus;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const issue = visibleSaveIssue(status);
  const ref = useBannerOffset(issue !== null);
  const showRecovered = status.recovered && issue === null;
  return (
    <div className="save-status" ref={ref}>
      <div
        className={`save-status-alert${issue ? "" : " save-status-alert-empty"}`}
      >
        <p role="alert">{issue ? text.save.messages[issue] : ""}</p>
        {issue && (
          <button
            type="button"
            className="save-status-action"
            onClick={issue === "unavailable" ? onDismiss : onRetry}
          >
            {issue === "unavailable" ? text.understood : text.save.retry}
          </button>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {showRecovered ? text.save.recovered : ""}
      </p>
    </div>
  );
}
