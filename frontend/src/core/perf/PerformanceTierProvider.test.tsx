import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
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

import { logger } from '../../utils/logger';
import { PerformanceTierProvider } from './PerformanceTierProvider';

describe('PerformanceTierProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });

    Object.defineProperty(window.navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });

    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
  });

  it('routes performance tier diagnostics through the shared logger instead of console.info', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    render(
      <PerformanceTierProvider>
        <div>child</div>
      </PerformanceTierProvider>
    );

    expect(logger.log).toHaveBeenCalledWith('[PerformanceTier] Device capable -> enhanced');
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });
});
