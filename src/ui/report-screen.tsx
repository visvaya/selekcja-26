import type { RefObject } from "react";
import { positionOrder } from "../data/catalog.ts";
import { GAME_RULES, RULES_REVISION } from "../data/constants.ts";
import type { FinalReport } from "../data/types.ts";
import {
  detailedPositions,
  playersByIds,
  positionShort,
} from "../logic/selection.ts";
import { groupPositions } from "./group-order.ts";
import { UI_TEXT as text } from "./text.ts";

export function ReportScreen({
  report,
  onRestart,
  headingRef,
}: {
  report: FinalReport;
  onRestart: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const effect =
    report.luck > GAME_RULES.tournament.favorableLuckThresholdPoints
      ? text.luck.positive
      : report.luck < GAME_RULES.tournament.unfavorableLuckThresholdPoints
        ? text.luck.negative
        : text.luck.neutral;
  return (
    <section className="result">
      <div className="result-hero">
        <div className="eyebrow result-eyebrow">{text.reportEyebrow}</div>
        <div className="grade">{report.grade}</div>
        <h1 ref={headingRef} tabIndex={-1}>
          {report.stage}
        </h1>
        <p>
          {text.pointsInGroup(report.points)} {effect}{" "}
          {text.reportOutcome(report.stage) ?? report.story.outcome}
        </p>
        <div className="outcomes">
          <div className="outcome">
            <small>{text.reportKpis.quality}</small>
            <b>{Math.round(report.quality)}</b>
          </div>
          <div className="outcome">
            <small>{text.reportKpis.chemistry}</small>
            <b>{Math.round(report.chem)}</b>
          </div>
          <div className="outcome">
            <small>{text.reportKpis.roles}</small>
            <b>{Math.round(report.coverage)}%</b>
          </div>
        </div>
      </div>
      <div className="report">
        <h2>{text.tournamentProgress}</h2>
        <ul>
          {report.story.matches.map((match, index) => (
            <li key={index}>{match}</li>
          ))}
        </ul>
      </div>
      <div className="report">
        <h2>{text.strengths}</h2>
        <ul>
          {(report.strengths.length
            ? report.strengths
            : [text.noStrengths]
          ).map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className="report">
        <h2>{text.weaknesses}</h2>
        <ul>
          {(report.weak.length ? report.weak : [text.noWeaknesses]).map(
            (reason, index) => (
              <li key={index}>{reason}</li>
            ),
          )}
        </ul>
      </div>
      <div className="report">
        <h2>{text.yourSquad}</h2>
        {groupPositions.map((group) => (
          <div className="squad-group" key={group}>
            <h3>{text.groups[group]}</h3>
            <div className="squad-list">
              {playersByIds(report.squadIds)
                .filter((player) => player.pos === group)
                .sort(
                  (left, right) =>
                    positionOrder[detailedPositions(left)[0]!] -
                    positionOrder[detailedPositions(right)[0]!],
                )
                .map((player) => (
                  <span className="squad-pill" key={player.id}>
                    <b>{positionShort(player)}</b> {player.name}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      {report.rulesRevision !== RULES_REVISION && (
        <p className="fineprint">{text.reportFromOlderRules}</p>
      )}
      <button className="primary restart" onClick={onRestart}>
        {text.restart}
      </button>
      <p className="fineprint">{text.simulationDisclaimer}</p>
    </section>
  );
}
