import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GamificationRealtimeBridge from './GamificationRealtimeBridge';

const useGamificationRealtime = vi.hoisted(() => vi.fn(() => ({ isConnected: false })));

vi.mock('../../hooks/gamification/useGamificationRealtime', () => ({
  useGamificationRealtime,
}));

describe('GamificationRealtimeBridge', () => {
  it('mounts the realtime hook once and contributes no DOM shell', () => {
    const { container } = render(<GamificationRealtimeBridge />);

    expect(useGamificationRealtime).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });
});
