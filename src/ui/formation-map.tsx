import { systems } from "../data/catalog.ts";
import type { SystemId } from "../data/types.ts";
import { UI_TEXT as text } from "./text.ts";

// The start screen's position map for the chosen formation: positions only, no counts.
export function FormationMap({ system }: { system: SystemId }) {
  const shape = systems.find((candidate) => candidate.id === system)!.shape;
  const name = text.systems[system].name;
  return (
    <div className="pitch-panel model-preview">
      <div
        className="mini-pitch"
        role="img"
        aria-label={text.formationMap(name)}
      >
        <div className="formation-label">
          <i aria-hidden="true" />
          <b>{name}</b>
        </div>
        <div className="pitch-field">
          <div className="pitch-markings" aria-hidden="true">
            <span className="box box-top" />
            <span className="centre-circle" />
            <span className="halfway" />
            <span className="box box-bottom" />
          </div>
          <div className="pitch-body">
            {shape.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`pitch-row ${row.length === 1 ? "single" : ""}`}
              >
                {row.map((code, slot) => (
                  <span key={`${rowIndex}-${slot}`} className="pitch-node">
                    <small>{code}</small>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
