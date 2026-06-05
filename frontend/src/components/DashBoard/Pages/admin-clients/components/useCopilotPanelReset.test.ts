import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCopilotPanelReset } from './useCopilotPanelReset';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const createSetters = () => ({
  setState: vi.fn(),
  setEditedPlan: vi.fn(),
  setExplainability: vi.fn(),
  setSafetyConstraints: vi.fn(),
  setExerciseRecs: vi.fn(),
  setWarnings: vi.fn(),
  setMissingInputs: vi.fn(),
  setGenerationMode: vi.fn(),
  setAuditLogId: vi.fn(),
  setTrainerNotes: vi.fn(),
  setOverrideReason: vi.fn(),
  setOverrideReasonRequired: vi.fn(),
  setDegradedData: vi.fn(),
  setSavedPlanId: vi.fn(),
  setUnmatchedExercises: vi.fn(),
  setValidationWarnings: vi.fn(),
  setErrorMessage: vi.fn(),
  setErrorCode: vi.fn(),
  setApproveErrors: vi.fn(),
  setActivePainEntries: vi.fn(),
  setPainAcknowledged: vi.fn(),
  setExpandedDays: vi.fn(),
  setIsSubmitting: vi.fn(),
  setActiveTab: vi.fn(),
  setLhFooterContent: vi.fn(),
});

describe('useCopilotPanelReset', () => {
  it('keeps the reset-on-open block outside the copilot state-machine shell', () => {
    expect(panelSource).toContain("from './useCopilotPanelReset'");
    expect(panelSource).not.toContain("setExplainability(null);\n      setSafetyConstraints(null);");
    expect(panelSource).not.toContain("setActivePainEntries([]);\n      setPainAcknowledged(false);");
  });

  it('resets every single-workout and tab state when the panel opens', () => {
    const setters = createSetters();

    renderHook(() => useCopilotPanelReset({ open: true, ...setters }));

    expect(setters.setState).toHaveBeenCalledWith('idle');
    expect(setters.setEditedPlan).toHaveBeenCalledWith(null);
    expect(setters.setExplainability).toHaveBeenCalledWith(null);
    expect(setters.setSafetyConstraints).toHaveBeenCalledWith(null);
    expect(setters.setExerciseRecs).toHaveBeenCalledWith([]);
    expect(setters.setWarnings).toHaveBeenCalledWith([]);
    expect(setters.setMissingInputs).toHaveBeenCalledWith([]);
    expect(setters.setGenerationMode).toHaveBeenCalledWith('');
    expect(setters.setAuditLogId).toHaveBeenCalledWith(null);
    expect(setters.setTrainerNotes).toHaveBeenCalledWith('');
    expect(setters.setOverrideReason).toHaveBeenCalledWith('');
    expect(setters.setOverrideReasonRequired).toHaveBeenCalledWith(false);
    expect(setters.setDegradedData).toHaveBeenCalledWith(null);
    expect(setters.setSavedPlanId).toHaveBeenCalledWith(null);
    expect(setters.setUnmatchedExercises).toHaveBeenCalledWith([]);
    expect(setters.setValidationWarnings).toHaveBeenCalledWith([]);
    expect(setters.setErrorMessage).toHaveBeenCalledWith('');
    expect(setters.setErrorCode).toHaveBeenCalledWith('');
    expect(setters.setApproveErrors).toHaveBeenCalledWith([]);
    expect(setters.setActivePainEntries).toHaveBeenCalledWith([]);
    expect(setters.setPainAcknowledged).toHaveBeenCalledWith(false);
    expect(setters.setExpandedDays).toHaveBeenCalledWith(new Set());
    expect(setters.setIsSubmitting).toHaveBeenCalledWith(false);
    expect(setters.setActiveTab).toHaveBeenCalledWith('single');
    expect(setters.setLhFooterContent).toHaveBeenCalledWith(null);
  });

  it('does not reset while closed', () => {
    const setters = createSetters();

    renderHook(() => useCopilotPanelReset({ open: false, ...setters }));

    expect(setters.setState).not.toHaveBeenCalled();
    expect(setters.setEditedPlan).not.toHaveBeenCalled();
    expect(setters.setExpandedDays).not.toHaveBeenCalled();
  });
});
