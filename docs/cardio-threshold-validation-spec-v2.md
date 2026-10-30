> Copied from Google Drive (Habit-Tracker folder) on 2026-10-30. Drive is the archive; edit here going forward. Shipped as Zone 2 tracking (see ROADMAP.md).

# Cardio Threshold Validation — Spec v2

*App feature: on logging a cardio session, validate it against an aerobic-volume threshold and track weekly accumulation. Goal: optimize cardio's contribution to weight loss without compromising recovery, appetite, or sustainability.*

**Status:** Decisions locked (see §2, §8). Ready to build in a code-enabled session.
**Supersedes:** v1 (`cardio-threshold-validation-spec-v1.md`) — delete v1.
**Data source:** Wahoo Ticker chest strap → Wahoo app (treadmill + outdoor running). App reports avg HR, max HR, and time-in-zone.

---

## 0. The Honest Frame (read first)

**Weight loss = energy balance.** Cardio is a support lever, not the driver. The driver is the calorie deficit, which for Regan runs primarily through the binge/boredom-eating module. Cardio widens the deficit and improves metabolic health (LDL, HDL, TyG, trigs); it does not carry weight loss on its own. Grounding number: a 21-min session ≈ 198 kcal; a 150 min/week target ≈ ~1,400 kcal/week — meaningful but roughly one large meal. Diet dwarfs it.

**The "fat-burning zone" is a substrate-percentage artifact, not a fat-loss mechanism.** Higher % fat burned ≠ more body fat lost. The app validates *repeatable aerobic volume*, not a fat zone. Repeatability is the metric that survives a bad week — which is also the right answer for the dropout pattern.

---

## 1. Why This Intensity Is Right for Regan

Not because it melts fat — because it's the lowest-interference, most-repeatable intensity that still drives expenditure and metabolic adaptation.

| Benefit | Relevance |
|---|---|
| Low fatigue cost | Protects recovery from 4x/wk lifting + running |
| Builds fat-oxidation / mitochondrial capacity | Metabolic flexibility, longevity driver |
| Minimal appetite disturbance | Hard cardio can trigger compensatory eating — relevant to binge lever |
| Floor-compatible | Sustainable when life collapses to the floor |

---

## 2. Zone Definition — LOCKED

**Method: %HRmax, using Wahoo's existing default Zone 2 band.**
**Qualifying band: 107-132 bpm (Wahoo Zone 2).**

- Decoded against Tanaka HRmax (`208 − 0.7 × age` ≈ 172 at age 52): 107-132 = **~62-77% HRmax**.
- Floor (107 / 62%) sits above walking pace → walks self-exclude, staying a separate bucket.
- Ceiling (132 / 77%) is generous — captures moderate aerobic work. Acceptable for volume accumulation; note it does not distinguish recovery cost (a 130-bpm minute counts the same as 110).
- **No Wahoo configuration required.** Zones are default; band is read directly off the history screen.

*Rationale for choosing this over a custom 103-120 band: Wahoo is on defaults, so adopting its native Zone 2 means zero setup and zero per-session math — one number read off a screen already in use. Friction reduction outweighs intensity-purity gain. Karvonen %HRR is the future upgrade once RHR stabilizes (see §8).*

---

## 3. Per-Session Threshold

A session counts toward the weekly target when:

| Criterion | Threshold |
|---|---|
| Time in Wahoo Zone 2 (107-132) | ≥ 20 min (target 20-30+) |

**Time-in-zone is the metric, not average HR.** Wahoo already computes it — read "Zone 2" minutes off the session summary. (Example session: 19:14 in Zone 2 = just under the 20-min count.)

---

## 4. Weekly Volume Target (the real lever)

Per-session is the unit; **weekly accumulation moves expenditure.**

| Tier | Weekly Zone 2 minutes |
|---|---|
| Floor | 90 min/wk (≈ 3 × 30) |
| Target | 150 min/wk |
| Ceiling | 180-200+ min/wk |

App tracks a running weekly total of Zone 2 minutes vs tier. This is the headline number — more important than any single session's grade.

---

## 5. Logging Schema & Input

Input = Wahoo Zone 2 minutes (one number per session). Optional avg HR for records.

Schema (`cardioSessions`):
```json
{
  "ts": "ISO-8601",
  "mode": "run | treadmill | bike | other",
  "durationMin": number,
  "zone2Min": number, // read off Wahoo
  "avgHR": number, // optional
  "qualifies": boolean, // zone2Min >= 20
  "sessionType": "zone2 | tempo | interval | other"
}
```

---

## 6. What Counts vs What's Exempt (self-sorting)

Tempo runs (Phase 2: 2K @ 80%) and 400m intervals (Phase 3) are SUPPOSED to exceed this band — they push into Wahoo Zone 3+ (133+ bpm) and **auto-separate** without manual tagging. They serve VO2/threshold goals, not aerobic-base volume.

- Zone 2 minutes (107-132) → count toward weekly total.
- Time in Zone 3+ → high-intensity, not zone-counted, exempt from the threshold check. Never flagged as a "failed" session.

Because the band ceiling (132) sits below tempo/interval HR, the exemption runs off Wahoo's native zones with no extra input.

---

## 7. Validation Feedback (no moralizing — inherited rule)

| Outcome | Feedback |
|---|---|
| Qualifies | Quiet green + weekly total: "27 min Zone 2. Week: 112/150." |
| Under 20 min | Neutral: "18 min Zone 2 — 2 short of counting. Data, not a penalty." |
| Mostly below band | "Most time under 107 — logs as a walk, not Zone 2 cardio." |
| Mostly Zone 3+ | "High-intensity logged. Different job — not counted toward Zone 2 volume." |

Neutral data, never a verdict. Consistent with the binge module.

---

## 8. Decisions — LOCKED

1. **Zone method:** %HRmax via Wahoo default Zone 2 (107-132). ✓
2. **Input method:** Read Wahoo Zone 2 minutes — one number. ✓
3. **Wahoo config:** None required (defaults adopted intentionally). ✓
4. **Resting HR:** Measure (tracked test metric, target −3 to −5 bpm per protocol). Not needed for this build, but unlocks the Karvonen upgrade below.

**Future upgrade (not now):** Once RHR stabilizes over a few months, optionally migrate to Karvonen %HRR for individualized zones, piggybacking on the 8-week RHR retest. Revisit only if the 107-132 band proves too generous in practice (e.g., cardio starts taxing lifting recovery).

---

## 9. MVP Scope

**MVP:** §3 per-session check + §4 weekly accumulation tracker + §7 feedback. One input number per session.

**Fast-follow:** weekly Zone 2 minutes trend over time; overlay against weight trend.

**Out of scope:** auto-pulling HR from Wahoo/Apple Health (not possible in a PWA) — manual single-number entry is the design.

---

*Cardio widens the deficit; it doesn't drive it. Reward repeatable aerobic volume — the metric that survives a bad week — and let walks and intervals self-sort around the band.*
