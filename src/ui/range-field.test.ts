import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import type { RangeBounds } from "../data/types.ts";
import { UI_TEXT as text } from "./text.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

const scale = { min: 20, max: 40 };

// Renders a stateful field: commits are recorded and fed back as the new bounds.
async function withField(
  options: { signed?: boolean; label?: string; bounds?: RangeBounds },
  body: (rendered: {
    commits: RangeBounds[];
    from: HTMLInputElement;
    to: HTMLInputElement;
    container: HTMLElement;
    setStored: (bounds: RangeBounds) => void;
  }) => Promise<void> | void,
) {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup, act } = await import("@testing-library/react");
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    try {
      const { RangeField } = (await vite.ssrLoadModule(
        "/src/ui/range-field.tsx",
      )) as typeof import("./range-field.tsx");
      const commits: RangeBounds[] = [];
      let setStored: (bounds: RangeBounds) => void = () => undefined;
      const label = options.label ?? text.ranges.age;
      function Harness() {
        const [bounds, setBounds] = React.useState<RangeBounds>(
          options.bounds ?? { min: null, max: null },
        );
        React.useEffect(() => {
          setStored = setBounds;
        }, []);
        return React.createElement(RangeField, {
          id: "age",
          label,
          scale,
          bounds,
          signed: options.signed ?? false,
          version: bounds,
          onCommit: (next: RangeBounds) => {
            commits.push(next);
            setBounds(next);
          },
        });
      }
      const { getByRole, container } = render(React.createElement(Harness));
      const from = getByRole("spinbutton", {
        name: text.rangeFrom(label),
      }) as HTMLInputElement;
      const to = getByRole("spinbutton", {
        name: text.rangeTo(label),
      }) as HTMLInputElement;
      await body({
        commits,
        from,
        to,
        container,
        setStored: (bounds) => act(() => setStored(bounds)),
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

test("the inputs are named after the label and show the scale as placeholders", async () => {
  await withField({}, ({ from, to }) => {
    assert.equal(text.rangeFrom(text.ranges.age), "Wiek od");
    assert.equal(text.rangeTo(text.ranges.age), "Wiek do");
    assert.equal(from.placeholder, "20");
    assert.equal(to.placeholder, "40");
    assert.equal(from.value, "");
    assert.equal(from.getAttribute("inputmode"), "numeric");
  });
});

test("typing commits only on blur, clamped to the scale", async () => {
  await withField({}, async ({ commits, from }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(from, { target: { value: "99" } });
    assert.equal(commits.length, 0);
    assert.equal(from.value, "99");
    fireEvent.blur(from);
    assert.deepEqual(commits, [{ min: 40, max: null }]);
    assert.equal(from.value, "40");
  });
});

test("Enter commits the typed value", async () => {
  await withField({}, async ({ commits, to }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(to, { target: { value: "30" } });
    fireEvent.keyDown(to, { key: "Enter" });
    assert.deepEqual(commits, [{ min: null, max: 30 }]);
  });
});

test("od above do pulls do up on commit", async () => {
  await withField(
    { bounds: { min: null, max: 25 } },
    async ({ commits, from, to }) => {
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(from, { target: { value: "30" } });
      fireEvent.blur(from);
      assert.deepEqual(commits, [{ min: 30, max: 30 }]);
      assert.equal(to.value, "30");
    },
  );
});

test("arrow keys on an empty field start at the scale ends and keep stepping", async () => {
  await withField({}, async ({ commits, from, to }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.keyDown(from, { key: "ArrowUp" });
    assert.equal(from.value, "20");
    assert.deepEqual(commits, [{ min: null, max: null }]);
    fireEvent.keyDown(from, { key: "ArrowUp" });
    assert.equal(from.value, "21");
    assert.deepEqual(commits.at(-1), { min: 21, max: null });
    fireEvent.keyDown(from, { key: "ArrowDown" });
    fireEvent.keyDown(from, { key: "ArrowDown" });
    assert.equal(from.value, "20");
    fireEvent.keyDown(to, { key: "ArrowDown" });
    assert.equal(to.value, "40");
  });
});

test("the wheel steps only the focused field", async () => {
  await withField({}, async ({ commits, from }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.wheel(from, { deltaY: -100 });
    assert.equal(commits.length, 0);
    assert.equal(from.value, "");
    from.focus();
    fireEvent.wheel(from, { deltaY: -100 });
    assert.equal(from.value, "20");
    assert.equal(commits.length, 1);
  });
});

test("a lone minus in the signed field is cleared on blur", async () => {
  await withField({ signed: true }, async ({ commits, from }) => {
    const { fireEvent } = await import("@testing-library/react");
    assert.equal(from.hasAttribute("inputmode"), false);
    fireEvent.change(from, { target: { value: "-" } });
    fireEvent.blur(from);
    assert.equal(from.value, "");
    assert.equal(commits.length, 0);
  });
});

test("a stored bound outside the scale is shown as stored, the fill clamps", async () => {
  await withField(
    { bounds: { min: 5, max: 90 } },
    ({ from, to, container }) => {
      assert.equal(from.value, "5");
      assert.equal(to.value, "90");
      const fill = container.querySelector(".range-track-fill");
      assert.equal(fill?.classList.contains("is-set"), false);
    },
  );
});

test("the drag handles are hidden from assistive tech and the tab order", async () => {
  await withField(
    { bounds: { min: 25, max: 30 } },
    async ({ commits, container, from }) => {
      const { fireEvent } = await import("@testing-library/react");
      const handles = [
        ...container.querySelectorAll<HTMLInputElement>('input[type="range"]'),
      ];
      assert.equal(handles.length, 2);
      assert.equal(
        handles.every(
          (handle) =>
            handle.getAttribute("aria-hidden") === "true" &&
            handle.tabIndex === -1,
        ),
        true,
      );
      const fill = container.querySelector<HTMLElement>(".range-track-fill");
      assert.equal(fill?.classList.contains("is-set"), true);
      assert.equal(fill?.style.getPropertyValue("--from"), "25%");
      assert.equal(fill?.style.getPropertyValue("--to"), "50%");
      fireEvent.pointerDown(handles[0]!);
      fireEvent.input(handles[0]!, { target: { value: "35" } });
      assert.equal(from.value, "30");
      assert.equal(commits.length, 0);
      fireEvent.pointerUp(handles[0]!);
      assert.deepEqual(commits, [{ min: 30, max: 30 }]);
    },
  );
});

test("a drag that ends with a native change commits once and stops dragging", async () => {
  await withField(
    { bounds: { min: 25, max: 30 } },
    async ({ commits, container, from }) => {
      const { fireEvent } = await import("@testing-library/react");
      const handle = container.querySelector<HTMLInputElement>(
        'input[type="range"]',
      )!;
      const field = container.querySelector(".range-field")!;
      fireEvent.pointerDown(handle);
      assert.equal(field.classList.contains("is-dragging"), true);
      fireEvent.input(handle, { target: { value: "22" } });
      fireEvent(handle, new window.Event("change", { bubbles: true }));
      assert.deepEqual(commits, [{ min: 22, max: 30 }]);
      assert.equal(from.value, "22");
      assert.equal(field.classList.contains("is-dragging"), false);
    },
  );
});

test("clearing the stored bounds empties a field that showed a stepped scale end", async () => {
  await withField({}, async ({ from, setStored }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.keyDown(from, { key: "ArrowUp" });
    assert.equal(from.value, "20");
    setStored({ min: null, max: null });
    assert.equal(from.value, "");
  });
});
