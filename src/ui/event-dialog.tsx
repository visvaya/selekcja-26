import type { CampEvent } from "../data/events.ts";
import type { GameState } from "../data/types.ts";
import { riskLevel, squadQuality } from "../logic/selection.ts";
import { effectChips, eventOrdinal } from "./event-model.ts";
import type { EffectChip } from "./event-model.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

const ARROW_PATHS = { up: "M6 2l4 5H2z", down: "M6 10L2 5h8z" } as const;

function Effect({ chip }: { chip: EffectChip }) {
  const classes = [
    "effect",
    `effect-${chip.direction}`,
    chip.metric === "risk" ? "effect-inverse" : "",
    chip.good ? "effect-good" : "effect-bad",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      {text.eventEffects[chip.metric]}{" "}
      <svg className="effect-arrow" viewBox="0 0 12 12" aria-hidden="true">
        <path d={ARROW_PATHS[chip.direction]} />
      </svg>
      <span className="visually-hidden">
        {text.effectDirection[chip.direction]}
      </span>
    </span>
  );
}

export function EventDialog({
  event,
  state,
  onClose,
  onChoose,
  onUndo,
  restoreFocusFallback,
}: {
  event: CampEvent;
  state: GameState;
  onClose: () => void;
  onChoose: (index: number, choiceTitle: string) => void;
  onUndo: () => void;
  restoreFocusFallback: () => void;
}) {
  const copy = text.events[event.id];
  const ordinal = eventOrdinal(event.id);
  const quality = squadQuality(state);
  const risk = text.risk[riskLevel(state)].toLocaleLowerCase("pl");
  return (
    <GameDialog
      title={copy.title}
      eyebrow={text.eventEyebrow}
      onClose={onClose}
      blocking
      restoreFocusFallback={restoreFocusFallback}
    >
      <p className="event-context">
        {text.eventContext(ordinal.atPlayers, ordinal.index, ordinal.total)}
      </p>
      <p className="event-current">
        {text.eventCurrent}{" "}
        <b>
          {text.kpis.risk} {risk}
        </b>
        {" · "}
        <b>
          {text.kpis.quality} {quality ?? text.emptyValue}
        </b>
      </p>
      <p>{copy.description}</p>
      {copy.choices.map((choice, index) => (
        <button
          type="button"
          className="decision"
          key={choice.title}
          onClick={() => onChoose(index, choice.title)}
        >
          <b>{choice.title}</b>
          <small>{choice.description}</small>
          <span className="effects">
            {effectChips(event.choices[index]!).map((chip) => (
              <Effect chip={chip} key={chip.metric} />
            ))}
          </span>
        </button>
      ))}
      <button type="button" className="event-undo" onClick={onUndo}>
        {text.eventUndo}
      </button>
    </GameDialog>
  );
}
