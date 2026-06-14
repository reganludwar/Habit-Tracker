# Habit-Tracker — Roadmap

Living list of planned features and deferred work. Newest ideas at the top of "Planned."

---

## ✅ Recently shipped
- Full **Aurora** redesign — light + dark theme with toggle, glass UI, floating tab bar.
- **AI Coach** approval workflow — approve/dismiss/undo recommendations (load, sets, reps, rest, add/remove exercises) for the workout templates.
- Apple Health **import** (22 metrics, paste + URL), reset/undo safety net, full codebase audit fixes + CI.
- 4 of 9 Aurora stretch illustrations (pigeon, forward fold, double pigeon, folded butterfly).

---

## 🟦 Planned

### A. Tightness check-in → adaptive mobility / stretch
**Idea:** Let the user check off body areas feeling tight, and have the app (and AI) adjust the stretch/mobility routine to target them.

**Why:** Makes mobility responsive to how the body actually feels day-to-day instead of a fixed list.

**How it could work:**
- **Input:** quick check-offs on the Stretch tab (or a "How are you feeling today?" prompt) for areas — Hips, Hamstrings, Lower back, Glutes, Shoulders, Chest, Neck, T-Spine, Ankles, Wrists. Store as a small per-day flag (e.g. a `tight` array in day state).
- **Tier 1 — rules-based (instant, offline):** map flagged areas → matching drills using the catalog's existing **`area`** metadata; bump those to the top of the active list, lengthen their holds a bit, and/or auto-suggest adding a matching drill from the catalog. Deprioritize unrelated ones.
- **Tier 2 — AI-assisted:** feed the tightness flags into the Coach, which proposes specific changes ("add Couch Stretch", "+30s on Pigeon", "add a T-spine drill") surfaced as **approve/dismiss cards** — reuse the existing `coachEdits` approval UI.

**Existing hooks:** mobility `area` tags · `loadActiveList('mobility'|'stretch')` · `getStretchTime` · `getCatalogMap` · the coach approve/dismiss/undo flow.

### B. AI analysis of the Stretch & Mobility pages (its own report)
**Idea:** Give mobility/stretch the same dedicated AI Coach analysis the Workout page gets — not just a side note.

**Why:** Mobility is half the program but currently gets no real feedback loop.

**How it could work:**
- A dedicated mobility/stretch report covering:
  - **Consistency** — mobility streak, days hit vs missed.
  - **Coverage & balance** — which body **areas** are trained vs neglected (using the `area` metadata), so it can flag "you never do ankles/T-spine."
  - **Hold durations** vs sensible targets.
  - **Match to training** — e.g. heavy squat/hinge days → flag missing hip/ankle mobility; lots of pressing → flag missing chest/T-spine openers.
  - **Recommendations** — add/drop drills, adjust durations, cover neglected areas — as **approvable edits** that update the active stretch/mobility lists.

**Existing hooks:** `coachPayload` already sends `mobilityRoutine`/`stretchRoutine` (extend with per-area coverage + mobility history from day state / `mobStreak`) · `COACH_FOCUS` already has a `'mobility'` mode · reuse the approve workflow to apply changes.

**Synergy with A:** the tightness flags feed this analysis, and the analysis can recommend the same kind of routine changes — both share the approve/dismiss machinery.

---

## 🗂️ Backlog / on hold
- **Finish the Aurora stretch illustration set** (couch_stretch, thoracic_rotation, doorway_chest_opener, 90_90, seated_straddle, + a Frog image). *On hold* pending a reliable image tool (Recraft + pose-reference images is the current plan). Processing pipeline is ready (sharp: key background → transparent → wire in).
- **"Export everything for an AI assessment"** — one-tap export of all training + Apple Health data as a single bundle for review by an external AI. (Best once Health data is flowing in.)
- **Apple Health write-back ("Log to Health")** — verify/fix the export shortcut path so finished sessions reliably write to Health.
