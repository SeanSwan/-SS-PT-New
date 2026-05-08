import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaudClipQueue } from './PlaudClipQueue';

const clips = [
  {
    clipId: '11111111-1111-1111-1111-111111111111',
    filename: 'rec1.mp3',
    mimetype: 'audio/mpeg',
    size: 1024,
    durationSec: 45,
    status: 'pending_merge',
    uploadedAt: '2026-05-04',
    expiresAt: '2026-05-05',
  },
  {
    clipId: '22222222-2222-2222-2222-222222222222',
    filename: 'rec2.mp3',
    mimetype: 'audio/mpeg',
    size: 2048,
    durationSec: 60,
    status: 'pending_merge',
    uploadedAt: '2026-05-04',
    expiresAt: '2026-05-05',
  },
];

describe('PlaudClipQueue render contract', () => {
  it('renders empty state when no clips', () => {
    render(<PlaudClipQueue clips={[]} selectedIds={new Set()} onToggleSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText(/No clips uploaded yet/i)).toBeTruthy();
  });

  it('renders deterministic clip labels instead of raw filenames', () => {
    render(<PlaudClipQueue clips={clips} selectedIds={new Set()} onToggleSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('Audio clip 1')).toBeTruthy();
    expect(screen.getByText('Audio clip 2')).toBeTruthy();
    expect(screen.queryByText('rec1.mp3')).toBeNull();
    expect(screen.queryByText('rec2.mp3')).toBeNull();
  });

  it('does not render arbitrary clip filenames in the queue surface', () => {
    const privateClips = [{
      ...clips[0],
      filename: 'Marcus-private@example.com.mp3',
    }];

    const { container } = render(
      <PlaudClipQueue clips={privateClips} selectedIds={new Set()} onToggleSelect={() => {}} onDelete={() => {}} />,
    );

    expect(screen.getByText('Audio clip 1')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /select audio clip 1/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /delete audio clip 1/i })).toBeTruthy();
    expect(container.innerHTML).not.toContain('private@example.com');
    expect(container.innerHTML).not.toContain('Marcus');
  });

  it('renders aria-checked=true for selected clips', () => {
    render(
      <PlaudClipQueue
        clips={[clips[0]]}
        selectedIds={new Set(['11111111-1111-1111-1111-111111111111'])}
        onToggleSelect={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
  });

  it('shows the selected chronological merge order', () => {
    const chronologicalClips = [
      {
        ...clips[1],
        filename: 'late.mp3',
        uploadedAt: '2026-05-04T11:30:00.000Z',
      },
      {
        ...clips[0],
        filename: 'early.mp3',
        uploadedAt: '2026-05-04T11:00:00.000Z',
      },
    ];

    render(
      <PlaudClipQueue
        clips={chronologicalClips}
        selectedIds={new Set(chronologicalClips.map((c) => c.clipId))}
        onToggleSelect={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByText('Merge step 1')).toBeTruthy();
    expect(screen.getByText('Merge step 2')).toBeTruthy();
  });
});
