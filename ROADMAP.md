# Habit-Tracker — Roadmap

Living list of planned features and deferred work. Newest ideas at the top of "Planned."

---

## ✅ Recently shipped
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
