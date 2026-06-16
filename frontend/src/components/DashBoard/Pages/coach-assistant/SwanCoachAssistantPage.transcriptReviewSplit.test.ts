import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const TRANSCRIPT_REVIEW_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachTranscriptReview.ts'),
  'utf8',
);
const SEND_ROUTING_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachSendRouting.ts'),
  'utf8',
);
const MESSAGES_PANEL_SOURCE = readFileSync(
  resolve(__dirname, './SwanCoachMessagesPanel.tsx'),
  'utf8',
);

describe('SwanCoachAssistantPage transcript review ownership split', () => {
  it('page imports the transcript review hook instead of useTranscriptIntake directly', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachTranscriptReview/);
    expect(PAGE_SOURCE).not.toMatch(/import\s*\{\s*useTranscriptIntake\s*\}/);
  });

  it('transcript review hook owns intake and review ref state', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/useTranscriptIntake\(\)/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/transcriptReviewsRef/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/type\s+TranscriptProcessingState\s*=/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/stage:\s*'uploading'\s*\|\s*'parsing'/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/useState<TranscriptProcessingState>/);
  });

  it('transcript review hook owns confirm, cancel, and date-change handlers', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/handleConfirmTranscript/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/handleCancelTranscript/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/handleTranscriptDateChange/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleConfirmTranscript\s*=\s*useCallback/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleCancelTranscript\s*=\s*useCallback/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleTranscriptDateChange\s*=\s*useCallback/);
  });

  it('send-routing uses registration helpers instead of page-level ref mutation', () => {
    expect(PAGE_SOURCE).toMatch(/registerTranscriptError/);
    expect(PAGE_SOURCE).toMatch(/registerTranscriptReview/);
    expect(SEND_ROUTING_SOURCE).toMatch(/registerTranscriptError\(\s*errorMsgId,\s*userMsgId\s*\)/);
    expect(SEND_ROUTING_SOURCE).toMatch(/registerTranscriptReview\(\s*reviewMsgId,\s*userMsgId/);
    expect(PAGE_SOURCE).not.toMatch(/transcriptReviewsRef\.current\.set/);
  });

  it('hook stays under the project file-size ceiling', () => {
    const lines = TRANSCRIPT_REVIEW_SOURCE.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });

  it('passes the selected logger scope label into chat workout handoffs', () => {
    expect(PAGE_SOURCE).toMatch(/const\s+selectedClientName\s*=/);
    expect(PAGE_SOURCE).toMatch(/const\s+workoutLoggerScopeLabel\s*=/);
    expect(PAGE_SOURCE).toMatch(/workoutLoggerScopeLabel=\{workoutLoggerScopeLabel\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/workoutLoggerScopeLabel\?:\s*string\s*\|\s*null/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/workoutLoggerScopeLabel=\{workoutLoggerScopeLabel\}/);
  });
});
