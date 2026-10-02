import type { SaveFailureReason } from "../../logic/storage.ts";

export const SYSTEM_TEXT = {
  brand: "SELEKCJA",
  introPhase: "ODPRAWA",
  resultPhase: "RAPORT",
  loading: "Wczytywanie gry…",
  announcements: {
    undo: (count: number, limit: number) =>
      `Cofnięto ostatnią decyzję. Powołani: ${count} z ${limit}.`,
    autoFill: (added: number, count: number, limit: number) =>
      `Losowo dobrano zawodników: ${added}. Powołani: ${count} z ${limit}.`,
    clearSquad:
      "Odwołano wszystkich zawodników. Możesz to cofnąć przyciskiem „Cofnij”.",
    eventResolved: (choiceTitle: string) =>
      `Zdarzenie rozstrzygnięte: ${choiceTitle}.`,
  },
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
  rulesChangedTitle: "Zmieniły się zasady gry",
  rulesChangedDiscarded:
    "Od twojej ostatniej wizyty zmieniły się zasady gry i nie ma możliwości wczytania niedokończonej selekcji. Zaczynasz od nowa.",
  topBarVersion: (version: string) => `v${version}`,
  topBarVersionAccessible: (version: string) => `Wersja ${version}`,
  phaseLabel: "Etap:",
  errorBoundary: {
    title: "Coś poszło nie tak",
    message:
      "Gra napotkała nieoczekiwany błąd. Odśwież stronę – ostatni zapisany postęp powinien się wczytać. Jeśli błąd wraca, zacznij od nowa; zapisana gra zostanie wtedy usunięta.",
    reload: "Odśwież stronę",
    reset: "Zacznij od nowa",
  },
} as const;
