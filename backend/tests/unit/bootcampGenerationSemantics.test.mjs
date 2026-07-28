import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import BootcampTemplate from '../../models/BootcampTemplate.mjs';
import BootcampExercise from '../../models/BootcampExercise.mjs';
import { FORMAT_CONFIG } from '../../services/bootcamp/bootcampConstants.mjs';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';
import { applyClassStyle, generateBoard2 } from '../../services/bootcamp/classStyleModifiers.mjs';
import { hydrateTemplateExerciseMedia } from '../../services/bootcamp/bootcampCrud.mjs';
import { hydrateExerciseProgrammingIntent, serializeExerciseNotes } from '../../services/bootcamp/bootcampProgrammingNotes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootcampCrudSource = readFileSync(resolve(__dirname, '../../services/bootcamp/bootcampCrud.mjs'), 'utf8');
const bootcampGeneratorSource = readFileSync(resolve(__dirname, '../../services/bootcamp/bootcampGenerator.mjs'), 'utf8');
const bootcampEquipmentContextSource = readFileSync(resolve(__dirname, '../../services/bootcamp/bootcampEquipmentContext.mjs'), 'utf8');
const bootcampExerciseSelectionSource = readFileSync(resolve(__dirname, '../../services/bootcamp/bootcampExerciseSelection.mjs'), 'utf8');
const exerciseRolodexBridgeSource = readFileSync(resolve(__dirname, '../../services/bootcamp/exerciseRolodexBridge.mjs'), 'utf8');
const lineCount = (fileSource) => fileSource.split(/\r?\n/).length;

describe('bootcamp generation semantics', () => {
  it('keeps the generator as orchestration by extracting helper modules', () => {
    expect(bootcampGeneratorSource).toContain("from './bootcampEquipmentContext.mjs'");
    expect(bootcampGeneratorSource).toContain("from './bootcampExerciseSelection.mjs'");
    expect(bootcampGeneratorSource).toContain("from './bootcampIntensityScoring.mjs'");
    expect(bootcampGeneratorSource).toContain("from './bootcampStructure.mjs'");
    expect(bootcampGeneratorSource).toContain("from './bootcampPainAlerts.mjs'");
    expect(lineCount(bootcampGeneratorSource)).toBeLessThanOrEqual(300);
  });
  it('orders calisthenics and flexibility requests around the selected intensity instead of treating it as metadata only', () => {
    const exercises = [
      { name: 'Barbell Back Squat', key: 'barbell_back_squat', muscles: ['quads'], equipment: ['barbell'], difficulty: 700 },
      { name: 'Hip Mobility Flow', key: 'hip_mobility_flow', muscles: ['hip_flexors'], equipment: ['mat'], difficulty: 200 },
      { name: 'Push Up', key: 'push_up', muscles: ['chest'], equipment: ['bodyweight'], difficulty: 350 },
    ];

    expect(__testing__.rankExercisesForBootcamp(exercises, { intensityCategory: 'calisthenics' })[0].name).toBe('Push Up');
    expect(__testing__.rankExercisesForBootcamp(exercises, { intensityCategory: 'flexibility' })[0].name).toBe('Hip Mobility Flow');
  });

  it('gives every exposed non-standard class style a real coaching cue on the generated exercises', () => {
    const styles = ['pyramid', 'superset', 'mixed', 'ladder', 'descending', 'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density'];

    for (const style of styles) {
      const exercises = [
        { exerciseName: 'Goblet Squat', board: 'main', stationIndex: 0, sortOrder: 1, durationSec: 35, restSec: 15, isCardioFinisher: false },
        { exerciseName: 'Push Up', board: 'main', stationIndex: 0, sortOrder: 2, durationSec: 35, restSec: 15, isCardioFinisher: false },
        { exerciseName: 'Step Jacks', board: 'alternative', stationIndex: 0, sortOrder: 1, durationSec: 35, restSec: 15, isCardioFinisher: false },
      ];
      const explanations = [];

      applyClassStyle(style, exercises, explanations);

      const mainExercises = exercises.filter(ex => ex.board === 'main');
      expect(explanations.some(exp => exp.type === 'style' && exp.message.toLowerCase().includes(style.replace('_', ' ')))).toBe(true);
      expect(mainExercises.every(ex => typeof ex.description === 'string' && ex.description.length > 0)).toBe(true);
      expect(exercises.find(ex => ex.board === 'alternative').description).toBeUndefined();
    }
  });

  it('adds metcon rep targets and paired-muscle focus to cross-training style cues', () => {
    const exercises = [
      {
        exerciseName: 'Dumbbell Thruster',
        board: 'main',
        stationIndex: 0,
        sortOrder: 1,
        durationSec: 35,
        restSec: 15,
        isCardioFinisher: false,
        muscleTargets: 'quads,shoulders',
      },
    ];
    const explanations = [];

    applyClassStyle('descending', exercises, explanations);

    expect(exercises[0].description).toContain('25-20-15-9');
    expect(exercises[0].description).toContain('quads + shoulders');
    expect(exercises[0].description).toContain('run the target muscles down safely');
    expect(exercises[0].programmingIntent).toEqual(expect.objectContaining({
      type: 'functional_circuit',
      classStyle: 'descending',
      scheme: '25-20-15-9',
      prescriptionLabel: '25-20-15-9 reps',
      repTargets: [25, 20, 15, 9],
      groupFocus: 'quads + shoulders',
    }));
    expect(explanations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'style',
        message: expect.stringContaining('two body groups'),
      }),
    ]));
  });
  it('round-trips structured programming intent through saved BootcampExercise notes', async () => {
    const exercises = [{
      exerciseName: 'Dumbbell Thruster',
      board: 'main',
      stationIndex: 0,
      sortOrder: 1,
      durationSec: 35,
      restSec: 15,
      isCardioFinisher: false,
      muscleTargets: 'quads,shoulders',
    }];

    applyClassStyle('descending', exercises, []);
    const notes = serializeExerciseNotes(exercises[0]);
    const plainExercise = { notes, exerciseLibraryId: null };
    const template = { exercises: [plainExercise], stations: [] };

    expect(BootcampExercise.rawAttributes.notes).toBeDefined();
    expect(notes).toContain('bootcamp:programming-intent:');
    expect(serializeExerciseNotes({
      notes: 'Trainer-visible note',
      programmingIntent: exercises[0].programmingIntent,
    })).toContain('Trainer-visible note\nbootcamp:programming-intent:');
    hydrateExerciseProgrammingIntent(plainExercise);
    expect(plainExercise.programmingIntent).toEqual(expect.objectContaining({ scheme: '25-20-15-9' }));
    await hydrateTemplateExerciseMedia([template], async () => {
      throw new Error('live exercise loader should not run without exerciseLibraryId values');
    });
    expect(plainExercise.programmingIntent).toEqual(expect.objectContaining({ prescriptionLabel: '25-20-15-9 reps' }));
    expect(bootcampCrudSource).toContain('notes: serializeExerciseNotes(ex)');
  });

  it('builds separate joint-friendly and low-impact alternative boards from the main intensity board', () => {
    const alternatives = generateBoard2([
      {
        exerciseName: 'Box Jump',
        board: 'main',
        stationIndex: 0,
        sortOrder: 1,
        durationSec: 35,
        restSec: 15,
        isCardioFinisher: false,
        easyVariation: 'Step-Up',
        kneeMod: 'Low Box Step-Up',
        shoulderMod: null,
        backMod: null,
        ankleMod: 'Supported Step-Up',
      },
    ]);

    expect(alternatives).toHaveLength(2);
    expect(alternatives.map(ex => ex.board)).toEqual(['alternative', 'lowImpact']);
    expect(alternatives.map(ex => ex.exerciseName)).toEqual(['Low Box Step-Up', 'Step-Up']);
    expect(alternatives.every(ex => ex.boardNumber > 1)).toBe(true);
    expect(alternatives.every(ex => ex.sourceExerciseName === 'Box Jump')).toBe(true);
  });

  it('allows generated low-impact board entries to be saved as bootcamp exercises', () => {
    expect(BootcampExercise.rawAttributes.board.values).toContain('lowImpact');
  });

  it('persists the source exercise name for generated alternative boards', () => {
    expect(BootcampExercise.rawAttributes.sourceExerciseName).toBeDefined();
    expect(bootcampCrudSource).toContain('sourceExerciseName: ex.sourceExerciseName ?? null');
  });

  it('persists every joint-modification field rendered by Board 2', () => {
    expect(BootcampExercise.rawAttributes.elbowMod).toBeDefined();
    expect(BootcampExercise.rawAttributes.footMod).toBeDefined();
    expect(BootcampExercise.rawAttributes.hipMod).toBeDefined();
    expect(bootcampCrudSource).toContain('elbowMod: ex.elbowMod');
    expect(bootcampCrudSource).toContain('footMod: ex.footMod');
    expect(bootcampCrudSource).toContain('hipMod: ex.hipMod');
  });

  it('allows every generator class format to be saved as a bootcamp template', () => {
    const modelValues = BootcampTemplate.rawAttributes.classFormat.values;
    expect(modelValues).toEqual(expect.arrayContaining(Object.keys(FORMAT_CONFIG)));
  });

  it('allows every exposed class style to be saved as a bootcamp template', () => {
    const modelValues = BootcampTemplate.rawAttributes.classStyle.values;
    expect(modelValues).toEqual(expect.arrayContaining([
      'standard', 'pyramid', 'superset', 'mixed', 'ladder', 'descending',
      'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density',
    ]));
  });

  it('pulls Rolodex exercise media into generated bootcamp classes before falling back to the registry', () => {
    const rolodexQueryIndex = bootcampGeneratorSource.indexOf('const rolodexResults = await queryExercisesForBootcamp');
    const registryFallbackIndex = bootcampGeneratorSource.indexOf('const registry = getExerciseRegistry()');
    const preRolodexQuery = bootcampGeneratorSource.slice(Math.max(0, rolodexQueryIndex - 700), rolodexQueryIndex);

    expect(rolodexQueryIndex).toBeGreaterThan(-1);
    expect(registryFallbackIndex).toBeGreaterThan(rolodexQueryIndex);
    expect(preRolodexQuery).not.toContain('if (equipmentProfileId) {');
    expect(exerciseRolodexBridgeSource).toContain('"videoUrl", "previewVideoUrl", "imageUrl", "thumbnailUrl"');
    expect(exerciseRolodexBridgeSource).toContain('normalizeExerciseRows(queryResult)');
    expect(exerciseRolodexBridgeSource).not.toContain('const [exercises] = await sequelize.query');
    expect(exerciseRolodexBridgeSource).toContain('videoUrl: ex.videoUrl ?? sample?.videoUrl ?? null');
    expect(exerciseRolodexBridgeSource).toContain('previewVideoUrl: ex.previewVideoUrl ?? null');
    expect(exerciseRolodexBridgeSource).toContain('thumbnailUrl: ex.thumbnailUrl ?? sample?.thumbnailUrl ?? null');
  });

  it('uses safe catalog demo samples as generated bootcamp media fallbacks', () => {
    expect(exerciseRolodexBridgeSource).toContain('getCatalogVideoSamplesByExercise');
    expect(exerciseRolodexBridgeSource).toContain('const sample = catalogVideoSamples[ex.id]');
    expect(exerciseRolodexBridgeSource).toContain('videoUrl: ex.videoUrl ?? sample?.videoUrl ?? null');
    expect(exerciseRolodexBridgeSource).toContain('previewVideoUrl: ex.previewVideoUrl ?? null');
    expect(exerciseRolodexBridgeSource).toContain('thumbnailUrl: ex.thumbnailUrl ?? sample?.thumbnailUrl ?? null');
  });

  it('passes the selected OPT phase into the Rolodex bridge query', () => {
    const normalizedGeneratorSource = bootcampGeneratorSource.replace(/\r\n/g, '\n');
    const queryIndex = normalizedGeneratorSource.indexOf('const rolodexResults = await queryExercisesForBootcamp');
    const queryBlock = normalizedGeneratorSource.slice(queryIndex, queryIndex + 260);

    expect(queryIndex).toBeGreaterThan(-1);
    expect(normalizedGeneratorSource).toContain('equipmentProfileId,\n    optPhase,\n    name,');
    expect(queryBlock).toContain('availableEquipment,\n      optPhase,\n      excludeNames');
    expect(exerciseRolodexBridgeSource).toContain('if (optPhase) {');
    expect(exerciseRolodexBridgeSource).toContain('COALESCE("optPhases"::text');
  });

  it('strict-filters generated classes against selected equipment profiles and mapping evidence', () => {
    expect(bootcampGeneratorSource).toContain("from './bootcampIntelligenceEngine.mjs'");
    expect(bootcampGeneratorSource).toContain('getBootcampEquipmentContext');
    expect(bootcampEquipmentContextSource).toContain('EquipmentExerciseMap.findAll');
    expect(bootcampEquipmentContextSource).toContain('confirmed: true');
    expect(bootcampGeneratorSource).toContain('filterExercisesForStrictEquipment(availableExercises, equipmentContext)');
    expect(bootcampGeneratorSource).toContain('summarizeBootcampSelectionEvidence(equipmentFilterResult, { requiredSlots: requiredEquipmentSlots })');
    expect(bootcampGeneratorSource).toContain('equipmentReadiness: equipmentSummary ?? null');
    expect(bootcampEquipmentContextSource).toContain('strictEquipment: Boolean(equipmentProfileId)');
    expect(bootcampExerciseSelectionSource).toContain('selectionReason: ex.selectionReason ?? null');
    expect(bootcampExerciseSelectionSource).toContain('equipmentEvidence: Array.isArray(ex.equipmentEvidence) ? ex.equipmentEvidence : []');
    expect(bootcampExerciseSelectionSource).toContain('missingEquipment: Array.isArray(ex.missingEquipment) ? ex.missingEquipment : []');
  });

  it('calculates planned non-cardio slots for equipment readiness warnings', () => {
    expect(__testing__.getRequiredEquipmentExerciseSlots({
      classFormat: 'custom',
      stationCount: 4,
      format: { exercisesPerStation: 4 },
    })).toBe(12);
    expect(__testing__.getRequiredEquipmentExerciseSlots({
      classFormat: 'full_group',
      stationCount: 0,
      format: { exercisesPerStation: 5 },
    })).toBe(15);
  });
  it('persists exercise media references for saved class templates and demo mode replay', () => {
    expect(BootcampExercise.rawAttributes.videoUrl).toBeDefined();
    expect(BootcampExercise.rawAttributes.previewVideoUrl).toBeDefined();
    expect(BootcampExercise.rawAttributes.imageUrl).toBeDefined();
    expect(BootcampExercise.rawAttributes.thumbnailUrl).toBeDefined();
    expect(bootcampCrudSource).toContain('videoUrl: ex.videoUrl ?? null');
    expect(bootcampCrudSource).toContain('previewVideoUrl: ex.previewVideoUrl ?? null');
    expect(bootcampCrudSource).toContain('imageUrl: ex.imageUrl ?? null');
    expect(bootcampCrudSource).toContain('thumbnailUrl: ex.thumbnailUrl ?? null');
  });

  it('persists real instruction text and avoids synthesizing a medium tier from the exercise name', () => {
    expect(BootcampExercise.rawAttributes.description).toBeDefined();
    expect(BootcampExercise.rawAttributes.instructions).toBeDefined();
    expect(bootcampCrudSource).toContain('description: ex.description ?? null');
    expect(bootcampCrudSource).toContain('instructions: ex.instructions ?? null');
    expect(bootcampExerciseSelectionSource).toContain('mediumVariation: ex.medium ?? null');
    expect(exerciseRolodexBridgeSource).toContain('medium: ex.mediumVariation ?? null');
    expect(bootcampGeneratorSource).not.toContain('mediumVariation: ex.name ?? formatExerciseName(ex.key)');
    expect(exerciseRolodexBridgeSource).not.toContain('medium: ex.name');
  });

  it('keeps shared Exercise UUIDs as bootcamp exercise library ids for live media rejoin', () => {
    expect(BootcampExercise.rawAttributes.exerciseLibraryId.type.key).toBe('UUID');
    expect(bootcampCrudSource).toContain('exerciseLibraryId: normalizeExerciseLibraryId(ex.exerciseLibraryId)');
    expect(bootcampExerciseSelectionSource).toContain('const exerciseLibraryId = normalizeExerciseLibraryId(ex.exerciseLibraryId)');
  });
});
