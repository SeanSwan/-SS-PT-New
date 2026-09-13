import React, { useImperativeHandle } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CelebrationProvider, useCelebration } from './CelebrationContext';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'account-a' } },
  play: vi.fn(),
  setMuted: vi.fn(),
  setRetroMode: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../utils/soundManager', () => ({
  default: {
    getMuted: () => false,
    getRetroMode: () => false,
    play: mocks.play,
    setMuted: mocks.setMuted,
    setRetroMode: mocks.setRetroMode,
  },
}));

type CelebrationHandle = ReturnType<typeof useCelebration>;

const CelebrationTrigger = React.forwardRef<CelebrationHandle>((_, ref) => {
  const celebration = useCelebration();
  useImperativeHandle(ref, () => celebration, [celebration]);
  return null;
});
CelebrationTrigger.displayName = 'CelebrationTrigger';

describe('CelebrationProvider lifecycle ownership', () => {
  beforeEach(() => {
    mocks.auth.user = { id: 'account-a' };
    mocks.play.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('defers a level-up takeover until an existing save modal closes', async () => {
    const handleRef = React.createRef<CelebrationHandle>();
    const Wrapper = ({ showSaveModal }: { showSaveModal: boolean }) => (
      <CelebrationProvider>
        {showSaveModal && <div aria-modal="true" data-testid="save-modal">Save workout</div>}
        <CelebrationTrigger ref={handleRef} />
      </CelebrationProvider>
    );
    const { rerender } = render(<Wrapper showSaveModal />);

    act(() => actTrigger(handleRef, 3));
    expect(screen.queryByRole('alertdialog')).toBeNull();

    rerender(<Wrapper showSaveModal={false} />);
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveTextContent('3'));
  });

  it('clears account-owned overlays after logout or account switch', () => {
    const handleRef = React.createRef<CelebrationHandle>();
    const Wrapper = () => (
      <CelebrationProvider>
        <CelebrationTrigger ref={handleRef} />
      </CelebrationProvider>
    );
    const { rerender } = render(<Wrapper />);

    act(() => actTrigger(handleRef, 2));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    mocks.auth.user = null;
    rerender(<Wrapper />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('auto-dismisses a level-up after its own timer', () => {
    vi.useFakeTimers();
    const handleRef = React.createRef<CelebrationHandle>();
    const Wrapper = () => (
      <CelebrationProvider>
        <CelebrationTrigger ref={handleRef} />
      </CelebrationProvider>
    );
    const { unmount } = render(<Wrapper />);
    act(() => actTrigger(handleRef, 2));
    act(() => vi.advanceTimersByTime(5999));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    unmount();
    vi.useRealTimers();
  });
});

function actTrigger(handleRef: React.RefObject<CelebrationHandle>, level: number) {
  if (!handleRef.current) throw new Error('celebration handle not mounted');
  handleRef.current.triggerLevelUp(level);
}
