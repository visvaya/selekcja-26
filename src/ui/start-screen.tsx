import type { RefObject } from "react";
import { players, systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { SystemId } from "../data/types.ts";
import { ChangelogSection } from "./changelog-section.tsx";
import { FormationMap } from "./formation-map.tsx";
import { UI_TEXT as text } from "./text.ts";

// Decorative bars in the ticket stub (not a game rule).
const TICKET_BARCODE_BARS = 7;

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
      <fieldset className="choice-fieldset">
        <legend className="choice-title">{text.systemChoice}</legend>
        <div className="model-choice-layout">
          <div className="choice-grid">
            {systems.map((candidate) => (
              <label
                key={candidate.id}
                className={`choice ${system === candidate.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="system"
                  className="radio"
                  value={candidate.id}
                  checked={system === candidate.id}
                  onChange={() => onSystem(candidate.id)}
                />
                <span>
                  <b>{text.systems[candidate.id].name}</b>{" "}
                  <small>{text.systems[candidate.id].description}</small>
                </span>
              </label>
            ))}
          </div>
          <FormationMap system={system} />
        </div>
      </fieldset>
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
