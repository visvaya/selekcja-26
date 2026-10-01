import type { OutcomeId } from "../../data/types.ts";

// The report's closing sentence, speaking of Poland as "we", keyed by the stage label the report
// stores (`FinalReport.stage`). Built at display time, so older saved reports read the same way;
// the sentence stored in `story.outcome` stays frozen, because it is part of the golden traces.
const REPORT_OUTCOMES: Readonly<Record<string, string>> = {
  "Faza grupowa": "Zakończyliśmy udział w turnieju po fazie grupowej.",
  "1/8 finału": "Odpadliśmy w 1/8 finału.",
  Ćwierćfinał: "Odpadliśmy w ćwierćfinale.",
  Półfinał: "Odpadliśmy w półfinale.",
  "Wicemistrz Europy": "Zostaliśmy wicemistrzami Europy.",
  "Mistrz Europy": "Zostaliśmy mistrzami Europy.",
};

export const REPORT_TEXT = {
  reportEyebrow: "Raport turniejowy",
  pointsInGroup: (count: number) => `Zdobyliśmy ${count} pkt w grupie.`,
  reportOutcome: (stage: string): string | undefined =>
    Object.hasOwn(REPORT_OUTCOMES, stage) ? REPORT_OUTCOMES[stage] : undefined,
  outcomes: {
    champion: "Mistrz Europy",
    runnerUp: "Wicemistrz Europy",
    semifinal: "Półfinał",
    quarterfinal: "Ćwierćfinał",
    roundOf16: "1/8 finału",
    group: "Faza grupowa",
  } satisfies Record<OutcomeId, string>,
  tournament: {
    groupOpponents: [
      "Dania",
      "Szwajcaria",
      "Serbia",
      "Austria",
      "Szkocja",
      "Turcja",
    ],
    knockoutOpponents: [
      "Francja",
      "Hiszpania",
      "Anglia",
      "Niemcy",
      "Portugalia",
      "Włochy",
      "Holandia",
    ],
    wins: ["2:0", "2:1", "1:0"],
    losses: ["0:1", "1:2", "0:2"],
    quarterfinalLosses: ["1:1, karne 3:4", "0:1", "1:2"],
    groupExit: ["1:1", "0:1", "1:2"],
    groupPoints: (points: number) => `Faza grupowa: ${points} pkt`,
    match: (score: string, opponent: string) => `Polska ${score} ${opponent}`,
    round: (name: string, match: string) => `${name}: ${match}`,
    groupLast: (match: string) => `Ostatni mecz grupy: ${match}`,
    groupOutcome: "Polska zakończyła udział w turnieju po fazie grupowej.",
    championOutcome: "Polska została mistrzem Europy.",
    runnerUpOutcome: "Polska została wicemistrzem Europy.",
    eliminated: (stage: string) =>
      `Polska odpadła w ${stage === "Półfinał" ? "półfinale" : stage === "Ćwierćfinał" ? "ćwierćfinale" : "1/8 finału"}.`,
    rounds: ["1/8 finału", "Ćwierćfinał", "Półfinał", "Finał"],
    groupStage: "Faza grupowa",
    championStage: "Mistrz Europy",
    runnerUpStage: "Wicemistrz Europy",
    semifinalStage: "Półfinał",
    quarterfinalStage: "Ćwierćfinał",
  },
  luck: {
    positive: "Kilka kluczowych momentów ułożyło się po twojej myśli.",
    negative: "Drobne zdarzenia boiskowe obróciły się przeciwko drużynie.",
    neutral:
      "Zespół uzyskał wynik odpowiadający jakości i przygotowaniu kadry.",
  },
  reportKpis: { quality: "Jakość", chemistry: "Chemia", roles: "Role" },
  tournamentProgress: "Przebieg turnieju",
  strengths: "Co zadziałało",
  weaknesses: "Ryzyka selekcji",
  yourSquad: "Twoja kadra",
  noStrengths: "Nie zbudowano wyraźnej przewagi strukturalnej.",
  noWeaknesses: "Analiza nie wykryła krytycznej luki w konstrukcji kadry.",
  restart: "Zagraj od początku",
  reportFromOlderRules:
    "Ten raport powstał według wcześniejszej wersji zasad gry.",
  simulationDisclaimer:
    "Symulacja ocenia strukturę decyzji i zawiera kontrolowaną losowość. Nie jest prognozą rzeczywistego wyniku sportowego.",
  resultReasons: {
    qualityHigh:
      "Wysoka jakość indywidualna daje rozwiązania przy zamkniętym meczu.",
    qualityLow:
      "Brakuje jakości do samodzielnego rozstrzygania trudnych spotkań.",
    chemHigh: "Trzon zespołu powinien dobrze reagować na kryzysy w meczu.",
    chemLow: "Relacje i hierarchia mogą pęknąć pod presją wyniku.",
    testedHigh: (count: number) =>
      `${count} powołanych przeszło wcześniejszy test w twoim systemie.`,
    testedLow: (count: number) =>
      `Aż ${count} zawodników jedzie na EURO bez testu w marcowym zgrupowaniu.`,
    coverageHigh:
      "Każda kluczowa rola w modelu gry ma co najmniej jednego wykonawcę.",
    coverageLow:
      "Nie wszystkie role potrzebne w wybranym systemie zostały pokryte.",
    fitnessHigh: "Kadra ma dobry poziom dostępności i energii na trzy mecze.",
    fitnessLow: "Profil zdrowotny kadry może wymusić nieplanowane rotacje.",
  },
} as const;
