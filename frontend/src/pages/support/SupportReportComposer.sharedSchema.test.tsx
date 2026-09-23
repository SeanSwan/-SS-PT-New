/**
 * ============================================================================
 * FILE: SupportReportComposer.sharedSchema.test.tsx
 * PURPOSE: Prove the Report Room form validates against the SAME contract the
 *          API enforces — not a hand-written copy of it.
 *
 * WHY (SWA-225 EX-5): this form used to re-declare four rules that
 * routes/supportIssueRoutes.mjs already owned (title ≥ 4, description ≥ 10,
 * ≤ 12 steps, ≤ 500 chars per step). Two copies of one contract kept in step by
 * memory alone. Now both import @swan/schemas.
 *
 * THE CONTROL THAT MAKES THIS SUITE MEAN SOMETHING — run it, watch it fail:
 *   loosen ONE rule in packages/swan-schemas/supportIssue.mjs (e.g. change
 *   `title: z.string().trim().min(4)` to `.min(1)`), then run BOTH:
 *     frontend: npx vitest run src/pages/support/SupportReportComposer.sharedSchema.test.tsx
 *     backend:  npx vitest run tests/unit/supportIssueIdempotencyContract.test.mjs
 *   Each must fail. If only one does, the ends are not actually shared and this
 *   slice did not do its job. Restore the rule afterwards.
 * ============================================================================
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { supportIssueCreateSchema, supportIssueComposerSchema } from '@swan/schemas';
import SupportReportComposer from './SupportReportComposer';

const makeClient = () => ({
  createIssue: vi.fn().mockResolvedValue({ id: 1, publicId: 'SI-1', status: 'new' }),
});

// Address fields by their exact ids, not by loose label regex: "what happened"
// also appears in the field's own help text, so a regex matched two nodes.
const fill = (id: string, value: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`field #${id} not found`);
  fireEvent.change(el, { target: { value } });
};
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

describe('SupportReportComposer — one contract, both ends', () => {
  it('derives its rules from the shared schema, not from local copies', () => {
    // If these ever diverge the form is validating something the API does not.
    expect(supportIssueComposerSchema.shape.title.safeParse('abc').success).toBe(false);
    expect(supportIssueComposerSchema.shape.title.safeParse('abcd').success).toBe(true);
    expect(supportIssueComposerSchema.shape.description.safeParse('123456789').success).toBe(false);
    expect(supportIssueComposerSchema.shape.description.safeParse('1234567890').success).toBe(true);
    // The composer subset must be a strict subset of what the API accepts —
    // never a field the server does not know.
    const apiKeys = Object.keys(supportIssueCreateSchema.shape);
    for (const key of Object.keys(supportIssueComposerSchema.shape)) {
      expect(apiKeys).toContain(key);
    }
  });

  it('blocks submit and shows the shared rule when the title is too short', async () => {
    const client = makeClient();
    render(<SupportReportComposer client={client} onSubmitted={vi.fn()} />);

    fill('support-title', 'abc');                       // 3 chars — under the shared min(4)
    fill('support-description', 'This is definitely more than ten characters long.');
    send();

    expect(await screen.findByText(/at least 4 characters/i)).toBeInTheDocument();
    // The decisive assertion: nothing reached the API.
    await waitFor(() => expect(client.createIssue).not.toHaveBeenCalled());
  });

  it('blocks submit when the description is too short', async () => {
    const client = makeClient();
    render(<SupportReportComposer client={client} onSubmitted={vi.fn()} />);

    fill('support-title', 'A valid title');
    fill('support-description', 'too short');          // 9 chars — under min(10)
    send();

    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();
    await waitFor(() => expect(client.createIssue).not.toHaveBeenCalled());
  });

  it('submits a body the shared API schema accepts', async () => {
    const client = makeClient();
    render(<SupportReportComposer client={client} onSubmitted={vi.fn()} />);

    fill('support-title', 'Checkout button does nothing');
    fill('support-description', 'I pressed the checkout button and the page did not respond at all.');
    send();

    await waitFor(() => expect(client.createIssue).toHaveBeenCalledTimes(1));
    // Parse the ACTUAL outgoing body with the ACTUAL server schema: if the form
    // can build a payload the API would reject, that is the drift this slice
    // exists to prevent, and it fails here instead of in production.
    const body = client.createIssue.mock.calls[0][0];
    const parsed = supportIssueCreateSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 2)).toBe(true);
  });
});
