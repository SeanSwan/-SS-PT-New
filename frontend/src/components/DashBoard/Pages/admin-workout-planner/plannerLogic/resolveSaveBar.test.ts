import { describe, expect, it } from 'vitest';
import { resolveSaveBar } from './resolveSaveBar';

describe('resolveSaveBar', () => {
  it.each([
    [{ isDirty: true, isSaved: false, isActive: false, hasActiveOther: false, canActivate: true }, 'Save plan', ['Discard'], 'Not saved'],
    [{ isDirty: false, isSaved: true, isActive: false, hasActiveOther: false, canActivate: true }, 'Activate', ['Duplicate', 'Save as template', 'Delete'], 'Saved · not active'],
    [{ isDirty: false, isSaved: true, isActive: false, hasActiveOther: true, canActivate: true }, 'Activate (replaces current)', ['Duplicate', 'Save as template', 'Delete', 'View active plan'], 'Saved · another plan is active'],
    [{ isDirty: true, isSaved: true, isActive: false, hasActiveOther: false, canActivate: true }, 'Save changes', ['Revert', 'Duplicate'], 'Unsaved changes'],
    [{ isDirty: false, isSaved: true, isActive: true, hasActiveOther: false, canActivate: true }, 'Assign / Schedule', ['Duplicate', 'Save as template', 'Deactivate'], 'Active'],
    [{ isDirty: true, isSaved: true, isActive: true, hasActiveOther: false, canActivate: true }, 'Save changes', ['Revert'], 'Active · unsaved changes'],
    [{ isDirty: false, isSaved: true, isActive: false, hasActiveOther: false, canActivate: false }, 'Activate', ['Duplicate', 'Save as template', 'Delete'], 'Activation requires trainer role'],
    [{ isDirty: false, isSaved: true, isActive: false, hasActiveOther: false, canActivate: undefined }, 'Activate', ['Duplicate', 'Save as template', 'Delete'], 'Saved · not active'],
  ] as const)('resolves the documented matrix row %#', (state, primary, overflow, statusText) => {
    expect(resolveSaveBar(state)).toMatchObject({ primary, overflow, statusText });
  });

  it('keeps active-plan controls available when activation is denied', () => {
    expect(resolveSaveBar({ isDirty: false, isSaved: true, isActive: true, hasActiveOther: false, canActivate: false }).overflow).toContain('Deactivate');
  });
});
