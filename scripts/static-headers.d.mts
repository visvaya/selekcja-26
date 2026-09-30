export function parseHeadersFile(
  text: string,
): { pattern: string; headers: Record<string, string> }[];

export function headersForPattern(
  text: string,
  pattern: string,
): Record<string, string>;
