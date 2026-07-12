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
    const { container } = render(<BookConsultCTA />);
    openModal();
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).toBeTruthy();
    expect(honeypot?.getAttribute('aria-hidden')).toBe('true');
    expect(honeypot?.getAttribute('tabindex')).toBe('-1');
  });
});
