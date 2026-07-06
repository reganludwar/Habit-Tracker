# Habit-Tracker

A self-contained, offline-first **Progressive Web App** for tracking daily habits, mobility/stretch routines, strength workouts, and fitness tests — with an optional bring-your-own-key **AI Coach** and **Apple Health** import.

No backend, no build step, no dependencies. The entire app is one file: [`index.html`](index.html) (HTML + CSS + vanilla JS), served as a PWA via [`sw.js`](sw.js) and [`manifest.json`](manifest.json). All data lives in the browser's `localStorage` on your device.

## Features

- **Day** — daily checklist (habits, vitamins, mobility, lift), with expandable routine details.
- **Week** — consistency calendar, adherence, and tonnage at a glance.
- **Snacks** — "exercise snacks" module (brief post-meal bouts, per the research): a breakfast/lunch/dinner card each suggests a context-aware exercise (with a picker and an optional AI-coach pick), tracks **post-meal coverage** and a weekly **vigorous-burst (VO₂max)** tier, and logs cardio or strength snacks anytime.
- **Stretch** — guided mobility/stretch sessions with a spoken timer and a customizable catalog.
- **Test** — log fitness-test results (e.g. push-ups, plank) with trends.
- **Workout** — five day-templates (push / lower+run / pull / lower-variation+run / mix) with per-set logging, rest timers with in-rest mobility, progression nudges, and PR tracking. Templates are editable (add/remove exercises, sets, rest, mobility).
- **AI Coach** — paste your own Anthropic API key to get a training analysis; its recommendations become one-tap **Approve / Dismiss** edits to your templates (with Undo).
- **Apple Health** — import metrics via a Shortcut (paste or `?hl=` URL); export workouts back via `shortcuts://`.
- **Backup** — export/import all data as a JSON file.

## Run it

It's a static site — open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

For full PWA behavior (service worker, install), serve over `http(s)` rather than `file://`.

## Tests

A Node smoke-test harness runs the app's inline JS in a mocked-DOM sandbox and asserts on behavior:

```sh
npm test        # runs node test/smoke.js
```

The suite covers the data layer, rendering, workout/template logic, AI-Coach approval flow, Apple Health ingestion, and the reset/undo safety nets.
