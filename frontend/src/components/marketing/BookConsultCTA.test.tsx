/**
 * BookConsultCTA — public "Book a Free Consult" button + modal form.
 * Verifies: the modal opens; email is validated client-side (no POST on invalid);
 * a valid submit POSTs the exact backend contract to /api/consult-request and shows
 * success; a server 400 surfaces its message; the honeypot field exists.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import BookConsultCTA from './BookConsultCTA';

vi.mock('axios');
const mockedPost = vi.mocked(axios.post);

const openModal = () => fireEvent.click(screen.getByRole('button', { name: /book a free consult/i }));

describe('BookConsultCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPost.mockResolvedValue({ status: 201, data: { success: true } } as never);
  });

  it('renders the trigger button and opens the modal', () => {
    render(<BookConsultCTA />);
    openModal();
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Heading (not the trigger button, which also matches the text).
    expect(screen.getByRole('heading', { name: /book a free consult/i })).toBeTruthy();
  });

  it('blocks an invalid email client-side (no request fired)', async () => {
    render(<BookConsultCTA />);
    openModal();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'notanemail' } });
    fireEvent.click(screen.getByRole('button', { name: /request my free consult/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/valid email/i);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('POSTs the backend contract to /api/consult-request and shows success', async () => {
    render(<BookConsultCTA />);
    openModal();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alex Doe' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. weekday mornings'), { target: { value: 'Mon AM' } });
    fireEvent.click(screen.getByRole('button', { name: /request my free consult/i }));

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    const [url, payload] = mockedPost.mock.calls[0];
    expect(String(url)).toContain('/api/consult-request');
    expect(payload).toMatchObject({
      name: 'Alex Doe',
      email: 'alex@example.com',
      preferredTime: 'Mon AM',
      website: '', // honeypot empty for humans
    });

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByRole('status').textContent).toMatch(/reach out to confirm/i);
  });

  it('surfaces a server 400 message', async () => {
    mockedPost.mockRejectedValue({
      response: { status: 400, data: { message: 'One or more fields are too long or malformed.' } },
    } as never);

    render(<BookConsultCTA />);
    openModal();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alex@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /request my free consult/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/too long or malformed/i);
  });

  it('includes the honeypot field (hidden from humans)', () => {
    render(<BookConsultCTA />);
    openModal();
    // The modal is portaled to <body>, so query the document — not the render container.
    const honeypot = document.querySelector('input[name="website"]');
    expect(honeypot).toBeTruthy();
    expect(honeypot?.getAttribute('aria-hidden')).toBe('true');
    expect(honeypot?.getAttribute('tabindex')).toBe('-1');
  });

  it('portals the dialog to <body> so transformed ancestors cannot clip it', () => {
    const { container } = render(
      <div style={{ transform: 'translateZ(0)', overflow: 'hidden' }}>
        <BookConsultCTA />
      </div>
    );
    openModal();
    const dialog = screen.getByRole('dialog');
    // Regression for the 2026-07-12 prod finding: dialog rendered inline under a
    // transformed ancestor, so position:fixed clipped into the contact column.
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('locks body scroll while open and restores it on close', () => {
    render(<BookConsultCTA />);
    openModal();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(document.body.style.overflow).toBe('');
  });

  it('returns focus to the trigger button when the modal closes', () => {
    render(<BookConsultCTA />);
    const trigger = screen.getByRole('button', { name: /book a free consult/i });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(document.activeElement).toBe(trigger);
  });

  it('renders the required asterisk inline with the Email label (not on its own row)', () => {
    render(<BookConsultCTA />);
    openModal();
    const star = screen.getByText('*');
    // Regression for the orphaned-asterisk finding: the star must live inside the
    // same inline wrapper as the "Email" text, not as a separate flex row.
    expect(star.parentElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Email *');
  });
});
