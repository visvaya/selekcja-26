export type HeaderRule = { pattern: string; headers: Record<string, string> };

export function parseHeadersFile(text: string): HeaderRule[];

export function expectedHeaders(
  rules: HeaderRule[],
  path: string,
): Record<string, string>;
