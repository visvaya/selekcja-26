// Open popovers (a list strip's menu, a position badge's note). Engines without the
// :popover-open selector have none.
export function openPopovers(): HTMLElement[] {
  try {
    return [...document.querySelectorAll<HTMLElement>(":popover-open")];
  } catch {
    return [];
  }
}
