import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WorkoutPlannerGuidedCandidatesPanel from './WorkoutPlannerGuidedCandidatesPanel';

const candidate = {
  exerciseKey: 'supported_dumbbell_row',
  exerciseName: 'Supported Dumbbell Row',
  sets: 3,
  reps: 10,
  tempo: '2/0/2',
  restSeconds: 60,
  readinessNote: 'Use release/rolling as needed, controlled range of motion, and stop if symptoms escalate.',
  selectionReason: 'Back option matches goal and readiness.',
  media: {
    videoUrl: 'https://cdn.swan.test/row.mp4',
    previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
    imageUrl: null,
    thumbnailUrl: 'https://cdn.swan.test/row.jpg',
  },
  exerciseSlim: {
    id: 'supported_dumbbell_row',
    name: 'Supported Dumbbell Row',
    exerciseKey: 'supported_dumbbell_row',
    exerciseType: 'pull',
    bodyPartCategory: 'Back',
    primaryMuscles: ['back', 'forearms'],
    difficulty: 280,
    equipment: ['dumbbell', 'bench'],
    videoUrl: 'https://cdn.swan.test/row.mp4',
    previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
    imageUrl: null,
    thumbnailUrl: 'https://cdn.swan.test/row.jpg',
  },
};

const candidates = {
  planningSystem: 'swan_coach_planning',
  candidateSystem: 'swan_coach_guided_candidates',
  generationMode: 'guide_me',
  category: 'back',
  primaryGoal: 'strength',
  slots: [{
    slotId: 'back-primary',
    focus: 'Back',
    instruction: 'Pick one option for this workout slot.',
    candidates: [candidate],
  }],
};

describe('WorkoutPlannerGuidedCandidatesPanel', () => {
  it('renders selectable candidates with Rolodex media, readiness notes, and training parameters', async () => {
    const onSelectCandidate = vi.fn();
    render(
      <WorkoutPlannerGuidedCandidatesPanel
        candidates={candidates as any}
        generationMode="guide_me"
        generatingCandidates={false}
        onSelectCandidate={onSelectCandidate}
        onClearCandidates={vi.fn()}
      />,
    );

    expect(screen.getByText('Supported Dumbbell Row')).toBeInTheDocument();
    expect(screen.getByText(/controlled range/i)).toBeInTheDocument();
    expect(screen.getByText('3 x 10')).toBeInTheDocument();
    expect(screen.getByText('Tempo 2/0/2')).toBeInTheDocument();
    expect(screen.getByText('60s rest')).toBeInTheDocument();
    expect(screen.getByLabelText('Supported Dumbbell Row exercise demo media')).toHaveAttribute(
      'src',
      'https://cdn.swan.test/row-preview.webm',
    );

    await userEvent.click(screen.getByRole('button', { name: /add supported dumbbell row/i }));
    expect(onSelectCandidate).toHaveBeenCalledWith(candidate);
  });

  it('shows an actionable empty state when no equipment-matched candidates are available', () => {
    render(
      <WorkoutPlannerGuidedCandidatesPanel
        candidates={{ ...candidates, slots: [{ ...candidates.slots[0], candidates: [] }] } as any}
        generationMode="deep_grill"
        generatingCandidates={false}
        onSelectCandidate={vi.fn()}
        onClearCandidates={vi.fn()}
      />,
    );

    expect(screen.getByText(/No exercise options matched/i)).toBeInTheDocument();
    expect(screen.getByText(/adjust the category or equipment profile/i)).toBeInTheDocument();
  });
});