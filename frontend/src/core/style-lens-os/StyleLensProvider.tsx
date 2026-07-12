/**
 * Brand-neutral appearance orchestration.
 * Preview state stays isolated; only validated commits touch the runtime root.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_APPEARANCE_PROFILE } from './constants';
import { DEFAULT_STYLE_LENS_MANIFEST } from './defaultManifest';
import {
  APPEARANCE_STORAGE_KEY,
  createAppearancePersistence,
  type StorageLike,
} from './appearancePersistence';
import {
  appearanceReducer,
  createInitialAppearanceState,
  type AppearanceState,
} from './appearanceState';
import { createAppearanceTransitionCoordinator } from './appearanceRuntime';
import { createStyleLensRegistry } from './registry';
import type {
  AppearanceProfile,
  StyleLensRegistry,
} from './types';
import { validateAppearanceProfile } from './validation';

interface StyleLensContextValue {
  state: AppearanceState;
  registry: StyleLensRegistry;
  persistenceSuppressed: boolean;
  beginPreview: (profile: AppearanceProfile) => void;
  cancelPreview: () => void;
  commitPreview: () => Promise<boolean>;
  setPersistenceSuppressed: (suppressed: boolean) => void;
}

interface StyleLensProviderProps {
  children: ReactNode;
  registry?: StyleLensRegistry;
  storage?: StorageLike;
  sourceId?: string;
  root?: HTMLElement;
}

const StyleLensContext = createContext<StyleLensContextValue | undefined>(
  undefined,
);

const memoryStorage = (): StorageLike => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
};

const defaultRegistry = createStyleLensRegistry([
  DEFAULT_STYLE_LENS_MANIFEST,
]);

export const StyleLensProvider: React.FC<StyleLensProviderProps> = ({
  children,
  registry = defaultRegistry,
  storage = typeof window === 'undefined' ? memoryStorage() : window.localStorage,
  sourceId,
  root,
}) => {
  const resolvedSourceId = useRef(
    sourceId ?? `style-lens-${Math.random().toString(36).slice(2)}`,
  );
  const persistence = useMemo(
    () =>
      createAppearancePersistence({
        storage,
        sourceId: resolvedSourceId.current,
      }),
    [storage],
  );
  const [state, dispatch] = useReducer(
    appearanceReducer,
    undefined,
    () => createInitialAppearanceState(persistence.load().profile),
  );
  const stateRef = useRef(state);
  const [persistenceSuppressed, setSuppressed] = useState(false);
  const suppressedRef = useRef(false);
  const runtimeRoot =
    root ?? (typeof document === 'undefined' ? undefined : document.documentElement);

  const coordinator = useMemo(
    () =>
      runtimeRoot
        ? createAppearanceTransitionCoordinator({
            root: runtimeRoot,
            getViewportWidth: () =>
              typeof window === 'undefined' ? 1200 : window.innerWidth,
            getSystemReducedMotion: () =>
              typeof window !== 'undefined' &&
              window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
            getMotionEnabled: () =>
              typeof document === 'undefined' ||
              document.documentElement.dataset.motion !== 'off',
            startViewTransition:
              typeof document !== 'undefined' &&
              'startViewTransition' in document
                ? (
                    document as Document & {
                      startViewTransition: (
                        update: () => void,
                      ) => { finished: Promise<void> };
                    }
                  ).startViewTransition.bind(document)
                : undefined,
          })
        : null,
    [runtimeRoot],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!coordinator) return;
    coordinator.applyImmediate(stateRef.current.committed);
  }, [coordinator]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_STORAGE_KEY) return;
      const external = persistence.readExternal(
        event.newValue,
        stateRef.current.committed,
        { suppressed: suppressedRef.current },
      );
      if (external) {
        dispatch({ type: 'EXTERNAL_PROFILE_RECEIVED', profile: external });
        void coordinator?.transition(external);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [coordinator, persistence]);

  const setPersistenceSuppressed = useCallback((suppressed: boolean) => {
    suppressedRef.current = suppressed;
    setSuppressed(suppressed);
  }, []);

  const beginPreview = useCallback((profile: AppearanceProfile) => {
    dispatch({ type: 'BEGIN_PREVIEW', profile });
  }, []);

  const cancelPreview = useCallback(() => {
    dispatch({ type: 'CANCEL_PREVIEW' });
  }, []);

  const commitPreview = useCallback(async (): Promise<boolean> => {
    const snapshot = stateRef.current;
    const target = snapshot.preview;
    if (!target || !coordinator) return false;

    dispatch({ type: 'BEGIN_COMMIT' });
    const validation = validateAppearanceProfile(target, registry);
    if (!validation.ok) {
      dispatch({
        type: 'VALIDATION_REJECTED',
        error: validation.issues.join('; '),
      });
      return false;
    }

    dispatch({ type: 'COMMIT_VALIDATED', profile: target });
    dispatch({ type: 'TRANSITION_STARTED' });
    await coordinator.transition(target);
    dispatch({ type: 'TRANSITION_COMPLETED' });

    if (
      suppressedRef.current ||
      persistence.save(target, { suppressed: false })
    ) {
      dispatch({ type: 'PERSIST_SUCCEEDED' });
      return true;
    }

    dispatch({ type: 'PERSIST_FAILED', error: 'Appearance could not be saved.' });
    await coordinator.transition(snapshot.committed);
    dispatch({ type: 'ROLLBACK_COMPLETED' });
    return false;
  }, [coordinator, persistence, registry]);

  const value = useMemo<StyleLensContextValue>(
    () => ({
      state,
      registry,
      persistenceSuppressed,
      beginPreview,
      cancelPreview,
      commitPreview,
      setPersistenceSuppressed,
    }),
    [
      beginPreview,
      cancelPreview,
      commitPreview,
      persistenceSuppressed,
      registry,
      setPersistenceSuppressed,
      state,
    ],
  );

  return (
    <StyleLensContext.Provider value={value}>
      {children}
    </StyleLensContext.Provider>
  );
};

export const useStyleLensAppearance = (): StyleLensContextValue => {
  const context = useContext(StyleLensContext);
  if (!context) {
    throw new Error('useStyleLensAppearance requires StyleLensProvider');
  }
  return context;
};

/**
 * Optional variant for surfaces that must render with or without the
 * provider (e.g. unit-tested production surfaces). Returns undefined when
 * no StyleLensProvider is mounted — callers fall back to host defaults.
 */
export const useOptionalStyleLensAppearance = (): StyleLensContextValue | undefined =>
  useContext(StyleLensContext);
