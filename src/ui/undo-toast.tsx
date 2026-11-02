import { useEffect, useState } from "react";
import { UI_CONFIG } from "./ui-config.ts";

// A new object per undo, so the same sentence twice still restarts the timer.
export type UndoMessage = { readonly id: number; readonly text: string };

// A short visible note on what the last undo reverted. The live region already reads the
// sentence, so the note is hidden from assistive tech and lets pointer input through.
export function UndoToast({ message }: { message: UndoMessage | null }) {
  const [expiredId, setExpiredId] = useState<number | null>(null);
  useEffect(() => {
    if (!message) return;
    const { id } = message;
    const timer = setTimeout(() => setExpiredId(id), UI_CONFIG.undoToastMs);
    return () => clearTimeout(timer);
  }, [message]);
  if (!message) return null;
  const visible = expiredId !== message.id;
  return (
    <div
      className={
        visible ? "undo-toast tip-surface is-visible" : "undo-toast tip-surface"
      }
      aria-hidden="true"
    >
      {message.text}
    </div>
  );
}
