import type {
  AvailabilityFlagId,
  DetailedPosition,
  RoleId,
  SortId,
  TrialNoteId,
} from "../../data/types.ts";

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

export const LIST_TEXT = {
  autoFill: "Dobierz losowo",
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
} as const;
