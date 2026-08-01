/**
 * useJarvisVoiceLoop.test.ts — S9 state-ladder fence.
 * Locks: exact state set; ≥2 clarify questions IMPOSSIBLE; timeout →
 * best-effort + needsReview; barge-in from speaking; Type-instead legal
 * from every state.
 */
import { describe, expect, it } from 'vitest';
import {
  jarvisLoopReducer, INITIAL_JARVIS_STATE, type JarvisLoopState,
} from './useJarvisVoiceLoop';

const run = (events: Parameters<typeof jarvisLoopReducer>[1][]) =>
  events.reduce(jarvisLoopReducer, INITIAL_JARVIS_STATE);

const toReview = () => run([
  { type: 'LISTEN' }, { type: 'CAPTURED' },
  { type: 'TRANSCRIBED', transcript: 'bench 3x8 185' }, { type: 'DECODED' },
]);

describe('S9 jarvis loop reducer', () => {
  it('walks the honest ladder: idle→listening→transcribing→decoding→review', () => {
    expect(toReview().state).toBe('review');
    expect(toReview().transcript).toBe('bench 3x8 185');
  });

  it('clarify is a sub-state of review and a SECOND question is impossible', () => {
    let s = toReview();
    s = jarvisLoopReducer(s, { type: 'CLARIFY_ASK', question: 'Which bench?' });
    expect(s.state).toBe('clarifying');
    s = jarvisLoopReducer(s, { type: 'CLARIFY_ANSWERED' });
    expect(s.state).toBe('review');
    const second = jarvisLoopReducer(s, { type: 'CLARIFY_ASK', question: 'And which grip?' });
    expect(second.state).toBe('review'); // refused — one question max, ever
    expect(second.clarifyQuestion).toBeNull();
  });

  it('clarify cannot fire outside review', () => {
    const s = jarvisLoopReducer(INITIAL_JARVIS_STATE, { type: 'CLARIFY_ASK', question: 'x' });
    expect(s.state).toBe('idle');
  });

  it('3s no-answer resumes best-effort with needsReview flagged', () => {
    let s = toReview();
    s = jarvisLoopReducer(s, { type: 'CLARIFY_ASK', question: 'Which bench?' });
    s = jarvisLoopReducer(s, { type: 'CLARIFY_TIMEOUT' });
    expect(s.state).toBe('review');
    expect(s.needsReview).toBe(true);
  });

  it('barge-in: LISTEN is legal from speaking', () => {
    let s = toReview();
    s = jarvisLoopReducer(s, { type: 'SPEAK' });
    expect(s.state).toBe('speaking');
    s = jarvisLoopReducer(s, { type: 'LISTEN' });
    expect(s.state).toBe('listening');
  });

  it('Type instead exits to idle from EVERY state', () => {
    const states: JarvisLoopState[] = [
      INITIAL_JARVIS_STATE,
      run([{ type: 'LISTEN' }]),
      run([{ type: 'LISTEN' }, { type: 'CAPTURED' }]),
      toReview(),
      jarvisLoopReducer(toReview(), { type: 'CLARIFY_ASK', question: 'q' }),
      jarvisLoopReducer(toReview(), { type: 'SPEAK' }),
      jarvisLoopReducer(INITIAL_JARVIS_STATE, { type: 'FAIL', message: 'x' }),
    ];
    for (const s of states) {
      expect(jarvisLoopReducer(s, { type: 'EXIT_TO_TYPING' }).state).toBe('idle');
    }
  });
});
