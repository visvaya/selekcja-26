import type { RefObject } from "react";
import { players, systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { SystemId } from "../data/types.ts";
import { ChangelogSection } from "./changelog-section.tsx";
import { UI_TEXT as text } from "./text.ts";

// Decorative bars in the ticket stub (not a game rule).
const TICKET_BARCODE_BARS = 7;

function ChoiceButton({
  selected,
  name,
  description,
  onClick,
}: {
  selected: boolean;
  name: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`choice ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="radio" aria-hidden="true" />
      <span>
        <b>{name}</b>
        <small>{description}</small>
      </span>
    </button>
  );
}

export function StartScreen({
  system,
  canUndo,
  headingRef,
  onSystem,
  onStart,
  onUndo,
}: {
  system: SystemId;
  canUndo: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSystem: (value: SystemId) => void;
  onStart: () => void;
  onUndo: () => void;
}) {
  return (
    <section className="start">
      <div className="hero-e-ticket start-ticket">
        <div className="hero-e-main">
          <h1 className="hero-sample-title" ref={headingRef} tabIndex={-1}>
            {text.ticket.title}
          </h1>
          <p className="hero-sample-lead start-ticket-lead">
            <span>{text.ticket.dates}</span>
            <span>{text.ticket.candidates(players.length)}</span>
          </p>
          <dl className="hero-e-fields">
            <div>
              <dt>{text.ticket.stagesLabel}</dt>
              <dd>{Object.keys(text.stages).length}</dd>
            </div>
            <div>
              <dt>{text.ticket.nextStageLabel}</dt>
              <dd>{text.ticket.nextStage}</dd>
            </div>
            <div>
              <dt>{text.ticket.campPlacesLabel}</dt>
              <dd>{GAME_RULES.camp.squadSizePlayers}</dd>
            </div>
            <div>
              <dt>{text.ticket.finalPlacesLabel}</dt>
              <dd>{GAME_RULES.final.squadSizePlayers}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-e-stub" aria-hidden="true">
          <span className="hero-e-barcode">
            {Array.from({ length: TICKET_BARCODE_BARS }, (_, index) => (
              <i key={index} />
            ))}
          </span>
          <span className="hero-e-num">{text.ticket.stub}</span>
        </div>
      </div>
      <div className="choice-title">{text.systemChoice}</div>
      <div className="choice-grid">
        {systems.map((candidate) => (
          <ChoiceButton
            key={candidate.id}
            selected={system === candidate.id}
            name={text.systems[candidate.id].name}
            description={text.systems[candidate.id].description}
            onClick={() => onSystem(candidate.id)}
          />
        ))}
      </div>
      <button className="primary start-button" onClick={onStart}>
        {text.start}
      </button>
      {canUndo && (
        <button className="action-button" onClick={onUndo}>
          {text.undo}
        </button>
      )}
      <p className="fineprint">{text.disclaimer}</p>
      <ChangelogSection />
    </section>
  );
}
