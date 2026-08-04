import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerClientState.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner client state extraction', () => {
  it('keeps client loading, selection, and self-generation gates outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerClientState'");
    expect(pageSource).not.toContain('const [clients, setClients]');
    expect(pageSource).not.toContain('const [selectedClientId, setSelectedClientId]');
    expect(pageSource).not.toContain('const [clientsLoading, setClientsLoading]');
    expect(pageSource).not.toContain('const fetchClients = async');
    expect(pageSource).not.toContain('TrainerAssignmentResponse');
    expect(pageSource).not.toContain('const handleClientSelectionChange = useCallback');
    expect(hookSource).toContain('/api/auth/clients');
    expect(hookSource).toContain('/api/client-trainer-assignments/trainer/${user.id}');
    expect(hookSource).toContain('normalizeWorkoutPlannerClients');
    expect(hookSource).toContain('pickWorkoutPlannerClientId');
    expect(hookSource).toContain('resetLoadedPlanState');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
