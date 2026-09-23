// Migration of save schema versions 1 and 2 (players identified by display name, reports
// holding full player objects) to version 3 (stable player IDs). Works on raw parsed JSON;
// the caller validates the result against the version 3 shape.
import type { PlayerId } from "../data/types.ts";

// Frozen map from the names that versions 1 and 2 used as identifiers to the stable IDs.
// Never edit or remove an entry: saves written before the migration depend on it.
const LEGACY_PLAYER_IDS_BY_NAME: Readonly<Record<string, PlayerId>> =
  Object.freeze({
    "Łukasz Skorupski": "lukasz-skorupski",
    "Kamil Grabara": "kamil-grabara",
    "Marcin Bułka": "marcin-bulka",
    "Bartłomiej Drągowski": "bartlomiej-dragowski",
    "Jakub Kiwior": "jakub-kiwior",
    "Jan Bednarek": "jan-bednarek",
    "Matty Cash": "matty-cash",
    "Jakub Kamiński": "jakub-kaminski",
    "Kamil Piątkowski": "kamil-piatkowski",
    "Przemysław Wiśniewski": "przemyslaw-wisniewski",
    "Jan Ziółkowski": "jan-ziolkowski",
    "Sebastian Walukiewicz": "sebastian-walukiewicz",
    "Tomasz Kędziora": "tomasz-kedziora",
    "Paweł Dawidowicz": "pawel-dawidowicz",
    "Przemysław Frankowski": "przemyslaw-frankowski",
    "Arkadiusz Reca": "arkadiusz-reca",
    "Piotr Zieliński": "piotr-zielinski",
    "Nicola Zalewski": "nicola-zalewski",
    "Sebastian Szymański": "sebastian-szymanski",
    "Jakub Moder": "jakub-moder",
    "Bartosz Slisz": "bartosz-slisz",
    "Kacper Kozłowski": "kacper-kozlowski",
    "Kacper Urbański": "kacper-urbanski",
    "Maxi Oyedele": "maxi-oyedele",
    "Jakub Piotrowski": "jakub-piotrowski",
    "Damian Szymański": "damian-szymanski",
    "Michał Skóraś": "michal-skoras",
    "Kamil Grosicki": "kamil-grosicki",
    "Mateusz Bogusz": "mateusz-bogusz",
    "Filip Marchwiński": "filip-marchwinski",
    "Robert Lewandowski": "robert-lewandowski",
    "Karol Świderski": "karol-swiderski",
    "Adam Buksa": "adam-buksa",
    "Krzysztof Piątek": "krzysztof-piatek",
    "Mariusz Fornalczyk": "mariusz-fornalczyk",
    "Dominik Marczuk": "dominik-marczuk",
    "Oskar Pietuszewski": "oskar-pietuszewski",
    "Michał Rakoczy": "michal-rakoczy",
    "Karol Struski": "karol-struski",
    "Mateusz Wieteska": "mateusz-wieteska",
    "Bartosz Mrozek": "bartosz-mrozek",
    "Patryk Peda": "patryk-peda",
    "Mateusz Kochalski": "mateusz-kochalski",
    "Oliwier Zych": "oliwier-zych",
    "Wojciech Mońka": "wojciech-monka",
    "Kacper Potulski": "kacper-potulski",
    "Tymoteusz Puchacz": "tymoteusz-puchacz",
    "Norbert Wojtuszek": "norbert-wojtuszek",
    "Maik Nawrocki": "maik-nawrocki",
    "Paweł Wszołek": "pawel-wszolek",
    "Wiktor Nowak": "wiktor-nowak",
    "Filip Rózga": "filip-rozga",
    "Jakub Kałuziński": "jakub-kaluzinski",
    "Antoni Kozubal": "antoni-kozubal",
    "Michael Ameyaw": "michael-ameyaw",
    "Tomasz Pieńko": "tomasz-pienko",
    "Adrian Benedyczak": "adrian-benedyczak",
    "Mateusz Żukowski": "mateusz-zukowski",
    "Dawid Kownacki": "dawid-kownacki",
    "Szymon Włodarczyk": "szymon-wlodarczyk",
    "Bartłomiej Wdowik": "bartlomiej-wdowik",
  });

// Versions 1 and 2 carried no rules revision. The rules did not change between the source
// import and the introduction of RULES_REVISION, so those saves count as revision 1.
export const LEGACY_RULES_REVISION = 1;

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

class LegacyNameError extends Error {}

function idFor(name: unknown): PlayerId {
  const id =
    typeof name === "string" && Object.hasOwn(LEGACY_PLAYER_IDS_BY_NAME, name)
      ? LEGACY_PLAYER_IDS_BY_NAME[name]
      : undefined;
  if (!id) throw new LegacyNameError(`Unknown legacy player: ${String(name)}`);
  return id;
}

const idsFor = (names: unknown): unknown =>
  Array.isArray(names) ? names.map(idFor) : names;

function migrateReport(report: unknown): unknown {
  if (!isRecord(report) || !Array.isArray(report.s)) return report;
  const { s: squad, ...rest } = report;
  return {
    ...rest,
    rulesRevision: LEGACY_RULES_REVISION,
    squadIds: squad.map((player) => idFor(isRecord(player) && player.name)),
  };
}

function migrateSnapshot(snapshot: unknown): unknown {
  if (!isRecord(snapshot)) return snapshot;
  const trial = isRecord(snapshot.trial)
    ? Object.fromEntries(
        Object.entries(snapshot.trial).map(([name, result]) => [
          idFor(name),
          result,
        ]),
      )
    : snapshot.trial;
  return {
    ...snapshot,
    selected: idsFor(snapshot.selected),
    campSquad: idsFor(snapshot.campSquad),
    compare: idsFor(snapshot.compare),
    trial,
    report: migrateReport(snapshot.report),
  };
}

// Returns the state in the version 3 shape, or null when a player name is unknown. Version 1
// had no undo history; version 2 history is kept and migrated snapshot by snapshot.
export function migrateLegacyState(
  state: unknown,
  schemaVersion: 1 | 2,
): unknown {
  if (!isRecord(state)) return null;
  try {
    const history =
      schemaVersion === 1
        ? []
        : Array.isArray(state.history)
          ? state.history.map(migrateSnapshot)
          : state.history;
    return { ...(migrateSnapshot(state) as RawRecord), history };
  } catch (error) {
    if (error instanceof LegacyNameError) return null;
    throw error;
  }
}
