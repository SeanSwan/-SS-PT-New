#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     SwanStudios AI Image Generator                          ║
 * ║     Powered by Google Gemini (Nano Banana Pro)              ║
 * ║                                                              ║
 * ║  Usage:                                                      ║
 * ║    node scripts/generate-image.mjs "cosmic gym hero banner" ║
 * ║    node scripts/generate-image.mjs "galaxy swan logo"       ║
 * ║        --output frontend/public/hero-bg.png                 ║
 * ║        --style "dark cosmic theme, cyan and purple accents" ║
 * ║        --size 1024x1024                                     ║
 * ║                                                              ║
 * ║  Setup: Add to .env:                                         ║
 * ║    GEMINI_API_KEY=your-key-from-aistudio.google.com/apikey  ║
 * ║                                                              ║
 * ║  Pricing:                                                    ║
 * ║    ~$0.04/image (Gemini Flash) or ~$0.13/image (Pro)        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const MODELS = {
  flash: 'gemini-3.1-flash-image-preview',   // Faster, cheaper (~$0.04)
  pro:   'gemini-3-pro-image-preview',        // Higher quality (~$0.13)
};

const SWANSTUDIOS_STYLE = `Galaxy-Swan dark cosmic aesthetic. Deep space background (#0a0a1a).
Cyan accent (#00FFFF) and cosmic purple (#7851A9) color palette.
Premium, luxurious, motivating fitness brand feel.
Professional photography quality, cinematic lighting.`;

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
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

// ─────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    prompt: '',
    output: null,
    style: SWANSTUDIOS_STYLE,
    model: 'flash',
    noStyle: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      opts.output = args[++i];
    } else if (args[i] === '--style' || args[i] === '-s') {
      opts.style = args[++i];
    } else if (args[i] === '--pro') {
      opts.model = 'pro';
    } else if (args[i] === '--no-style') {
      opts.noStyle = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    } else {
      positional.push(args[i]);
    }
  }

  opts.prompt = positional.join(' ');
  return opts;
}

function printHelp() {
  console.log(`
  SwanStudios AI Image Generator

  Usage:
    node scripts/generate-image.mjs "your prompt here" [options]

  Options:
    --output, -o    Output file path (default: generated-images/image-{timestamp}.png)
    --style, -s     Style override (default: SwanStudios Galaxy-Swan theme)
    --no-style      Don't append SwanStudios style to prompt
    --pro           Use Gemini Pro model (higher quality, ~$0.13/image)
    (default)       Uses Gemini Flash model (faster, ~$0.04/image)

  Examples:
    node scripts/generate-image.mjs "cosmic fitness hero banner with galaxy background"
    node scripts/generate-image.mjs "personal trainer silhouette" --pro -o frontend/public/hero.png
    node scripts/generate-image.mjs "abstract gradient" --no-style -o bg.png
  `);
}

// ─────────────────────────────────────────────
// Image Generation
// ─────────────────────────────────────────────

async function generateImage(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.8,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();

  // Extract image data from response
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

  // Check if there's a text response explaining why no image was generated
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

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  loadEnv();

  const opts = parseArgs();

  if (!opts.prompt) {
    console.error('  Error: No prompt provided.');
    console.error('  Usage: node scripts/generate-image.mjs "your prompt here"');
    console.error('  Run with --help for more options.');
    process.exit(1);
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('  Error: No Gemini API key found.');
    console.error('');
    console.error('  Setup:');
    console.error('  1. Go to https://aistudio.google.com/apikey');
    console.error('  2. Create a free API key');
    console.error('  3. Add to your .env:');
    console.error('     GEMINI_API_KEY=your-key-here');
    process.exit(1);
  }

  const model = MODELS[opts.model];
  const fullPrompt = opts.noStyle
    ? opts.prompt
    : `${opts.prompt}\n\nStyle: ${opts.style}`;

  // Default output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = opts.output || join(ROOT, 'generated-images', `image-${timestamp}.png`);

  console.log('');
  console.log('  SwanStudios AI Image Generator');
  console.log(`  Model:  ${model}`);
  console.log(`  Prompt: "${opts.prompt}"`);
  if (!opts.noStyle) console.log(`  Style:  SwanStudios Galaxy-Swan theme applied`);
  console.log(`  Output: ${outputPath}`);
  console.log('');
  console.log('  Generating...');

  const start = Date.now();

  try {
    const result = await generateImage(apiKey, model, fullPrompt);

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });

    // Determine extension from mime type
    const ext = result.mimeType.includes('jpeg') ? '.jpg' : '.png';
    const finalPath = outputPath.endsWith('.png') || outputPath.endsWith('.jpg')
      ? outputPath
      : outputPath + ext;

    writeFileSync(finalPath, result.data);

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const size = (result.data.length / 1024).toFixed(0);
    const cost = opts.model === 'pro' ? '~$0.13' : '~$0.04';

    console.log('');
    console.log(`  Done! ${duration}s | ${size} KB | ${cost}`);
    console.log(`  Saved: ${finalPath}`);
    console.log('');
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
