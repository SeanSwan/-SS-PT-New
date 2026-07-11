import type {
  AppearanceProfile,
  LayoutProfileId,
  MotionMode,
} from './types';

export interface AppearanceAttributes {
  'data-style-lens': string;
  'data-layout-profile': LayoutProfileId;
  'data-motion-mode': Exclude<MotionMode, 'auto'> | 'full';
  'data-density': AppearanceProfile['density'];
}

export interface ViewTransitionLike {
  finished: Promise<void>;
}

export interface TransitionCoordinatorOptions {
  root: HTMLElement;
  getViewportWidth: () => number;
  getSystemReducedMotion: () => boolean;
  getMotionEnabled: () => boolean;
  startViewTransition?: (update: () => void) => ViewTransitionLike;
}

interface TransitionRequest {
  profile: AppearanceProfile;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export const resolveLayoutProfile = (width: number): LayoutProfileId => {
  if (width < 768) return 'mobile-minimal';
  if (width < 1200) return 'tablet';
  return 'desktop-enhanced';
};

export const resolveEffectiveMotionMode = (
  requested: MotionMode,
  systemReducedMotion: boolean,
  motionEnabled: boolean,
): AppearanceAttributes['data-motion-mode'] => {
  if (!motionEnabled || requested === 'off') return 'off';
  if (systemReducedMotion || requested === 'reduced') return 'reduced';
  return 'full';
};

export const buildAppearanceAttributes = (
  profile: AppearanceProfile,
  viewportWidth: number,
  systemReducedMotion: boolean,
  motionEnabled: boolean,
): AppearanceAttributes => ({
  'data-style-lens': profile.styleLensId,
  'data-layout-profile': resolveLayoutProfile(viewportWidth),
  'data-motion-mode': resolveEffectiveMotionMode(
    profile.motionMode,
    systemReducedMotion,
    motionEnabled,
  ),
  'data-density': profile.density,
});

export const applyAppearanceAttributes = (
  root: HTMLElement,
  attributes: AppearanceAttributes,
): (() => void) => {
  const previous = new Map<string, string | null>();
  Object.entries(attributes).forEach(([name, value]) => {
    previous.set(name, root.getAttribute(name));
    root.setAttribute(name, value);
  });

  return () => {
    previous.forEach((value, name) => {
      if (value === null) root.removeAttribute(name);
      else root.setAttribute(name, value);
    });
  };
};

export const createAppearanceTransitionCoordinator = ({
  root,
  getViewportWidth,
  getSystemReducedMotion,
  getMotionEnabled,
  startViewTransition,
}: TransitionCoordinatorOptions) => {
  let active = false;
  let pending: TransitionRequest | null = null;

  const apply = (profile: AppearanceProfile) =>
    applyAppearanceAttributes(
      root,
      buildAppearanceAttributes(
        profile,
        getViewportWidth(),
        getSystemReducedMotion(),
        getMotionEnabled(),
      ),
    );

  const execute = async (profile: AppearanceProfile) => {
    const motion = resolveEffectiveMotionMode(
      profile.motionMode,
      getSystemReducedMotion(),
      getMotionEnabled(),
    );
    if (motion !== 'full' || !startViewTransition) {
      apply(profile);
      return;
    }

    try {
      const transition = startViewTransition(() => {
        apply(profile);
      });
      await transition.finished;
    } catch {
      apply(profile);
    }
  };

  const run = async (request: TransitionRequest): Promise<void> => {
    active = true;
    try {
      await execute(request.profile);
      request.resolve();
    } catch (error) {
      request.reject(error);
    } finally {
      active = false;
      if (pending) {
        const next = pending;
        pending = null;
        void run(next);
      }
    }
  };

  return Object.freeze({
    transition: (profile: AppearanceProfile): Promise<void> =>
      new Promise((resolve, reject) => {
        const request = { profile, resolve, reject };
        if (!active) {
          void run(request);
          return;
        }
        pending?.resolve();
        pending = request;
      }),
    applyImmediate: (profile: AppearanceProfile): void => void apply(profile),
  });
};
