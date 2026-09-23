import test from "node:test";
import assert from "node:assert/strict";
import { createLatestRequestTracker } from "./latest-request.ts";

test("a single request is latest", () => {
  const tracker = createLatestRequestTracker();
  const isLatest = tracker.begin();
  assert.equal(isLatest(), true);
});

test("an older request stops being latest after a newer begin", () => {
  const tracker = createLatestRequestTracker();
  const olderIsLatest = tracker.begin();
  const newerIsLatest = tracker.begin();
  assert.equal(olderIsLatest(), false);
  assert.equal(newerIsLatest(), true);
});

test("the newest request stays latest across repeated checks and further stale checks", () => {
  const tracker = createLatestRequestTracker();
  const first = tracker.begin();
  const second = tracker.begin();
  const third = tracker.begin();
  assert.equal(third(), true);
  assert.equal(third(), true);
  assert.equal(first(), false);
  assert.equal(second(), false);
});
