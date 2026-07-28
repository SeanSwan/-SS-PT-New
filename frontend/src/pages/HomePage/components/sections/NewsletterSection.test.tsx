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
    // Conversion: success state offers a booking CTA + a resend affordance
    expect(screen.getByText(/Ask about a complimentary consultation/i).getAttribute('href')).toBe('/contact?intent=consultation&utm_source=newsletter&utm_campaign=welcome');
    expect(screen.getByRole('button', { name: /resend/i })).toBeTruthy();
  });

  it('resend on the success screen re-POSTs and stays on the success screen', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true, message: 'Almost there — check your email to confirm your subscription.' } });
    render(<NewsletterSection tier="essential" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    await screen.findByText(/Ask about a complimentary consultation/i);
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Ask about a complimentary consultation/i)).toBeTruthy(); // still on success screen
  });

  it('rejects an invalid email client-side without POSTing', async () => {
    render(<NewsletterSection tier="essential" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    await screen.findByRole('alert');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('shows a warning if the subscription is saved but confirmation email delivery fails', async () => {
    (axios.post as any).mockResolvedValue({
      data: {
        success: true,
        emailDelivery: 'failed',
        message: 'Your subscription request was saved, but the confirmation email could not be sent right now.',
      },
    });
    render(<NewsletterSection tier="essential" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    await screen.findByRole('alert');
    expect(screen.getByText(/confirmation email could not be sent/i)).toBeTruthy();
    expect(screen.queryByText(/check your email to confirm/i)).toBeNull();
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

  it('shows a warning when the footer subscription is saved but confirmation email delivery fails', async () => {
    (axios.post as any).mockResolvedValue({
      data: {
        success: true,
        emailDelivery: 'failed',
        message: 'Your subscription request was saved, but the confirmation email could not be sent right now.',
      },
    });
    render(<FooterNewsletter />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bob@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe to newsletter/i }));

    await screen.findByRole('alert');
    expect(screen.getByText(/confirmation email could not be sent/i)).toBeTruthy();
    expect(screen.queryByText(/check your email to confirm/i)).toBeNull();
  });

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
