/**
 * populate-exercise-variations.mjs
 * ─────────────────────────────────────────────────────────────
 * Uses Gemini 3.1 Flash (FREE) to generate exercise variations
 * and pain modifications for all 883 exercises in the database.
 *
 * Populates: easyVariation, hardVariation, kneeMod, shoulderMod,
 *            backMod, ankleMod, wristMod
 *
 * Run: node scripts/populate-exercise-variations.mjs
 * Options:
 *   --dry-run     Preview without writing to DB
 *   --batch-size  Exercises per API call (default: 20)
 *   --limit       Max exercises to process (default: all)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load .env manually
const envFile = readFileSync(resolve(rootDir, '.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

import { pathToFileURL } from 'url';
const { GoogleGenerativeAI } = await import(pathToFileURL(resolve(rootDir, 'backend/node_modules/@google/generative-ai/dist/index.mjs')).href);

// Database
process.chdir(resolve(rootDir, 'backend'));
const dbModule = await import(pathToFileURL(resolve(rootDir, 'backend/database.mjs')).href);
const sequelize = dbModule.default;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '20');
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '9999');

console.log(`\n🏋️ Exercise Variation Populator`);
console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE — writing to DB'}`);
console.log(`  Batch size: ${batchSize}`);
console.log(`  Limit: ${limit === 9999 ? 'all' : limit}`);

// Fetch exercises missing variations
const [exercises] = await sequelize.query(`
  SELECT id, name, "exerciseType", "bodyPartCategory", "primaryMuscles", "equipmentNeeded"
  FROM "Exercises"
  WHERE ("isActive" = true OR "isActive" IS NULL)
    AND ("easyVariation" IS NULL OR "easyVariation" = '')
  ORDER BY name
  LIMIT ${limit}
`);

console.log(`  Exercises needing variations: ${exercises.length}\n`);

if (exercises.length === 0) {
  console.log('All exercises already have variations! Nothing to do.');
  process.exit(0);
}

const PROMPT_TEMPLATE = `You are a NASM-certified personal trainer with 25 years of experience. For each exercise below, provide:

1. easyVariation: A simpler/easier version of the exercise (regression)
2. hardVariation: A harder/more advanced version (progression)
3. kneeMod: Alternative exercise if client has knee pain/issues
4. shoulderMod: Alternative if client has shoulder pain/issues
5. backMod: Alternative if client has lower back pain/issues
6. ankleMod: Alternative if client has ankle pain/issues
7. wristMod: Alternative if client has wrist pain/issues
8. elbowMod: Alternative if client has elbow pain/issues (tennis elbow, golfer's elbow)
9. footMod: Alternative if client has foot pain/issues (plantar fasciitis, bunions, flat feet)
10. hipMod: Alternative if client has hip pain/issues (hip flexor strain, labrum tear, bursitis)

RULES:
- Each answer must be a REAL exercise name (not made up)
- Keep responses SHORT — just the exercise name, no descriptions
- If a modification isn't relevant (e.g., wristMod for a squat), write "N/A"
- The easy variation should be achievable by a beginner
- The hard variation should challenge an advanced athlete
- Pain mods should train the SAME muscles but avoid the problematic joint
- For knee mods: avoid deep flexion, jumping, lunges — use seated/lying alternatives
- For shoulder mods: avoid overhead pressing, lateral raising — use chest/neutral grip
- For back mods: avoid spinal loading, forward bending — use supported/seated versions
- For ankle mods: avoid impact, calf raises, jumping — use seated alternatives
- For wrist mods: avoid gripping, push-ups on hands — use forearm/fist positions
- For elbow mods: avoid heavy curls, tricep extensions, push-ups — use isometrics or bands
- For foot mods: avoid standing/jumping, calf work — use seated/lying exercises
- For hip mods: avoid deep lunges, hip flexion beyond 90° — use partial ROM or external rotation

Respond ONLY as a JSON array. Each item: { "id": <number>, "easyVariation": "...", "hardVariation": "...", "kneeMod": "...", "shoulderMod": "...", "backMod": "...", "ankleMod": "...", "wristMod": "...", "elbowMod": "...", "footMod": "...", "hipMod": "..." }

EXERCISES:
`;

let totalUpdated = 0;
let totalBatches = Math.ceil(exercises.length / batchSize);

for (let batch = 0; batch < totalBatches; batch++) {
  const start = batch * batchSize;
  const batchExercises = exercises.slice(start, start + batchSize);

  const exerciseList = batchExercises.map(ex => {
    const muscles = typeof ex.primaryMuscles === 'string'
      ? (() => { try { return JSON.parse(ex.primaryMuscles).join(', '); } catch { return ex.primaryMuscles; } })()
      : Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles.join(', ') : '';
    const equip = typeof ex.equipmentNeeded === 'string'
      ? (() => { try { return JSON.parse(ex.equipmentNeeded).join(', '); } catch { return ex.equipmentNeeded; } })()
      : Array.isArray(ex.equipmentNeeded) ? ex.equipmentNeeded.join(', ') : 'bodyweight';
    return `ID:${ex.id} | ${ex.name} | type:${ex.exerciseType || '?'} | muscles:${muscles} | equipment:${equip || 'bodyweight'} | body:${ex.bodyPartCategory || '?'}`;
  }).join('\n');

  console.log(`  Batch ${batch + 1}/${totalBatches} (${batchExercises.length} exercises)...`);

  try {
    const result = await model.generateContent(PROMPT_TEMPLATE + exerciseList);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`    ❌ No JSON found in response`);
      continue;
    }

    const variations = JSON.parse(jsonMatch[0]);

    for (const v of variations) {
      if (!v.id) continue;

      const clean = (val) => {
        if (!val || val === 'N/A' || val === 'n/a' || val === 'None') return null;
        return val.trim().substring(0, 255);
      };

      if (dryRun) {
        const ex = batchExercises.find(e => e.id === v.id);
        console.log(`    ${ex?.name || v.id}: easy="${clean(v.easyVariation)}" hard="${clean(v.hardVariation)}"`);
      } else {
        await sequelize.query(`
          UPDATE "Exercises" SET
            "easyVariation" = $1, "hardVariation" = $2,
            "kneeMod" = $3, "shoulderMod" = $4, "backMod" = $5,
            "ankleMod" = $6, "wristMod" = $7, "elbowMod" = $8, "footMod" = $9, "hipMod" = $10
          WHERE id = $11
        `, {
          bind: [
            clean(v.easyVariation), clean(v.hardVariation),
            clean(v.kneeMod), clean(v.shoulderMod), clean(v.backMod),
            clean(v.ankleMod), clean(v.wristMod), clean(v.elbowMod), clean(v.footMod), clean(v.hipMod),
            v.id,
          ],
        });
      }
      totalUpdated++;
    }

    console.log(`    ✅ ${variations.length} exercises processed`);

    // Rate limit: 1 second between batches
    if (batch < totalBatches - 1) await new Promise(r => setTimeout(r, 1500));

  } catch (err) {
    console.error(`    ❌ Batch error: ${err.message}`);
    // Wait longer on error (might be rate limited)
    await new Promise(r => setTimeout(r, 5000));
  }
}

console.log(`\n✅ Done! ${totalUpdated} exercises ${dryRun ? 'would be' : ''} updated.`);
process.exit(0);
