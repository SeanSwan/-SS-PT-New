/**
 * Cortex P0 §13.5.9 — SafetyGateModal contract tests.
 * A charming no is still a no: override is impossible without a written reason.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SafetyGateModal from './SafetyGateModal';

const renderModal = (overrides: Partial<React.ComponentProps<typeof SafetyGateModal>> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <SafetyGateModal
      open
      signals={['active_pain_review_required']}
      missingData={[]}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
};

describe('SafetyGateModal', () => {
  it('renders as an alertdialog with humanized signals', () => {
    renderModal();
    expect(screen.getByRole('alertdialog', { name: /review required/i })).toBeTruthy();
    expect(screen.getByText(/Active pain reported/i)).toBeTruthy();
  });

  it('override is disabled until a written reason exists (test 9 UI contract)', () => {
    const { onConfirm } = renderModal();
    const override = screen.getByRole('button', { name: /acknowledge & generate/i }) as HTMLButtonElement;
    expect(override.disabled).toBe(true);
    fireEvent.click(override);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/why is it safe to proceed/i), {
      target: { value: 'Reviewed with client; pressing removed' },
    });
    expect(override.disabled).toBe(false);
    fireEvent.click(override);
    expect(onConfirm).toHaveBeenCalledWith('Reviewed with client; pressing removed');
  });

  it('Hold & Review and Escape both cancel without confirming', () => {
    const { onConfirm, onCancel } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /hold & review/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(
      <SafetyGateModal open={false} signals={[]} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
