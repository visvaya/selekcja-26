import type { SaveFailureReason, SaveResult } from "./storage.ts";

// Pure UI state for the save-failure banner (see src/ui/save-status-banner.tsx). It is not
// part of GameState: it is never persisted and is driven only by the outcome of each save
// attempt, so it lives here as a plain reducer instead of directly inside a component.
export interface SaveStatus {
  readonly issue: SaveFailureReason | null;
  readonly unavailableDismissed: boolean;
  // True once an issue has been cleared by a successful save; drives the "Postęp zapisany."
  // announcement. It is not reset back to false except by a new save failure.
  readonly recovered: boolean;
}

export type SaveStatusEvent =
  | { readonly type: "saveResult"; readonly result: SaveResult }
  | { readonly type: "dismiss" };

export const initialSaveStatus: SaveStatus = {
  issue: null,
  unavailableDismissed: false,
  recovered: false,
};

export function reduceSaveStatus(
  status: SaveStatus,
  event: SaveStatusEvent,
): SaveStatus {
  if (event.type === "dismiss") {
    if (status.issue !== "unavailable" || status.unavailableDismissed)
      return status;
    return { ...status, unavailableDismissed: true };
  }
  const { result } = event;
  if (result.ok) {
    if (status.issue === null) return status;
    return { issue: null, unavailableDismissed: false, recovered: true };
  }
  if (status.issue === result.reason) return status;
  return {
    issue: result.reason,
    unavailableDismissed: status.unavailableDismissed,
    recovered: false,
  };
}

// null when there is no issue, or the issue is "unavailable" and was dismissed for this session.
export function visibleSaveIssue(status: SaveStatus): SaveFailureReason | null {
  if (status.issue === null) return null;
  if (status.issue === "unavailable" && status.unavailableDismissed)
    return null;
  return status.issue;
}
