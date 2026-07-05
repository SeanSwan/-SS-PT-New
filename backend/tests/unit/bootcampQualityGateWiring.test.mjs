import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const generatorSource = readFileSync(
  resolve(__dirname, '../../services/bootcamp/bootcampGenerator.mjs'),
  'utf8',
);

describe('bootcamp generator quality-gate wiring contract', () => {
  it('gates general classes to low-impact via the shared exercise quality gate', () => {
    expect(generatorSource).toContain(
      "import { applyExerciseQualityGate } from '../exerciseQualityGate.mjs';",
    );
    expect(generatorSource).toContain('applyExerciseQualityGate(availableExercises');
  });

  it('only lets explicit cardio/high-impact classes opt back into plyo work', () => {
    const block = generatorSource.slice(
      generatorSource.indexOf('const explicitHighImpactClass'),
      generatorSource.indexOf('// Step 5: Build stations'),
    );

    expect(block).toContain("intensityCategory === 'high_impact'");
    expect(block).toContain("intensityCategory === 'cardio'");
    expect(block).toContain("dayType === 'cardio'");
    // Gate applies only when NOT an explicit high-impact class, before stations.
    expect(block).toContain('if (!explicitHighImpactClass)');
    expect(block).toContain('gateResult.allowed');
    // Trainers see WHY exercises were excluded and how to opt back in.
    expect(block).toContain('quality_gate');
  });
});
