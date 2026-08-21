/**
 * aiCommandRouteFallbackSource.test.mjs
 * =====================================
 * Source guard for command-lane fallback into Swan Coach chat/proposals.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTE_SOURCE = readFileSync(resolve(__dirname, '../../routes/aiCommandRoutes.mjs'), 'utf8');

describe('aiCommandRoutes not-wired fallback source guard', () => {
  it('routes selected not-wired commands back to chat instead of dead-ending', () => {
    expect(ROUTE_SOURCE).toMatch(/shouldFallbackNotWiredCommandToChat/);
    expect(ROUTE_SOURCE).toMatch(/ctx\.result\?\.type === 'not_wired'/);
    expect(ROUTE_SOURCE).toMatch(/fallbackToChat:\s*true/);
  });

  it('keeps route-level command failures off raw exception messages and stacks', () => {
    expect(ROUTE_SOURCE).toContain('const logAICommandRouteError =');
    expect(ROUTE_SOURCE).not.toContain('error: err.message');
    expect(ROUTE_SOURCE).not.toContain('stack: err.stack');
  });
});

describe('aiCommandRoutes unhandled-utterance wiring source guard (F1)', () => {
  it('records the chat/clarification fallthrough instead of discarding it', () => {
    // The fallthrough branch must call recordUnhandledUtterance BEFORE returning.
    const branch = ROUTE_SOURCE.split("ctx.intent?.intent === 'chat' || ctx.intent?.intent === 'clarification_needed'")[1] ?? '';
    expect(branch.slice(0, 600)).toContain('recordUnhandledUtterance');
  });

  it('records UNKNOWN_INTENT with the phantom intent name', () => {
    expect(ROUTE_SOURCE).toContain("=== 'UNKNOWN_INTENT'");
    expect(ROUTE_SOURCE).toContain('phantomIntent');
  });

  it('feeds the SANITIZED message, never the raw request body text', () => {
    // Identity redaction runs before the pipeline; the recorder must use its output.
    expect(ROUTE_SOURCE).toContain('input: promptInputs.message');
    expect(ROUTE_SOURCE).not.toContain('input: message');
  });

  it('gates the unhandled report behind the admin role like /metrics/summary', () => {
    const idx = ROUTE_SOURCE.indexOf("'/metrics/unhandled'");
    expect(idx).toBeGreaterThan(-1);
    expect(ROUTE_SOURCE.slice(idx, idx + 300)).toContain("req.user?.role !== 'admin'");
  });
});
