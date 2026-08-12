/**
 * pixels.mjs — actually LOOK at a generated image.
 *
 * The Forge has been able to measure an image's dimensions and never its
 * content. That gap blocked two different things at once, which is why this is
 * one module and not two:
 *
 *   1. IMAGE-TO-IMAGE is `'claimed'`. An `image` parameter is accepted (HTTP
 *      200) but acceptance is not influence — the seed parameter is accepted on
 *      the same endpoint and does nothing. The discriminating test is whether
 *      two inputs of markedly different colour produce outputs that TRACK them,
 *      and that needs pixels.
 *   2. PALETTE LAW is unenforced on output. The compiler polices the PROMPT for
 *      retired Galaxy-Swan colours, and nothing has ever checked whether the
 *      returned image honoured the palette it asked for.
 *
 * SCOPE, stated honestly: 8-bit truecolour PNG (colour types 2 and 6),
 * non-interlaced. That is what these image APIs return. Anything else returns
 * `null` rather than a plausible wrong answer — the standing rule of this
 * codebase, earned by a dimension parser that once reported 65536x4293722192.
 */

import { inflateSync } from 'node:zlib';
import { toBuffer } from './imageDimensions.mjs';

/** Channels per pixel for the colour types this module supports. */
const CHANNELS = { 2: 3, 6: 4 };

/**
 * Decode a PNG to raw RGB. Returns null for anything outside the supported
 * subset, never a guess.
 * @returns {{width:number,height:number,rgb:Buffer}|null} rgb = 3 bytes/pixel
 */
export function decodePng(input) {
  const b = toBuffer(input);
  if (b.length < 33) return null;
  if (b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null;

  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const bitDepth = b[24];
  const colorType = b[25];
  const interlace = b[28];
  const ch = CHANNELS[colorType];
  // Unsupported is NULL, not a best effort. A palette-indexed or 16-bit or
  // Adam7-interlaced image decoded by truecolour rules produces confident
  // garbage, and garbage that looks like data is the failure mode this whole
  // subsystem keeps relearning.
  if (bitDepth !== 8 || !ch || interlace !== 0) return null;
  if (!width || !height || width * height > 40_000_000) return null;

  // Concatenate every IDAT chunk — a large PNG is split across many.
  const idat = [];
  let p = 8;
  while (p + 8 <= b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(b.subarray(p + 8, p + 8 + len));
    if (type === 'IEND') break;
    p += 12 + len;                       // len + type(4) + data + crc(4)
    if (len < 0 || p > b.length) return null;
  }
  if (!idat.length) return null;

  let raw;
  try { raw = inflateSync(Buffer.concat(idat)); } catch { return null; }

  const stride = width * ch;
  if (raw.length < (stride + 1) * height) return null;

  // Un-filter. Each scanline is prefixed with a filter byte and is predicted
  // from its left (a), above (b) and above-left (c) neighbours.
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let x = 0; x < stride; x += 1) {
      const cur = raw[src + x];
      const a = x >= ch ? out[dst + x - ch] : 0;
      const bb = y > 0 ? out[up + x] : 0;
      const c = (x >= ch && y > 0) ? out[up + x - ch] : 0;
      let v;
      switch (filter) {
        case 0: v = cur; break;
        case 1: v = cur + a; break;
        case 2: v = cur + bb; break;
        case 3: v = cur + ((a + bb) >> 1); break;
        case 4: {
          const pa = Math.abs(bb - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + bb - 2 * c);
          v = cur + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c));
          break;
        }
        default: return null;            // unknown filter — refuse, don't guess
      }
      out[dst + x] = v & 0xff;
    }
  }

  // Drop alpha so callers get a uniform 3-byte-per-pixel buffer.
  if (ch === 3) return { width, height, rgb: out };
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < out.length; i += 4, j += 3) {
    rgb[j] = out[i]; rgb[j + 1] = out[i + 1]; rgb[j + 2] = out[i + 2];
  }
  return { width, height, rgb };
}

/** Mean colour of a decoded image. Sampled, because full scans are wasteful. */
export function averageColor(decoded, sampleStep = 7) {
  if (!decoded?.rgb?.length) return null;
  const { rgb } = decoded;
  let r = 0; let g = 0; let bl = 0; let n = 0;
  const step = Math.max(1, sampleStep) * 3;
  for (let i = 0; i + 2 < rgb.length; i += step) {
    r += rgb[i]; g += rgb[i + 1]; bl += rgb[i + 2]; n += 1;
  }
  if (!n) return null;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(bl / n), sampled: n };
}

export function toHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

/** Euclidean RGB distance. Crude but sufficient for "is this that colour". */
export function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Active Crystalline Swan palette. */
export const SWAN_PALETTE = Object.freeze({
  '#002060': 'Midnight Sapphire', '#003080': 'Royal Depth', '#60C0F0': 'Ice Wing',
  '#50A0F0': 'Arctic Cyan', '#C6A84B': 'Gilded Fern', '#E0ECF4': 'Frost White',
  '#4070C0': 'Swan Lavender', '#8B5CF6': 'Wing Purple', '#0A0A0F': 'Obsidian Black',
  '#141419': 'Carbon', '#1A1A24': 'Graphite',
});

/**
 * RETIRED Galaxy-Swan. Concatenated so this file never contains the literal
 * strings — the same defence the law filter uses, so a naive grep for retired
 * tokens does not flag the very code that bans them.
 */
export const RETIRED_PALETTE = Object.freeze({
  [`#0a0a${'1a'}`]: 'Galaxy bg', [`#00FF${'FF'}`]: 'Galaxy cyan', [`#7851${'A9'}`]: 'Galaxy purple',
});

/**
 * How near a pixel must be to an anchor to count as BEING that colour.
 *
 * CALIBRATED AGAINST REAL OUTPUT, not chosen. The first value was 60, picked by
 * eye. Measuring the four real generated photographs against the retired anchors
 * gave distances of 55, 73, 73 and 87 to Galaxy purple — so at radius 60 an
 * ordinary photographic grey counted as "contains Galaxy purple" and the audit
 * flagged a lake as a branding violation.
 *
 * 40 sits below every one of those measurements and still admits a genuine
 * match (a real Galaxy pixel scores 0). If this is ever retuned, retune it
 * against measured images again — the number has no meaning in the abstract.
 */
export const PRESENCE_RADIUS = 40;

/** Fraction of pixels that must sit near a retired anchor before it is flagged. */
export const RETIRED_PRESENCE_THRESHOLD = 0.02;

/**
 * Audit a generated image against Swan doctrine.
 *
 * MEASURES PRESENCE, NOT CENTROID PROXIMITY — and the difference is the whole
 * design. The first version compared the image's AVERAGE colour to each palette
 * anchor and flagged whichever was nearer. Run against four real generated
 * photographs it flagged all four as drifting to the retired Galaxy identity,
 * which is nonsense: a desaturated grey (#9095a0) is numerically closer to the
 * muted #7851A9 than to the more saturated Swan Lavender, so EVERY photograph
 * fails. An average is a centroid, and a centroid is not a colour that appears
 * in the picture.
 *
 * So: count the fraction of sampled pixels sitting within `PRESENCE_RADIUS` of
 * each anchor. A frozen lake contains no Galaxy cyan and scores zero; an image
 * genuinely carrying the retired identity has thousands of pixels there.
 *
 * ADVISORY, never fatal, and null-honest: an image that cannot be decoded
 * reports that rather than reading as a pass.
 */
export function paletteAudit(input, opts = {}) {
  const radius = opts.radius ?? PRESENCE_RADIUS;
  const decoded = decodePng(input);
  if (!decoded) return { decoded: false, reason: 'not a supported 8-bit non-interlaced PNG' };
  const avg = averageColor(decoded);
  if (!avg) return { decoded: false, reason: 'no sampled pixels' };

  const swanAnchors = Object.entries(SWAN_PALETTE)
    .map(([hex, name]) => ({ hex, name, retired: false, rgb: hexToRgb(hex), hits: 0 }));

  /**
   * A RETIRED ANCHOR THAT SITS ON TOP OF AN ACTIVE ONE IS NOT EVIDENCE.
   *
   * Retired Galaxy bg (#0a0a…) and active Obsidian Black are ELEVEN units apart
   * in RGB — visually the same near-black. Counting pixels near it flags every
   * dark image, because a dark pixel matches the Swan token just as well. The
   * first calibrated run reported two of four real photographs as drifting on
   * exactly this basis, which is measuring "this picture has shadows".
   *
   * So an anchor whose nearest active token is closer than the presence radius
   * is AMBIGUOUS by construction and excluded from the verdict — reported, not
   * silently dropped. Galaxy cyan (116 from Ice Wing) and Galaxy purple (68 from
   * Swan Lavender) stay in; they have no active look-alike.
   */
  const retiredAll = Object.entries(RETIRED_PALETTE).map(([hex, name]) => {
    const rgb = hexToRgb(hex);
    const nearestActive = Math.min(...swanAnchors.map((s) => colorDistance(rgb, s.rgb)));
    return { hex, name, retired: true, rgb, hits: 0, nearestActive: Math.round(nearestActive),
      discriminating: nearestActive > radius };
  });

  const anchors = [...swanAnchors, ...retiredAll];

  const { rgb } = decoded;
  const step = 7 * 3;
  let n = 0;
  /**
   * UNION, NOT SUM — per-anchor hits double-count and the totals become
   * nonsense. Obsidian Black, Carbon and Graphite are all near-black and sit
   * within one radius of each other, so a single dark pixel matches all three.
   * Summing per-anchor coverage reported **236.9% Swan coverage** on a dark
   * image, which is impossible for a fraction and made the metric useless for
   * exactly the dark, moody images Swan generates most.
   *
   * So the totals count each PIXEL once — did it match any Swan anchor, did it
   * match any discriminating retired anchor — while per-anchor hits are kept
   * for the "which token dominates" readout.
   */
  let swanPixels = 0;
  let retiredPixels = 0;
  const scoringRetired = retiredAll.filter((r) => r.discriminating);
  for (let i = 0; i + 2 < rgb.length; i += step) {
    const px = { r: rgb[i], g: rgb[i + 1], b: rgb[i + 2] };
    n += 1;
    let hitSwan = false;
    let hitRetired = false;
    for (const a of anchors) {
      if (colorDistance(px, a.rgb) <= radius) {
        a.hits += 1;
        if (!a.retired) hitSwan = true;
      }
    }
    for (const r of scoringRetired) if (colorDistance(px, r.rgb) <= radius) hitRetired = true;
    if (hitSwan) swanPixels += 1;
    if (hitRetired) retiredPixels += 1;
  }

  const cover = (a) => ({
    hex: a.hex, name: a.name, coverage: n ? a.hits / n : 0,
    ...(a.retired ? { discriminating: a.discriminating, nearestActive: a.nearestActive } : {}),
  });
  const swan = swanAnchors.map(cover).sort((x, y) => y.coverage - x.coverage);
  const retired = retiredAll.map(cover).sort((x, y) => y.coverage - x.coverage);
  // Only DISCRIMINATING anchors count toward the verdict, and the totals are
  // per-PIXEL unions computed above — never sums of overlapping anchors.
  const scoring = retired.filter((r) => r.discriminating);
  const retiredTotal = n ? retiredPixels / n : 0;

  return {
    decoded: true,
    width: decoded.width,
    height: decoded.height,
    sampled: n,
    averageHex: toHex(avg),          // informational only — never a verdict
    average: avg,
    swanCoverage: Number((n ? swanPixels / n : 0).toFixed(4)),
    topSwan: swan[0],
    retiredCoverage: Number(retiredTotal.toFixed(4)),
    topRetired: scoring[0] ?? null,
    // Named so a reader can see WHY an anchor was ignored rather than wondering
    // where it went. Ambiguity is disclosed, not hidden.
    ambiguousAnchors: retired.filter((r) => !r.discriminating)
      .map((r) => ({ name: r.name, nearestActive: r.nearestActive })),
    // A real signal now: this many pixels ARE a retired colour that no active
    // Swan token could be mistaken for.
    driftsRetired: retiredTotal >= RETIRED_PRESENCE_THRESHOLD,
  };
}
