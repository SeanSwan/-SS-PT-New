import { describe, expect, it } from 'vitest';
import {
  ChallengeCreationValidationError,
  buildChallengeCreatePayload,
} from '../../services/gamification/challengeCreationService.mjs';

const NOW = new Date('2026-06-28T20:00:00.000Z');
const FUTURE_DATES = {
  startDate: '2026-07-01T16:00:00.000Z',
  endDate: '2026-07-08T16:00:00.000Z',
};

describe('challenge creation validation', () => {
  it('rejects retired wellness categories before Sequelize validation', () => {
    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Unsupported Category',
        description: 'This challenge category should be rejected before the database write.',
        category: 'mindfulness',
        ...FUTURE_DATES,
      },
    })).toThrow(ChallengeCreationValidationError);
  });

  it('rejects title and description values outside model bounds before model write', () => {
    const maxTitle = 'T'.repeat(100);
    const maxDescription = 'D'.repeat(1000);

    expect(buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: maxTitle,
        description: maxDescription,
        ...FUTURE_DATES,
      },
    })).toMatchObject({
      title: maxTitle,
      description: maxDescription,
    });

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'T'.repeat(101),
        description: 'This description is long enough for validation.',
        ...FUTURE_DATES,
      },
    })).toThrow('Title must be 100 characters or less');

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Bounded Copy',
        description: 'D'.repeat(1001),
        ...FUTURE_DATES,
      },
    })).toThrow('Description must be 1000 characters or less');
  });
  it('rejects non-string title and description inputs before model write', () => {
    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: { text: 'Object title' },
        description: 'This description is long enough for validation.',
        ...FUTURE_DATES,
      },
    })).toThrow('Title must be text');

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Text Guard',
        description: { text: 'Object description' },
        ...FUTURE_DATES,
      },
    })).toThrow('Description must be text');
  });
  it('rejects non-decimal and boolean integer inputs before model write', () => {
    const baseBody = {
      title: 'Integer Boundary',
      description: 'Integer-backed challenge fields should not accept Number coercion shortcuts.',
      ...FUTURE_DATES,
    };

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: { ...baseBody, maxParticipants: '1e2' },
    })).toThrow('Max participants must be a whole number');

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: { ...baseBody, maxParticipants: '0x10' },
    })).toThrow('Max participants must be a whole number');

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: { ...baseBody, difficulty: true },
    })).toThrow('Difficulty must be a whole number');

    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: { ...baseBody, maxParticipants: '9007199254740993' },
    })).toThrow('Max participants must be a whole number');

    expect(buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: { ...baseBody, maxParticipants: '024', difficulty: '04' },
    })).toMatchObject({
      maxParticipants: 24,
      difficulty: 4,
    });
  });

  it('keeps requirements and tags as clean string metadata only', () => {
    const payload = buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Metadata Hygiene',
        description: 'Challenge metadata should stay readable and not stringify arbitrary objects.',
        requirements: [' Hydrate daily ', { text: 'object artifact' }, '[object Object]', ['nested artifact'], 44, false, 'hydrate daily'],
        tags: [' Team ', { slug: 'object-tag' }, '[object Object]', ['nested-tag'], 123, true, 'team', 'Coach'],
        ...FUTURE_DATES,
      },
    });

    expect(payload.requirements).toEqual(['Hydrate daily']);
    expect(payload.tags).toEqual(['Team', 'Coach']);
    expect(payload.requirements).not.toContain('[object Object]');
    expect(payload.tags).not.toContain('[object Object]');
  });
  it('returns a 400-friendly validation error for unknown templates', () => {
    try {
      buildChallengeCreatePayload({
        userId: 42,
        now: NOW,
        body: {
          templateId: 'challenge-template:not-real',
          title: 'Unknown Template',
          description: 'The API should not fall through into a generic server error.',
          ...FUTURE_DATES,
        },
      });
      throw new Error('expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(ChallengeCreationValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.publicMessage).toBe('Unknown challenge template');
    }
  });

  it('rejects challenge windows that do not start in the future', () => {
    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Past Challenge',
        description: 'A challenge cannot start before the creation request time.',
        startDate: '2026-06-28T19:59:00.000Z',
        endDate: '2026-06-30T19:59:00.000Z',
      },
    })).toThrow('Start date must be in the future');
  });

  it('rejects impossible calendar dates before model write', () => {
    const earlyNow = new Date('2026-01-01T00:00:00.000Z');
    const baseInput = {
      userId: 42,
      now: earlyNow,
      body: {
        title: 'Calendar Guard',
        description: 'Backend validation must not normalize impossible calendar dates.',
      },
    };

    expect(() => buildChallengeCreatePayload({
      ...baseInput,
      body: {
        ...baseInput.body,
        startDate: '2026-02-30',
        endDate: '2026-03-08',
      },
    })).toThrow('Start date must be a valid date');

    expect(() => buildChallengeCreatePayload({
      ...baseInput,
      body: {
        ...baseInput.body,
        startDate: '2026-02-28',
        endDate: '2026-02-30',
      },
    })).toThrow('End date must be a valid date');
  });

  it('rejects non-ISO date strings before relying on Date.parse', () => {
    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Loose Date Parser',
        description: 'Challenge creation should accept stable ISO inputs only.',
        startDate: 'July 1, 2026',
        endDate: '2026-07-08T16:00:00.000Z',
      },
    })).toThrow('Start date must be a valid date');
  });

  it('accepts Date instances from internal challenge builders', () => {
    const payload = buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        title: 'Internal Date Builder',
        description: 'Internal builders can pass actual Date instances without string parsing.',
        startDate: new Date('2026-07-01T16:00:00.000Z'),
        endDate: new Date('2026-07-08T16:00:00.000Z'),
      },
    });

    expect(payload.startDate.toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(payload.endDate.toISOString()).toBe('2026-07-08T16:00:00.000Z');
  });
});

