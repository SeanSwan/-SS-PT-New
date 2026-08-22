/**
 * aiCommandGuards.test.mjs
 * ========================
 * Slice F1 — command-lane middleware:
 *   - lane kill switch 503s when AI_COMMANDS_ENABLED=false, passes by default
 *   - per-user rate limiter (env-configurable) 429s over the limit
 *   - route wiring regression: /execute and /confirm carry both guards
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aiCommandLaneKillSwitch,
  aiCommandRateLimiter,
  resetCommandRateLimiter,
} from '../../middleware/aiCommandGuards.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENV_KEYS = ['AI_COMMANDS_ENABLED', 'AI_COMMAND_RATE_PER_MINUTE', 'AI_COMMAND_RATE_PER_HOUR', 'AI_COMMAND_GLOBAL_RATE_PER_MINUTE'];
const savedEnv = {};

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  resetCommandRateLimiter();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('aiCommandLaneKillSwitch', () => {
  it('passes through by default (flag unset)', () => {
    const next = vi.fn();
    const res = makeRes();
    aiCommandLaneKillSwitch({ user: { id: 1 } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('returns 503 with AI_COMMANDS_DISABLED when AI_COMMANDS_ENABLED=false', () => {
    process.env.AI_COMMANDS_ENABLED = 'false';
    const next = vi.fn();
    const res = makeRes();
    aiCommandLaneKillSwitch({ user: { id: 1 } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_COMMANDS_DISABLED');
  });

  it('only the explicit string "false" disables (typo-safe)', () => {
    process.env.AI_COMMANDS_ENABLED = 'FALSE_TYPO';
    const next = vi.fn();
    aiCommandLaneKillSwitch({ user: { id: 1 } }, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('aiCommandRateLimiter', () => {
  it('allows requests under the per-minute limit, 429s the next one', () => {
    process.env.AI_COMMAND_RATE_PER_MINUTE = '3';
    const req = { user: { id: 42 } };

    for (let i = 0; i < 3; i += 1) {
      const next = vi.fn();
      aiCommandRateLimiter(req, makeRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const next = vi.fn();
    const res = makeRes();
    aiCommandRateLimiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('AI_COMMAND_RATE_LIMITED');
  });

  it('enforces the per-hour limit independently', () => {
    process.env.AI_COMMAND_RATE_PER_MINUTE = '100';
    process.env.AI_COMMAND_RATE_PER_HOUR = '2';
    const req = { user: { id: 43 } };

    for (let i = 0; i < 2; i += 1) {
      const next = vi.fn();
      aiCommandRateLimiter(req, makeRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const res = makeRes();
    const next = vi.fn();
    aiCommandRateLimiter(req, res, next);
    expect(res.statusCode).toBe(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('tracks users independently', () => {
    process.env.AI_COMMAND_RATE_PER_MINUTE = '1';
    const nextA = vi.fn();
    const nextB = vi.fn();
    aiCommandRateLimiter({ user: { id: 1 } }, makeRes(), nextA);
    aiCommandRateLimiter({ user: { id: 2 } }, makeRes(), nextB);
    expect(nextA).toHaveBeenCalledTimes(1);
    expect(nextB).toHaveBeenCalledTimes(1);
  });

  it('falls back to defaults on invalid env values', () => {
    process.env.AI_COMMAND_RATE_PER_MINUTE = 'banana';
    const req = { user: { id: 44 } };
    // default is 10/min — 10 calls should pass
    for (let i = 0; i < 10; i += 1) {
      const next = vi.fn();
      aiCommandRateLimiter(req, makeRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    }
    const res = makeRes();
    aiCommandRateLimiter(req, res, vi.fn());
    expect(res.statusCode).toBe(429);
  });

  it('401s when auth somehow did not attach a user', () => {
    const res = makeRes();
    const next = vi.fn();
    aiCommandRateLimiter({}, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('route wiring regression', () => {
  const ROUTES_SRC = readFileSync(
    resolve(__dirname, '../../routes/aiCommandRoutes.mjs'),
    'utf8',
  );

  it('applies both guards to /execute and /confirm', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\('\/execute',\s*protect,\s*aiCommandLaneKillSwitch,\s*aiCommandRateLimiter,/,
    );
    expect(ROUTES_SRC).toMatch(
      /router\.post\('\/confirm',\s*protect,\s*aiCommandLaneKillSwitch,\s*aiCommandRateLimiter,/,
    );
  });

  it('audits cancellations', () => {
    expect(ROUTES_SRC).toMatch(/outcome:\s*'cancelled'/);
  });
});

describe('aiCommandRateLimiter global ceiling (H7)', () => {
  // Hostile round 1 (Grok, DeepSeek Pro, DeepSeek Flash): the lane had per-user
  // limits only - N users x 10/min was unbounded subscription spend.
  it('returns 503 AI_COMMAND_GLOBAL_RATE_LIMITED once the fleet-wide minute budget is spent', () => {
    process.env.AI_COMMAND_GLOBAL_RATE_PER_MINUTE = '3';
    process.env.AI_COMMAND_RATE_PER_MINUTE = '100'; // per-user must NOT be what trips
    const outcomes = [];
    for (let userId = 1; userId <= 4; userId += 1) {
      const res = makeRes();
      const next = vi.fn();
      aiCommandRateLimiter({ user: { id: userId } }, res, next);
      outcomes.push(next.mock.calls.length === 1 ? 'next' : res.body?.code);
    }
    expect(outcomes).toEqual(['next', 'next', 'next', 'AI_COMMAND_GLOBAL_RATE_LIMITED']);
  });

  it('a single noisy user hits their OWN 429 before the fleet hits the global 503', () => {
    process.env.AI_COMMAND_GLOBAL_RATE_PER_MINUTE = '5';
    process.env.AI_COMMAND_RATE_PER_MINUTE = '2';
    const codes = [];
    for (let i = 0; i < 3; i += 1) {
      const res = makeRes();
      const next = vi.fn();
      aiCommandRateLimiter({ user: { id: 9 } }, res, next);
      codes.push(next.mock.calls.length === 1 ? 'next' : `${res.statusCode}:${res.body?.code}`);
    }
    expect(codes).toEqual(['next', 'next', '429:AI_COMMAND_RATE_LIMITED']);
  });

  it('resetCommandRateLimiter clears the global window too', () => {
    process.env.AI_COMMAND_GLOBAL_RATE_PER_MINUTE = '1';
    aiCommandRateLimiter({ user: { id: 1 } }, makeRes(), vi.fn());
    resetCommandRateLimiter();
    const next = vi.fn();
    aiCommandRateLimiter({ user: { id: 2 } }, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
