# Stretch Illustration Guide

How to make the Aurora-style stretch illustrations for the app, and how to drop a finished one in.

Two roles:
- **Artist** (e.g. a helper/family member) — only needs a **web browser**. Generates art in Recraft, hands back raw PNGs. *Parts 1–3.*
- **Dev** — runs one command to process + wire each image in. *Part 4.*

---

## Part 1 — One-time setup (~15 min, artist)

1. **Recraft account** — sign up at [recraft.ai](https://recraft.ai). The free daily credits are plenty to start.
2. **Shared folder** — make a Google Drive / iCloud / Dropbox folder named `stretch-art`. Finished PNGs go here; that's the whole handoff.
3. **Lock the house style (most important step):**
   1. New project → set image type to **"Vector Illustration"** (not Realistic).
   2. Generate one image with the master prompt below.
   3. When one looks right, click **"Use as style" / Create style** and name it `aurora-stretch`.
   4. Every later image reuses that style — only the pose changes, so the whole set stays consistent.

---

## Part 2 — The master prompt

Paste this every time; swap only the **POSE** line.

```
Single continuous line-art illustration of one person doing a [POSE].
Minimalist line drawing on a plain white background, no fill, no shading.
The line is a smooth vertical gradient: cyan-blue (#4BB8D8) at the top,
fading through blue (#598ED3) to violet (#6F6BCE) at the bottom.
Even ~3px rounded stroke weight.
Side profile, full body, centered in a square frame with margin.
Clean, calm, modern wellness-app aesthetic.
```

> **Match the existing set:** the four finished poses (pigeon, forward fold, double pigeon, folded
> butterfly) all use this cyan→violet vertical gradient — there is **no gold**. Easiest way to lock it:
> in Recraft, **import the color palette from `pigeon_pose.png`** and keep that image as your style
> reference, so every new pose comes out the same.

**Pose lines for the set we're (re)doing:**

| Pose line | Save the PNG as |
|---|---|
| couch stretch — kneeling lunge, back foot propped against a wall | `couch_stretch` |
| thoracic rotation — on hands and knees, one arm reaching up and rotating open | `thoracic_rotation` |
| doorway chest opener — standing, forearm on a door frame, chest rotating away | `doorway_chest_opener` |
| 90/90 hip stretch — seated on floor, both knees bent 90°, one front one back | `90_90` |
| seated straddle — seated on floor, legs wide apart, folding forward | `seated_straddle` |
| frog stretch — on hands and knees, knees spread wide, hips sitting back | `frog` |
| behind-back clasp — standing, hands clasped behind the back, straight arms lifted up and away, chest open | `behind_back_clasp` |

> The filename must be **exactly** the slug in the right column (lowercase, underscores) — the app matches by name.

---

## Part 3 — Per-image checklist (artist)

For each pose:
1. Swap the POSE line, generate 4 variations.
2. **Pick by this checklist:** ☐ cyan→violet gradient line, no other colors ☐ white background ☐ pose looks anatomically right ☐ centered & roughly square ☐ no stray marks or text.
3. Download the **PNG** at the highest resolution offered.
4. Rename it to the exact slug from the table (e.g. `couch_stretch.png`).
5. Drop it in the `stretch-art` folder. Done — no code, ever.

**Pose looks wrong?** Attach a reference (a photo, or even a stick-figure sketch) alongside the prompt in Recraft. The saved style stays locked; the reference just fixes the body position.

---

## Part 4 — Process + wire it in (dev)

For each raw PNG the artist delivers:

```bash
npm run stretch-art -- path/to/raw.png couch_stretch
# or: node scripts/process-stretch.js path/to/raw.png couch_stretch
```

This keys the white background to transparent (feathered, so the colored lines keep clean edges), trims the border, and centers the figure on a transparent **320×320** square. It writes `couch_stretch.webp` to the repo root, where the app already looks for it.

- **Already wired:** the `SSVG` map in `index.html` references `couch_stretch.webp`, `forward_fold.webp`, etc. by name, so replacing/adding the file is all that's needed. A missing or broken file just hides itself (`imgErr`), so you can swap images in one at a time without breaking the page.
- **Adding a brand-new pose** (e.g. `frog`): add an `<img src="frog.webp" …>` entry to `SSVG` for that drill's id.
- **Line looks too thin** (the key ate the anti-aliased edges)? Re-run with a softer threshold:
  ```bash
  HI=245 LO=215 npm run stretch-art -- path/to/raw.png couch_stretch
  ```
  Tunables (env vars): `HI` (whiteness fully removed, default 250) · `LO` (whiteness fully kept, 230) · `SIZE` (square edge, 320) · `MARGIN` (padding, 24).

---

## Style reference (what "Aurora" means here)

- Single continuous **line art**, no fills or shading.
- **Cyan→violet vertical gradient stroke** — `#4BB8D8` (top) → `#598ED3` (mid) → `#6F6BCE` (bottom), even ~3px rounded weight. Matches the four finished poses (pigeon, forward fold, double pigeon, folded butterfly).
- Square framing, figure centered with margin, side profile, minimal props (a floor line at most).
- Transparent background in the final asset (the script handles that from a white input).

> Note: two unfinished placeholder poses (`b9` Overhead Lat Stretch, `b10` Spinal Twist) are still
> drawn as gold SVGs in `index.html` — those are the *old* style and should eventually be redrawn in
> this gradient too. Don't use them as a color reference.
