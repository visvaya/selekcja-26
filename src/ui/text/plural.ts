// Polish plural form for a count: 1 takes "one"; a last digit 2-4 (except 12-14) takes "few"; the rest, including 0, takes "many".
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  if (count === 1) return one;
  const lastDigit = count % 10,
    lastTwoDigits = count % 100;
  const isFew =
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14);
  return isFew ? few : many;
}

// Polish list: "A", "A i B", "A, B i C".
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}`;
}

// Signed camp impact with a true minus sign (U+2212); zero shows as "+0".
export function formatSignedImpact(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}
