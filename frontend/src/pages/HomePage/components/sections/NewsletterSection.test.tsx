/**
 * NewsletterSection + FooterNewsletter (Tier 1.2) — behavior tests.
 * Verifies the shared subscribe path: valid email POSTs to the live endpoint
 * with the right source, invalid email is rejected client-side (no POST),
 * API failure surfaces an error. axios is mocked — no real network.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import NewsletterSection from './NewsletterSection';
import FooterNewsletter from '../../../../components/Footer/FooterNewsletter';

vi.mock('axios');

describe('NewsletterSection (Tier 1.2 homepage)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POSTs a valid subscription to /api/newsletter/subscribe with source=homepage and shows the confirm message', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true, message: 'Almost there — check your email to confirm your subscription.' } });
    render(<NewsletterSection tier="essential" />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const [url, body] = (axios.post as any).mock.calls[0];
    expect(url).toContain('/api/newsletter/subscribe');
    expect(body).toMatchObject({ email: 'jane@example.com', source: 'homepage' });
    await screen.findByText(/check your email to confirm/i);
  });

  it('rejects an invalid email client-side without POSTing', async () => {
    render(<NewsletterSection tier="essential" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    await screen.findByRole('alert');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('surfaces an error if the API call fails', async () => {
    (axios.post as any).mockRejectedValue({ response: { data: { message: 'Could not subscribe right now. Please try again.' } } });
    render(<NewsletterSection tier="essential" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    await screen.findByRole('alert');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});

describe('FooterNewsletter (Tier 1.2 footer)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POSTs with source=footer and shows confirmation', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true, message: 'Almost there — check your email to confirm your subscription.' } });
    render(<FooterNewsletter />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bob@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe to newsletter/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const [, body] = (axios.post as any).mock.calls[0];
    expect(body).toMatchObject({ email: 'bob@example.com', source: 'footer' });
    await screen.findByText(/check your email to confirm/i);
  });
});
