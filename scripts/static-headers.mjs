// Reads the Cloudflare `_headers` file (public/_headers), so `vite preview`, and with it the
// browser journeys, serves the same response headers as production.
// Format: an unindented URL pattern line, then indented `Name: value` lines; `#` starts a comment.

/** @typedef {{ pattern: string, headers: Record<string, string> }} HeaderRule */

/**
 * @param {string} text
 * @returns {HeaderRule[]}
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
 * @param {string} pattern
 * @param {string} path
 */
export function matchesPattern(pattern, path) {
  return new URLPattern({ pathname: pattern }).test({ pathname: path });
}

/**
 * Headers for a path: Cloudflare applies every rule whose pattern matches it and joins the
 * values of a header set by more than one rule with ", ".
 * @param {HeaderRule[]} rules
 * @param {string} path
 * @returns {Record<string, string>}
 */
export function expectedHeaders(rules, path) {
  return rules
    .filter((rule) => matchesPattern(rule.pattern, path))
    .flatMap((rule) => Object.entries(rule.headers))
    .reduce((/** @type {Record<string, string>} */ result, [name, value]) => {
      // Header names are case-insensitive; the first spelling is kept.
      const key =
        Object.keys(result).find(
          (existing) => existing.toLowerCase() === name.toLowerCase(),
        ) ?? name;
      const earlier = result[key];
      return {
        ...result,
        [key]: earlier === undefined ? value : `${earlier}, ${value}`,
      };
    }, {});
}
