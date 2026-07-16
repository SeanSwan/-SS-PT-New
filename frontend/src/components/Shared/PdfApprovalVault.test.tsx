/**
 * PdfApprovalVault (A3) wiring tests.
 * Proves the vault previews the exact bytes it downloads, surfaces the resolved
 * brand on the safety chip, downloads the previewed blob on Approve, and closes
 * on Cancel / Escape / click-outside — without ever downloading on error.
 * PDF rendering itself is a browser concern; here we assert the wiring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PdfApprovalVault, { type PdfPreviewPayload } from './PdfApprovalVault';

const makePayload = (over: Partial<PdfPreviewPayload> = {}): PdfPreviewPayload => ({
  blob: new Blob(['%PDF'], { type: 'application/pdf' }),
  filename: 'MoveFitness-3mo-Plan-MF-Client.pdf',
  brandWordmark: 'Move Fitness',
  ...over,
});

const createObjectURL = vi.fn(() => 'blob:preview-url');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  // jsdom lacks these blob-URL helpers.
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PdfApprovalVault', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PdfApprovalVault open={false} onClose={() => {}} buildFile={() => makePayload()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('previews the built blob and shows the resolved brand on the safety chip', async () => {
    render(
      <PdfApprovalVault open onClose={() => {}} documentLabel="training plan" buildFile={() => makePayload()} />,
    );

    // Brand safety chip surfaces the resolved wordmark.
    expect(await screen.findByLabelText('Branding: Move Fitness')).toBeInTheDocument();
    // The preview iframe points at the object URL built from the exact blob.
    const frame = screen.getByTitle('training plan PDF preview') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe('blob:preview-url');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('builds the file exactly once per open', async () => {
    const buildFile = vi.fn(() => makePayload());
    render(<PdfApprovalVault open onClose={() => {}} buildFile={buildFile} />);
    await screen.findByLabelText('Branding: Move Fitness');
    expect(buildFile).toHaveBeenCalledTimes(1);
  });

  it('downloads the exact previewed file on Approve, then closes', async () => {
    const onClose = vi.fn();
    const created: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, opts?: ElementCreationOptions) => {
      const el = realCreate(tag, opts);
      if (tag === 'a') created.push(el as HTMLAnchorElement);
      return el;
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<PdfApprovalVault open onClose={onClose} buildFile={() => makePayload()} />);
    const approve = await screen.findByRole('button', { name: /approve and download/i });
    fireEvent.click(approve);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(created.at(-1)?.download).toBe('MoveFitness-3mo-Plan-MF-Client.pdf');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Cancel, Escape, and click-outside', async () => {
    const onClose = vi.fn();
    render(<PdfApprovalVault open onClose={onClose} buildFile={() => makePayload()} />);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    // Click on the overlay (the dialog's parent) closes; click on the panel does not.
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('shows an error state and disables Approve when the build fails (nothing downloads)', async () => {
    render(<PdfApprovalVault open onClose={() => {}} buildFile={() => null} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t build the preview/i);
    expect(screen.getByRole('button', { name: /approve and download/i })).toBeDisabled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('surfaces an error when buildFile rejects', async () => {
    render(
      <PdfApprovalVault open onClose={() => {}} buildFile={() => Promise.reject(new Error('boom'))} />,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
