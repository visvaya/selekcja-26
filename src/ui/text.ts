import type {
  AvailabilityFlagId,
  DetailedPosition,
  GroupPosition,
  OutcomeId,
  PriorityId,
  RoleId,
  SortId,
  Stage,
  SystemId,
  TrialNoteId,
} from "../data/types.ts";
import type { EventId } from "../data/events.ts";
import type { SaveFailureReason } from "../logic/storage.ts";
import type { ChangelogVersion } from "../data/changelog.ts";

// Formats an ISO "YYYY-MM-DD" changelog date as Polish "DD.MM.YYYY". No Intl dependency: the
// format is fixed and locale-independent from the caller's point of view.
function formatChangelogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

// Polish plural of "rok" for an age: 1 rok; 2-4, 22-24, 32-34 lata (but 12-14 lat); otherwise lat.
function formatAge(years: number): string {
  if (years === 1) return "1 rok";
  const lastDigit = years % 10,
    lastTwoDigits = years % 100;
  const few =
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14);
  return `${years} ${few ? "lata" : "lat"}`;
}

export const UI_TEXT = {
  brand: "SELEKCJA",
  introPhase: "ODPRAWA",
  resultPhase: "RAPORT",
  loading: "Wczytywanie gry…",
  introEyebrow: "Symulator selekcjonera • EURO 2028",
  introTitle: "Jedna lista. Cały kraj ocenia.",
  introLead:
    "Wybierz 26 zawodników na mistrzostwa Europy. Nazwiska pomagają, ale turniej wygrywa kadra zbudowana pod plan – nie ranking popularności.",
  briefTitle: "Notatka sztabu szkoleniowego",
  candidateCount: "kandydatów",
  campCount: "zgrupowania",
  rosterTransition: "lista kontrolna i EURO",
  groupMatches: "mecze w grupie",
  systemChoice: "Wybierz model gry",
  priorityChoice: "Ustal priorytet selekcji",
  start: "Rozpocznij odprawę",
  autoFill: "Dobierz losowo",
  undo: "Cofnij",
  roles: {
    aerial: "Powietrze",
    ballPlaying: "Gra nogami",
    ballWinning: "Odbiór",
    boxPresence: "Pole karne",
    buildUp: "Wyprowadzenie",
    centreBack: "Stoper",
    dribbling: "Drybling",
    experience: "Doświadczenie",
    leader: "Lider",
    leftFoot: "Lewa noga",
    linkUp: "Łączenie gry",
    longShots: "Strzał z dystansu",
    pace: "Szybkość",
    playmaker: "Kreator",
    potential: "Potencjał",
    pressing: "Pressing",
    reach: "Zasięg",
    reflexes: "Refleks",
    rightBack: "Prawy obrońca",
    setPieces: "Stałe fragmenty",
    striker: "Napastnik",
    winger: "Skrzydło",
    wingBack: "Wahadło",
  } satisfies Record<RoleId, string>,
  availabilityFlags: {
    injuryRisk: "Ryzyko urazu",
    minutesLimit: "Limit minut",
  } satisfies Record<AvailabilityFlagId, string>,
  autoFillErrors: {
    full: "Kadra jest już pełna. Odwołaj zawodnika, aby zwolnić miejsce.",
    insufficientSlots:
      "Pozostało zbyt mało miejsc, aby spełnić wymagane proporcje. Odwołaj zawodników z nadliczbowych grup i spróbuj ponownie.",
    candidateShortage:
      "Nie ma wystarczającej liczby dostępnych zawodników w wymaganej grupie.",
    tooManyGoalkeepers:
      "W finałowej kadrze mogą być dokładnie trzej bramkarze. Odwołaj nadliczbowego bramkarza i spróbuj ponownie.",
  },
  autoFillErrorTitle: "Nie udało się dobrać zawodników",
  disclaimer:
    "Nieoficjalna gra fanowska. Kluby, dostępność i oceny są elementem scenariusza EURO 2028 oraz autorskim modelem rozgrywki – nie rzeczywistym scoutingiem ani produktem PZPN/UEFA.",
  systems: {
    "4231": {
      name: "4–2–3–1",
      description: "Kontrola środka, skrzydła schodzące do półprzestrzeni.",
    },
    "3421": {
      name: "3–4–2–1",
      description: "Trzech stoperów, wahadła i dwóch graczy między liniami.",
    },
    "433": {
      name: "4–3–3",
      description: "Pressing, mobilna ósemka i szeroko ustawieni skrzydłowi.",
    },
  } satisfies Record<SystemId, { name: string; description: string }>,
  priorities: {
    balance: {
      name: "Zrównoważony",
      description:
        "Najbliższy realizmowi: forma, rytm, doświadczenie, kadra, grupa i taktyka.",
    },
    form: {
      name: "Liczy się dziś",
      description: "Premia za obecną formę i rytm meczowy.",
    },
    quality: {
      name: "Najlepsi piłkarze",
      description: "Zaufanie do klasy, doświadczenia i sufitu.",
    },
  } satisfies Record<PriorityId, { name: string; description: string }>,
  stages: {
    camp: {
      phase: "ZGRUPOWANIE 1/2",
      eyebrow: "MARZEC 2028",
      heading: "Wybierz 23 zawodników na test",
      hint: "To moment na sprawdzenie wynalazków. Występ na zgrupowaniu ujawni dodatkową informację przed EURO.",
      finalize: "Jedź na zgrupowanie",
      completed: "Lista kontrolna gotowa",
      suffix: "LISTA KONTROLNA",
    },
    final: {
      phase: "ZGRUPOWANIE 2/2",
      eyebrow: "CZERWIEC 2028",
      heading: "Wybierz finałową kadrę 26",
      hint: "Masz raport z marcowego zgrupowania. Możesz zaufać obserwacji albo powołać nieprzetestowanego zawodnika.",
      finalize: "Zatwierdź",
      completed: "Kadra jest kompletna",
      suffix: "EURO",
    },
  } satisfies Record<
    Stage,
    {
      phase: string;
      eyebrow: string;
      heading: string;
      hint: string;
      finalize: string;
      completed: string;
      suffix: string;
    }
  >,
  kpis: { quality: "Jakość", fit: "Dopasowanie", risk: "Ryzyko" },
  risk: { none: "Brak", low: "Niskie", medium: "Średnie", high: "Wysokie" },
  emptyValue: "Brak",
  searchPlaceholder: "Szukaj zawodnika lub klubu…",
  searchLabel: "Szukaj zawodnika",
  filterLabel: "Filtruj po pozycji",
  sortLabel: "Sortuj zawodników",
  allCandidates: "Wszyscy kandydaci",
  noCandidates: "Brak zawodników spełniających kryteria.",
  sort: {
    model: "Ocena selekcyjna",
    quality: "Jakość",
    form: "Forma i rytm",
    fitness: "Zdrowie",
    tactics: "Dopasowanie taktyczne",
    experience: "Doświadczenie",
    group: "Wpływ na grupę",
    young: "Wiek: najmłodsi",
    old: "Wiek: najstarsi",
    name: "Nazwisko A–Z",
  } satisfies Record<SortId, string>,
  positions: {
    BR: "Bramkarz",
    LO: "Lewy obrońca",
    LŚO: "Lewy środkowy obrońca",
    ŚO: "Środkowy obrońca",
    PŚO: "Prawy środkowy obrońca",
    PO: "Prawy obrońca",
    LWO: "Lewy wahadłowy",
    DP: "Defensywny pomocnik",
    ŚP: "Środkowy pomocnik",
    OP: "Ofensywny pomocnik",
    PWO: "Prawy wahadłowy",
    LS: "Lewe skrzydło",
    N: "Napastnik",
    PS: "Prawe skrzydło",
  } satisfies Record<DetailedPosition, string>,
  groups: {
    BR: "Bramkarze",
    OBR: "Obrońcy",
    POM: "Pomocnicy",
    ATA: "Napastnicy",
  } satisfies Record<GroupPosition, string>,
  filtersAll: "Wszyscy",
  select: "Powołaj",
  selected: "Powołany ✓",
  profile: "Profil",
  compare: "Porównaj",
  compared: "Wybrany",
  playerMetrics: {
    quality: "Jakość",
    form: "Forma",
    fitness: "Zdrowie",
    tactics: "Taktyka",
  },
  selectionScore: "Ocena selekcyjna",
  age: formatAge,
  campResult: "Zgrupowanie",
  trialNotes: {
    impressed: "przekonał",
    solid: "bez zarzutu",
    uncertain: "niepewny",
    disappointed: "rozczarował",
  } satisfies Record<TrialNoteId, string>,
  foot: {
    both: "Obunożny",
    left: "Lewa",
    right: "Prawa",
    lead: "Wiodąca noga:",
  },
  profileMetrics: [
    "Ocena selekcyjna",
    "Jakość",
    "Forma i rytm",
    "Zdrowie",
    "Taktyka",
    "Doświadczenie",
    "Zgranie kadrowe",
    "Wpływ na grupę",
  ],
  removeFromSquad: "Odwołaj z kadry",
  addToSquad: "Powołaj do kadry",
  removeShort: "Odwołaj",
  returnToList: "Wróć do listy",
  announcements: {
    undo: (count: number, limit: number) =>
      `Cofnięto ostatnią decyzję. Powołani: ${count} z ${limit}.`,
    autoFill: (added: number, count: number, limit: number) =>
      `Losowo dobrano zawodników: ${added}. Powołani: ${count} z ${limit}.`,
    eventResolved: (choiceTitle: string) =>
      `Zdarzenie rozstrzygnięte: ${choiceTitle}.`,
  },
  fullSquadTitle: "Lista jest pełna",
  fullSquadMessage:
    "Aby powołać kolejnego zawodnika, najpierw zwolnij jedno miejsce.",
  notice: "Uwaga",
  understood: "Rozumiem",
  save: {
    messages: {
      failed:
        "Nie udało się zapisać postępu. Ostatnie zmiany mogą przepaść po zamknięciu karty.",
      quota:
        "Nie udało się zapisać postępu: w pamięci przeglądarki brakuje miejsca. Zwolnij miejsce i spróbuj ponownie.",
      unavailable:
        "Postęp nie jest zapisywany: przeglądarka nie udostępnia pamięci (np. tryb prywatny). Możesz grać dalej, ale po zamknięciu karty gra zacznie się od nowa.",
    } satisfies Record<SaveFailureReason, string>,
    retry: "Spróbuj ponownie",
    recovered: "Postęp zapisany.",
  },
  comparisonEyebrow: "Analiza porównawcza",
  comparisonTitle: "Dwóch kandydatów, jedno miejsce?",
  clearComparison: "Wyczyść porównanie",
  returnWithoutClearing: "Wróć bez czyszczenia",
  outOfFormation: "Poza ustawieniem",
  outOfFormationEyebrow: "Dopasowanie do ustawienia",
  outOfFormationExplanation:
    "Ci zawodnicy nie mają żadnej naturalnej pozycji w wybranej formacji. Możesz ich powołać, ale będzie to wymagało zmiany ustawienia lub gry poza nominalną rolą.",
  returnToPitch: "Wróć do mapy",
  availablePlayers: "liczba dostępnych",
  pitchDescription:
    "Liczby pokazują, ilu powołanych może grać na danej pozycji.",
  dockOpen: "Dotknij, aby zobaczyć podział miejsc",
  dockCoverage: "Dotknij, aby zobaczyć obsadę",
  missing: (count: number, group: string) => `brakuje ${count} × ${group}`,
  excess: (count: number, group: string) =>
    `jest o ${count} × ${group} za dużo`,
  remaining: (count: number) => `Zostało ${count} miejsc`,
  outOfFormationCount: (count: number) => `${count} poza ustawieniem`,
  outOfFormationTitle: (count: number) => `Poza ustawieniem: ${count}`,
  occupied: (count: number, position: string) =>
    `${position}: ${count} powołanych`,
  exact: "dokładnie",
  minimum: "min.",
  missingShort: (count: number) => `Brakuje ${count}`,
  excessShort: (count: number) => `O ${count} za dużo`,
  fulfilled: "✓ Spełnione",
  events: {
    doctor: {
      title: "Raport medyczny: przeciążenie",
      description:
        "Jeden z najbardziej doświadczonych zawodników może zagrać, ale sztab przewiduje podwyższone ryzyko urazu w trzecim meczu grupowym.",
      choices: [
        {
          title: "Ogranicz jego minuty",
          description: "Mniej jakości w pierwszym składzie, niższe ryzyko.",
        },
        {
          title: "Zaufaj zawodnikowi",
          description: "Zachowujesz pełną jakość, ale ryzyko rośnie.",
        },
      ],
    },
    captain: {
      title: "Kapitan prosi o ciągłość",
      description:
        "Liderzy chcą zachować trzon znający automatyzmy. Analitycy wskazują jednak dwóch młodszych graczy w lepszej formie.",
      choices: [
        {
          title: "Postaw na ciągłość",
          description: "Wyższa chemia i odporność na presję.",
        },
        {
          title: "Wybierz aktualną formę",
          description: "Więcej dynamiki, ale mniej przewidywalna szatnia.",
        },
      ],
    },
    scout: {
      title: "Ostatni raport obserwacyjny",
      description:
        "Młody skrzydłowy imponuje w treningu. Dane z krótkiej próby są świetne, lecz sztab nie wie, jak zareaguje na turniejową presję.",
      choices: [
        {
          title: "Zostaw furtkę młodości",
          description:
            "Premia za nieprzewidywalność, większa wariancja wyniku.",
        },
        {
          title: "Chroń strukturę kadry",
          description: "Mniejszy sufit, stabilniejsze minimum.",
        },
      ],
    },
  } satisfies Record<
    EventId,
    {
      title: string;
      description: string;
      choices: { title: string; description: string }[];
    }
  >,
  eventEyebrow: "Sytuacja ze zgrupowania",
  campReportEyebrow: "Raport po zgrupowaniu",
  campReportTitle: "Masz więcej danych. Nie wszystkie są wygodne.",
  campReportBody: (best: string, doubts: string) =>
    `Najlepiej wypadli ${best}. Najwięcej wątpliwości zostawili ${doubts}. Ocena selekcyjna uwzględnia teraz występ i znajomość automatyzmów.`,
  continueToFinal: "Przejdź do powołań na EURO",
  reportEyebrow: "Raport turniejowy",
  pointsInGroup: (count: number) => `Polska zdobyła ${count} pkt w grupie.`,
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
  rulesChangedTitle: "Zmieniły się zasady gry",
  rulesChangedDiscarded:
    "Od twojej ostatniej wizyty zmieniły się zasady gry i nie ma możliwości wczytania niedokończonej selekcji. Zaczynasz od nowa.",
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
  changelogTitle: "Co nowego",
  changelogVersionLabel: (version: string, date: string) =>
    `Wersja ${version} · ${formatChangelogDate(date)}`,
  topBarVersion: (version: string) => `v${version}`,
  topBarVersionAccessible: (version: string) => `Wersja ${version}`,
  changelogShowOlder: (count: number) => `Wcześniejsze zmiany (${count})`,
  changelogHideOlder: "Ukryj wcześniejsze zmiany",
  changelogNotes: {
    "0.1.6": [
      "Komunikat po nieudanym losowym doborze ma jaśniejszy tytuł: „Nie udało się dobrać zawodników”.",
    ],
    "0.1.5": [
      "Wynik turnieju jest ostateczny: na ekranie raportu nie ma już przycisku „Cofnij”.",
    ],
    "0.1.4": [
      "Wiek zawodników ma poprawną formę, np. „34 lata” zamiast „34 lat”.",
      "Raport turniejowy nie powtarza już ostatniego meczu pod listą spotkań. Ostatni wiersz listy to ostatni mecz.",
    ],
    "0.1.3": [
      "Obwódka wskazująca aktywny element przy grze klawiaturą jest wyraźniejsza i dobrze widoczna na każdym tle.",
    ],
    "0.1.2": [
      "Jeśli gra napotka nieoczekiwany błąd, zamiast pustej strony pojawia się komunikat z możliwością odświeżenia strony albo rozpoczęcia od nowa.",
      "Przy grze klawiaturą fokus po zmianie ekranu trafia na jego nagłówek, a po zamknięciu okna wraca w widoczne miejsce.",
      "Czytniki ekranu ogłaszają wynik cofnięcia decyzji, losowego doboru i rozstrzygnięcia zdarzenia.",
      "Przy włączonym w systemie ograniczeniu ruchu strona nie przewija się płynnie, a karty zawodników nie są animowane.",
    ],
    "0.1.1": [
      "Gdy przeglądarka nie zapisze postępu, na górze ekranu pojawia się pasek z wyjaśnieniem. Przy braku miejsca albo błędzie zapisu można spróbować ponownie, a pasek znika po udanym zapisie.",
      "Jeśli zmienią się zasady gry, ukończony raport zostaje jako historia z adnotacją, a niedokończonej selekcji nie da się wczytać. Gra mówi o tym wprost.",
      "Selekcje zapisane w poprzedniej wersji wczytują się dalej bez utraty postępu. W najstarszych zapisach, sprzed wprowadzenia historii cofania, wcześniejszych decyzji nie da się cofnąć.",
      "Numer wersji na górnym pasku i lista zmian na ekranie startowym.",
    ],
    "0.1.0": [
      "Pierwsza wersja: marcowe zgrupowanie na 23 zawodników, kadra turniejowa na 26, trzy systemy gry, zdarzenia ze zgrupowania, cofanie decyzji i raport z turnieju.",
    ],
  } satisfies Record<ChangelogVersion, readonly string[]>,
  errorBoundary: {
    title: "Coś poszło nie tak",
    message:
      "Gra napotkała nieoczekiwany błąd. Odśwież stronę – ostatni zapisany postęp powinien się wczytać. Jeśli błąd wraca, zacznij od nowa; zapisana gra zostanie wtedy usunięta.",
    reload: "Odśwież stronę",
    reset: "Zacznij od nowa",
  },
} as const;
