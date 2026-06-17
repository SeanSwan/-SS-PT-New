/**
 * Tests for NurtureTestSendPanel — focuses on the SAFETY-critical behavior:
 * no live send fires without the explicit confirm, guard-error mapping, and
 * phone masking. The API client is mocked so nothing is actually sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NurtureTestSendPanel, { maskPhone, describeTestSendResult } from './NurtureTestSendPanel';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { get: mockGet, post: mockPost } }));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockResolvedValue({ data: { success: true, data: [{ name: 'welcome' }] } });
  mockPost.mockResolvedValue({ data: { success: true, data: { success: true } } });
});

describe('maskPhone', () => {
  it('shows only the last 4 digits, never the full number', () => {
    expect(maskPhone('+15551234567')).toBe('•••• 4567');
    expect(maskPhone('12')).toBe('••••');
    expect(maskPhone('')).toBe('••••');
  });
});

describe('describeTestSendResult', () => {
  it('maps success and guard codes to plain language', () => {
    expect(describeTestSendResult({ success: true })).toEqual({ ok: true, text: 'Test SMS sent.' });
    expect(describeTestSendResult({ success: false, error: 'not_in_test_allowlist' }).text).toMatch(/not on the server test allowlist/i);
    expect(describeTestSendResult({ success: false, error: 'invalid_phone' }).text).toMatch(/valid phone number/i);
    expect(describeTestSendResult({ success: false, message: 'boom' }).text).toBe('boom');
    expect(describeTestSendResult({ success: false }).text).toBe('Send failed.');
  });
});

describe('NurtureTestSendPanel', () => {
  it('renders the LIVE-send warning and the control', async () => {
    render(<NurtureTestSendPanel />);
    expect(screen.getByText(/sends ONE real SMS/i)).toBeTruthy();
    expect(screen.getByPlaceholderText('+15551234567')).toBeTruthy();
    expect(screen.getByRole('button', { name: /send live test sms/i })).toBeTruthy();
    // flush the async template load so the state update settles inside act()
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/sms/templates'));
  });

  it('does NOT send until the confirm dialog is accepted (safety gate)', async () => {
    render(<NurtureTestSendPanel />);
    await waitFor(() => expect(screen.queryByText(/No SMS templates available/i)).toBeNull());

    fireEvent.change(screen.getByPlaceholderText('+15551234567'), { target: { value: '+15551234567' } });
    fireEvent.click(screen.getByRole('button', { name: /send live test sms/i }));

    // confirm dialog opened, but nothing sent yet
    expect(screen.getByText(/Send a LIVE test SMS\?/i)).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();

    // accept the dialog -> now it sends, with confirm:true
    fireEvent.click(screen.getByRole('button', { name: /^send live test$/i }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/automation/test-send',
      { to: '+15551234567', templateName: 'welcome', confirm: true },
    ));
  });

  it('surfaces a guard rejection (not in allowlist) in plain language', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { data: { success: false, error: 'not_in_test_allowlist' } } } });
    render(<NurtureTestSendPanel />);
    await waitFor(() => expect(screen.queryByText(/No SMS templates available/i)).toBeNull());

    fireEvent.change(screen.getByPlaceholderText('+15551234567'), { target: { value: '+15551234567' } });
    fireEvent.click(screen.getByRole('button', { name: /send live test sms/i }));
    fireEvent.click(screen.getByRole('button', { name: /^send live test$/i }));

    await waitFor(() => expect(screen.getByText(/not on the server test allowlist/i)).toBeTruthy());
  });
});
