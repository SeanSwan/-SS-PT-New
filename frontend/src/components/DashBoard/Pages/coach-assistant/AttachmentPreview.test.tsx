/**
 * AttachmentPreview — CLS-reduction behavior test
 * ================================================
 * Phase 11.1 hotfix 2026-04-14: AttachmentPreview previously returned
 * `null` when the files array was empty, causing a ~44px preview bar
 * to pop into the composer area and push the message list up every
 * time the user attached a file in the transcript intake flow. The
 * new implementation always renders the PreviewBar with a
 * $hasFiles-driven min-height + padding, so the layout slot is always
 * present; only its content size changes on user interaction (which
 * the Web Vitals layout-shift API excludes via hadRecentInput).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AttachmentPreview from './AttachmentPreview';
import type { AttachedFile } from './hooks/useFileAttachment';

function makeFile(name: string, mime: string, size = 1024): AttachedFile {
  return {
    id: `${Date.now()}-${Math.random()}`,
    file: new File([new Uint8Array(1)], name, { type: mime }),
    name,
    size,
    type: mime,
    previewUrl: null,
  };
}

describe('AttachmentPreview — CLS stability', () => {
  it('KEEPS the preview bar in the tree when files is empty (no null return)', () => {
    // Core CLS fix. If this test fails, AttachmentPreview has regressed
    // to the `if (files.length === 0) return null` pattern.
    render(<AttachmentPreview files={[]} onRemove={vi.fn()} />);
    const bar = screen.getByTestId('attachment-preview-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks the preview bar visible when files are present', () => {
    render(
      <AttachmentPreview
        files={[makeFile('voice.mp3', 'audio/mpeg')]}
        onRemove={vi.fn()}
      />,
    );
    const bar = screen.getByTestId('attachment-preview-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.getAttribute('aria-hidden')).toBe('false');
  });

  it('renders one FileChip per file', () => {
    render(
      <AttachmentPreview
        files={[
          makeFile('one.mp3', 'audio/mpeg'),
          makeFile('two.txt', 'text/plain'),
          makeFile('three.pdf', 'application/pdf'),
        ]}
        onRemove={vi.fn()}
      />,
    );
    // The remove buttons are the only <button> elements in the preview
    const removeBtns = screen.getAllByRole('button');
    expect(removeBtns.length).toBe(3);
  });

  it('uses neutral attachment labels instead of raw local filenames', () => {
    const privateFile = makeFile('Marcus-private@example.com.mp3', 'audio/mpeg');
    const { container } = render(
      <AttachmentPreview files={[privateFile]} onRemove={vi.fn()} />,
    );

    expect(screen.getByText('Audio item 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove audio item 1/i })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Marcus-private@example.com');
    expect(container.innerHTML).not.toContain('private@example.com');
  });

  it('calls onRemove when a chip Remove button is clicked', () => {
    const onRemove = vi.fn();
    const file = makeFile('voice.mp3', 'audio/mpeg');
    render(<AttachmentPreview files={[file]} onRemove={onRemove} />);
    const removeBtn = screen.getByRole('button', { name: /Remove audio item 1/i });
    removeBtn.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(file.id);
  });
});
