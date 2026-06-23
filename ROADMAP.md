# Habit-Tracker — Roadmap

Living list of planned features and deferred work. Newest ideas at the top of "Planned."

---

## ✅ Recently shipped
- **Cardio Threshold Validation (Zone 2).** A `Zone 2 minutes` field on each cardio session (read off the Wahoo strap); 20+ min qualifies the session, and the Week page tracks weekly Zone 2 accumulation against locked tiers (Floor 90 / Target 150 / Ceiling 180+ min/wk) — the headline metric. High-intensity work (sprints/HIIT, Zone 3+) self-excludes and is never graded as a failed session. Per-session feedback is permission-framed (under-threshold = "still real expenditure, not a fail"); zone2Min flows into the AI coach payload. Built on the existing cardio logging rather than a parallel store. See `cardio-threshold-validation-spec-v2` (gdrive; supersedes v1).
- **Boredom-Binge Interrupt — urge-loop coach.** A dashboard "Riding an urge" button for the moment of bored/idle eating. One stateless AI call (reuses the Coach key/model) names the state, grants permission (soft 15-min timer, "still want it after? zero penalty"), and redirects restless energy into movement already owned (mobility, walk, air squats). Every tap logs an `urgeEvent` — outcome + the preceding activity (root-cause field) — to localStorage, with a ride-out rate "evidence mirror." Hard no-moralizing system prompt; static fallback so the button never dead-ends offline. See `boredom-binge-interrupt-spec-v1` (gdrive).
- **Feature B — dedicated Stretch & Mobility AI report.** A Workout/Mobility switch in the Coach tab generates a mobility report (Consistency · Coverage & Balance · Hold Durations · Match to Training · Recommendations) with add/drop/duration recommendations as approve-or-dismiss cards that update the active routine. Shared, kind-tagged report history with a filter. See `docs/feature-A-tightness.md` §A for the shared engine.
- **Feature A — chronic tight-area check-in → adaptive stretch/mobility.** Day-page tight-areas check-in (chronic list); the Stretch tab adapts with longer holds + targeted adds (approve-first, no reordering); optional AI "Tailor" pass. See `docs/feature-A-tightness.md`.
- Full **Aurora** redesign — light + dark theme with toggle, glass UI, floating tab bar.
- **AI Coach** approval workflow — approve/dismiss/undo recommendations (load, sets, reps, rest, add/remove exercises) for the workout templates.
- Apple Health **import** (22 metrics, paste + URL), reset/undo safety net, full codebase audit fixes + CI.
- 4 of 9 Aurora stretch illustrations (pigeon, forward fold, double pigeon, folded butterfly).

---

## 🟦 Planned

_(Next ideas go here — A and B above are shipped.)_

---

## 🗂️ Backlog / on hold
- **Finish the Aurora stretch illustration set** (couch_stretch, thoracic_rotation, doorway_chest_opener, 90_90, seated_straddle, + a Frog image). *On hold* pending a reliable image tool (Recraft + pose-reference images is the current plan). Processing pipeline is ready (sharp: key background → transparent → wire in).
- **"Export everything for an AI assessment"** — one-tap export of all training + Apple Health data as a single bundle for review by an external AI. (Best once Health data is flowing in.)
- **Apple Health write-back ("Log to Health")** — verify/fix the export shortcut path so finished sessions reliably write to Health.
