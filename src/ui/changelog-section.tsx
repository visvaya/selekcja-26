import { useState } from "react";
import { CHANGELOG } from "../data/changelog.ts";
import { UI_TEXT as text } from "./text.ts";

// Renders the latest changelog entry, with older entries behind a disclosure button. Disclosure
// state is local UI state: it is not part of the game reducer, not saved, and not an undo step.
export function ChangelogSection() {
  const [expanded, setExpanded] = useState(false);
  const [latest, ...older] = CHANGELOG;
  if (!latest) return null;
  return (
    <section className="report changelog" aria-labelledby="changelog-title">
      <h2 id="changelog-title">{text.changelogTitle}</h2>
      <p className="changelog-version">
        {text.changelogVersionLabel(latest.version, latest.date)}
      </p>
      <ul>
        {text.changelogNotes[latest.version].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {older.length > 0 && (
        <>
          <button
            type="button"
            className="action-button changelog-toggle"
            aria-expanded={expanded}
            aria-controls="changelog-older"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? text.changelogHideOlder
              : text.changelogShowOlder(older.length)}
          </button>
          <div
            id="changelog-older"
            className={expanded ? "changelog-older" : "changelog-older hidden"}
          >
            {older.map((entry) => (
              <div className="changelog-entry" key={entry.version}>
                <p className="changelog-version">
                  {text.changelogVersionLabel(entry.version, entry.date)}
                </p>
                <ul>
                  {text.changelogNotes[entry.version].map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
