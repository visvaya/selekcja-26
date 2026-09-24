// A permanently mounted polite live region for screen readers. GameApp holds the announced
// message as local UI state (never saved, no undo step) and clears it before setting a new
// message so an identical announcement (e.g. undo twice in a row) still triggers a fresh
// mutation of this element's text content.
export function LiveAnnouncer({ message }: { message: string }) {
  return (
    <p className="visually-hidden" role="status" aria-live="polite">
      {message}
    </p>
  );
}
