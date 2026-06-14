# Feature A — Tightness Check-in → Adaptive Mobility / Stretch (Build Plan)

> Goal: let the user flag body areas that feel tight, and have the app (instantly, by rules) and the AI Coach (by approvable suggestions) adapt the day's stretch/mobility routine to target those areas — without destroying their saved routine.

## 1. UX summary
- A small **"Feeling tight today?"** card at the top of the **Stretch** tab with tappable **area chips** (Hips, Hamstrings, Glutes, Lower back, Quads/Hip-flexors, Chest, Shoulders, Upper back (T‑spine), Neck, Ankles).
- Tapping chips sets today's tight areas. The active list then shows an **"Adjusted for: Hips, Shoulders"** banner and:
  - matching drills **float to the top** and get a subtle highlight,
  - their **holds extend** a little (e.g. +15–30s, capped),
  - if a flagged area has **no** active drill, the app **suggests adding** the best catalog match (one tap).
- Optional **"Ask coach to tailor it"** → the AI proposes specific changes as **approve/dismiss cards** (reuses the existing coach approval UI).
- **Non-destructive:** the user's saved `active_*` lists and `stretch_times` are never overwritten by the adjustment. Adjustment is a *per-day overlay* computed at render/session time. (Approved coach edits *do* persist, just like template edits.)

## 2. Data model

### 2a. Area taxonomy (new constant)
Canonical list (`TIGHT_AREAS`), ~10 areas:
`hips, hamstrings, glutes, lowerBack, hipFlexors, chest, shoulders, tspine, neck, ankles`
Each with a display label. Keep it small and body-map-friendly.

### 2b. Tag the catalog with areas (foundational)
- **Mobility (`MOB_BASE`)** already has `area` (string). Normalize it into an **`areas: []`** list mapped to the taxonomy (e.g. `'T-Spine' → ['tspine']`, `'Hips' → ['hips','hipFlexors']`).
- **Stretches (`FLOOR_STR` / `EXTRA_STR`)** currently have **no** area — add an `areas: []` to each. Initial mapping:
  - Couch Stretch → `hipFlexors, quads(hipFlexors)`
  - Pigeon / Double Pigeon / 90-90 → `glutes, hips`
  - Forward Fold / Seated Straddle → `hamstrings, lowerBack`
  - Folded Butterfly / Frog → `hips, adductors(hips)`
  - Thoracic Rotation → `tspine`
  - Doorway Chest Opener → `chest, shoulders`
- Custom items: add an optional **area picker** to the "Create Custom" sheets so user-made drills participate (default: untagged → ignored by the engine).
- Surface this through `getCatalogMap()` / `stGetList()` so every item exposes `areas`.

### 2c. Tightness storage
- Store today's flags in the **day `state`** object (already saved under the `tr_YYYY_M_D` key, so it rides along in backups automatically): `state.tight = ['hips','shoulders']`.
- Helpers: `getTight()` / `toggleTight(area)` → mutate `state.tight`, call `save()`.
- (Phase 2 option) a persistent **"chronic" list** (`tight_profile` key) for areas that are always a focus, layered under the daily flags.

## 3. Tier 1 — rules engine (instant, offline)
A pure function the Stretch render/session uses; **does not mutate saved data**.

```
adjustRoutine(activeItems, tightAreas) -> { ordered, boostedHolds, missingAreas }
```
Logic:
1. **Score** each active item by overlap of its `areas` with `tightAreas`.
2. **Stable-sort** matched items to the top (preserve original order within ties) → `ordered`.
3. **Extend holds** for matched items by a fixed bump (e.g. `+20s`, capped at 2× default) → `boostedHolds` (a per-id override applied only for this session, *not* written to `stretch_times`).
4. **Missing-area detection:** for any `tightArea` with zero matched active items, find the best catalog candidate (by area match, prefer built-in) → `missingAreas: [{area, suggestId}]` → render an "Add Pigeon for glutes?" one-tap chip (uses existing `addToActive`).

Wire-in points: `stGetList()` (apply ordering + hold overrides when `state.tight` non-empty), `renderStretch()` (banner + suggestion chips), the session builder (use boosted holds + order).

## 4. Tier 2 — AI Coach integration
- Extend **`coachPayload()`** to include `tightAreas` and `areaCoverage` (which areas the active mobility/stretch lists currently cover).
- Add a coach **prompt mode** (reuse `COACH_FOCUS='mobility'`) that, given the tight areas, recommends concrete changes.
- Reuse the **approve workflow** (`coachValidEdit` / `coachEdits` / `coachApproveEdit`) with **new edit types** scoped to mobility/stretch:
  - `addDrill` (add catalog item to an `active_*` list),
  - `removeDrill`,
  - `setHold` (write to `stretch_times`).
  These persist on approval (mirroring how template edits persist), with Undo.
- Guardrails: only catalog items by exact id/name; only the active set's list; bounded hold values — same validation discipline as the workout edits.

## 5. Function / file touch points (all in `index.html`)
- **New:** `TIGHT_AREAS`, `getTight`, `toggleTight`, `adjustRoutine`, `tightChipsHTML`, `areaSuggest`.
- **Edit:** `FLOOR_STR`/`EXTRA_STR`/`MOB_BASE` (+`areas`), `getCatalogMap`/`stGetList` (expose `areas`, apply adjustment), `renderStretch` (chips + banner + suggestions), session builder (ordered + boosted holds), `coachPayload` (+tightAreas/coverage), coach edit validation/apply (new mobility edit types), custom-create sheets (area picker).
- **Backups:** `state.tight` rides in the `tr_` day blob already (in `isBackupKey`). If we add `tight_profile`, add it to `isBackupKey`.

## 6. Edge cases
- No tight areas flagged → app behaves exactly as today (zero overhead).
- Flagged area with no catalog coverage at all → show a gentle "no drill for X yet" note (and it's a candidate for a future custom drill).
- Bilateral items (`note==='Each side'`) → keep doubling logic intact when boosting holds.
- Don't let boosted holds blow up total time unreasonably → cap per item and show the new total.
- Adjustment must never persist into the saved routine unless the user explicitly approves a coach edit or taps "add."

## 7. Testing (extend `test/smoke.js`)
- `adjustRoutine` orders matched items first and leaves order otherwise stable.
- Hold-boost applies to matched ids only, respects the cap, and does **not** write `stretch_times`.
- Missing-area detection returns a sensible `suggestId` for a flagged area with no active match.
- `toggleTight` persists to day state and is picked up by the next render.
- Coach mobility edits (`addDrill`/`removeDrill`/`setHold`) validate, apply, and undo.

## 8. Phased delivery
1. **Phase 1 (foundation + Tier 1):** area taxonomy, tag the catalog, tightness chips + storage, `adjustRoutine` (reorder + hold boost + suggest-add), banner. Fully useful with **no AI**.
2. **Phase 2 (AI):** extend coach payload + mobility edit types + approve/undo; "Ask coach to tailor it."
3. **Phase 3 (polish):** chronic-tightness profile, area picker on custom-create, a simple body-map visual instead of chips.

## 9. Decisions for you
- **Where the chips live:** top of the Stretch tab (recommended) vs a prompt when you press Start vs on the Day page.
- **Daily vs persistent:** reset tight flags each day (recommended) vs keep until cleared.
- **How aggressive the auto-adjust is:** reorder + small hold bump (recommended) vs also auto-add drills without asking.
- **Scope of v1:** ship Phase 1 (rules only, no AI) first to validate the UX, then add the AI layer.
