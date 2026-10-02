const px = (value: string) => Number.parseFloat(value) || 0;

// Content-box width in fractional pixels; clientWidth would round and wrongly truncate.
export function contentWidth(element: HTMLElement): number {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const edges = style
    ? px(style.paddingLeft) +
      px(style.paddingRight) +
      px(style.borderLeftWidth) +
      px(style.borderRightWidth)
    : 0;
  return element.getBoundingClientRect().width - edges;
}

// Natural width of `text` in an invisible probe with the name's own class.
export function naturalWidth(
  parent: HTMLElement,
  className: string,
  text: string,
): number {
  const probe = parent.ownerDocument.createElement("span");
  probe.className = `${className} fit-probe`;
  probe.textContent = text;
  parent.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}
