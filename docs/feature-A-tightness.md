# Feature A — Chronic Tight-Area Check-in → Adaptive Mobility / Stretch

> Goal: let the user flag the body areas that are **chronically tight**, and have the app adapt
> the stretch/mobility routine to target them — instantly by rules, and optionally with a reasoned
> AI pass — **without ever reordering or overwriting the user's saved routine.**

This document is the **as-built spec**. The four design questions were settled in an interview
(2026‑06‑14); the decisions are recorded in §2.

## 1. What it does
- On the **Day page**, the Floor Mobility line carries two pills: the existing **session counter**
  and a new **"Tight areas" check-in** pill showing the flagged count.
- Tapping the check-in pill opens a sheet of body areas; ticked areas are a **chronic list** that
  persists until cleared (no daily reset).
- The **Stretch tab** stays fully pre-rendered and instant. When tight areas are flagged it shows a
  **"Tuned for tight areas"** card with per-item, approve-or-dismiss suggestions:
  - **Longer holds** on drills already in the routine that hit a tight area, and
  - **Targeted adds** when an area is thinly covered (<2 drills), inserted *next to related drills*
    — the routine order is never shuffled. An approved add is written into the active list
    (i.e. saved to the routine/template), not a one-off.
- A **"Tailor with AI coach"** button runs a focused, direct API call (reusing the Coach key/model)
  that may only lengthen an existing drill or add a catalog drill — never reorder, remove, or
  invent. Its picks merge into the **same approve cards**, tagged `AI`, each with a short reason.
- The workout **Coach** payload also gains `tightAreas` (with coverage counts) so its prose review
  can speak to the tight areas.

## 2. Decisions (finalized in interview)
1. **Placement → Day page.** Keeps the Stretch tab instant (no analysis on open). The mobility
   counter line splits into a counter pill + a tight-areas check-in pill.
2. **Persistence → chronic list only.** Flags persist until cleared; no daily acute tracking
   (documented as a "later if needed" extension).
3. **Behavior → no reordering.** Suggest longer durations + targeted adds (insert near related
   drills, save into the routine). Everything is an approve-first suggestion.
4. **Source → both.** Rules run automatically/offline for the instant baseline; the AI coach is an
   opt-in "Tailor" pass. Both feed one approval surface.

## 3. Data model
- **`TIGHT_AREAS`** — canonical, body-map-friendly list (neck, shoulders, chest, T‑spine, lower
  back, hips, glutes, hamstrings, quads/hip-flexors, ankles, wrists). Core/activation work maps to
  no tight area.
- **Catalog tagging** — `getCatalogMap()` exposes `areas: []` on every drill. Mobility drills derive
  theirs from the existing `area` label via `MOB_AREA_MAP`; stretches via `STR_AREA_MAP` (by id).
  Custom drills are untagged (`[]`) and ignored by the engine.
- **Chronic storage** — `tight_areas` localStorage key (sanitized against the taxonomy on read).
  Helpers: `getTightAreas` / `saveTightAreas` / `isTight` / `toggleTightArea`.

## 4. Rules engine (instant, offline)
`stSuggCompute()` for the current mode (`floor`/`full`/`mobility`):
1. For each tight area, find the shortest **active** drill below the mode's hold target
   (`stTargetHold`: 60s mobility, 90s stretch) → propose a **`dur`** boost to the target.
2. If an area is covered by **<2** active drills, propose the first catalog **`add`** for that area
   that isn't already active.
3. De-dupe by `kind|id`. The routine order is read-only; adds compute an insert position adjacent to
   related drills (`stSuggInsertPos`).
Suggestions are approved per-item (`stSuggApprove` → `setStretchTime` / `saveActiveList`); dismissals
last for the session.

## 5. AI tailoring
- `stTailor()` posts `{tightAreas, routine, availableToAdd}` to the Anthropic API and asks for a
  strict `{"suggestions":[{action:"setDuration"|"addDrill", drill, seconds, why}]}` block.
- `stTailorParse()` validates every suggestion against the catalog/active list (exact name match,
  bounded seconds, no invented drills, no duration decreases) before merging into the approve cards.
- Reuses `coachKey()` / `coachModel()` / `coachFriendlyErr()`; entirely separate from the
  workout-template edit machinery.

## 6. Touch points (all in `index.html`, plus `sw.js` cache bump + `test/smoke.js`)
- **Catalog/taxonomy:** `TIGHT_AREAS`, `MOB_AREA_MAP`, `STR_AREA_MAP`, `areaLbl`, `catalogAreas`;
  `getCatalogMap` (+`areas`).
- **Storage:** `getTightAreas`/`saveTightAreas`/`isTight`/`toggleTightArea`.
- **Engine + UI:** `stSuggCompute`/`stSuggList`/`stSuggInsertPos`/`stSuggApprove`/`stSuggDismiss`/
  `stSuggHTML`; `renderStretch` (card injected above the list).
- **AI:** `stTailorPayload`/`stCatalogByName`/`stSuggAIPush`/`stTailorParse`/`stTailor`.
- **Day page:** `mobRowHTML` (check-in pill), `tightChipLabel`/`refreshTightChip`, `openTightSheet`/
  `toggleTightRow`.
- **Coach:** `coachTightSummary`; `coachPayload` (+`tightAreas`); mobility focus instruction.

## 7. Tests (in `test/smoke.js`)
Catalog area tags; chronic storage round-trip + sanitization; rules produce a boost on a short
hip drill and a hip add on a thin list; approving a boost writes the override; approving an add
inserts the drill while leaving existing drills in place; AI parse accepts valid drills and rejects
an invented one; `coachPayload` reports/omits `tightAreas`; Day-page chip + sheet render.

## 8. Later (out of scope for v1)
- Daily acute tightness layered under the chronic list.
- Area picker on the custom-create sheets so user drills participate.
- A body-map visual instead of the area list.
