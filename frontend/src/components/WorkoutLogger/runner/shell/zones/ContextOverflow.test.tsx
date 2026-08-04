import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContextOverflow from './ContextOverflow';

const props = {
  onCancelSession: vi.fn(),
  onExportPDF: vi.fn(),
  showGenerateSummary: false,
  isGeneratingSummary: false,
};

describe('ContextOverflow', () => {
  it('opens Full Command Center through the parent SPA navigator and closes Session actions', () => {
    const onOpenCoachCommand = vi.fn();
    render(<ContextOverflow {...props} onOpenCoachCommand={onOpenCoachCommand} />);

    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open full Coach Command Center for this workout' }));

    expect(onOpenCoachCommand).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Session actions' })).not.toBeInTheDocument();
  });
});
