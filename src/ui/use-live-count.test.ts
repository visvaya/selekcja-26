import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { useLiveCount } from "./use-live-count.ts";

async function renderProbe(initial: number) {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const seen: string[] = [];
  function Probe({ count }: { count: number }) {
    seen.push(useLiveCount(count));
    return null;
  }
  const root = createRoot(document.createElement("div"));
  const render = (count: number) =>
    act(async () => root.render(React.createElement(Probe, { count })));
  const tick = (ms: number) =>
    act(async () => {
      mock.timers.tick(ms);
    });
  await render(initial);
  return { seen, render, tick, unmount: () => act(async () => root.unmount()) };
}

async function withProbe(
  body: (probe: Awaited<ReturnType<typeof renderProbe>>) => Promise<void>,
) {
  await withJsdomWindow(async () => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const probe = await renderProbe(61);
      await body(probe);
      await probe.unmount();
    } finally {
      mock.timers.reset();
    }
  });
}

test("useLiveCount announces nothing on first render", async () => {
  await withProbe(async ({ seen, tick }) => {
    assert.equal(seen.at(-1), "");
    await tick(1000);
    assert.equal(seen.at(-1), "");
  });
});

test("useLiveCount announces a changed count after the delay", async () => {
  await withProbe(async ({ seen, render, tick }) => {
    await render(12);
    await tick(499);
    assert.equal(seen.at(-1), "");
    await tick(1);
    assert.equal(seen.at(-1), "Widoczni: 12 z 61");
  });
});

test("useLiveCount announces two quick changes once with the last value", async () => {
  await withProbe(async ({ seen, render, tick }) => {
    await render(12);
    await tick(300);
    await render(7);
    await tick(499);
    assert.equal(seen.includes("Widoczni: 12 z 61"), false);
    await tick(1);
    assert.equal(seen.at(-1), "Widoczni: 7 z 61");
    assert.equal(seen.filter((value) => value !== "").length > 0, true);
    assert.equal(new Set(seen.filter((value) => value !== "")).size, 1);
  });
});

test("useLiveCount stays silent when the count returns to the announced value", async () => {
  await withProbe(async ({ seen, render, tick }) => {
    await render(12);
    await tick(100);
    await render(61);
    await tick(1000);
    assert.equal(seen.at(-1), "");
  });
});
