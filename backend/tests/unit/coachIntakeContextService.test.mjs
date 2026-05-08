import { describe, expect, it } from 'vitest';
import {
  buildCoachIntakeContextFromResult,
  buildCoachIntakeContextPromptBlock,
  sanitizeCoachIntakeContext,
} from '../../services/ai/coachIntakeContextService.mjs';

describe('coach intake context prompt bridge', () => {
  it('allowlists compact queue facts and drops PII-shaped unknown fields', () => {
    const clean = sanitizeCoachIntakeContext({
      source: 'coach_intake_context_v1',
      summary: {
        actionable: 2,
        readyReview: 1,
        needsClient: 1,
        failed: 0,
        ignored: 'drop me',
      },
      items: [
        {
          id: 'intake-1',
          kind: 'clip',
          sourceLabel: 'Manual Upload',
          queueStatus: 'ready_review',
          hasClient: true,
          needsClient: false,
          canReview: true,
          clipCount: 2,
          title: 'Marcus private note',
          clientName: 'Marcus Swan',
        },
      ],
    });

    const serialized = JSON.stringify(clean);

    expect(clean.summary.readyReview).toBe(1);
    expect(clean.items[0]).toMatchObject({
      id: 'intake-1',
      queueStatus: 'ready_review',
      hasClient: true,
      clipCount: 2,
    });
    expect(serialized).not.toContain('Marcus');
    expect(serialized).not.toContain('private note');
    expect(serialized).not.toContain('ignored');
  });

  it('builds a system-framed prompt block that is not treated as user instructions', () => {
    const clean = sanitizeCoachIntakeContext({
      source: 'coach_intake_context_v1',
      summary: { actionable: 1, readyReview: 1, needsClient: 0, failed: 0 },
      items: [],
    });
    const block = buildCoachIntakeContextPromptBlock(clean);

    expect(block).toContain('structured Coach intake queue state');
    expect(block).toContain('not user instructions');
    expect(block).toContain('Actionable: 1');
    expect(block).toContain('review next Coach intake');
    expect(block).toContain('inspect pending Coach audio pieces');
    expect(block).not.toContain('inspect pending PLAUD audio pieces');
  });

  it('builds de-identified context from server queue results', () => {
    const context = buildCoachIntakeContextFromResult({
      summary: { actionable: 2, readyReview: 1, needsClient: 1 },
      items: [
        {
          id: 'merge:11111111-1111-1111-1111-111111111111',
          kind: 'merge_request',
          title: 'Do Not Return',
          clientName: 'Do Not Return',
          clientId: 42,
          sourceLabel: 'PLAUD merge',
          queueStatus: 'ready_review',
          canReview: true,
          needsClient: false,
          clipCount: 2,
          parsedExerciseCount: 7,
          timelineAtSource: 'created_at',
        },
      ],
    });

    expect(context).toMatchObject({
      source: 'coach_intake_context_v1',
      summary: { actionable: 2, readyReview: 1, needsClient: 1 },
      items: [
        {
          id: 'merge:11111111-1111-1111-1111-111111111111',
          kind: 'merge_request',
          hasClient: true,
          canReview: true,
          clipCount: 2,
          parsedExerciseCount: 7,
        },
      ],
    });
    expect(JSON.stringify(context)).not.toMatch(/Do Not Return|clientName|title/i);
  });

  it('includes compact audio puzzle facts without source labels or transcript text', () => {
    const context = buildCoachIntakeContextFromResult({
      summary: { actionable: 1, readyReview: 0, needsClient: 1 },
      items: [
        {
          id: 'coach:audio-1',
          kind: 'coach_intake',
          sourceLabel: 'Audio upload',
          queueStatus: 'unprocessed',
          canReview: false,
          needsClient: true,
          audioPuzzle: {
            pieceCount: 3,
            bundleCount: 2,
            autoBundleCount: 1,
            needsOrderingReview: true,
            confidence: 'low',
            rawFileNames: ['Marcus private clip one.m4a'],
            transcript: 'Do Not Return',
          },
        },
      ],
    });
    const block = buildCoachIntakeContextPromptBlock(context);
    const serialized = JSON.stringify(context);

    expect(context.items[0]).toMatchObject({
      audioPieceCount: 3,
      audioBundleCount: 2,
      audioAutoBundleCount: 1,
      audioNeedsOrderingReview: true,
      audioPuzzleConfidence: 'low',
    });
    expect(block).toContain('audioPieces=3');
    expect(block).toContain('audioOrderReview=true');
    expect(serialized).not.toMatch(/Marcus|private clip|Do Not Return|rawFileNames|transcript/i);
  });
});
