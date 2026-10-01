import type { RefObject } from "react";
import { players, systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { SystemId } from "../data/types.ts";
import { ChangelogSection } from "./changelog-section.tsx";
import { UI_TEXT as text } from "./text.ts";

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
      <div className="eyebrow">{text.introEyebrow}</div>
      <h1 className="hero-title" ref={headingRef} tabIndex={-1}>
        {text.introTitle}
      </h1>
      <p className="lead">{text.introLead}</p>
      <div className="brief">
        <h2>{text.briefTitle}</h2>
        <div className="brief-grid">
          <div className="brief-stat">
            <b>{players.length}</b>
            <span>{text.candidateCount}</span>
          </div>
          <div className="brief-stat">
            <b>{Object.keys(text.stages).length}</b>
            <span>{text.campCount}</span>
          </div>
          <div className="brief-stat">
            <b>
              {GAME_RULES.camp.squadSizePlayers} →{" "}
              {GAME_RULES.final.squadSizePlayers}
            </b>
            <span>{text.rosterTransition}</span>
          </div>
          <div className="brief-stat">
            <b>{GAME_RULES.groupMatchesCount}</b>
            <span>{text.groupMatches}</span>
          </div>
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
