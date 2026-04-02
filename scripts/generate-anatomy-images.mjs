#!/usr/bin/env node
/**
 * generate-anatomy-images.mjs
 * ===========================
 * Uses Gemini's image generation API to create anatomical body map images.
 * Outputs 4 WebP files to frontend/public/anatomy/
 *
 * Usage: node scripts/generate-anatomy-images.mjs
 * Requires: GEMINI_API_KEY in .env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env manually without dotenv dependency
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const OUTPUT_DIR = path.join(ROOT, 'frontend', 'public', 'anatomy');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Image generation configs ────────────────────────────────────────────

const IMAGES = [
  {
    filename: 'male-front.png',
    prompt: `Professional medical anatomical illustration of a male human body, front anterior view, standing in standard anatomical position with arms slightly away from the body and palms facing forward. The illustration should show defined musculature visible under semi-transparent skin, including pectoralis major, deltoids, biceps, rectus abdominis, obliques, quadriceps, tibialis anterior, and forearm muscles. Clinical medical textbook quality, clean lines, neutral front lighting that highlights muscle contours and body symmetry. Solid dark background color (#0A0A0F near-black). No text, no labels, no annotations. Full body from head to feet. Realistic human proportions, athletic but not exaggerated build. High detail anatomical accuracy.`,
  },
  {
    filename: 'male-back.png',
    prompt: `Professional medical anatomical illustration of a male human body, back posterior view, standing in standard anatomical position with arms slightly away from the body. The illustration should show defined musculature visible under semi-transparent skin, including trapezius, rear deltoids, infraspinatus, rhomboids, latissimus dorsi, erector spinae, gluteus maximus, hamstrings, gastrocnemius, and triceps. Clinical medical textbook quality, clean lines, neutral back lighting that highlights the V-taper back musculature. Solid dark background color (#0A0A0F near-black). No text, no labels, no annotations. Full body from head to feet. Realistic human proportions, athletic but not exaggerated build. High detail anatomical accuracy.`,
  },
  {
    filename: 'female-front.png',
    prompt: `Professional medical anatomical illustration of a female human body, front anterior view, standing in standard anatomical position with arms slightly away from the body and palms facing forward. The illustration should show defined but feminine musculature visible under semi-transparent skin, including deltoids, biceps, rectus abdominis, obliques, quadriceps, and tibialis anterior. Clinical medical textbook quality, clean lines, neutral front lighting. Narrower shoulders and wider hips reflecting female anatomy. Solid dark background color (#0A0A0F near-black). No text, no labels, no annotations. Full body from head to feet. Realistic human proportions, athletic but not exaggerated. Tasteful and clinical, suitable for professional medical or fitness education. High detail anatomical accuracy.`,
  },
  {
    filename: 'female-back.png',
    prompt: `Professional medical anatomical illustration of a female human body, back posterior view, standing in standard anatomical position with arms slightly away from the body. The illustration should show defined but feminine musculature visible under semi-transparent skin, including trapezius, rear deltoids, rhomboids, latissimus dorsi, erector spinae, gluteus maximus, hamstrings, and gastrocnemius. Clinical medical textbook quality, clean lines, neutral lighting. Female proportions with narrower shoulders and wider hip structure. Solid dark background color (#0A0A0F near-black). No text, no labels, no annotations. Full body from head to feet. Realistic human proportions, athletic but not exaggerated. Tasteful and clinical. High detail anatomical accuracy.`,
  },
];

// ── Gemini Imagen API ───────────────────────────────────────────────────

// Models to try in order — first success wins
const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
];
const GEMINI_IMAGE_MODELS = [
  'nano-banana-pro-preview',     // Nano Banana 2 — primary
  'gemini-2.5-flash-image',      // fallback
  'gemini-3-pro-image-preview',  // fallback
];

/**
 * Try Imagen API (dedicated image generation model).
 * Returns { success, buffer } or { success: false }.
 */
async function tryImagen(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`;
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '9:16',
      personGeneration: 'allow_all',
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.log(`   ⚠ ${model} (Imagen): ${resp.status} — ${errText.slice(0, 200)}`);
    return { success: false };
  }

  const data = await resp.json();
  const prediction = data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    console.log(`   ⚠ ${model} (Imagen): No image in response`);
    return { success: false };
  }

  return {
    success: true,
    buffer: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
    mime: prediction.mimeType || 'image/png',
  };
}

/**
 * Try Gemini generateContent with image response modality.
 */
async function tryGeminiNative(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.log(`   ⚠ ${model} (native): ${resp.status} — ${errText.slice(0, 200)}`);
    return { success: false };
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart) {
    const textPart = parts.find(p => p.text);
    if (textPart) console.log(`   ⚠ ${model} (native): text only — ${textPart.text.slice(0, 150)}`);
    else console.log(`   ⚠ ${model} (native): No image in response`);
    return { success: false };
  }

  return {
    success: true,
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mime: imagePart.inlineData.mimeType,
  };
}

/**
 * Generate image — tries Imagen predict API, then Gemini native image models.
 */
async function generateImage(prompt, filename) {
  console.log(`\n🎨 Generating: ${filename}...`);

  // Try Imagen predict API models first
  for (const model of IMAGEN_MODELS) {
    const result = await tryImagen(model, prompt);
    if (result.success) {
      const outputPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, result.buffer);
      const sizeKB = (result.buffer.length / 1024).toFixed(1);
      console.log(`✅ Saved via ${model}: ${outputPath} (${sizeKB} KB, ${result.mime})`);
      return true;
    }
  }

  // Try Gemini native image generation models
  for (const model of GEMINI_IMAGE_MODELS) {
    const result = await tryGeminiNative(model, prompt);
    if (result.success) {
      const outputPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, result.buffer);
      const sizeKB = (result.buffer.length / 1024).toFixed(1);
      console.log(`✅ Saved via ${model}: ${outputPath} (${sizeKB} KB, ${result.mime})`);
      return true;
    }
  }

  console.error(`❌ All models failed for ${filename}`);
  return false;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🦢 SwanStudios Anatomy Image Generator');
  console.log('========================================');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Generating ${IMAGES.length} anatomical images via Gemini API...\n`);

  let success = 0;
  let failed = 0;

  for (const img of IMAGES) {
    // Small delay between requests to respect rate limits
    if (success + failed > 0) {
      console.log('   ⏳ Waiting 3s between requests...');
      await new Promise((r) => setTimeout(r, 3000));
    }

    const ok = await generateImage(img.prompt, img.filename);
    if (ok) success++;
    else failed++;
  }

  console.log(`\n========================================`);
  console.log(`✅ Generated: ${success}/${IMAGES.length}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${IMAGES.length}`);
  console.log(`\nImages saved to: ${OUTPUT_DIR}`);

  if (success > 0) {
    console.log('\n💡 The BodyMap component will automatically detect and display');
    console.log('   these images at 85% opacity with SVG hotspots layered on top.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
