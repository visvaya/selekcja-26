import type { ReactNode } from "react";
import type { DetailedPosition } from "../data/types.ts";

// The drawn field shared by the start screen map and the squad board: marker lines behind
// one row of nodes per formation line.
export function PitchField({
  shape,
  renderNode,
}: {
  shape: readonly (readonly DetailedPosition[])[];
  renderNode: (code: DetailedPosition, key: string) => ReactNode;
}) {
  return (
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
            {row.map((code, slot) => renderNode(code, `${rowIndex}-${slot}`))}
          </div>
        ))}
      </div>
    </div>
  );
}
