import { systems } from "../data/catalog.ts";
import type { SystemId } from "../data/types.ts";
import { PitchField } from "./pitch-field.tsx";
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
        <PitchField
          shape={shape}
          renderNode={(code, key) => (
            <span key={key} className="pitch-node">
              <small>{code}</small>
            </span>
          )}
        />
      </div>
    </div>
  );
}
