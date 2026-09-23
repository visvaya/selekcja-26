// Guards against an older asynchronous request's result overwriting a newer one
// (e.g. a slow save followed quickly by a retry): only the most recently started
// request should ever be treated as current. A closure over a counter tracks this,
// with no framework dependency and no object-oriented wrapper needed.

export interface LatestRequestTracker {
  readonly begin: () => () => boolean;
}

export function createLatestRequestTracker(): LatestRequestTracker {
  let currentId = 0;
  function begin(): () => boolean {
    const requestId = ++currentId;
    return () => requestId === currentId;
  }
  return { begin };
}
