import type { EventId } from "../../data/events.ts";
import { joinNames } from "./polish-format.ts";

export const DIALOGS_TEXT = {
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
  confirmNewGame: {
    eyebrow: "Nowa gra",
    title: "Zacząć nową grę?",
    description:
      "Obecna selekcja i historia decyzji przepadną. Tego nie da się cofnąć.",
    confirm: "Zacznij nową grę",
    cancel: "Wróć do gry",
  },
  confirmRestart: {
    eyebrow: "Nowa gra",
    title: "Zagrać od początku?",
    description:
      "Raport turnieju i obecna selekcja przepadną. Tego nie da się cofnąć.",
    confirm: "Zagraj od początku",
    cancel: "Wróć do raportu",
  },
  closeDialog: "Zamknij",
  closeDialogHint: "Zamknij okno. Nic się nie zmieni.",
  profilePositions: "Pozycje",
  profileAttributes: "Atrybuty",
  leadFoot: { both: "obie", left: "lewa", right: "prawa" },
  // the profile meters and the comparison rows after "Ocena selekcyjna", in this order
  profileMetrics: [
    "Jakość",
    "Forma",
    "Zdrowie",
    "Taktyka",
    "Doświadczenie",
    "Zgranie kadrowe",
    "Wpływ na grupę",
  ],
  removeFromSquad: "Odwołaj z kadry",
  addToSquad: "Powołaj do kadry",
  returnToList: "Wróć do listy",
  fullSquadTitle: "Lista jest pełna",
  fullSquadMessage:
    "Aby powołać kolejnego zawodnika, najpierw zwolnij jedno miejsce.",
  notice: "Uwaga",
  understood: "Rozumiem",
  comparisonEyebrow: "Analiza porównawcza",
  selectBoth: "Powołaj obu",
  selectBothName: (first: string, second: string) =>
    `Powołaj obu: ${joinNames([first, second])}`,
  selectBothBlocked: "Zostało za mało miejsc, by powołać obu",
  sharedTraits: (names: string) => `Wspólne cechy: ${names}.`,
  clearComparison: "Wyczyść porównanie",
  returnWithoutClearing: "Wróć bez czyszczenia",
  outOfFormationEyebrow: "Dopasowanie do ustawienia",
  outOfFormationExplanation:
    "Ci zawodnicy nie mają żadnej naturalnej pozycji w wybranej formacji. Możesz ich powołać, ale będzie to wymagało zmiany ustawienia lub gry poza nominalną rolą.",
  returnToPitch: "Wróć do mapy",
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
  eventContext: (atPlayers: number, index: number, total: number) =>
    `Przy ${atPlayers} powołaniach sztab zgłasza sprawę do rozstrzygnięcia (${index} z ${total}). Twój wybór wpłynie na ocenę całej kadry.`,
  eventCurrent: "Obecnie:",
  eventEffects: {
    risk: "Ryzyko urazu",
    quality: "Jakość",
    chemistry: "Zgranie",
  },
  effectDirection: { up: "rośnie", down: "spada" },
  eventUndo: "Cofnij ostatnie powołanie",
  campReportEyebrow: "Raport po zgrupowaniu",
  campReportTitle: "Masz więcej danych. Nie wszystkie są wygodne.",
  campReportBody: (best: string, doubts: string) =>
    `Najlepiej wypadli ${best}. Najwięcej wątpliwości zostawili ${doubts}. Ocena selekcyjna uwzględnia teraz występ i znajomość automatyzmów.`,
  continueToFinal: "Przejdź do powołań na EURO",
} as const;
