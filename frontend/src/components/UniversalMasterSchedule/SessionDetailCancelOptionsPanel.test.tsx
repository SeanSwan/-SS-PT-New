import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailCancelOptionsPanel from './SessionDetailCancelOptionsPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const renderPanel = (overrides = {}) => {
  const props = {
    isEarlyCancelEligible: false,
    packagePrice: 175,
    packageName: 'Elite Training',
    cancelReason: '',
    onCancelReasonChange: vi.fn(),
    chargeType: 'full' as const,
    onChargeTypeChange: vi.fn(),
    chargeAmount: '175',
    onChargeAmountChange: vi.fn(),
    defaultFullCharge: 175,
    defaultLateFee: 87.5,
    restoreCredit: false,
    onRestoreCreditChange: vi.fn(),
    notifyOnCancel: true,
    onNotifyOnCancelChange: vi.fn(),
    ...overrides,
  };

  render(<SessionDetailCancelOptionsPanel {...props} />);

  return props;
};

describe('SessionDetailCancelOptionsPanel', () => {
  it('does not leak styling-only caption props into the DOM', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const typographySource = read('ui/Typography.tsx');

    try {
      renderPanel();

      expect(typographySource).toContain('export const Caption = styled.span.withConfig');
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('non-boolean attribute `secondary`'),
        expect.anything(),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('renders manager cancellation controls without changing billing defaults', () => {
    const props = renderPanel();

    expect(screen.getByText('Client Package: Elite Training')).toBeInTheDocument();
    expect(screen.getByText('Rate: $175/session')).toBeInTheDocument();
    expect(screen.getByText('Late cancellation (less than 24 hours notice)')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Late Cancellation Fee/i));
    expect(props.onChargeTypeChange).toHaveBeenCalledWith('late_fee');
    expect(props.onChargeAmountChange).toHaveBeenCalledWith('87.5');
    expect(props.onRestoreCreditChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByLabelText(/No Charge/i));
    expect(props.onChargeTypeChange).toHaveBeenCalledWith('none');
    expect(props.onChargeAmountChange).toHaveBeenCalledWith('');
    expect(props.onRestoreCreditChange).toHaveBeenCalledWith(true);
  });

  it('keeps the oversized modal shell free of inline manager cancellation markup', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailCancelOptionsPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailCancelOptionsPanel'");
    expect(modalSource).not.toContain('Cancel Session - Choose Charge Option');
    expect(modalSource).not.toContain('<ChargeTypeGrid>');
    expect(panelSource).toContain('Cancel Session - Choose Charge Option');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});

describe('SessionDetailCancelOptionsPanel — unavailable pricing', () => {
  it('does not present package-derived dollar amounts when pricing is unavailable', () => {
    renderPanel({ pricingUnavailable: true, chargeType: 'none', chargeAmount: '' });

    expect(screen.queryByText('$175.00')).toBeNull();
    expect(screen.getAllByText(/pricing unavailable/i).length).toBeGreaterThan(0);
  });

  it('disables the package-derived charge options when pricing is unavailable', () => {
    renderPanel({ pricingUnavailable: true, chargeType: 'none', chargeAmount: '' });

    expect(screen.getByLabelText(/full session charge/i)).toBeDisabled();
    expect(screen.getByLabelText(/late cancellation fee/i)).toBeDisabled();
  });

  it('still renders package amounts when pricing is available', () => {
    renderPanel();

    expect(screen.getByText('$175.00')).toBeTruthy();
    expect(screen.queryByText(/pricing unavailable/i)).toBeNull();
  });
});
