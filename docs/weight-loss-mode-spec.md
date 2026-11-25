# Weight-Loss Mode — spec (Phase 1)

A goal-with-a-deadline layered on the app's existing fat-loss data, so the Goals
tab answers one question: **am I on pace to hit my target by the date?**

## Why
The app already has the raw materials — `weightTrend()` (smoothed lb/week),
`nutritionSummary()` (deficit), `latestBodyWeightLb()`, the Fat-Loss card — but the
goal is a hardcoded `GOAL_WEIGHT_LB = 175` with no target date and no pace math.
Weight-Loss Mode turns that into an editable goal and derives progress + projection.

Calorie target is intentionally **out of scope**: the user sets and manages their
daily calorie number in Cronometer; the app reads the resulting deficit through the
existing Health sync and shows required-vs-actual for reference only.

## Data model
A single global object in `localStorage` under `wl_goal` (not per-day `state`):

```
{ startW: <lb>, startMs: <epoch>, goalW: <lb>, targetMs: <epoch> }
```

- `startW` / `startMs` — weight and date when the goal was set (baseline for progress).
- `goalW` — target weight. Pounds-to-lose = `startW - goalW`.
- `targetMs` — the deadline.

`goalWeight()` returns `wl_goal.goalW` when a goal is set, else the legacy `175`,
so the Fat-Loss card keeps working with no goal.

## Derived stats — `wlStats()`
- **lost** = `startW - currentW`  (currentW from `latestBodyWeightLb()`)
- **toLose** = `startW - goalW`, **remaining** = `currentW - goalW`, **pct** = lost/toLose
- **weeksLeft** = (targetMs − now) / 1wk
- **requiredRate** = remaining / weeksLeft  (lb/wk still needed)
- **requiredDeficit** = requiredRate × 3500 / 7  (kcal/day, informational)
- **actualRate** = `weightTrend().ratePerWeek`  (negative = losing)
- **projMs** = now + remaining / |actualRate| weeks  (projected finish, when losing)
- **status** = ahead / on-track / behind, from projMs vs targetMs (±4-day grace)

## UI — Goals tab
- **No goal set:** a "Set up your weight-loss goal" card with a short inline form —
  current weight (prefilled from Health), pounds to lose (default 15), target date
  (default +4 months). Save writes `wl_goal`.
- **Goal set:** a dashboard card at the top of the Goals tab:
  - Headline: **X / N lb lost** + % to goal.
  - **Glide-path chart** (compact SVG): the straight target line from (start, startW)
    to (deadline, goalW), the actual smoothed weight trend, a "today" marker, and a
    dashed **projected-finish** segment from the latest point along the current rate.
  - Countdown row: weeks left · required pace vs actual pace · projected date.
  - Status banner: on-track / ahead / behind, with the pace nudge to get back on line.
  - Required vs actual deficit (actual from `nutritionSummary`) — reference only.
  - Edit / clear goal.

## Coach integration
A compact `weightLoss` block in `coachPayload` — goal weight, target date, lost,
remaining, requiredRate, actualRate, projectedDate, status — so the AI Coach advises
against the deadline, not just "trending down."

## Phase 2 (shipped)
Mode on/off toggle (`wl_mode`) + a pinned Day-page progress strip; a manual weigh-in
quick-add (`wlLogWeight` → today's `hl_` record); a 7-day "this week" delta; monthly
milestone markers (chart month ticks + next-milestone line). `wl_goal`/`wl_mode` added to
the backup sweep. Still deferred: wiring the parked goal-derived in-app calorie ceiling
(calories stay in Cronometer by choice).
