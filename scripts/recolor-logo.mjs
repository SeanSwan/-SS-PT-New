#!/usr/bin/env node
/**
 * Recolor Logo Script
 * Takes the existing SwanStudios logo and adds purple tones via Gemini image editing.
 * Sends the actual logo as input so the output is the SAME logo, just recolored.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, '..', '..');

// Load .env
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

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (!apiKey) { console.error('No GEMINI_API_KEY found'); process.exit(1); }

const logoPath = join(ROOT, 'frontend', 'public', 'Logo.png');
const logoBase64 = readFileSync(logoPath).toString('base64');

const purpleVariants = [
  { name: '01-subtle-purple-tint', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add a very subtle purple/violet tint (#7851A9) to some of the geometric polygon facets on the swan body and wings. The purple should blend naturally with the existing blue tones. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '02-purple-wing-tips', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add purple (#7851A9) color to the wing tip polygons and tail feathers of the swan, blending from blue to purple. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '03-purple-gradient-body', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add a purple (#8B5CF6) gradient that flows through the swan body from the chest area down through the lower body polygons, blending with the existing blue. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '04-purple-highlights', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add purple (#7851A9) highlights to the lighter/brighter polygon facets of the swan, replacing some of the light blue/white highlights with light purple tones. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '05-deep-purple-shadows', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: shift the darker shadow polygons of the swan from dark blue to deep purple (#4B0082), creating purple depth in the shadows while keeping the lighter facets blue/icy. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '06-purple-neck-chest', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add purple (#6C2DC7) color specifically to the neck and chest area polygons of the swan, creating a purple-to-blue gradient from the neck down to the wings. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '07-cosmic-purple-blend', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: blend cosmic purple (#7851A9) throughout about 30-40% of the swan polygons, alternating between purple and blue facets to create a blue-purple crystalline effect. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '08-purple-wing-gradient', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add a purple (#8B5CF6) to blue gradient across the wing feathers specifically, going from purple at the wing tips to blue at the wing base. Keep the head and body blue. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '09-violet-shimmer', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add violet/purple (#9966CC) tones to every other polygon facet on the swan, creating a shimmering blue-purple mosaic pattern across the geometric surface. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
  { name: '10-royal-purple-accent', prompt: 'Edit this exact logo image. Keep every detail identical — same geometric low-poly swan, same dark navy blue circular background, same composition, same pose. The ONLY change: add royal purple (#6B3FA0) color to the mid-tone polygon facets (not the lightest highlights or darkest shadows, but the middle-brightness polygons). This creates a three-tone effect: icy highlights, purple mid-tones, dark blue shadows. Do NOT change the shape, pose, style, or background. Output the modified logo.' },
];

const outputDir = join(ROOT, 'frontend', 'src', 'assets', 'logo-purple-options');
mkdirSync(outputDir, { recursive: true });

const variant = purpleVariants[parseInt(process.argv[2]) || 0];
console.log(`  Generating: ${variant.name}`);
console.log(`  Sending YOUR logo as input image...`);

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: logoBase64 } },
        { text: variant.prompt },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 0.4,
    },
  }),
  signal: AbortSignal.timeout(120_000),
});

if (!res.ok) {
  const err = await res.text().catch(() => '');
  console.error(`API error ${res.status}: ${err.slice(0, 300)}`);
  process.exit(1);
}

const data = await res.json();
const candidates = data.candidates || [];
for (const candidate of candidates) {
  for (const part of (candidate.content?.parts || [])) {
    if (part.inlineData) {
      const outPath = join(outputDir, `${variant.name}.png`);
      writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'));
      console.log(`  Saved: ${outPath}`);
      process.exit(0);
    }
    if (part.text) {
      console.log(`  Model response: ${part.text.slice(0, 200)}`);
    }
  }
}
console.error('  No image in response');
process.exit(1);
