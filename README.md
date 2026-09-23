# Selekcja 26

A browser game about picking Poland's national squad for EURO 2028. The player, as head coach, narrows 61 candidates to a 23-player test camp and then to a 26-player tournament squad; a seeded simulation plays out the tournament. The game interface is in Polish.

[Play in the browser](https://old-deployment.invalid) on a phone or a desktop, no installation required.

## Gameplay

1. **Briefing.** Choose a formation (4-2-3-1, 3-4-2-1 or 4-3-3) and a selection priority: balance, current form or pure quality. Both change how every candidate is rated.
2. **March camp, 23 players.** Build a test list that meets positional minimums. Three camp events (a medical report, the captain's request, a scout's report) each force a trade-off.
3. **Camp report.** Tested players impress or disappoint, which adds information unavailable for anyone left at home.
4. **Tournament squad, 26 players,** with exactly three goalkeepers. Trust the camp observations or gamble on an untested player.
5. **Tournament.** The simulation plays the group stage and the knockout bracket. The report lists every match, the strengths of the squad and the selection risks.

Along the way the player can open profiles, compare two candidates, filter by 14 detailed positions, check formation coverage on a mini pitch, fill free places randomly within the quotas and undo decisions. Progress is saved on the device.

## Under the hood

- **Deterministic simulation.** Each new game gets its own seed and all game logic draws from a seeded generator. Undoing and re-confirming the same squad reproduces the same result; a saved report is restored, never re-simulated.
- **Pure logic, thin UI.** Rules, scoring and the tournament are pure functions in `src/logic/`. Every state transition goes through one reducer with an undo history of up to 50 steps.
- **Versioned saves.** Saved games carry a schema version; older saves are validated and migrated, and a corrupt save starts a fresh game instead of breaking it.
- **Mobile first and accessible.** Full keyboard support, visible focus, focus-trapping dialogs, and correct `aria-pressed` and `aria-expanded` states.
- **Two test layers.** Logic and UI tests run on `node --test`. Playwright journeys play the whole game on a narrow phone viewport and with the keyboard alone on a desktop.

**Stack:** React 19, TypeScript 7, Vite 8, Playwright, oxlint, Prettier. No state library and no backend; the build is a static site.

## Getting started

Requires Node.js 24+ and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev            # Vite dev server
pnpm quality        # fast static checks: types, lint, formatting, text and convention rules
pnpm verify         # quality plus tests and build
pnpm verify:full    # full gate: verify plus browser journeys
pnpm test:e2e       # browser journeys (first run: pnpm exec playwright install chromium)
```

| Directory    | Contents                                                          |
| ------------ | ----------------------------------------------------------------- |
| `src/data/`  | candidates, formations, game-rule constants, camp events          |
| `src/logic/` | state reducer, selection, scoring, tournament, randomness, saving |
| `src/ui/`    | React components, all Polish copy, styles                         |
| `e2e/`       | Playwright journeys                                               |
| `docs/`      | internal notes, known debt and decisions                          |

## Contributing

[AGENTS.md](AGENTS.md) (in Polish) describes the architecture, the game rules that change only with the owner's approval, and the change checklist. [docs/future-scope.md](docs/future-scope.md) lists known technical debt, the recommended order of work and open product decisions. Commits follow Conventional Commits; the hooks in `.githooks/` check this automatically.

## Fiction and facts

This is an unofficial fan game with no connection to PZPN or UEFA. Clubs, form, ratings and player availability belong to a fictional EURO 2028 scenario and are not scouting data. Only two rules come from real regulations: the 26-player limit and the minimum of three goalkeepers ([UEFA EURO 2026–28 regulations, Article 32.01](https://documents.uefa.com/r/Regulations-of-the-UEFA-European-Football-Championship-2026-28/Article-32-Player-lists-Online)). Requiring exactly three goalkeepers, the size of the test camp and all other limits are game assumptions.
