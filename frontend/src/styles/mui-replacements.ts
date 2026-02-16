/**
 * MUI replacement utilities for SwanStudios.
 * Keeps migration APIs compact: useSwanTheme, alpha, useMediaQuery, useClickAway.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import type { DefaultTheme } from 'styled-components';

export const BREAKPOINT_VALUES = {
  mobile: 320,
  xs: 375,
  sm: 430,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1440,
  desktop: 1920,
  qhd: 2560,
  uhd: 3840,
} as const;

export type Breakpoint = keyof typeof BREAKPOINT_VALUES;

const BREAKPOINT_ORDER: Breakpoint[] = [
  'mobile',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
  'desktop',
  'qhd',
  'uhd',
];

export interface SwanBreakpointHelpers {
  values: typeof BREAKPOINT_VALUES;
  up: (key: Breakpoint | number) => string;
  down: (key: Breakpoint | number) => string;
  between: (start: Breakpoint | number, end: Breakpoint | number) => string;
  only: (key: Breakpoint) => string;
}

export type SwanTheme = DefaultTheme & {
  breakpoints?: Record<string, unknown> & Partial<SwanBreakpointHelpers>;
};

const getBreakpointValue = (key: Breakpoint | number): number => {
  if (typeof key === 'number') {
    return key;
  }
  return BREAKPOINT_VALUES[key];
};

const stripMediaPrefix = (query: string): string =>
  query.replace(/^@media\s*/i, '').trim();

const createBreakpointHelpers = (): SwanBreakpointHelpers => ({
  values: BREAKPOINT_VALUES,
  up: (key) => `@media (min-width:${getBreakpointValue(key)}px)`,
  down: (key) => `@media (max-width:${Math.max(0, getBreakpointValue(key) - 0.05)}px)`,
  between: (start, end) =>
    `@media (min-width:${getBreakpointValue(start)}px) and (max-width:${Math.max(
      0,
      getBreakpointValue(end) - 0.05
    )}px)`,
  only: (key) => {
    const current = getBreakpointValue(key);
    const idx = BREAKPOINT_ORDER.indexOf(key);
    const nextKey = BREAKPOINT_ORDER[idx + 1];

    if (!nextKey) {
      return `@media (min-width:${current}px)`;
    }

    const next = getBreakpointValue(nextKey);
    return `@media (min-width:${current}px) and (max-width:${Math.max(0, next - 0.05)}px)`;
  },
});

/**
 * Styled-components theme hook with guaranteed MUI-like breakpoint helpers.
 */
export const useSwanTheme = (): SwanTheme & { breakpoints: SwanBreakpointHelpers } => {
  const theme = useTheme() as SwanTheme;
  const helpers = useMemo(() => createBreakpointHelpers(), []);

  return useMemo(() => {
    const existingBreakpoints = theme?.breakpoints ?? {};
    const valuesFromTheme =
      typeof existingBreakpoints.values === 'object' && existingBreakpoints.values
        ? (existingBreakpoints.values as Partial<typeof BREAKPOINT_VALUES>)
        : {};

    const mergedHelpers: SwanBreakpointHelpers = {
      ...helpers,
      values: {
        ...helpers.values,
        ...valuesFromTheme,
      },
      up: typeof existingBreakpoints.up === 'function' ? existingBreakpoints.up.bind(existingBreakpoints) : helpers.up,
      down:
        typeof existingBreakpoints.down === 'function'
          ? existingBreakpoints.down.bind(existingBreakpoints)
          : helpers.down,
      between:
        typeof existingBreakpoints.between === 'function'
          ? existingBreakpoints.between.bind(existingBreakpoints)
          : helpers.between,
      only:
        typeof existingBreakpoints.only === 'function'
          ? existingBreakpoints.only.bind(existingBreakpoints)
          : helpers.only,
    };

    return {
      ...theme,
      breakpoints: {
        ...existingBreakpoints,
        ...mergedHelpers,
      },
    };
  }, [helpers, theme]);
};

const clampOpacity = (opacity: number): number => Math.min(1, Math.max(0, opacity));

const expandShortHex = (hex: string): string =>
  hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;

/**
 * MUI-compatible alpha utility.
 */
export const alpha = (color: string, opacity: number): string => {
  const safeOpacity = clampOpacity(opacity);

  if (color.startsWith('#')) {
    const raw = color.slice(1);
    const normalized = expandShortHex(raw);

    if (normalized.length !== 6) {
      return color;
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
  }

  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      return color;
    }

    const channels = match[1].split(',').map((value) => value.trim());
    if (channels.length < 3) {
      return color;
    }

    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${safeOpacity})`;
  }

  return color;
};

export interface UseMediaQueryOptions {
  defaultMatches?: boolean;
  noSsr?: boolean;
  matchMedia?: (query: string) => MediaQueryList;
}

/**
 * MUI-like media query hook. Accepts either a query string or a callback.
 */
export const useMediaQuery = (
  queryInput: string | ((theme: SwanTheme & { breakpoints: SwanBreakpointHelpers }) => string),
  options: UseMediaQueryOptions = {}
): boolean => {
  const theme = useSwanTheme();
  const { defaultMatches = false, noSsr = false, matchMedia: customMatchMedia } = options;

  const query = useMemo(() => {
    const raw = typeof queryInput === 'function' ? queryInput(theme) : queryInput;
    return stripMediaPrefix(raw ?? '');
  }, [queryInput, theme]);

  const getMediaMatcher = () => {
    if (customMatchMedia) {
      return customMatchMedia;
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia.bind(window);
    }

    return undefined;
  };

  const [matches, setMatches] = useState<boolean>(() => {
    const matcher = getMediaMatcher();

    if (!matcher) {
      return defaultMatches;
    }

    if (noSsr && typeof window === 'undefined') {
      return defaultMatches;
    }

    return matcher(query).matches;
  });

  useEffect(() => {
    const matcher = getMediaMatcher();
    if (!matcher) {
      return undefined;
    }

    const mediaQueryList = matcher(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);
    updateMatches();

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', listener);
      return () => mediaQueryList.removeEventListener('change', listener);
    }

    mediaQueryList.addListener(listener);
    return () => mediaQueryList.removeListener(listener);
  }, [customMatchMedia, query]);

  return matches;
};

type ClickAwayEvent = MouseEvent | TouchEvent | PointerEvent;
type ClickAwayHandler = (event: ClickAwayEvent) => void;

/**
 * useClickAway(handler) returns a new ref.
 * useClickAway(ref, handler) wires an existing ref.
 */
export function useClickAway<T extends HTMLElement = HTMLElement>(
  handler: ClickAwayHandler
): React.RefObject<T>;
export function useClickAway<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  handler: ClickAwayHandler
): React.RefObject<T>;
export function useClickAway<T extends HTMLElement = HTMLElement>(
  refOrHandler: React.RefObject<T> | ClickAwayHandler,
  maybeHandler?: ClickAwayHandler
): React.RefObject<T> {
  const localRef = useRef<T>(null);
  const handler = (typeof refOrHandler === 'function' ? refOrHandler : maybeHandler) as
    | ClickAwayHandler
    | undefined;
  const targetRef = (typeof refOrHandler === 'function' ? localRef : refOrHandler) as React.RefObject<T>;

  useEffect(() => {
    if (!handler || typeof document === 'undefined') {
      return undefined;
    }

    const handleClickAway = (event: ClickAwayEvent) => {
      const node = targetRef.current;
      if (!node) {
        return;
      }
      if (!node.contains(event.target as Node)) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('touchstart', handleClickAway);
    document.addEventListener('pointerdown', handleClickAway);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('touchstart', handleClickAway);
      document.removeEventListener('pointerdown', handleClickAway);
    };
  }, [handler, targetRef]);

  return targetRef;
}

export const createBreakpointQuery = (
  breakpoint: Breakpoint | number,
  direction: 'up' | 'down' = 'up'
): string =>
  direction === 'up'
    ? `(min-width:${getBreakpointValue(breakpoint)}px)`
    : `(max-width:${Math.max(0, getBreakpointValue(breakpoint) - 0.05)}px)`;

export const useBreakpoint = {
  up: (breakpoint: Breakpoint | number): boolean => useMediaQuery(createBreakpointQuery(breakpoint, 'up')),
  down: (breakpoint: Breakpoint | number): boolean => useMediaQuery(createBreakpointQuery(breakpoint, 'down')),
};

export const themeUtils = {
  spacing: (multiplier: number): string => `${multiplier * 8}px`,
  shadow: (level = 1): string => {
    const index = Math.min(Math.max(0, level), 4);
    const shadows = [
      'none',
      '0 2px 4px rgba(0, 0, 0, 0.10)',
      '0 4px 8px rgba(0, 0, 0, 0.15)',
      '0 8px 16px rgba(0, 0, 0, 0.20)',
      '0 16px 32px rgba(0, 0, 0, 0.25)',
    ];
    return shadows[index];
  },
  glass: (opacity = 0.1): string => `
    background: ${alpha('#0a0a1a', opacity)};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid ${alpha('#00FFFF', 0.2)};
  `,
};
