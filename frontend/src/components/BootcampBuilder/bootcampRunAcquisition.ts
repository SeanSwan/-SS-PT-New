import type { BootcampRunnerPhase } from './BootcampRunner.logic';

interface WakeLockSentinelLike {
  release?: () => Promise<void>;
}

interface WakeLockNavigatorLike {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

type CapabilityName = 'fullscreen' | 'wake-lock' | 'audio';

export interface BootcampRunAcquisitionOptions {
  requestFullscreen?: () => Promise<unknown> | unknown;
  requestWakeLock?: () => Promise<unknown> | unknown;
  resumeAudio?: () => Promise<unknown> | unknown;
  onCapabilityError?: (capability: CapabilityName, error: unknown) => void;
}

export interface BootcampRunAcquisitionResult {
  fullscreen: boolean;
  wakeLock: boolean;
  audio: boolean;
}

let audioContext: AudioContext | null = null;
let activeWakeLock: WakeLockSentinelLike | null = null;
let wakeLockGeneration = 0;

const getAudioContext = (): AudioContext | null => {
  if (audioContext) return audioContext;
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
};

const defaultFullscreen = () => {
  if (typeof document === 'undefined') return undefined;
  // Already fullscreen: an explicit no-op SUCCESS, not a missing request.
  if (document.fullscreenElement) return Promise.resolve();
  // A browser without the Fullscreen API yields undefined — settleCapability
  // reports that as FALSE (H24: missing capability must not report success).
  return document.documentElement?.requestFullscreen?.() ?? undefined;
};

const defaultWakeLock = async () => {
  if (typeof navigator === 'undefined') return undefined;
  const wakeNavigator = navigator as Navigator & WakeLockNavigatorLike;
  if (!wakeNavigator.wakeLock?.request) return undefined;
  const generation = ++wakeLockGeneration;
  const sentinel = await wakeNavigator.wakeLock.request('screen');
  if (generation !== wakeLockGeneration) {
    await sentinel?.release?.();
    return undefined;
  }
  activeWakeLock = sentinel;
  return activeWakeLock;
};

const defaultResumeAudio = () => {
  const context = getAudioContext();
  if (!context) return undefined;
  // Already unlocked: explicit no-op SUCCESS (H24).
  if (context.state === 'running') return Promise.resolve();
  return context.resume();
};

const settleCapability = async (
  capability: CapabilityName,
  started: Promise<unknown> | unknown,
  onError: BootcampRunAcquisitionOptions['onCapabilityError'],
): Promise<boolean> => {
  // H24: an undefined starter means "no request could be made" — that is a
  // failed acquisition, never a silent success.
  if (started === undefined || started === null) return false;
  try {
    await started;
    return true;
  } catch (error) {
    onError?.(capability, error);
    return false;
  }
};

export function acquireBootcampRunSurface(
  options: BootcampRunAcquisitionOptions = {},
): Promise<BootcampRunAcquisitionResult> {
  const hasWakeOverride = Object.prototype.hasOwnProperty.call(options, 'requestWakeLock');
  const wakeNavigator = typeof navigator === 'undefined'
    ? null
    : navigator as Navigator & WakeLockNavigatorLike;
  const requestFullscreen = options.requestFullscreen ?? (
    typeof document !== 'undefined' ? defaultFullscreen : undefined
  );
  const requestWakeLock = hasWakeOverride
    ? options.requestWakeLock
    : wakeNavigator?.wakeLock?.request
      ? defaultWakeLock
      : undefined;
  const resumeAudio = options.resumeAudio ?? (
    typeof window !== 'undefined' && window.AudioContext ? defaultResumeAudio : undefined
  );

  const fullscreenStarted = requestFullscreen?.();
  const wakeLockStarted = requestWakeLock?.();
  const audioStarted = resumeAudio?.();

  return Promise.all([
    requestFullscreen
      ? settleCapability('fullscreen', fullscreenStarted, options.onCapabilityError)
      : Promise.resolve(false),
    requestWakeLock
      ? settleCapability('wake-lock', wakeLockStarted, options.onCapabilityError)
      : Promise.resolve(false),
    resumeAudio
      ? settleCapability('audio', audioStarted, options.onCapabilityError)
      : Promise.resolve(false),
  ]).then(([fullscreen, wakeLock, audio]) => ({ fullscreen, wakeLock, audio }));
}

export function playBootcampRunnerCue(phase: BootcampRunnerPhase): void {
  const context = getAudioContext();
  if (!context || context.state !== 'running' || phase === 'warmup') return;

  const frequencies: Record<Exclude<BootcampRunnerPhase, 'warmup'>, number> = {
    work: 880,
    rest: 520,
    transition: 660,
    complete: 1046,
  };
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime;
  oscillator.frequency.value = frequencies[phase];
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.16, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + 0.2);
}

export async function releaseBootcampWakeLock(): Promise<void> {
  wakeLockGeneration += 1;
  const lockToRelease = activeWakeLock;
  activeWakeLock = null;
  await lockToRelease?.release?.();
}
