> Copied from Google Drive (Habit-Tracker folder) on 2026-10-30. Drive is the archive; edit here going forward.
> **Partly superseded:** the 5-day upper/lower split described below was replaced by a 3-day full-body program (see ROADMAP.md and `5-day-split-archive.md`). The logging model, decisions 1-14, and the PowerBlock ladder still apply.

# Workout Tab — Build Spec

*Living spec for in-app set logging. Sits alongside `operating-plan.md`, `strength-program.md`, app roadmap. Plan only — no code generated yet.*

**Status:** design locked + trainer-review pass folded in, all five days defined, pending build approval | **Tab:** 5th view (Day · This Week · Stretch · Test · **Workout**)

---

## The Core Idea

A Strong-style set logger built into the app, with one deliberate divergence: **active-recovery rests**. Instead of Strong's grouped supersets (A1/B1/A2/B2 of two loaded lifts), each working set's rest is a fixed countdown that holds a *queued mobility movement* — different mobility per rest if wanted, authored once in the template. The heavy set drives the session; the mobility productively fills the rest you're taking anyway.

This is not new infrastructure. It assembles three things the app already has:
- the **mobility catalog** (`ALL_BASE` + custom stretches)
- the **timer engine** (announce / beep / wake-lock / bilateral switch)
- the **opposite-zone muscle model** (`WOM` / `SNM` / `olap`)

---

## Strong Review — Adopt / Adapt / Reject

| Strong feature | Verdict | Notes |
|---|---|---|
| Previous-session weight/reps overlay (greyed, per set) | **Adopt** | Highest-value, lowest-friction feature. Makes 60-sec logging possible. |
| Inline per-set rest divider (the `1:00` / `3:00` lines) | **Adopt + extend** | This is the hook — rest already lives between set rows. We hang a mobility on it. |
| Auto rest timer after each ✓ (configurable, extend, skip, tone) | **Adapt** | Same behavior; the countdown now shows the queued mobility inside it. |
| Set tags (W / working / AMRAP) | **Adopt (subset)** | Keep Warm-up + working. AMRAP optional. Drop "drop sets". Add a strict/partial form flag (see decision 11). |
| Grouped supersets (chain icon) | **Reject (one exception)** | The mobility-in-rest model replaces the reason to group loaded lifts. Exception: non-competing *finishers* may pair (decision 13). |
| Plate / warm-up calculator | **Reject** | Irrelevant to dumbbell/bodyweight. (Warm-up *load* is auto-seeded instead — decision 10.) |
| RPE, advanced charts, 1RM, muscle heat map, CSV export, Apple Health | **Defer** | These are why Strong stays the analytics backstop during transition. |
| Routines / templates / periodization | **Already have** | The `MON…FRI` arrays are the templates. |

---

## Locked Decisions

| # | Decision | Resolution |
|---|---|---|
| 1 | Weight entry | Per-exercise **loading type**: **PowerBlock** (fixed stepper on the Sport 90 ladder below, +/- jumps to the next achievable setting, prefill snaps to nearest valid) or **bodyweight** (no weight column; reps or time). Only these two — everything loads on the PowerBlocks, no kettlebell. |
| 2 | Reps entry | Prefilled from last session, **±1 fixed stepper**. |
| 3 | Mobility default | **Auto-queued from the template on working-set rests only**, swappable live. **Never queued after a warm-up** — the W→work rest stays a plain countdown. |
| 4 | Rest behavior | **Fixed rest target owns the clock**, seeded **per row from the template** (varies by day — push working rests 3:00, lower working rests 2:00; W→work typically 1:00). Mobility runs *inside* the working-rest window; do as much as wanted, idle out the remainder. |
| 5 | Authoring | **In-app template editor**, persists to localStorage, rides along in backup. No raw-array edits. Warm-up is **add/remove per exercise** (not assumed); rests editable per row. |
| 6 | Warm-up | Optional per exercise. When present, logged as a `W` row with a 1:00 default rest and **no mobility**. |
| 7 | Strong | **Parallel-run, then retire** once in-app history + minimal progression view exist. |
| 8 | Timed exercises | Logged via a **count-up stopwatch** with a 3-second lead-in (same engine as the Test tab's timed holds); records the time actually achieved, not a confirmed target. Bilateral movements (e.g. Side Plank) run the stopwatch per side using the existing "switch sides" handling. |
| 9 | **Progression rule** | **Double progression.** When *both* working sets hit the **top** of the target rep range, bump one PowerBlock notch next session (bodyweight: +1 rep target). The app surfaces a quiet "↑ try [next ladder value]" nudge on the set that earned it — it **never auto-applies**. This is the piece that turns faithful logging into actual progress; without it you plateau, which is historically when motivation dies. |
| 10 | **Warm-up load** | Auto-seeded at **~50–60% of the working weight**, snapped to the ladder — not a fixed guess. One less decision per session; editable. |
| 11 | **Rep quality** | Per-set **form flag** (`strict` / `partial`), defaulted on Pull-Up and other bodyweight grinds. Guards against rep-count inflation as fatigue degrades form — a rep only counts if it's clean. Surfaces in history so a rising rep count with falling quality is visible, not hidden. |
| 12 | **Deload** | Every **~4–6 weeks, a lighter week** (≈40% volume cut, same lifts) is a standing principle, not optional — especially at 51, where skipping backoff is how the forearm tightness flares. The app should *flag* the need: working reps stalled two sessions running, or right-forearm tightness climbing on the Sunday review. Auto-detect is v3; the principle is in force now. |
| 13 | **Finisher pairing** | Mike Tyson Pushups + Side Plank may run **back-to-back as a pair** (non-competing: push vs. anti-rotation core), saving time with no performance cost. The one sanctioned grouping — finishers only, distinct from the active-recovery model and from loaded supersets. |
| 14 | **Kill criterion** | If MVP per-set logging **isn't a habit after 2 weeks, stop and revert to the single `lift` checkbox.** Per-set entry is a real escalation from a checkbox; naming the failure mode up front is the anti-dropout safeguard. |

### PowerBlock Sport 90 ladder (two 2.5 lb adders per handle)

```
2.5, 5, 7.5, 10, 15, 17.5, 20, 25, 27.5, 30, 35, 37.5, 40, 45, 47.5,
50, 55, 57.5, 60, 65, 67.5, 70, 75, 77.5, 80, 85, 87.5, 90 (lb/hand)
```

Irregular by design — the stepper is a hard-coded 28-value array, **not** arithmetic. Unreachable settings skipped: **12.5, 22.5, 32.5, 42.5, 52.5, 62.5, 72.5, 82.5**. (Progression nudge in decision 9 jumps to the next value in this array.)

---

## Data Model

| Object | Fields |
|---|---|
| Day template (`MON…FRI`) | exercises[] |
| Template exercise | name, **loadType** (`powerblock` / `bodyweight`), inputType (`weight_reps` / `reps` / `time`), **setCount** (per exercise — some lifts are intentionally a single working set, others two; warm-up optional and separate), targetReps (**range**, per exercise — drives the progression nudge), **restSec[]** (per row, W and each working rest), **restMobility[]** (one entry per working-set rest → catalog id or null) |
| Logged session (`wo_YYYY_M_D`) | date, dayTag, elapsed, exercises[ { name, sets:[ { tag, weight, reps/time, **formFlag** (strict/partial), restSec, mobilityId, done } ] } ] |

`restMobility[]` is where "different mobility between each heavy set" lives: rest 1 → Couch Stretch, rest 2 → 90/90, etc. Authored once per day in the editor, overridable mid-session. Indexed to working-set rests only (warm-up rest is never an entry).

### Reference: Monday (Upper Push), from Strong template

| Exercise | Type | Sets | Rests | Mobility eligible |
|---|---|---|---|---|
| Bench Press (DB) | weight+reps | W · 1 · 2 | W→1: 1:00, 1→2: 3:00 | 1→2 only |
| Seated Overhead Press (DB) | weight+reps | W · 1 · 2 | W→1: 1:00, 1→2: 3:00 | 1→2 only |
| Triceps Extension (DB) | weight+reps | 1 · 2 (no W) | 1→2: 3:00 | 1→2 |
| Hanging Knee Raise | reps | 1 · 2 | 1→2: 1:00 | none (rest too short) |

### Reference: Tuesday (Lower + Run), from Strong template

| Exercise | Type | Sets | Rests | Mobility eligible |
|---|---|---|---|---|
| Goblet Squat | weight+reps (PowerBlock) | W · 1 | W→1: 2:00 | 2:00 working rest |
| Romanian Deadlift | weight+reps (PowerBlock) | W · 1 · 2 | W→1: 1:00, 1→2: 2:00 | 1→2 only |
| Lunge | bodyweight (0 lb) | 1 | — | n/a |

Confirms loading is per-exercise (all PowerBlock or bodyweight, no kettlebell) and that **working rests differ by day** (push 3:00, lower 2:00) — so rest seeds per row.

### Reference: Wednesday (Upper Pull), from Strong template

| Exercise | Type | Sets | Rests | Mobility eligible |
|---|---|---|---|---|
| Pull Up | bodyweight, reps (no assist load — reps only; default form flag on) | W · 1 · 2 | W→1: 1:00, 1→2: 3:00 | 1→2 only |
| Bent Over Row | weight+reps (PowerBlock) | 1 · 2 | 1→2: 3:00 | 1→2 |
| Preacher Curl | weight+reps (PowerBlock) | 1 (single working set) | — | n/a |
| Hammer Curl | weight+reps (PowerBlock) | 1 · 2 | 1→2: 3:00 | 1→2 |
| Hanging Knee Raise | bodyweight, reps | 1 · 2 | 1→2: 1:00 | none (too short) |

Confirms: bodyweight movements can still carry a warm-up (Pull-up W) with no weight column; `targetReps` is **per exercise** — Hammer Curl normally sits at **8–12** (the 4–5 seen in an earlier screenshot was just an overload day, not its range), while presses ramp at 8–15.

### Reference: Thursday (Lower Variation + Run), from Strong template

| Exercise | Type | Sets | Rests | Mobility eligible |
|---|---|---|---|---|
| Goblet Squat | weight+reps (PowerBlock) | W · 1 (single working set) | W→1: 2:00 | none (single working set) |
| Plank | **time** (count-up stopwatch) | 1 | 1:00 | n/a |
| Split Squat (Bulgarian) | ~1 lb ≈ bodyweight | 1 (single working set) | — | n/a |

Confirms the `time` input type is used inside a real day (Plank → stopwatch), and single-working-set lifts. Split Squat reads as bodyweight; `loadType` is editor's call.

### Reference: Friday (Upper Mix) — DERIVED (no Strong template; created in-app)

| Exercise | Load / type | Sets | Seed | Rests | Mobility |
|---|---|---|---|---|---|
| Incline DB Bench | PowerBlock | W + 2 | 40 lb, 8–12 (W ~25, ≈55%) | W→1:00, 1→2: 3:00 | 1→2 |
| **Pull-Up** | bodyweight, reps only (form flag on) | W + 2 | W 5 · work 8 / 7 | W→1:00, 1→2: 3:00 | 1→2 |
| Mike Tyson Pushups | bodyweight | 2 (no W) | AMRAP, log reps | paired → 1:00 | none |
| Side Plank | time (stopwatch, bilateral) | 2 (no W) | 30–45 s/side | 1→2: 1:00 | none |

Derivation: Incline seeded one PowerBlock notch below flat bench (45→40) since it's a harder angle; **Pull-Up replaces Chest-Supported Row** — pull-ups appear on *both* Wednesday and Friday for twice-weekly frequency, seeded straight from Wednesday's numbers so the two days stay in sync (same exercise → prefill carries across). **Mike Tyson Pushups + Side Plank run as a back-to-back pair** (decision 13 — non-competing finishers). Seeds only; first-session prefill carries real numbers forward.

**Phase: ramp-up is live.** The tab seeds **conditioning reps (8–15 for the main lifts, ~8–12 for accessories like curls)** — not the heavy 5–8 range. Re-seed targets when the heavy phase begins.

---

## Logging Loop (60-second rule)

1. Open today → rows auto-seeded from the day's scheme. In the ramp-up phase that's the conditioning scheme (e.g. `1wu+2x8-15` → one `W` row + two working rows, target reps greyed). Warm-up row auto-seeds at ~50–60% of the working weight (decision 10). Heavy phase later re-seeds working reps to `5-8`.
2. Each set shows last session's weight×reps prefilled; adjust with steppers (weight = PowerBlock ladder, reps = ±1). Time-type sets log via the count-up stopwatch. Bodyweight grinds (pull-ups) carry a strict/partial form flag.
3. Tap ✓ → set saves, fixed rest countdown launches. On a **working-set rest** the queued mobility shows inside the window (timer engine handles cue/beep/wake-lock/bilateral); a **warm-up rest** is a plain 1:00 countdown, no mobility.
4. Extend / skip available; mobility swappable in the moment.
5. Timer ends → next set prefilled. Repeat.
6. **Progression nudge:** when both working sets land at the top of the rep range, the set shows a quiet "↑ try [next ladder value]" prompt for next time. Never auto-applied.
7. **Finish** → writes the `wo_` session, auto-ticks the Day tab `lift` checkbox → feeds the consistency heatmap and the floor/ceiling workout bar (single source of truth).

Friction guard: mobility is **opt-out**, not opt-in. A no-frills logging day stays as fast as Strong; the mobility only appears because the template queued it, and one tap skips it.

---

## Input & Loading

| inputType | loadType | Used by | Columns |
|---|---|---|---|
| `weight_reps` | powerblock | bench, OHP, triceps, RDL, goblet squat, weighted lunge | weight (PowerBlock ladder) + reps |
| `reps` | bodyweight | bodyweight lunge, pull-ups, Mike Tyson pushups, Pallof, knee raises | reps only (+ form flag where relevant) |
| `time` | bodyweight | planks, side planks, dead hang | mm:ss via count-up stopwatch (reuse Test-tab engine) |

Loading is **per exercise**, not global — a bodyweight lunge logs at 0 lb with no stepper, but can flip to `powerblock` the day you start loading it. Reuses the Test tab's typed-input system rather than inventing new entry widgets.

---

## Integration Points

- **Tab:** new 5th view; same dark/amber styling, safe-area insets.
- **Storage:** `wo_YYYY_M_D` keys, added to the `isBackupKey` sweep so they export/restore.
- **Day linkage:** finishing a session ticks `lift` → heatmap + workout bar update automatically.
- **Reuse:** mobility catalog, timer engine, opposite-zone model — unchanged, called from the new tab.

---

## Phasing

| Phase | Scope |
|---|---|
| **MVP** | Workout tab; seed rows from template (incl. auto-seeded warm-up load); log sets (PowerBlock stepper + reps stepper + prefill + time stopwatch + form flag); plain fixed rest timer; progression nudge; Finish → tick `lift`. No mobility yet. |
| **v2** | Active-recovery: queued mobility per rest, template editor, live swap. The headline feature. |
| **v3** | Session history (cross-week previous overlay), W/AMRAP tags, deload auto-detect, decide Strong retirement, add minimal volume/PR view if retiring. |

**Kill criterion (decision 14):** if MVP logging isn't habitual after 2 weeks, revert to the single `lift` checkbox. This is the line that keeps the build from becoming another all-or-nothing cycle.

---

## Still Open / Future

- Opposite-zone **auto-suggestion** when authoring a rest (editor pre-fills a sensible mobility based on the day's muscle zone) — nice-to-have, not MVP.
- Per-exercise **volume readout** + session elapsed clock (Strong's `3200 lb`, `Finish` timer) — deferred.
- Minimal **progression view** (per-exercise weight/rep trend, with form-flag overlay) — only needed at Strong retirement.
- **Deload auto-detect** — flag a lighter week when working reps stall two sessions running or forearm tightness climbs on the Sunday review (decision 12). v3.
- Decision at v3: what minimum analytics must exist before Strong comes off the home screen.
- **Phase transition:** when ramp-up → heavy begins, re-seed working-set target reps from `8-15` to `5-8`. Worth a one-tap "phase" switch in the template editor rather than hand-editing every day.

---

*Built from Strong reference templates (Mon–Thu) + derived Friday + PowerBlock Sport 90 spec + a trainer-review pass (progression, warm-up seeding, rep quality, deload, finisher pairing, kill criterion). All five days reduce to the same primitives without bending the model. Update as the build proceeds; MVP → v2 → v3 gates on consistency, same as the training program.*
