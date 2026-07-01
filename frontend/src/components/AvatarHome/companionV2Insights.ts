export interface CompanionV2InsightInput {
  stage: number;
  health: number;
  happiness: number;
  moodLabel: string;
  totalInteractions?: number;
}

export interface CompanionV2Insight {
  bondPercent: number;
  title: string;
  body: string;
  nextActionLabel: string;
}

const STAGE_COUNT = 6;

export const clampCompanionPercent = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
};

export const getCompanionBondPercent = ({
  stage,
  health,
  happiness,
  totalInteractions = 0,
}: CompanionV2InsightInput): number => {
  const stageScore = (Math.max(0, stage) / Math.max(1, STAGE_COUNT - 1)) * 35;
  const wellbeingScore = (clampCompanionPercent(health) * 0.25) + (clampCompanionPercent(happiness) * 0.25);
  const interactionScore = Math.min(15, Math.max(0, totalInteractions) * 1.5);
  return clampCompanionPercent(stageScore + wellbeingScore + interactionScore);
};

export const getCompanionV2Insight = (input: CompanionV2InsightInput): CompanionV2Insight => {
  const health = clampCompanionPercent(input.health);
  const happiness = clampCompanionPercent(input.happiness);
  const bondPercent = getCompanionBondPercent(input);

  if (health < 40) {
    return {
      bondPercent,
      title: 'Recovery rhythm',
      body: 'Your companion is asking for a lighter, smarter step: hydrate, plan recovery, or log the next session you can complete.',
      nextActionLabel: 'Choose recovery',
    };
  }

  if (happiness < 50) {
    return {
      bondPercent,
      title: 'Small win needed',
      body: 'A quick check-in, celebration, or tiny wellness action can bring the companion back into rhythm.',
      nextActionLabel: 'Add a small win',
    };
  }

  if (input.moodLabel === 'ecstatic' || input.moodLabel === 'happy') {
    return {
      bondPercent,
      title: 'Momentum is glowing',
      body: 'Keep the streak alive with one logged workout, nutrition win, or recovery check-in.',
      nextActionLabel: 'Keep momentum',
    };
  }

  if (input.stage === 0) {
    return {
      bondPercent,
      title: 'Hatching starts with consistency',
      body: 'Complete simple health actions and check in often. The first evolution should feel like a real milestone.',
      nextActionLabel: 'Build consistency',
    };
  }

  return {
    bondPercent,
    title: 'Choose the next healthy action',
    body: 'Your companion grows from real progress. Pick one workout, recovery, nutrition, or community action and let it count.',
    nextActionLabel: 'Pick next action',
  };
};
