import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    table: vi.fn(),
  },
}));

import { logger } from './logger';
import { enhanceBrowserNavigation } from './spaRoutingFix';

describe('spaRoutingFix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/dashboard/admin');
  });

  it('routes SPA navigation diagnostics through the shared logger instead of console.log', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    enhanceBrowserNavigation();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(logger.log).toHaveBeenCalledWith('SPA Routing: Handling browser navigation');
    expect(logger.log).toHaveBeenCalledWith(
      'SPA Routing: Restoring route after browser navigation:',
      '/dashboard/admin'
    );
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
