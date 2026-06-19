/**
 * VideoOptimizerPanel.test.tsx
 * Locks the UI state machine. The ffmpeg.wasm transcode (videoCompressor) is
 * mocked — these tests prove validation, preset selection, the compress call
 * contract, progress, result/download, error, and reset, all without wasm.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoOptimizerPanel from './VideoOptimizerPanel';
import { compressVideo } from './videoCompressor';

vi.mock('./videoCompressor', () => ({
  compressVideo: vi.fn(),
  isLikelySupported: () => true,
}));

const mockCompress = vi.mocked(compressVideo);

const result = (outputBytes = 250) => ({
  blob: new Blob(['x'.repeat(outputBytes)], { type: 'video/mp4' }),
  outputBytes,
  outputName: 'squat-web-balanced.mp4',
  mimeType: 'video/mp4',
});

const videoFile = (name = 'squat.mp4', size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'video/mp4' });

function selectFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeAll(() => {
  // jsdom has no object-URL support
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
});
beforeEach(() => mockCompress.mockReset());

describe('VideoOptimizerPanel', () => {
  it('shows the dropzone hint when idle', () => {
    const { container } = render(<VideoOptimizerPanel />);
    expect(screen.getByText(/Drop a video here/i)).toBeTruthy();
    // keyboard reachability: the file input must NOT be display:none-hidden
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toHaveAttribute('hidden');
  });

  it('rejects a non-video file and never calls the compressor', () => {
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, new File(['x'], 'note.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert').textContent).toMatch(/video/i);
    expect(mockCompress).not.toHaveBeenCalled();
  });

  it('accepts a video and shows the name, estimate and enabled Optimize button', () => {
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    expect(screen.getByText('squat.mp4')).toBeTruthy();
    expect(screen.getByText(/Estimated output/i)).toBeTruthy();
    const btn = screen.getByRole('button', { name: /optimize for web/i });
    expect(btn).not.toBeDisabled();
  });

  it('switches the active preset (aria-checked)', () => {
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    // anchor on the label: "Balanced" blurb also contains "smaller"
    const small = screen.getByRole('radio', { name: /^Small/i });
    fireEvent.click(small);
    expect(small).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Balanced/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('compresses with the chosen preset and shows savings + a download link', async () => {
    mockCompress.mockResolvedValueOnce(result(250));
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    fireEvent.click(screen.getByRole('radio', { name: /^Small/i }));
    fireEvent.click(screen.getByRole('button', { name: /optimize for web/i }));

    expect(await screen.findByText(/75% smaller/)).toBeTruthy();
    expect(mockCompress).toHaveBeenCalledWith(expect.any(File), 'small', expect.objectContaining({ onProgress: expect.any(Function) }));

    const dl = screen.getByRole('link', { name: /download optimized copy/i });
    expect(dl).toHaveAttribute('download', 'squat-web-balanced.mp4');
    expect(dl).toHaveAttribute('href', 'blob:mock');
  });

  it('shows a progress label while compressing', async () => {
    let resolveCompress!: (r: ReturnType<typeof result>) => void;
    const pending = new Promise<ReturnType<typeof result>>((res) => { resolveCompress = res; });
    mockCompress.mockReturnValueOnce(pending);
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    fireEvent.click(screen.getByRole('button', { name: /optimize for web/i }));
    expect(await screen.findByRole('button', { name: /optimizing/i })).toBeTruthy();
    resolveCompress(result(250));
    await screen.findByText(/75% smaller/);
  });

  it('surfaces a compression error', async () => {
    mockCompress.mockRejectedValueOnce(new Error('engine boom'));
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    fireEvent.click(screen.getByRole('button', { name: /optimize for web/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/engine boom/i);
  });

  it('resets back to idle with "Optimize another"', async () => {
    mockCompress.mockResolvedValueOnce(result(250));
    const { container } = render(<VideoOptimizerPanel />);
    selectFile(container, videoFile());
    fireEvent.click(screen.getByRole('button', { name: /optimize for web/i }));
    await screen.findByText(/75% smaller/);
    fireEvent.click(screen.getByRole('button', { name: /optimize another/i }));
    await waitFor(() => expect(screen.getByText(/Drop a video here/i)).toBeTruthy());
  });
});
