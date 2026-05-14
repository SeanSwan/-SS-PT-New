/**
 * Equipment Scan Caption Fallback
 * ===============================
 * Converts a plain Gemini vision caption into the structured equipment scan
 * shape when strict JSON passes return Unknown.
 *
 * Runtime flow:
 *   equipmentScanService -> Gemini caption pass -> scanResultFromCaption
 *
 * Safety notes:
 *   - No user PII is included in the prompt.
 *   - The raw caption is capped before being saved in aiScanData.
 *   - This is a fallback only; strict JSON scan remains the primary path.
 */

function titleCaseEquipmentName(value) {
  return String(value || '')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(part => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : '')
    .join(' ')
    .slice(0, 150);
}

export function buildEquipmentCaptionPrompt() {
  return `Answer this visual question in one short phrase: what workout equipment is this?

If the image shows black hex dumbbells stored on a rack, answer exactly: Dumbbell Rack.
If the image shows dumbbells without a clear rack, answer exactly: Dumbbells.
Name the primary visible gym or workout equipment. Do not explain.`;
}

export function scanResultFromCaption(rawText) {
  const text = String(rawText || '').trim();
  const lower = text.toLowerCase();
  if (!text || /unknown|cannot identify|can't identify|no fitness|no gym equipment/.test(lower)) {
    return null;
  }

  if (/dumbbell|hex dumbbell|free[-\s]?weight|hexagonal weight|weight rack|weights?.*rack|rack.*weights?/.test(lower)) {
    const onRack = /rack|stand|storage|shelf/.test(lower);
    return {
      name: onRack ? 'Dumbbell Rack' : 'Dumbbells',
      category: 'dumbbell',
      resistanceType: 'dumbbell',
      description: onRack
        ? 'A storage rack holding dumbbells for free-weight strength training.'
        : 'A set of dumbbells used for free-weight strength training.',
      confidence: 0.74,
      suggestedExercises: ['Dumbbell Bench Press', 'Goblet Squat', 'Dumbbell Row'],
      fallbackSource: 'gemini-caption',
      rawCaption: text.slice(0, 300),
    };
  }

  const keywordMatches = [
    [/kettlebell/, ['Kettlebell', 'kettlebell', 'kettlebell']],
    [/barbell|olympic bar/, ['Barbell', 'barbell', 'barbell']],
    [/cable|functional trainer/, ['Cable Machine', 'cable_machine', 'cable']],
    [/bench/, ['Weight Bench', 'bench', 'other']],
    [/treadmill/, ['Treadmill', 'cardio', 'other']],
    [/bike|cycle|spin/, ['Exercise Bike', 'cardio', 'other']],
    [/rower|rowing machine/, ['Rowing Machine', 'cardio', 'other']],
    [/resistance band|exercise band/, ['Resistance Bands', 'resistance_band', 'band']],
    [/medicine ball/, ['Medicine Ball', 'medicine_ball', 'other']],
    [/stability ball|exercise ball/, ['Stability Ball', 'stability_ball', 'other']],
    [/pull[-\s]?up/, ['Pull-Up Bar', 'pull_up_bar', 'bodyweight']],
    [/trx|suspension trainer/, ['TRX Suspension Trainer', 'trx', 'bodyweight']],
    [/foam roller/, ['Foam Roller', 'foam_roller', 'other']],
  ];

  for (const [pattern, [name, category, resistanceType]] of keywordMatches) {
    if (pattern.test(lower)) {
      return {
        name,
        category,
        resistanceType,
        description: `${name} identified from Gemini's visual caption fallback.`,
        confidence: 0.64,
        suggestedExercises: [],
        fallbackSource: 'gemini-caption',
        rawCaption: text.slice(0, 300),
      };
    }
  }

  const name = titleCaseEquipmentName(text.replace(/^the image shows\s+/i, '').replace(/^this is\s+/i, ''));
  return name ? {
    name,
    category: 'other',
    resistanceType: 'other',
    description: 'Equipment identified from Gemini visual caption fallback.',
    confidence: 0.52,
    suggestedExercises: [],
    fallbackSource: 'gemini-caption',
    rawCaption: text.slice(0, 300),
  } : null;
}
