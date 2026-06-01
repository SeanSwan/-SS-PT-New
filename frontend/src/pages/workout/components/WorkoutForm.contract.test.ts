import { readFileSync } from 'fs';
import { resolve } from 'path';

const plannerSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/WorkoutPlanner.tsx'),
  'utf8'
);
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/WorkoutForm.tsx'),
  'utf8'
);
const notesSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/SessionNotes.tsx'),
  'utf8'
);

describe('WorkoutForm active planner child contract', () => {
  it('wires real exercise reorder controls through the mounted planner', () => {
    expect(plannerSource).toContain('const handleMoveExercise');
    expect(plannerSource).toContain('onMoveExercise={handleMoveExercise}');
    expect(formSource).toContain('onMoveExercise');
    expect(formSource).toContain('ArrowUp');
    expect(formSource).toContain('ArrowDown');
    expect(formSource).not.toContain('drag and drop');
  });

  it('extracts inline styles from the form and notes panels', () => {
    expect(formSource).not.toContain('styled.');
    expect(notesSource).not.toContain('styled.');
    expect(formSource).toContain("from './WorkoutForm.styles'");
    expect(notesSource).toContain("from './SessionNotes.styles'");
  });

  it('keeps active child files under the project line cap', () => {
    expect(formSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(notesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
