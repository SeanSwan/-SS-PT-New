import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LongHorizonReviewFooter from './LongHorizonReviewFooter';

describe('LongHorizonReviewFooter', () => {
  it('exposes regenerate and approve actions for a valid draft', () => {
    const onRegenerate = vi.fn();
    const onApprove = vi.fn();

    render(
      <LongHorizonReviewFooter
        state="plan_review"
        isSubmitting={false}
        auditLogId={42}
        onRegenerate={onRegenerate}
        onApprove={onApprove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    fireEvent.click(screen.getByRole('button', { name: /approve & save/i }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('blocks approval when the audit link is missing', () => {
    const onApprove = vi.fn();

    render(
      <LongHorizonReviewFooter
        state="plan_review"
        isSubmitting={false}
        auditLogId={null}
        onRegenerate={vi.fn()}
        onApprove={onApprove}
      />,
    );

    const approveButton = screen.getByRole('button', { name: /approve & save/i });

    expect(approveButton).toBeDisabled();
    fireEvent.click(approveButton);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('blocks approval when the Swan Coach planning review has not been acknowledged', () => {
    const onApprove = vi.fn();

    render(
      <LongHorizonReviewFooter
        state="plan_review"
        isSubmitting={false}
        auditLogId={42}
        approvalDisabled
        onRegenerate={vi.fn()}
        onApprove={onApprove}
      />,
    );

    const approveButton = screen.getByRole('button', { name: /approve & save/i });

    expect(approveButton).toBeDisabled();
    fireEvent.click(approveButton);
    expect(onApprove).not.toHaveBeenCalled();
  });
});
