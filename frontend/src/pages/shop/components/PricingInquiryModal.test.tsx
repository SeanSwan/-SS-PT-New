import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PricingInquiryModal from './PricingInquiryModal';
import api from '../../../services/api.service';

vi.mock('../../../services/api.service', () => ({
  default: { post: vi.fn(() => Promise.resolve({ data: { success: true } })) },
}));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

const fixedPackage: any = {
  id: 42,
  name: 'Silver Swan Elite',
  description: 'Test package',
  packageType: 'fixed',
  sessions: 10,
  displayPrice: 1650,
  pricePerSession: 165,
  imageUrl: null,
  theme: 'cosmic',
};

const submitForm = () => {
  const form = document.querySelector('form');
  if (!form) throw new Error('inquiry form not found');
  fireEvent.submit(form);
};

describe('PricingInquiryModal', () => {
  beforeEach(() => post.mockClear());

  it('shows the package tier being inquired about', () => {
    render(<PricingInquiryModal package={fixedPackage} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ask about Silver Swan Elite/i)).toBeInTheDocument();
    expect(screen.getByText(/10 sessions/i)).toBeInTheDocument();
  });

  it('prefills name and email when provided', () => {
    render(
      <PricingInquiryModal
        package={fixedPackage}
        prefillName="Jane Client"
        prefillEmail="jane@example.test"
        onClose={vi.fn()}
      />
    );
    expect((screen.getByLabelText(/^name/i) as HTMLInputElement).value).toBe('Jane Client');
    expect((screen.getByLabelText(/^email/i) as HTMLInputElement).value).toBe('jane@example.test');
  });

  it('posts to /api/contact with the tier + package id and shows success', async () => {
    const onClose = vi.fn();
    render(<PricingInquiryModal package={fixedPackage} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Jane Client' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jane@example.test' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-0101' } });
    submitForm();

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, payload] = post.mock.calls[0];
    expect(url).toBe('/api/contact');
    expect(payload).toMatchObject({
      name: 'Jane Client',
      email: 'jane@example.test',
      consultationType: 'Silver Swan Elite',
      priority: 'high',
    });
    // message must identify which tier + the package id for the admin
    expect(payload.message).toContain('Silver Swan Elite');
    expect(payload.message).toContain('[package id: 42]');
    expect(payload.message).toContain('555-0101');

    expect(await screen.findByText(/request sent/i)).toBeInTheDocument();
  });

  it('rejects an invalid email and does not call the API', async () => {
    render(<PricingInquiryModal package={fixedPackage} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'not-an-email' } });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
    expect(post).not.toHaveBeenCalled();
  });

  it('requires a name before submitting', async () => {
    render(<PricingInquiryModal package={fixedPackage} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jane@example.test' } });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter your name/i);
    expect(post).not.toHaveBeenCalled();
  });

  it('closes on Escape and via the close button', () => {
    const onClose = vi.fn();
    const { rerender } = render(<PricingInquiryModal package={fixedPackage} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<PricingInquiryModal package={fixedPackage} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close pricing inquiry/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
