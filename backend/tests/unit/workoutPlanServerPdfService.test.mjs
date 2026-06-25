import { describe, expect, it } from 'vitest';
import { buildWorkoutPlanPdfFile } from '../../services/workoutPlanServerPdfService.mjs';

const buildExercise = (index) => ({
  exerciseName: `Exercise ${index}`,
  sets: 3,
  targetReps: String(8 + index),
  tempo: '3-1-1',
  restSeconds: 45,
});

const buildDensePlan = () => ({
  planSummary: {
    durationWeeks: 2,
    sessionsPerWeek: 3,
    totalSessions: 6,
    primaryGoal: 'strength',
    startingPhase: 2,
  },
  recommendations: [
    'Because of your shoulder surgery and arthritis history, avoid overhead pressing.',
    'Based on your readiness profile, prioritize controlled tempo before adding load.',
  ],
  weeks: Array.from({ length: 2 }, (_, weekIndex) => ({
    weekNumber: weekIndex + 1,
    focus: `Week ${weekIndex + 1} strength focus`,
    days: Array.from({ length: 3 }, (_, dayIndex) => ({
      dayNumber: dayIndex + 1,
      name: `Week ${weekIndex + 1} Day ${dayIndex + 1}`,
      focus: 'full body strength',
      exercises: Array.from({ length: 16 }, (_, exerciseIndex) => buildExercise(exerciseIndex + 1)),
    })),
  })),
});

describe('workout plan server PDF service', () => {
  it('renders every saved workout and exercise with tempo in a professional branded PDF', () => {
    const file = buildWorkoutPlanPdfFile({
      title: 'Client Strength Plan',
      description: 'Two-week training arc',
      durationWeeks: 2,
      nasmPhase: 2,
      planData: buildDensePlan(),
    });

    expect(file?.originalname).toBe('SwanStudios-Workout-Plan-Client-Strength-Plan.pdf');
    const pdfText = file?.buffer.toString('utf8') || '';

    expect(pdfText).toContain('/BaseFont /Times-Bold');
    expect(pdfText).toContain('/BaseFont /Helvetica');
    expect(pdfText).toContain('Tempo');
    expect(pdfText).toContain('Week 2 Day 3');
    expect(pdfText).toContain('Exercise 16');
    expect(pdfText).not.toContain('additional exercises');
    expect(pdfText).not.toContain('Plan truncated');
  });

  it('keeps client-facing recommendations privacy-safe', () => {
    const file = buildWorkoutPlanPdfFile({
      title: 'Privacy Safe Plan',
      durationWeeks: 2,
      nasmPhase: 2,
      planData: buildDensePlan(),
    });

    const pdfText = file?.buffer.toString('utf8') || '';
    expect(pdfText).toContain('Based on your readiness profile');
    expect(pdfText).not.toMatch(/surgery|arthritis|history/i);
  });

  it('does not truncate long plans or leak private history from non-recommendation fields', () => {
    const file = buildWorkoutPlanPdfFile({
      title: 'Post surgery rebuild plan',
      description: 'Generated after injury history intake.',
      durationWeeks: 53,
      nasmPhase: 2,
      planData: {
        planSummary: {
          durationWeeks: 53,
          sessionsPerWeek: 1,
          totalSessions: 53,
          primaryGoal: 'post-surgery strength',
          startingPhase: 2,
        },
        recommendations: [],
        weeks: Array.from({ length: 53 }, (_, index) => ({
          weekNumber: index + 1,
          focus: index === 52 ? 'arthritis rehab focus' : `Week ${index + 1} strength`,
          days: [{
            dayNumber: 1,
            name: index === 52 ? 'Shoulder surgery day' : `Week ${index + 1} Day 1`,
            focus: 'injury history modifications',
            exercises: [{
              exerciseName: index === 52 ? 'Arthritis rehab press' : `Exercise ${index + 1}`,
              sets: 3,
              targetReps: '10',
              tempo: '3-1-1',
              restSeconds: 45,
              readinessNote: 'Diagnosis history requires conservative loading.',
            }],
          }],
        })),
      },
    });

    const pdfText = file?.buffer.toString('utf8') || '';
    expect(pdfText).toContain('Week 53');
    expect(pdfText).toContain('Day 1');
    expect(pdfText).toContain('Exercise 1');
    expect(pdfText).toContain('Trainer modification noted.');
    expect(pdfText).toContain('Based on your readiness profile, follow the plan exactly as assigned.');
    expect(pdfText).not.toMatch(/surgery|arthritis|injury|diagnosis|history|rehab/i);
  });
});
