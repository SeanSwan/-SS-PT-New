#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SwanStudios Achievement Badge Generator                        ║
 * ║  Powered by Nano Banana 2 (Gemini 3.1 Flash Image Generation)  ║
 * ║                                                                  ║
 * ║  Generates 3D badge images for each unique achievement template  ║
 * ║  in 3 art styles: claymation, glass, metallic-coin              ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    node scripts/generate-achievement-badges.mjs                  ║
 * ║    node scripts/generate-achievement-badges.mjs --dry-run        ║
 * ║    node scripts/generate-achievement-badges.mjs --style glass    ║
 * ║    node scripts/generate-achievement-badges.mjs --tree awakening ║
 * ║    node scripts/generate-achievement-badges.mjs --sample         ║
 * ║    node scripts/generate-achievement-badges.mjs --limit 10       ║
 * ║                                                                  ║
 * ║  Setup: GEMINI_API_KEY in .env (root or backend/.env)            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *   1. Loads achievement templates from scripts/achievement-badge-manifest.json
 *   2. Loads art style prompts from scripts/badge-manifest.json
 *   3. For each template × style, generates a 3D badge image via Gemini
 *   4. Saves to frontend/public/badges/achievements/{name}_{style}.png
 *   5. Skips already-generated files for idempotent re-runs
 *
 * Rate limiting: 1.5s delay between requests, exponential backoff on 429
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = join(ROOT, 'frontend', 'public', 'badges', 'achievements');
const ACHIEVEMENT_MANIFEST_PATH = join(__dirname, 'achievement-badge-manifest.json');
const STYLE_MANIFEST_PATH = join(__dirname, 'badge-manifest.json');

const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 3000;

/** The 3 user-selected art styles (mapped to badge-manifest.json style IDs) */
const SELECTED_STYLES = ['claymation', 'glass', 'metallic'];

/** All valid skill tree keys */
const VALID_TREES = [
  'awakening', 'forge_nasm', 'iron_gravity',
  'tribe_social', 'free_spirit', 'unbroken_streaks', 'hidden',
];

// ─────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────

function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        // Strip surrounding quotes (single or double) per AI Village consensus
        const raw = trimmed.slice(eqIdx + 1).trim();
        const val = raw.replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function getGeminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

// ─────────────────────────────────────────────
// CLI Argument Parsing
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    style: null,      // --style claymation => generate only one style
    tree: null,       // --tree awakening   => generate only one skill tree
    sample: false,    // --sample           => 1 per tree (6-7 total) in all 3 styles
    dryRun: false,    // --dry-run          => preview prompts only
    limit: Infinity,  // --limit N          => limit total generations
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--style':
        opts.style = args[++i];
        if (!SELECTED_STYLES.includes(opts.style)) {
          console.error(`  Error: Invalid style "${opts.style}". Valid: ${SELECTED_STYLES.join(', ')}`);
          process.exit(1);
        }
        break;
      case '--tree':
        opts.tree = args[++i];
        if (!VALID_TREES.includes(opts.tree)) {
          console.error(`  Error: Invalid tree "${opts.tree}". Valid: ${VALID_TREES.join(', ')}`);
          process.exit(1);
        }
        break;
      case '--sample':
        opts.sample = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--limit':
        opts.limit = parseInt(args[++i], 10);
        if (isNaN(opts.limit) || opts.limit < 1) {
          console.error('  Error: --limit must be a positive integer');
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`  Unknown argument: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
  SwanStudios Achievement Badge Generator
  ========================================

  Generates 3D badge images for achievement templates using
  Gemini 2.5 Flash Image Generation (Nano Banana 2).

  Usage:
    node scripts/generate-achievement-badges.mjs [options]

  Options:
    --style <name>   Generate only one style (claymation, glass, metallic)
    --tree <name>    Generate only one skill tree
                     (awakening, forge_nasm, iron_gravity, tribe_social,
                      free_spirit, unbroken_streaks, hidden)
    --sample         Generate 1 template per tree in all 3 styles (~18-21 images)
    --dry-run        Preview prompts without generating images
    --limit <N>      Limit total number of images to generate
    --help, -h       Show this help message

  Examples:
    # Preview all prompts
    node scripts/generate-achievement-badges.mjs --dry-run

    # Generate all badges (750 images!)
    node scripts/generate-achievement-badges.mjs

    # Generate only claymation style
    node scripts/generate-achievement-badges.mjs --style claymation

    # Generate only awakening tree badges
    node scripts/generate-achievement-badges.mjs --tree awakening

    # Sample run: 1 per tree, all styles
    node scripts/generate-achievement-badges.mjs --sample

    # Generate 10 total images
    node scripts/generate-achievement-badges.mjs --limit 10

  Output: frontend/public/badges/achievements/{templateName}_{style}.png
  `);
}

// ─────────────────────────────────────────────
// Manifest Loading
// ─────────────────────────────────────────────

function loadAchievementManifest() {
  if (!existsSync(ACHIEVEMENT_MANIFEST_PATH)) {
    console.error(`  Error: Achievement manifest not found at ${ACHIEVEMENT_MANIFEST_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(ACHIEVEMENT_MANIFEST_PATH, 'utf-8'));
}

function loadStyleManifest() {
  if (!existsSync(STYLE_MANIFEST_PATH)) {
    console.error(`  Error: Style manifest not found at ${STYLE_MANIFEST_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(STYLE_MANIFEST_PATH, 'utf-8'));
}

/**
 * Get style prompt config from the badge manifest for the 3 selected styles.
 * Returns a Map: styleId -> { promptPrefix, promptSuffix }
 */
function getStyleConfigs(styleManifest) {
  const map = new Map();
  for (const style of styleManifest.styles) {
    if (SELECTED_STYLES.includes(style.id)) {
      map.set(style.id, {
        id: style.id,
        name: style.name,
        promptPrefix: style.promptPrefix,
        promptSuffix: style.promptSuffix,
      });
    }
  }
  return map;
}

// ─────────────────────────────────────────────
// Work Plan Builder
// ─────────────────────────────────────────────

/**
 * Build the list of (template, style) generation jobs.
 */
function buildWorkPlan(templates, styleConfigs, opts) {
  let filteredTemplates = [...templates];

  // Filter by skill tree
  if (opts.tree) {
    // For "hidden", match templates whose skillTree might differ but category is "hidden"
    if (opts.tree === 'hidden') {
      filteredTemplates = filteredTemplates.filter(t => t.category === 'hidden');
    } else {
      filteredTemplates = filteredTemplates.filter(t => t.skillTree === opts.tree);
    }
  }

  // Sample mode: pick 1 template per unique skill tree
  if (opts.sample) {
    const seen = new Set();
    const sampled = [];
    for (const tpl of filteredTemplates) {
      const key = tpl.skillTree;
      if (!seen.has(key)) {
        seen.add(key);
        sampled.push(tpl);
      }
    }
    filteredTemplates = sampled;
  }

  // Determine which styles to generate
  const styles = opts.style
    ? [styleConfigs.get(opts.style)]
    : [...styleConfigs.values()];

  // Build job list
  const jobs = [];
  for (const tpl of filteredTemplates) {
    for (const style of styles) {
      const fileName = `${tpl.name}_${style.id}.png`;
      const outputPath = join(OUTPUT_DIR, fileName);
      const prompt = buildPrompt(tpl, style);

      jobs.push({
        template: tpl,
        style,
        fileName,
        outputPath,
        prompt,
        skip: existsSync(outputPath),
      });
    }
  }

  // Apply limit (only to non-skipped jobs, but respect total count)
  let remaining = opts.limit;
  const finalJobs = [];
  for (const job of jobs) {
    if (job.skip) {
      finalJobs.push(job);
      continue;
    }
    if (remaining <= 0) {
      job.skip = true;
      job.skipReason = 'limit reached';
    } else {
      remaining--;
    }
    finalJobs.push(job);
  }

  return finalJobs;
}

/**
 * Build the image generation prompt for a template + style combo.
 * AI Village consensus: inject Crystalline Swan aesthetic constraints.
 */
function buildPrompt(template, style) {
  const aesthetic = 'premium 3D collectible artifact, color palette midnight sapphire blue and frost white with gold accents, deep-ocean volumetric lighting with crystalline rim-lighting, NOT cyberpunk NOT neon NOT pure black';
  return `${style.promptPrefix} a ${template.visual}, badge icon, collectible, beautiful, ${aesthetic}, ${style.promptSuffix}`;
}

// ─────────────────────────────────────────────
// Image Generation (Gemini API)
// ─────────────────────────────────────────────

async function generateImage(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: 0.8,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (res.status === 429) {
    const err = await res.text().catch(() => '');
    throw Object.assign(new Error(`Rate limited (429): ${err.slice(0, 200)}`), { status: 429 });
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidates = data.candidates || [];

  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return {
          data: Buffer.from(part.inlineData.data, 'base64'),
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  // Check for text-only response
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        throw new Error(`No image generated. Model said: ${part.text.slice(0, 200)}`);
      }
    }
  }

  throw new Error('No image data in response');
}

/**
 * Generate with retry + exponential backoff on 429, 5xx, timeouts, network errors.
 * AI Village consensus: retry on transient failures, not just 429.
 */
async function generateWithRetry(apiKey, prompt, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await generateImage(apiKey, prompt);
    } catch (err) {
      const isRetryable = err.status === 429
        || (err.status >= 500 && err.status < 600)
        || err.name === 'AbortError'
        || err.code === 'ECONNRESET'
        || err.code === 'ETIMEDOUT'
        || err.code === 'UND_ERR_CONNECT_TIMEOUT';

      if (isRetryable && attempt < retries) {
        const jitter = Math.random() * 1000;
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter;
        console.log(`\n    Retryable error (${err.status || err.code || err.name}), backing off ${(backoff / 1000).toFixed(1)}s (attempt ${attempt + 1}/${retries})...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  loadEnv();
  const opts = parseArgs();

  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  SwanStudios Achievement Badge Generator         ║');
  console.log('  ║  Nano Banana 2 (Gemini 3.1 Flash Image Gen)     ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');

  // Load manifests
  const achievementManifest = loadAchievementManifest();
  const styleManifest = loadStyleManifest();
  const styleConfigs = getStyleConfigs(styleManifest);

  console.log(`  Templates loaded: ${achievementManifest.templates.length}`);
  console.log(`  Art styles: ${[...styleConfigs.values()].map(s => s.name).join(', ')}`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  Output: ${OUTPUT_DIR}`);

  if (opts.style) console.log(`  Filter style: ${opts.style}`);
  if (opts.tree) console.log(`  Filter tree: ${opts.tree}`);
  if (opts.sample) console.log(`  Sample mode: 1 per skill tree`);
  if (opts.limit < Infinity) console.log(`  Limit: ${opts.limit}`);
  if (opts.dryRun) console.log(`  DRY RUN — no images will be generated`);
  console.log('');

  // Build work plan
  const jobs = buildWorkPlan(achievementManifest.templates, styleConfigs, opts);
  const toGenerate = jobs.filter(j => !j.skip);
  const toSkip = jobs.filter(j => j.skip);

  console.log(`  Total jobs: ${jobs.length}`);
  console.log(`  Already exist (skip): ${toSkip.filter(j => !j.skipReason).length}`);
  if (toSkip.some(j => j.skipReason === 'limit reached')) {
    console.log(`  Over limit (skip): ${toSkip.filter(j => j.skipReason === 'limit reached').length}`);
  }
  console.log(`  To generate: ${toGenerate.length}`);
  console.log('');

  // Dry run: print prompts and exit
  if (opts.dryRun) {
    console.log('  ── DRY RUN: Prompt Preview ──────────────────────');
    console.log('');
    for (const job of jobs) {
      const status = job.skip ? (job.skipReason || 'EXISTS') : 'GENERATE';
      console.log(`  [${status}] ${job.fileName}`);
      console.log(`    Tree: ${job.template.skillTree} | Category: ${job.template.category}`);
      console.log(`    Title: ${job.template.title}`);
      console.log(`    Prompt: ${job.prompt.slice(0, 150)}...`);
      console.log('');
    }

    // Summary by tree
    const treeSummary = {};
    for (const job of jobs) {
      const tree = job.template.skillTree;
      if (!treeSummary[tree]) treeSummary[tree] = { total: 0, generate: 0, skip: 0 };
      treeSummary[tree].total++;
      if (job.skip) treeSummary[tree].skip++;
      else treeSummary[tree].generate++;
    }
    console.log('  ── Summary by Skill Tree ─────────────────────────');
    for (const [tree, counts] of Object.entries(treeSummary).sort()) {
      console.log(`    ${tree}: ${counts.total} total (${counts.generate} to generate, ${counts.skip} skip)`);
    }
    console.log('');
    console.log(`  Total images: ${jobs.length} | To generate: ${toGenerate.length}`);
    console.log(`  Estimated time: ~${formatDuration(toGenerate.length * (RATE_LIMIT_MS + 5000))}`);
    console.log(`  Estimated cost: ~$${(toGenerate.length * 0.04).toFixed(2)} (at ~$0.04/image)`);
    console.log('');
    return;
  }

  // Validate API key
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('  Error: No Gemini API key found.');
    console.error('');
    console.error('  Setup:');
    console.error('  1. Go to https://aistudio.google.com/apikey');
    console.error('  2. Create a free API key');
    console.error('  3. Add to your .env (root or backend/.env):');
    console.error('     GEMINI_API_KEY=your-key-here');
    process.exit(1);
  }

  if (toGenerate.length === 0) {
    console.log('  Nothing to generate — all badges already exist!');
    console.log('');
    return;
  }

  // Ensure output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate images
  console.log('  ── Generating Badges ─────────────────────────────');
  console.log('');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (let i = 0; i < toGenerate.length; i++) {
    const job = toGenerate[i];
    const progress = `[${i + 1}/${toGenerate.length}]`;

    process.stdout.write(`  ${progress} ${job.fileName} ...`);
    const requestStart = Date.now();

    try {
      const result = await generateWithRetry(apiKey, job.prompt);

      // Async file I/O per AI Village consensus
      await writeFile(job.outputPath, result.data);

      const size = (result.data.length / 1024).toFixed(0);
      console.log(` OK (${size} KB)`);
      successCount++;
    } catch (err) {
      console.log(` FAIL: ${err.message.slice(0, 80)}`);
      failCount++;
      failures.push({ fileName: job.fileName, error: err.message });
    }

    // Rate limit: account for elapsed time, 500ms hard floor
    if (i < toGenerate.length - 1) {
      const elapsed = Date.now() - requestStart;
      const remainingDelay = Math.max(500, RATE_LIMIT_MS - elapsed);
      if (elapsed < RATE_LIMIT_MS) {
        console.log(`    ⏱️  Rate limit: sleeping ${remainingDelay}ms (request took ${elapsed}ms)`);
      }
      await sleep(remainingDelay);
    }
  }

  // Final summary
  const totalTime = Date.now() - startTime;
  console.log('');
  console.log('  ── Generation Complete ───────────────────────────');
  console.log(`  Success: ${successCount}/${toGenerate.length}`);
  console.log(`  Failed:  ${failCount}`);
  console.log(`  Skipped: ${toSkip.length} (already existed)`);
  console.log(`  Time:    ${formatDuration(totalTime)}`);
  console.log(`  Cost:    ~$${(successCount * 0.04).toFixed(2)}`);
  console.log(`  Output:  ${OUTPUT_DIR}`);

  if (failures.length > 0) {
    console.log('');
    console.log('  ── Failures ─────────────────────────────────────');
    for (const f of failures) {
      console.log(`    ${f.fileName}: ${f.error.slice(0, 100)}`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
