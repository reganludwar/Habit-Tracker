> Copied from Google Drive (Habit-Tracker folder) on 2026-10-30. Drive is the archive; edit here going forward. Shipped as the "Riding an urge" button (see ROADMAP.md).

# Boredom-Binge Interrupt — Coach Module Spec v1

*Standalone AI-coach feature. Highest-priority behavioral target: bored/idle eating, the dominant driver behind the stress-eating signature and a leading edge of the dropout pattern.*

**Status:** Specced, not built. Requires code-enabled session (JS, AI API call, localStorage schema).
**Model:** `claude-sonnet-4-6` via direct API call.
**Parent feature:** AI Coach (see Floor Guardian + Evidence Mirror in broader coach spec). This module ships independently.

---

## 1. Why This Is Its Own Module

Boredom eating is not a willpower problem and must not be treated as one. It is understimulation seeking a fast dopamine hit, with food as the nearest lever. The urge is real; the target (food) is a misread of the actual need (state change). The entire module is built on one inversion:

**Permission, not prohibition. Interrupt, not restraint. Redirect the need, don't fight the food.**

Shame is the fuel of the binge cycle. A coach that moralizes is worse than no coach — it manufactures the guilt that drives the next episode. The no-moralizing rule below is a hard constraint, enforced at the system-prompt level, not a tone preference.

This is also instrumentation. Every interaction is a logged datapoint that surfaces the leading indicator already flagged as wanted: *when* does the urge fire, and after *what*.

---

## 2. The Button

| Property | Spec |
|---|---|
| Label | "Riding an urge" / "Not hungry but want to eat" (test both) |
| Location | Dashboard, always one tap away. Not buried in a tab. |
| Trigger | User-initiated, in the moment of catching the drift toward food |
| Output | Glanceable. One line + expand. Never a wall of text. (60-second rule.) |
| Cost | Single stateless AI call. Inject: recent log slice + urge-history + system prompt. |

---

## 3. The Urge-Loop Mechanic (core flow)

| Step | Coach move | Mechanism |
|---|---|---|
| 1. Name the state | "You ate ~2h ago. This reads as boredom, not hunger." | Boredom eating runs on autopilot. Naming breaks the trance. |
| 2. Permission + timer | "Set 15 min. Urges crest and fade. Still want it after? Eat it — zero penalty." | Urges peak/pass in ~15-20 min. Permission removes the rebound prohibition triggers. |
| 3. Meet the real need | Offer one 2-min stimulation substitute (menu §4). | The need is a state change, not calories. Movement shifts state fastest. |
| 4. Log either way | Record the event regardless of outcome. | Every tap = data. No outcome is a "fail." |

Timer is optional/soft — offered, not forced. The user can dismiss to step 4 at any point.

---

## 4. Substitute Menu (state-change redirects)

Restless boredom energy is the same fuel the floor routine burns. Redirect it into training rather than spending it on food. Coach picks 1-2 based on time of day + what's already logged today.

- **Bring the dog walk forward** — "Walk now instead of 6am. Same habit, better timing."
- **20 air squats, now** — changes physiological state in ~60 sec.
- **3 stretches from the floor routine** — "Restless and unfocused is exactly the state morning mobility clears."
- **Cold water / step outside** — fast sensory state change.
- **One avoided work task** — names a specific pending item if available.
- **Protein-first** (only if it reads as borderline-real hunger) — "Lead with protein. Nothing's off-limits, but start with the thing that actually satisfies." Ties to 170g target.

Rule: never offer food-restriction language. Offer *replacement stimulation*, with food as a permitted fallback.

---

## 5. System-Prompt Constraints (non-negotiable)

Encode in the module's system prompt:

1. **Zero moralizing.** If the user eats anyway: log neutral, respond e.g. "Logged. That's information about your afternoon, not a verdict." No guilt, no "next time," no disappointment framing.
2. **Permission-first.** Food is never forbidden. The frame is always "wait and see if the urge passes," never "don't."
3. **Floor-first redirect.** Substitutes point at training/movement the user already owns.
4. **Evidence-grounded.** Reference the user's own urge-history and streaks, not generic encouragement.
5. **Brevity.** Default output ≤ 2 lines. Expand only on tap.
6. **End pointed at an action**, never at more conversation. The coach is not a place to eat-talk instead of act.

System prompt is ~200-word compression of the above + the project's floor/ceiling + dropout context.

---

## 6. Logging Schema

Each tap writes one event to localStorage (key: `urgeEvents`), array of:

```json
{
  "ts": "ISO-8601 timestamp",
  "outcome": "rode_out | ate | redirected",
  "redirect": "walk | squats | mobility | water | task | protein | none",
  "precedingActivity": "free text or quick-pick: trading | work | task_transition | tv | scrolling | other",
  "hoursSinceLastMeal": number,
  "note": "optional free text"
}
```

`precedingActivity` is the root-cause field — turns each urge into trigger data, not just win/loss.

---

## 7. Evidence Mirror (compounding payoff)

Once a handful of events exist, the coach reflects the user's own data back:

- "Last 4 boredom taps you rode out and logged no regret. The urge is a liar — your data proves it."
- Success-rate trend (rode_out + redirected / total) becomes a tracked metric.
- This is conviction installing from the user's own behavior — the only kind that sticks.

---

## 8. Predictive Triggering (v2, after data exists)

Once `urgeEvents` has a few weeks of timestamps, build a time-of-day heatmap. Hypothesized hot windows from current schedule: market close, task transitions, 2-4pm slump.

When a hot window is detected, the coach can pre-empt (this is the ONE place this module may interrupt unprompted, and only after the pattern is established):

> "It's 3:10 — your boredom-urge window. Pre-empt it: stand up, water, two minutes outside."

Moves the user from reacting to the urge to disarming it before it fires.

| Logged field | Becomes |
|---|---|
| `ts` | Heatmap of when boredom eating hits |
| `outcome` | Success-rate trend (the evidence mirror) |
| `precedingActivity` | The actual trigger activity |

---

## 9. AI Call Structure

Stateless. Each invocation injects:
1. Relevant data slice — last meal time, today's training log, recent `urgeEvents` (last ~10), current streaks.
2. Compressed coach system prompt (§5).
3. Trigger context — manual tap vs predictive pre-empt, time of day.

Parse `data.content`, filter `type: "text"`, render first line on dashboard, full text on expand. Wrap in try/catch; on failure fall back to a static version of the urge-loop (steps 1-2 hardcoded) so the button never dead-ends without network.

---

## 10. MVP Scope & Kill Criterion

**MVP:** Button + urge-loop steps 1-4 + logging schema + no-moralizing system prompt. Evidence Mirror (§7) and Predictive (§8) are fast-follows once data accrues.

**Kill criterion:** If the button isn't being tapped at all after two weeks, the friction or framing is wrong — revisit the label and dashboard placement before assuming the concept failed. If it's tapped but ignored, the output is too long or too preachy — tighten the prompt. Scope down, don't abandon.

**Hard rule inherited from architecture:** Event-triggered/on-demand only (except established-pattern pre-empt). Never a forced daily check-in. A nag kills the app.

---

*The food isn't the want. Boredom is. Build the coach to meet the real need and the urge dissolves on its own — then log it, so the pattern becomes visible and finally beatable.*
