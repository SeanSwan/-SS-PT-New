import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.tsx'),
  'utf8'
);

describe('ExerciseLibraryManager retry contract', () => {
  it('refreshes the exercise library through component state instead of reloading the page', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).not.toContain('{/* Handle refresh */}');
    expect(SOURCE).toContain('const [fetchRetryNonce, setFetchRetryNonce]');
    expect(SOURCE).toContain('setFetchRetryNonce(prevNonce => prevNonce + 1)');
    expect(SOURCE).toContain('}, [authAxios, fetchRetryNonce]);');
    expect(SOURCE).toContain('onClick={handleRefreshLibrary}');
  });

  it('wires export to a real CSV download instead of a placeholder click handler', () => {
    expect(SOURCE).not.toContain('{/* Handle export */}');
    expect(SOURCE).toContain('handleExportLibrary');
    expect(SOURCE).toContain('filteredExercises.map');
    expect(SOURCE).toContain('new Blob');
    expect(SOURCE).toContain('URL.createObjectURL');
    expect(SOURCE).toContain("link.download = `exercise-library-${new Date().toISOString().slice(0, 10)}.csv`");
  });

  it('routes media preview and row action controls through a real preview handler', () => {
    expect(SOURCE).not.toContain('// Handle video play');
    expect(SOURCE).toContain('const handleExercisePreview = useCallback');
    expect(SOURCE.match(/handleExercisePreview\(exercise\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
