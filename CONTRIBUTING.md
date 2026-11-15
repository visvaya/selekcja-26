# Contributing

Bug reports and ideas are welcome as [issues](https://github.com/visvaya/selekcja-26/issues/new/choose). Security problems go through private reporting instead: see [SECURITY.md](SECURITY.md).

## Setup

Requires Node.js 24.2 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install --frozen-lockfile   # also points Git at the hooks in .githooks/
pnpm dev                         # Vite dev server
```

## Before opening a pull request

```sh
pnpm verify        # types, lint, formatting, text and link checks, duplication, dead code, tests, build
pnpm verify:full   # verify plus the browser journeys and the accessibility scan
```

The first browser run needs `pnpm exec playwright install chromium webkit`. CI runs the full gate on every pull request; the required check is `ci-ok`.

Rules the gate and the hooks enforce:

- Game logic stays in pure functions under `src/logic/`, with tests; all player-facing text is Polish and lives in the UI text module (`src/ui/text.ts`), not in components.
- No em dash (U+2014) and no emoji in files or commit messages.
- Gameplay rules, ratings and tournament outcomes change only together with the `RULES_REVISION` number and the golden traces (see `src/logic/golden-master.test.ts`).

## Commits and pull requests

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, with a subject of 72 characters or fewer.
- Pull requests are merged by squash, so the **pull request title becomes the commit on `main`**. CI checks the title against the same rules.
- Fill in the "Checks" section of the pull request template: what you ran, and what you did not run.
- CodeRabbit comments on each pull request; its comments are suggestions, and the maintainer decides which ones to apply.
