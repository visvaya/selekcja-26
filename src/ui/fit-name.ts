// Pure decisions behind the strip's name fitting; measurement lives in use-fitted-name.ts.

export type NameForm = "full" | "short";

// Full name when it fits, otherwise the short form; CSS adds the ellipsis when even that
// does not fit.
export function chooseNameForm({
  full,
  short,
  fits,
}: {
  full: string;
  short: string;
  fits: (text: string) => boolean;
}): NameForm {
  if (fits(full)) return "full";
  return short === full ? "full" : "short";
}

// Splits a catalogue name on its first space: the first word is the given name, the rest
// (one or more words) stays the surname.
export function splitName(name: string): { first: string; last: string } {
  const space = name.indexOf(" ");
  return space < 0
    ? { first: "", last: name }
    : { first: name.slice(0, space), last: name.slice(space + 1) };
}

// "Piotr", "Zieliński" -> "P. Zieliński"; a missing given name leaves the surname alone.
export function shortName(first: string, last: string): string {
  return first ? `${first.charAt(0)}. ${last}` : last;
}

// Measurement tolerance on the "fits" side only, so fractional layouts do not truncate.
const NAME_FIT_TOLERANCE_PX = 0.01;

export function fitsWidth(naturalPx: number, availablePx: number): boolean {
  return naturalPx <= availablePx + NAME_FIT_TOLERANCE_PX;
}
