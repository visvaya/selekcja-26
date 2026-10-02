import type { Stage, SystemId } from "../../data/types.ts";
import type { ChangelogVersion } from "../../data/changelog.ts";
import { plural } from "./polish-format.ts";

// Formats an ISO "YYYY-MM-DD" changelog date as Polish "DD.MM.YYYY". No Intl dependency: the
// format is fixed and locale-independent from the caller's point of view.
function formatChangelogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export const START_TEXT = {
  ticket: {
    title: "Bilet na EURO",
    dates: "Turniej: 9 czerwca – 9 lipca 2028.",
    candidates: (count: number) =>
      `Wybierasz spośród ${count} ${plural(count, "kandydata", "kandydatów", "kandydatów")}.`,
    stagesLabel: "Etapy selekcji",
    nextStageLabel: "Najbliższy etap",
    nextStage: "Zgrupowanie kontrolne",
    campPlacesLabel: "Miejsca na 1. zgrupowaniu",
    finalPlacesLabel: "Miejsca w kadrze turniejowej",
    stub: "EURO28",
  },
  systemChoice: "Wybierz formację",
  formationMap: (name: string) =>
    `${name}. Mapa pozycji dla wybranej formacji.`,

  start: "Rozpocznij odprawę",
  undo: "Cofnij",
  disclaimer:
    "Nieoficjalna gra fanowska. Nie jest rzeczywistym produktem PZPN/UEFA.",
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
  stages: {
    camp: {
      phase: "ZGRUPOWANIE 1/2",
      eyebrow: "MARZEC 2028",
      heading: "Wybierz 23 zawodników na test",
      hint: "To moment na sprawdzenie nowych twarzy. Występ na zgrupowaniu ujawni dodatkowe informacje przed EURO.",
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
  changelogTitle: "Co nowego",
  plannedTitle: "Co planujemy",
  plannedNotes: [
    "Forma zawodników, która zmienia się w trakcie przygotowań.",
    "Możliwość zmiany systemu gry po marcowym zgrupowaniu.",
  ],
  plannedDisclaimer: "Plany mogą się zmienić.",
  changelogVersionLabel: (version: string, date: string) =>
    `Wersja ${version} · ${formatChangelogDate(date)}`,
  changelogShowOlder: (count: number) => `Wcześniejsze zmiany (${count})`,
  changelogHideOlder: "Ukryj wcześniejsze zmiany",
  changelogNotes: {
    "0.1.8": ["Poprawione teksty na ekranie zgrupowania i na starcie."],
    "0.1.7": [
      "Raport turniejowy mówi o reprezentacji w pierwszej osobie, np. „Zakończyliśmy udział w turnieju po fazie grupowej.”.",
    ],
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
} as const;
