/**
 * Contract tests for the deterministic Swan Coach issue-structuring layer.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SupportReportGuidance from './SupportReportGuidance';
import {
  buildSupportReportPreview,
  initialSupportDraft,
} from './supportReportDraft';

describe('Swan Coach guided support intake', () => {
  it('turns a member draft into a structured agent-ready preview without identity data', () => {
    const preview = buildSupportReportPreview({
      ...initialSupportDraft,
      category: 'workout',
      severity: 'high',
      title: 'Workout logger will not save',
      description: 'The save button returns an error after I finish the session.',
      expectedBehavior: 'The completed workout appears in my diary.',
      impact: 'I cannot record today\'s progress.',
      steps: 'Open the workout logger\nFinish the session\nPress Save',
    });

    expect(preview).toContain('## What happened');
    expect(preview).toContain('## Expected behavior');
    expect(preview).toContain('## Impact');
    expect(preview).toContain('1. Open the workout logger');
    expect(preview).not.toMatch(/name|email|reporter/i);
  });

  it('shows the next useful question and moves focus to the matching report field', () => {
    const focusField = vi.fn();
    const { rerender } = render(
      <SupportReportGuidance draft={initialSupportDraft} onFocusField={focusField} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /tell swan coach what happened/i }));
    expect(focusField).toHaveBeenCalledWith('description');
    expect(screen.getByText(/0 of 4 key details ready/i)).toBeInTheDocument();

    rerender(
      <SupportReportGuidance
        draft={{ ...initialSupportDraft, description: 'The page stopped responding during checkout.' }}
        onFocusField={focusField}
      />,
    );

    expect(screen.getByRole('button', { name: /what should have happened/i })).toBeInTheDocument();
    expect(screen.getByText(/1 of 4 key details ready/i)).toBeInTheDocument();
  });
});
