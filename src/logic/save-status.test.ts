import test from "node:test";
import assert from "node:assert/strict";
import type { SaveResult } from "./storage.ts";
import {
  initialSaveStatus,
  reduceSaveStatus,
  visibleSaveIssue,
} from "./save-status.ts";
import type { SaveStatus } from "./save-status.ts";

const ok: SaveResult = { ok: true };
const failedResult: SaveResult = { ok: false, reason: "failed" };
const quotaResult: SaveResult = { ok: false, reason: "quota" };
const unavailableResult: SaveResult = { ok: false, reason: "unavailable" };

test("initialSaveStatus has no issue, is not dismissed and is not recovered", () => {
  assert.deepEqual(initialSaveStatus, {
    issue: null,
    unavailableDismissed: false,
    recovered: false,
  });
});

test("a failed save result sets the issue and clears recovered", () => {
  const status = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  assert.deepEqual(status, {
    issue: "failed",
    unavailableDismissed: false,
    recovered: false,
  });
});

test("a quota save result sets the quota issue", () => {
  const status = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: quotaResult,
  });
  assert.equal(status.issue, "quota");
  assert.equal(status.recovered, false);
});

test("an unavailable save result sets the unavailable issue", () => {
  const status = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: unavailableResult,
  });
  assert.equal(status.issue, "unavailable");
});

test("repeating the same failure reason returns the same object", () => {
  const first = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  const second = reduceSaveStatus(first, {
    type: "saveResult",
    result: failedResult,
  });
  assert.equal(second, first);
});

test("switching from one failure reason to another replaces the issue", () => {
  const first = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  const second = reduceSaveStatus(first, {
    type: "saveResult",
    result: quotaResult,
  });
  assert.equal(second.issue, "quota");
  assert.notEqual(second, first);
});

test("an ok result clears an existing issue and marks recovered", () => {
  const failedStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  const recovered = reduceSaveStatus(failedStatus, {
    type: "saveResult",
    result: ok,
  });
  assert.deepEqual(recovered, {
    issue: null,
    unavailableDismissed: false,
    recovered: true,
  });
});

test("an ok result with no prior issue returns the same object", () => {
  const status = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: ok,
  });
  assert.equal(status, initialSaveStatus);
});

test("an ok result after a prior recovery stays unchanged (same object)", () => {
  const failedStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  const recovered = reduceSaveStatus(failedStatus, {
    type: "saveResult",
    result: ok,
  });
  const stillRecovered = reduceSaveStatus(recovered, {
    type: "saveResult",
    result: ok,
  });
  assert.equal(stillRecovered, recovered);
});

test("dismiss hides an unavailable issue for the rest of the session", () => {
  const unavailableStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: unavailableResult,
  });
  const dismissed = reduceSaveStatus(unavailableStatus, { type: "dismiss" });
  assert.deepEqual(dismissed, {
    issue: "unavailable",
    unavailableDismissed: true,
    recovered: false,
  });
  assert.equal(visibleSaveIssue(dismissed), null);
});

test("dismiss does nothing when the issue is not unavailable", () => {
  const failedStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: failedResult,
  });
  const dismissed = reduceSaveStatus(failedStatus, { type: "dismiss" });
  assert.equal(dismissed, failedStatus);
  assert.equal(visibleSaveIssue(dismissed), "failed");
});

test("dismiss does nothing when there is no issue at all", () => {
  const dismissed = reduceSaveStatus(initialSaveStatus, { type: "dismiss" });
  assert.equal(dismissed, initialSaveStatus);
});

test("dismiss is idempotent once the unavailable issue is already dismissed", () => {
  const unavailableStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: unavailableResult,
  });
  const dismissed = reduceSaveStatus(unavailableStatus, { type: "dismiss" });
  const dismissedAgain = reduceSaveStatus(dismissed, { type: "dismiss" });
  assert.equal(dismissedAgain, dismissed);
});

test("repeated unavailable failures after dismissal keep the banner hidden", () => {
  const unavailableStatus = reduceSaveStatus(initialSaveStatus, {
    type: "saveResult",
    result: unavailableResult,
  });
  const dismissed = reduceSaveStatus(unavailableStatus, { type: "dismiss" });
  const stillUnavailable = reduceSaveStatus(dismissed, {
    type: "saveResult",
    result: unavailableResult,
  });
  assert.equal(visibleSaveIssue(stillUnavailable), null);
  assert.equal(stillUnavailable, dismissed);
});

test("visibleSaveIssue returns null when there is no issue", () => {
  assert.equal(visibleSaveIssue(initialSaveStatus), null);
});

test("visibleSaveIssue returns the issue when it is not dismissed", () => {
  const status: SaveStatus = {
    issue: "quota",
    unavailableDismissed: false,
    recovered: false,
  };
  assert.equal(visibleSaveIssue(status), "quota");
});
