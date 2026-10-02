import { UI_TEXT as text } from "./text.ts";

// Lists the planned features next to the changelog on the start screen.
export function PlannedSection() {
  return (
    <section className="report changelog" aria-labelledby="planned-title">
      <h2 id="planned-title">{text.plannedTitle}</h2>
      <ul>
        {text.plannedNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p className="fineprint">{text.plannedDisclaimer}</p>
    </section>
  );
}
