import { APP_CONFIG } from "../data/constants.ts";

// Split out of error-boundary.tsx (which has JSX and cannot be imported by node's plain
// type-stripping test runner) so this pure URL-building logic can be unit tested with a
// direct import instead of jsdom's Location, which does not allow stubbing reload()/assign().
export function buildResetUrl(currentHref: string): string {
  const url = new URL(currentHref);
  url.searchParams.set(APP_CONFIG.saveResetQueryParam, "");
  return url.toString();
}
