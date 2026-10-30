# Habit-Tracker

Offline-first PWA: habits, mobility/stretch, strength workouts, fitness tests, Apple Health import, optional AI Coach. Plain HTML/CSS/vanilla JS, no framework, no build step, no runtime dependencies. Global rules live in ~/.claude/CLAUDE.md; don't repeat them here. Product overview: `README.md`. What's shipped and planned: `ROADMAP.md` (update it when a feature ships). Specs: `docs/`.

## Run and test
- Serve: `python3 -m http.server 8000`, then open http://localhost:8000 (service worker needs http, not file://).
- Tests: `npm test` (runs `node test/smoke.js`). Must print `ALL CHECKS PASSED`. CI runs the same command on every PR.
- Tests run the inline JS of `index.html` in a mocked-DOM sandbox with a fake localStorage. They never touch real data. They do not exercise layout, so any UI change also needs a real-browser check (serve it, drive it, test phone width and dark mode).
- Add a smoke-test case for every new behaviour. Never disable a test to get CI green.

## Layout
- `index.html` is the whole app (~3,500 lines, one big inline `<script>`). The test harness extracts the LAST `<script>` block in the file, so keep the app code in the last script tag.
- `sw.js` caches the app shell. **Bump `CACHE` (currently `ht-v89`) in the same PR whenever `index.html` or any cached asset changes**, or installed PWAs keep serving the old version.
- `manifest.json`, `icon-*.png`, `apple-touch-icon.png`, `*.webp` stretch images: the webp files must stay committed next to `index.html` or stretch thumbnails break.
- `scripts/process-stretch.js` (`npm run stretch-art`) needs `sharp`, which is NOT declared in package.json (install it ad hoc if you ever run it). Not needed to run the app or the tests.
- `.github/workflows/`: `ci.yml` (tests), `deploy.yml` (GitHub Pages deploy on push to main).

## Rules
- All user data is in browser localStorage. Never add a backend or analytics. Never log or commit real health data, weights or API keys.
- The AI Coach uses the user's own Anthropic key, pasted in-app and kept in localStorage. Never hardcode a key, never put one in a test.
- New persisted keys must be included in the backup sweep (`isBackupKey`) so export/import round-trips them. Existing `tr_YYYY_M_D` and `wo_YYYY_M_D` data must never be rewritten or migrated destructively.
- No-moralizing rule for any coach/feedback copy: neutral data, never a verdict (see `docs/boredom-binge-interrupt-spec-v1.md` and the cardio spec). Final call on user-facing copy is Regan's: propose options, don't pick.
- Smallest change that solves the problem; don't refactor `index.html` while fixing something. No new dependencies without saying what they add and what upkeep they create.
- Anti-dropout principle behind the whole app: floor/ceiling targets, never all-or-nothing. Each spec carries a kill criterion; don't build past it.

## Git
- Feature branch, then PR. Regan reviews and merges. Never push to main. Conventional commits; add files by name.
- Pushes to main auto-deploy to GitHub Pages, so "merged" is not "done": confirm the deployed site loads and the new service-worker version took over.

## Specs (docs/)
- `workout-tab-spec-v2.md` (logging model; the 5-day split in it is superseded by the 3-day full-body program), `cardio-threshold-validation-spec-v2.md`, `boredom-binge-interrupt-spec-v1.md`, plus `feature-A-tightness.md`, `feature-B-mobility-report.md`, `stretch-art-guide.md`, `5-day-split-archive.md`.
- Copied from the Google Drive "Habit-Tracker" folder on 2026-10-30. This repo is now the source of truth for them; Drive is the archive.
- `audit-report.md` (repo root) is the last full codebase audit.
