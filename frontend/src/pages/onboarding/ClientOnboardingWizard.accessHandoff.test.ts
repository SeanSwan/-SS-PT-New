import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ClientOnboardingWizard.tsx'), 'utf8');

const getSourceSlice = (start: string, end: string) => {
  const startIndex = source.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  const endIndex = source.indexOf(end, startIndex);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};
describe('ClientOnboardingWizard access handoff', () => {
  it('does not render generated passwords in the onboarding success modal', () => {
    expect(source).not.toContain('submissionResult.tempPassword');
    expect(source).not.toContain('Temporary Password');
    expect(source).toContain('getOnboardingAccessStatusLabel(submissionResult)');
    expect(source).toContain('getOnboardingAccessModalCopy(submissionResult)');
    expect(source).toContain('getOnboardingResetUrlToCopy(submissionResult)');
    expect(source).not.toContain('submissionResult.resetUrl &&');
    expect(source).toContain('Copy reset link');



  });
  it('keeps staff-created client completion on the Client Hub after reset-link handoff', () => {
    expect(source).toContain('const isStaffCreationFlow = !selfSubmit && !onSubmit;');
    expect(source).toContain('isStaffCreationFlow ? "/dashboard/admin/client-management" : "/dashboard/client/overview"');
    expect(source).toContain('isStaffCreationFlow ? "Back to Client Hub" : "Go to Dashboard"');
  });
  it('keeps mobile step controls touch-safe without connector overflow', () => {
    const stepperStyles = getSourceSlice('const StepIndicator', 'const ButtonGroup');
    expect(stepperStyles).toContain('flex-wrap: wrap;');
    expect(stepperStyles).toContain('min-width: 44px;');
    expect(stepperStyles).toContain('min-height: 44px;');
    expect(stepperStyles).toContain('display: none;');
    expect(stepperStyles).not.toContain('width: 36px;');
    expect(stepperStyles).not.toContain('height: 36px;');
  });
  it('keeps the reset-link success handoff inside a labelled modal dialog with local copy feedback', () => {
    const modalSlice = getSourceSlice('<ModalContent', '<ModalTitle');
    const copyHandler = getSourceSlice('const handleCopyResetLink', 'const handleExit');

    expect(modalSlice).toContain('role="dialog"');
    expect(modalSlice).toContain('aria-modal="true"');
    expect(modalSlice).toContain('aria-labelledby="client-onboarding-success-title"');
    expect(source).toContain('<ModalTitle id="client-onboarding-success-title">');
    expect(source).toContain('ResetLinkCopyStatus');
    expect(source).toContain('role="status"');
    expect(copyHandler).toContain('setResetLinkCopyStatus');
    expect(copyHandler).not.toContain('setError("Reset link is ready');
  });
});
