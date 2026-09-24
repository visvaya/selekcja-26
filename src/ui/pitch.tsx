import { systems } from "../data/catalog.ts";
import type { GameState } from "../data/types.ts";
import { slotCount } from "../logic/selection.ts";
import { UI_TEXT as text } from "./text.ts";

export function Pitch({ state }: { state: GameState }) {
  const system = systems.find((candidate) => candidate.id === state.system)!;
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
      aria-label={`${text.systems[state.system].name}. ${text.pitchDescription} ${accessibleSlots}`}
    >
      <div className="formation-label">
        <i aria-hidden="true" />
        {text.systems[state.system].name} • {text.availablePlayers}
      </div>
      {system.shape.map((row, index) => (
        <div className="pitch-row" key={index}>
          {row.map((position, slot) => (
            <span
              className="pitch-node"
              key={`${position}-${slot}`}
              title={text.occupied(
                slotCount(state, position),
                text.positions[position],
              )}
            >
              <small>{position}</small>
              <b>{slotCount(state, position)}</b>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
