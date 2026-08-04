/** @since S14 — extracted pure logic. NOT WIRED until S15. */
export interface SaveBarState { isDirty: boolean; isSaved: boolean; isActive: boolean; hasActiveOther: boolean; canActivate: boolean | undefined; }
export interface SaveBarResolution { primary: string; overflow: string[]; statusText: string; primaryDisabled?: boolean; }
export const resolveSaveBar = (state: SaveBarState): SaveBarResolution => {
  if (state.isActive) return state.isDirty
    ? { primary: 'Save changes', overflow: ['Revert'], statusText: 'Active · unsaved changes' }
    : { primary: 'Assign / Schedule', overflow: ['Duplicate', 'Save as template', 'Deactivate'], statusText: 'Active' };
  if (!state.isSaved) return { primary: 'Save plan', overflow: ['Discard'], statusText: 'Not saved' };
  if (state.isDirty) return { primary: 'Save changes', overflow: ['Revert', 'Duplicate'], statusText: 'Unsaved changes' };
  if (state.canActivate === false) return { primary: 'Activate', primaryDisabled: true, overflow: ['Duplicate', 'Save as template', 'Delete'], statusText: 'Activation requires trainer role' };
  return state.hasActiveOther
    ? { primary: 'Activate (replaces current)', overflow: ['Duplicate', 'Save as template', 'Delete', 'View active plan'], statusText: 'Saved · another plan is active' }
    : { primary: 'Activate', overflow: ['Duplicate', 'Save as template', 'Delete'], statusText: 'Saved · not active' };
};
