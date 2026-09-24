/**
 * ============================================================================
 * FILE: usePremiumTTS.ts
 * PURPOSE: Gemini 2.5 Flash TTS — real AI voice, not robot text reader
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * 1. Calls POST /api/ai-chat/tts with the AI response text
 * 2. Backend sends to Gemini 2.5 Flash TTS → returns WAV audio
 * 3. Frontend plays the audio — sounds like a real person
 * 4. Falls back to browser SpeechSynthesis if backend TTS unavailable
 *
 * GEMINI VOICES (warm female picks):
 * Kore — warm, confident (default)
 * Aoede — smooth, gentle
 * Leda — bright, energetic
 */

import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePaywall } from '../../../../../context/PaywallContext';
import apiService from '../../../../../services/api.service';
import {
  audienceAllowedForActor,
  freezePublicationSnapshot,
  isAllowedRawRole,
  isPublicationSnapshot,
  parseStrictPositiveId,
  samePublicationToken,
  type PublicationBinding,
  type PublicationSnapshot,
} from '../../../../../hooks/coachPublicationScope';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type GeminiVoice = 'Kore' | 'Aoede' | 'Leda' | 'Puck' | 'Fenrir' | 'Charon';

export interface VoiceOption {
  id: GeminiVoice;
  label: string;
  description: string;
}

export interface UsePremiumTTSReturn {
  enabled: boolean;
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  toggleEnabled: () => void;
  voice: GeminiVoice;
  setVoice: (v: GeminiVoice) => void;
  voiceOptions: VoiceOption[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Voice Options
// ─────────────────────────────────────────────────────────────
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', label: 'Kore', description: 'Warm & confident' },
  { id: 'Aoede', label: 'Aoede', description: 'Smooth & gentle' },
  { id: 'Leda', label: 'Leda', description: 'Bright & energetic' },
  { id: 'Puck', label: 'Puck', description: 'Playful & youthful' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Deep & authoritative' },
  { id: 'Charon', label: 'Charon', description: 'Calm & measured' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Markdown Stripping (clean text for speech)
// ─────────────────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '. Code block omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*] /g, ', ')
    .replace(/\|[^|]+\|/g, ' ')  // Strip table rows
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
// The existing speech endpoint also admits authenticated raw users. Preserve
// that identity only for unbound speech; never alias it to client/staff authority.
const isSpeechActorRole = (role: unknown): role is 'admin' | 'trainer' | 'client' | 'user' =>
  isAllowedRawRole(role) || role === 'user';

type TtsOperation = {
  scope: object;
  token: PublicationSnapshot;
  controller: AbortController;
  phase: 'remote' | 'play' | 'browser';
  audio: HTMLAudioElement | null;
  url: string | null;
};

function readPublicationSnapshot(binding?: PublicationBinding): PublicationSnapshot | null {
  if (!binding) return null;
  try {
    const value = binding.getSnapshot();
    return isPublicationSnapshot(value) ? freezePublicationSnapshot(value) : null;
  } catch { return null; }
}

async function readPaywallData(value: unknown): Promise<Record<string, unknown>> {
  if (value instanceof Blob) {
    // Only bounded JSON errors are decoded; audio/HTML and large bodies stay opaque.
    if (value.size > 32768 || !/^application\/(?:[\w.-]+\+)?json(?:;|$)/i.test(value.type)) return {};
    try { value = JSON.parse(await value.text()); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function usePremiumTTS(binding?: PublicationBinding): UsePremiumTTSReturn {
  const auth = useAuth();
  const { showPaywall } = usePaywall();
  const [enabled, setEnabled] = useState(false);
  const [voice, setVoiceState] = useState<GeminiVoice>('Kore');
  const [speaking, setSpeaking] = useState(false);
  const actorId = parseStrictPositiveId(auth.user?.id) ?? null;
  const rawRole = typeof auth.user?.role === 'string' ? auth.user.role : null;
  const authenticated = Boolean(auth.isAuthenticated && auth.user && !auth.loading);
  const observed = readPublicationSnapshot(binding);
  const renderScope = useMemo(() => Object.freeze({}), [
    actorId, rawRole, authenticated, enabled, voice, Boolean(binding), observed?.actorId,
    observed?.rawRole, observed?.audienceRole, observed?.generation, observed?.targetUserId,
    observed?.threadId, observed?.enabled,
  ]);
  const [busyScope, setBusyScope] = useState(renderScope);
  const committedScope = useRef(renderScope);
  const actualAuth = useRef({ actorId, rawRole, authenticated });
  const enabledIntent = useRef(enabled);
  const bindingRef = useRef(binding);
  const mounted = useRef(true);
  const generation = useRef(1);
  const active = useRef<TtsOperation | null>(null);

  const clearAudio = useCallback((operation: TtsOperation) => {
    const audio = operation.audio;
    operation.audio = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    }
    const url = operation.url;
    operation.url = null;
    if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }, []);

  const retire = useCallback(() => {
    const operation = active.current;
    if (!operation) return;
    active.current = null;
    operation.controller.abort();
    clearAudio(operation);
    if (operation.phase === 'browser' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (mounted.current && active.current === null) setSpeaking(false);
  }, [clearAudio]);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; retire(); };
  }, [retire]);
  useLayoutEffect(() => {
    actualAuth.current = { actorId, rawRole, authenticated };
    bindingRef.current = binding;
    enabledIntent.current = enabled;
    if (committedScope.current !== renderScope) {
      committedScope.current = renderScope;
      generation.current += 1;
      retire();
    }
  });
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') retire(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [retire]);

  const isCurrent = useCallback((operation: TtsOperation): boolean => {
    const identity = actualAuth.current;
    if (!mounted.current || !enabledIntent.current || document.visibilityState === 'hidden'
      || active.current !== operation || operation.controller.signal.aborted
      || operation.scope !== committedScope.current || !identity.authenticated
      || operation.token.actorId !== identity.actorId || operation.token.rawRole !== identity.rawRole) return false;
    if (!bindingRef.current) return operation.token.generation === generation.current;
    const live = readPublicationSnapshot(bindingRef.current);
    return Boolean(live?.enabled && samePublicationToken(live, operation.token));
  }, []);

  const capture = useCallback((): PublicationSnapshot | null => {
    const identity = actualAuth.current;
    if (!mounted.current || committedScope.current !== renderScope || !enabledIntent.current
      || document.visibilityState === 'hidden' || !identity.authenticated
      || identity.actorId === null || !isSpeechActorRole(identity.rawRole)) return null;
    if (bindingRef.current) {
      const live = readPublicationSnapshot(bindingRef.current);
      return live?.enabled && samePublicationToken(live, observed)
        && live.actorId === identity.actorId && live.rawRole === identity.rawRole
        && audienceAllowedForActor(identity.rawRole, live.audienceRole) ? live : null;
    }
    return freezePublicationSnapshot({ actorId: identity.actorId, rawRole: identity.rawRole,
      audienceRole: identity.rawRole, generation: generation.current, targetUserId: null, threadId: null, enabled: true });
  }, [renderScope, observed]);

  const finish = useCallback((operation: TtsOperation) => {
    if (!isCurrent(operation)) return;
    clearAudio(operation);
    if (active.current !== operation) return;
    active.current = null;
    setSpeaking(false);
  }, [clearAudio, isCurrent]);

  const speakWithBrowser = useCallback((text: string, operation: TtsOperation) => {
    if (!isCurrent(operation)) return;
    if (!('speechSynthesis' in window)) { finish(operation); return; }
    try {
      operation.phase = 'browser';
      window.speechSynthesis.cancel();
      if (!isCurrent(operation)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.15;
      utterance.volume = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && ['female', 'zira', 'aria', 'jenny'].some(name => v.name.toLowerCase().includes(name)));
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => finish(operation);
      utterance.onerror = () => finish(operation);
      if (!isCurrent(operation)) return;
      window.speechSynthesis.speak(utterance);
    } catch { finish(operation); }
  }, [finish, isCurrent]);

  const speakWithGemini = useCallback(async (text: string, selectedVoice: GeminiVoice, operation: TtsOperation) => {
    try {
      if (!isCurrent(operation)) return;
      const response = await apiService.post<Blob>('/api/ai-chat/tts', { text, voice: selectedVoice },
        { responseType: 'blob', signal: operation.controller.signal, _isBackgroundRequest: true } as never);
      if (!isCurrent(operation)) return;
      operation.url = URL.createObjectURL(response.data);
      if (!isCurrent(operation)) { clearAudio(operation); return; }
      const audio = new Audio(operation.url);
      operation.audio = audio;
      if (!isCurrent(operation)) { clearAudio(operation); return; }
      audio.onended = () => finish(operation);
      audio.onerror = () => finish(operation);
      operation.phase = 'play';
      try { await audio.play(); }
      catch {
        if (!isCurrent(operation)) return;
        clearAudio(operation);
        speakWithBrowser(text, operation);
      }
    } catch (error) {
      if (!isCurrent(operation)) return;
      const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
      if (response?.status === 402) {
        const data = await readPaywallData(response.data);
        if (!isCurrent(operation)) return;
        showPaywall('Swan Coach', data);
      }
      if (!isCurrent(operation)) return;
      clearAudio(operation);
      speakWithBrowser(text, operation);
    }
  }, [clearAudio, finish, isCurrent, showPaywall, speakWithBrowser]);

  const speak = useCallback((text: string) => {
    if (!enabled || typeof text !== 'string') return;
    const token = capture();
    if (!token) return;
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;
    retire();
    const operation: TtsOperation = { scope: renderScope, token, controller: new AbortController(), phase: 'remote', audio: null, url: null };
    active.current = operation;
    setBusyScope(renderScope);
    setSpeaking(true);
    void speakWithGemini(cleaned, voice, operation);
  }, [capture, enabled, renderScope, retire, speakWithGemini, voice]);

  const stop = useCallback(() => {
    if (mounted.current && committedScope.current === renderScope) retire();
  }, [renderScope, retire]);
  const toggleEnabled = useCallback(() => {
    if (!mounted.current || committedScope.current !== renderScope) return;
    enabledIntent.current = !enabledIntent.current;
    if (!enabledIntent.current) retire();
    setEnabled(enabledIntent.current);
  }, [renderScope, retire]);
  const setVoice = useCallback((next: GeminiVoice) => {
    if (!mounted.current || committedScope.current !== renderScope || !VOICE_OPTIONS.some(option => option.id === next)) return;
    setVoiceState(next);
  }, [renderScope]);

  const visible = authenticated && actorId !== null && isSpeechActorRole(rawRole)
    && (!binding || (observed?.enabled && observed.actorId === actorId && observed.rawRole === rawRole
      && audienceAllowedForActor(rawRole, observed.audienceRole)));
  return { enabled, supported: true, speaking: Boolean(visible && enabled && busyScope === renderScope && speaking),
    speak, stop, toggleEnabled, voice, setVoice, voiceOptions: VOICE_OPTIONS };
}
