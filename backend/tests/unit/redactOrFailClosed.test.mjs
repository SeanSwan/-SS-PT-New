/**
 * redactOrFailClosed.test.mjs — S7 fail-closed privacy fence.
 * If the redactor errors or returns nothing, NO text reaches the LLM:
 * the guard throws a 422-class REDACTION_FAILED error instead.
 */
import { describe, expect, it } from 'vitest';
import { redactOrFailClosed } from '../../services/workoutLogParserService.mjs';

describe('S7 redactOrFailClosed', () => {
  it('returns redacted text on the happy path', () => {
    const out = redactOrFailClosed('bench press three by eight, email me at a@b.com', []);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain('a@b.com');
  });

  it('fails closed with a 422-class error when the redactor cannot produce text', () => {
    // Non-string input drives the redactor into its error path.
    let thrown;
    try {
      redactOrFailClosed(undefined, []);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeTruthy();
    expect(thrown.message).toBe('REDACTION_FAILED');
    expect(thrown.statusCode).toBe(422);
  });
});
