#!/usr/bin/env node
/*
 * process-stretch.js — turn a raw Recraft PNG (gold line art on white) into the
 * transparent, centered, square .webp the app loads.
 *
 *   node scripts/process-stretch.js <input.png> <name>
 *
 * <name> is the app slug WITHOUT extension, e.g.  couch_stretch  ->  couch_stretch.webp
 * written to the repo root (where the app looks for it). Examples:
 *   node scripts/process-stretch.js ~/Downloads/raw.png couch_stretch
 *   node scripts/process-stretch.js raw.png frog
 *
 * What it does: softly keys the white background to transparent (feathered so the
 * gold lines keep clean edges), trims the empty border, then centers the figure on
 * a transparent square canvas with a small margin.
 *
 * Tunables via env: HI (default 250) fully-transparent above this whiteness,
 * LO (230) fully-opaque below it, SIZE (320) output square, MARGIN (24) padding.
 */
const sharp = require('sharp');
const path = require('path');

const [, , input, name] = process.argv;
if (!input || !name) {
  console.error('Usage: node scripts/process-stretch.js <input.png> <name>');
  console.error('   e.g. node scripts/process-stretch.js raw.png couch_stretch');
  process.exit(1);
}

const HI = +(process.env.HI || 250);     // whiteness at/above which a pixel is fully removed
const LO = +(process.env.LO || 230);     // whiteness at/below which a pixel is fully kept
const SIZE = +(process.env.SIZE || 320); // output square edge in px
const MARGIN = +(process.env.MARGIN || 24);
const inner = SIZE - 2 * MARGIN;
const slug = name.replace(/\.(webp|png|jpg|jpeg)$/i, '');
const out = path.join(process.cwd(), slug + '.webp');

(async () => {
  // 1. read raw RGBA and soft-key the white background to transparent
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const whiteness = Math.min(data[i], data[i + 1], data[i + 2]); // bright on all channels => background
    let a;
    if (whiteness >= HI) a = 0;
    else if (whiteness <= LO) a = 255;
    else a = Math.round(255 * (HI - whiteness) / (HI - LO)); // feathered edge
    data[i + 3] = Math.min(data[i + 3], a);
  }
  const keyed = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });

  // 2. trim the now-transparent border, then fit inside the inner box
  const fitted = await keyed
    .trim()
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3. center on a transparent square canvas with margin
  const m = await sharp(fitted).metadata();
  const top = Math.round((SIZE - m.height) / 2);
  const left = Math.round((SIZE - m.width) / 2);
  await sharp(fitted)
    .extend({
      top, left,
      bottom: SIZE - m.height - top,
      right: SIZE - m.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(out);

  console.log('✓ wrote ' + slug + '.webp  (' + SIZE + '×' + SIZE + ', transparent)');
  console.log('  Reload the app — it picks the file up by name. If the line looks thin,');
  console.log('  re-run with a lower threshold:  HI=245 LO=215 node scripts/process-stretch.js ' + input + ' ' + slug);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
