import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MealPlanGeneratorSection, PhotoAnalysisSection } from './MealPlanTab.sections';

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, initial, animate, exit, whileHover, whileTap, ...props }: any) => <div {...props}>{children}</div>;
  const MotionButton = ({ children, initial, animate, exit, whileHover, whileTap, ...props }: any) => <button {...props}>{children}</button>;
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
    motion: { div: MotionDiv, button: MotionButton },
  };
});

const baseGeneratorProps = {
  calories: '2000',
  protein: '',
  carbs: '',
  fat: '',
  activityType: 'general fitness',
  optPhase: 'Phase 1 - Stabilization Endurance',
  selectedRestrictions: [],
  selectedConditions: [],
  planLoading: false,
  planError: '',
  expandedMeal: 0,
  onCaloriesChange: vi.fn(),
  onProteinChange: vi.fn(),
  onCarbsChange: vi.fn(),
  onFatChange: vi.fn(),
  onActivityTypeChange: vi.fn(),
  onOptPhaseChange: vi.fn(),
  onToggleRestriction: vi.fn(),
  onToggleCondition: vi.fn(),
  onGeneratePlan: vi.fn(),
  onExpandMeal: vi.fn(),
};

const readSectionSource = () =>
  readFileSync(resolve(__dirname, 'MealPlanTab.sections.tsx'), 'utf8');
const readStylesSource = () =>
  readFileSync(resolve(__dirname, 'MealPlanTab.styles.ts'), 'utf8');

describe('MealPlanTab sections', () => {
  it('routes framer-motion props through reduced-motion helpers', () => {
    const source = readSectionSource();

    expect(source).toContain("import { AnimatePresence, useReducedMotion } from 'framer-motion';");
    expect(source).toContain("import { buttonMotion, expandMotion, fadeSlideMotion } from './MealPlanTab.motion';");
    expect(source).toContain('const reduceMotion = Boolean(useReducedMotion());');
    expect(source).toContain('{...buttonMotion(reduceMotion)}');
    expect(source).toContain('{...fadeSlideMotion(reduceMotion)}');
    expect(source).toContain('{...expandMotion(reduceMotion)}');
    expect(source).not.toContain('whileHover={{ scale: 1.02 }}');
    expect(source).not.toContain("initial={{ opacity: 0, y: 12 }}");
  });

  it('does not render malformed generated-plan macros as credible numbers', () => {
    render(<MealPlanGeneratorSection {...baseGeneratorProps} plan={{
      planName: 'Malformed plan',
      dailyTargets: { calories: '1e3', protein: ['45'], carbs: '0x10', fat: '4.5', fiber: 25 },
      meals: [{
        mealType: 'lunch',
        time: '12:00',
        name: 'Chicken bowl',
        foods: [{ name: 'Chicken', serving: '1 bowl', calories: '0x10', protein: ['45'], carbs: '1e2', fat: '4.5' }],
        totalCalories: '2e2',
        prepTime: '10 min',
      }],
      groceryList: [],
      nasmNote: '',
      tips: [],
      fdaDisclaimer: 'Estimate only.',
    } as any} />);

    expect(screen.queryByText('1e3 cal')).not.toBeInTheDocument();
    expect(screen.queryByText('2e2 cal')).not.toBeInTheDocument();
    expect(screen.queryByText('0x10')).not.toBeInTheDocument();
    expect(screen.queryByText('1e2g')).not.toBeInTheDocument();
    expect(screen.getAllByText(/N\/A/).length).toBeGreaterThan(0);
  });

  it('uses care-first activity goal labels in the meal-plan selector', () => {
    render(<MealPlanGeneratorSection {...baseGeneratorProps} plan={null} />);

    expect(screen.queryByRole('option', { name: /weight loss/i })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /body composition support/i })).toBeInTheDocument();
  });

  it('keeps Plan Around preset chips out of the error color system', () => {
    const stylesSource = readStylesSource();
    const avoidChipStyle = stylesSource.match(/export const AvoidChip[\s\S]*?`;/)?.[0] ?? '';

    expect(avoidChipStyle).toContain('var(--accent-secondary, #8B5CF6)');
    expect(avoidChipStyle).not.toContain('var(--accent-error');
  });

  it('does not render malformed photo totals or confidence as certainty', () => {
    render(<PhotoAnalysisSection
      photoFile={null}
      photoPreview={null}
      photoResult={{
        foods: [],
        totalCalories: '1e3',
        totalProtein: ['45'],
        totalCarbs: '0x10',
        totalFat: '4.5',
        mealType: 'lunch',
        overallConfidence: '1e2',
        notes: '',
        fdaDisclaimer: 'Estimate only.',
      } as any}
      photoLoading={false}
      photoError=""
      fileInputRef={React.createRef<HTMLInputElement>()}
      onPhotoSelect={vi.fn()}
      onAnalyzePhoto={vi.fn()}
      onClearPhoto={vi.fn()}
    />);

    expect(screen.queryByText('1e3 cal')).not.toBeInTheDocument();
    expect(screen.queryByText('0x10g C')).not.toBeInTheDocument();
    expect(screen.queryByText('AI estimate 10000%')).not.toBeInTheDocument();
    expect(screen.getByText('AI estimate N/A')).toBeInTheDocument();
  });
});
