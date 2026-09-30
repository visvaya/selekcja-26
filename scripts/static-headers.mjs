// Reads the Cloudflare `_headers` file (public/_headers), so `vite preview`, and with it the
// browser journeys, serves the same response headers as production.
// Format: an unindented URL pattern line, then indented `Name: value` lines; `#` starts a comment.

/**
 * @param {string} text
 * @returns {{ pattern: string, headers: Record<string, string> }[]}
 */
export function parseHeadersFile(text) {
  return text
    .split(/\r?\n/)
    .reduce(
      (
        /** @type {{ pattern: string, headers: Record<string, string> }[]} */ rules,
        line,
      ) => {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("#")) return rules;
        if (!/^\s/.test(line))
          return [...rules, { pattern: trimmed, headers: {} }];
        const last = rules.at(-1);
        const separator = trimmed.indexOf(":");
        if (last === undefined || separator <= 0) {
          throw new Error(`Invalid _headers line: ${trimmed}`);
        }
        const name = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        return [
          ...rules.slice(0, -1),
          { ...last, headers: { ...last.headers, [name]: value } },
        ];
      },
      [],
    );
}

/**
 * @param {string} text
 * @param {string} pattern
 * @returns {Record<string, string>}
 */
export function headersForPattern(text, pattern) {
  return (
    parseHeadersFile(text).find((rule) => rule.pattern === pattern)?.headers ??
    {}
  );
}
