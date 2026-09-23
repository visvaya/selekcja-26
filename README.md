# Selekcja 26

A browser game about picking Poland's national squad for EURO 2028. The player, as head coach, narrows 61 real Polish footballers to a 23-player test camp and then to a 26-player tournament squad; a seeded simulation plays out the tournament. The game interface is in Polish.

The game runs in any modern browser on a phone or a desktop and builds to a static site. A public hosted version is not available yet; run it locally as described below.

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
- **Mobile first and accessible.** Full keyboard support, visible focus, focus-trapping dialogs, landmarks, and correct `aria-pressed` and `aria-expanded` states. Every screen and dialog is scanned with axe against WCAG 2.2 AA.
- **Tested at two levels.** Logic, UI and tooling tests run on `node --test` with coverage thresholds. Playwright plays the whole game on the production build: on a narrow phone in Chromium and WebKit, and with the keyboard alone on a desktop.

**Stack:** React 19, TypeScript 7, Vite 8, Playwright with axe, oxlint, Prettier, jscpd, knip. No state library and no backend; the build is a static site.

## Getting started

Requires Node.js 24+ and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev            # Vite dev server
pnpm quality        # fast static checks: types, lint, formatting, text and convention rules
pnpm verify         # quality plus duplication, dead code, tests with coverage and build
pnpm verify:full    # full gate: verify plus browser journeys and the accessibility scan
pnpm test:e2e       # browser journeys (first run: pnpm exec playwright install chromium webkit)
```

A saved game can be discarded by opening the game with `?reset` added to its address.

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

This is an unofficial fan game with no connection to PZPN, UEFA, the clubs or the players. The candidates are real Polish footballers, but the EURO 2028 scenario is fictional: ratings, form, roles and availability (injury risk, limited minutes) are game judgements, not scouting data or medical information, and clubs and ages reflect the roster's last update rather than live data. Only two rules come from real regulations: the 26-player limit and the minimum of three goalkeepers ([UEFA EURO 2026–28 regulations, Article 32.01](https://documents.uefa.com/r/Regulations-of-the-UEFA-European-Football-Championship-2026-28/Article-32-Player-lists-Online)). Requiring exactly three goalkeepers, the size of the test camp and all other limits are game assumptions.

## License

[MIT](LICENSE) © 2026 Maciej B.
