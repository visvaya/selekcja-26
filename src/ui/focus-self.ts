import type { MouseEvent } from "react";

// Safari does not focus a tapped button. A button that opens a dialog or the board sheet
// focuses itself first, so focus can return to it when that dialog or sheet closes.
export function focusSelf(event: MouseEvent<HTMLElement>): void {
  event.currentTarget.focus({ preventScroll: true });
}
