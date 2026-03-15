#!/usr/bin/env node

/**
 * SwanStudios Badge Generator — Batch Nano Banana 2
 * ==================================================
 * Generates 3D badge images from the badge manifest.
 *
 * Usage:
 *   node scripts/generate-badges.mjs                        # Generate ALL (500)
 *   node scripts/generate-badges.mjs --style claymation     # One style only
 *   node scripts/generate-badges.mjs --category swan        # One category only
 *   node scripts/generate-badges.mjs --sample               # 1 per style (20 total)
 *   node scripts/generate-badges.mjs --batch 0              # Batch 0 (first 25)
 *   node scripts/generate-badges.mjs --limit 10             # First 10 only
 *   node scripts/generate-badges.mjs --dry-run              # Preview prompts only
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── Load environment ──
function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

// ── Load manifest ──
const manifest = JSON.parse(readFileSync(join(__dirname, 'badge-manifest.json'), 'utf-8'));
const OUTPUT_DIR = join(ROOT, manifest.meta.outputDir);
mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Parse CLI args ──
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const filterStyle = getArg('style');
const filterCategory = getArg('category');
const sampleMode = hasFlag('sample');
const dryRun = hasFlag('dry-run');
const batchNum = getArg('batch');
const limitNum = getArg('limit');

// ── Build generation queue ──
function buildQueue() {
  const queue = [];
  const styles = filterStyle
    ? manifest.styles.filter(s => s.id === filterStyle)
    : manifest.styles;

  const categories = filterCategory
    ? manifest.categories.filter(c => c.id === filterCategory)
    : manifest.categories;

  // Distribute subjects across styles evenly
  // Each style gets ~25 badges (500 / 20 styles)
  const subjectsPerStyle = Math.ceil(500 / styles.length);

  // Flatten all subjects with their category
  const allSubjects = [];
  for (const cat of categories) {
    for (const subject of cat.subjects) {
      allSubjects.push({ subject, categoryId: cat.id, categoryName: cat.name });
    }
  }

  // Assign subjects to styles round-robin
  for (let i = 0; i < allSubjects.length; i++) {
    const style = styles[i % styles.length];
    const { subject, categoryId } = allSubjects[i];
    const slug = subject.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/-+$/, '');
    const filename = `badge_${style.id}_${categoryId}_${slug}.png`;
    const filepath = join(OUTPUT_DIR, filename);

    // Skip if already generated
    if (existsSync(filepath)) continue;

    const prompt = `${style.promptPrefix} a ${subject}, ${style.promptSuffix}. Square 1:1 format, centered composition, suitable as a collectible badge icon.`;

    queue.push({ style: style.id, styleName: style.name, categoryId, subject, filename, filepath, prompt });
  }

  // Apply filters
  let filtered = queue;
  if (sampleMode) {
    // One per style
    const seen = new Set();
    filtered = queue.filter(item => {
      if (seen.has(item.style)) return false;
      seen.add(item.style);
      return true;
    });
  }
  if (batchNum !== null) {
    const batchSize = 25;
    const start = parseInt(batchNum) * batchSize;
    filtered = filtered.slice(start, start + batchSize);
  }
  if (limitNum !== null) {
    filtered = filtered.slice(0, parseInt(limitNum));
  }

  return filtered;
}

// ── Generate single image via Gemini Nano Banana ──
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function generateImage(prompt, filepath, retries = 2) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.log(`  ⏳ Rate limited, waiting ${(wait/1000).toFixed(1)}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const candidates = data.candidates || [];

      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            const buf = Buffer.from(part.inlineData.data, 'base64');
            writeFileSync(filepath, buf);
            return true;
          }
        }
      }

      // No image in response — model may have returned text only
      if (attempt < retries) {
        console.log(`  ⚠️  No image returned, retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return false;
    } catch (err) {
      if (attempt < retries) {
        console.log(`  ⚠️  Error: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      console.error(`  ❌ Failed: ${err.message}`);
      return false;
    }
  }
  return false;
}

// ── Main ──
async function main() {
  const queue = buildQueue();

  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║     SwanStudios Badge Generator — Nano Banana 2          ║
  ╚══════════════════════════════════════════════════════════╝

  Badges to generate: ${queue.length}
  Output:             ${OUTPUT_DIR}
  Mode:               ${dryRun ? 'DRY RUN (preview only)' : sampleMode ? 'SAMPLE (1 per style)' : 'FULL'}
  Filter style:       ${filterStyle || 'all'}
  Filter category:    ${filterCategory || 'all'}
  `);

  if (queue.length === 0) {
    console.log('  ✅ All badges already generated! Nothing to do.');
    return;
  }

  if (dryRun) {
    for (const item of queue) {
      console.log(`\n[${item.style}] ${item.categoryId}/${item.subject}`);
      console.log(`  File: ${item.filename}`);
      console.log(`  Prompt: ${item.prompt.slice(0, 120)}...`);
    }
    console.log(`\n  Total: ${queue.length} badges would be generated.`);
    return;
  }

  let success = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const progress = `[${i + 1}/${queue.length}]`;
    process.stdout.write(`  ${progress} ${item.style} | ${item.subject.slice(0, 40)}... `);

    const ok = await generateImage(item.prompt, item.filepath);
    if (ok) {
      success++;
      console.log('✅');
    } else {
      failed++;
      console.log('❌');
    }

    // Rate limiting: small delay between requests
    if (i < queue.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
  ════════════════════════════════════════
  Done in ${elapsed}s
  ✅ Success: ${success}
  ❌ Failed:  ${failed}
  📁 Output:  ${OUTPUT_DIR}
  ════════════════════════════════════════
  `);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
