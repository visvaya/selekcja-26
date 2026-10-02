import { systems } from "../data/catalog.ts";
import type { GameState } from "../data/types.ts";
import { slotCount } from "../logic/selection.ts";
import { PitchField } from "./pitch-field.tsx";
import { UI_TEXT as text } from "./text.ts";

// The squad board's formation: how many called-up players can play each slot.
export function Pitch({ state }: { state: GameState }) {
  const system = systems.find((candidate) => candidate.id === state.system)!;
  const name = text.systems[state.system].name;
  const accessibleSlots = system.shape
    .flat()
    .map((position) =>
      text.occupied(slotCount(state, position), text.positions[position]),
    )
    .join(". ");
  return (
    <div
      className="mini-pitch"
      role="img"
      aria-label={`${name}. ${text.pitchDescription} ${accessibleSlots}`}
    >
      <div className="formation-label">
        <i aria-hidden="true" />
        <span>
          <b>{name}</b>
          <small>{text.pitchDescription}</small>
        </span>
      </div>
      <PitchField
        shape={system.shape}
        renderNode={(code, key) => {
          const count = slotCount(state, code);
          return (
            <span
              className="pitch-node"
              key={key}
              title={text.occupied(count, text.positions[code])}
            >
              <small>{code}</small>
              <b>{count}</b>
            </span>
          );
        }}
      />
    </div>
  );
}
