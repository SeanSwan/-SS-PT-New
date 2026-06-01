import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const COMPOSER_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachComposerPanel.tsx'), 'utf8');
const MESSAGES_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachMessagesPanel.tsx'), 'utf8');
const SEND_ROUTING_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachSendRouting.ts'),
  'utf8',
);

describe('SwanCoachAssistantPage send-routing split', () => {
  it('page imports a send-routing hook instead of declaring handleSend locally', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachSendRouting/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleSend\s*=\s*useCallback/);
  });

  it('send-routing hook owns transcript upload and PLAUD audio routing', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(/uploadClips\(/);
    expect(SEND_ROUTING_SOURCE).toMatch(/intake\.uploadTranscript\(/);
    expect(SEND_ROUTING_SOURCE).toMatch(/hasOnlyAudioTranscriptFiles/);
    expect(SEND_ROUTING_SOURCE).toMatch(/safeTranscriptFailureReason/);
  });

  it('send-routing hook owns transcript review/error registration calls', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(/registerTranscriptError\(/);
    expect(SEND_ROUTING_SOURCE).toMatch(/registerTranscriptReview\(/);
    expect(PAGE_SOURCE).not.toMatch(/registerTranscriptError\(\s*errorMsgId,\s*userMsgId\s*\)/);
    expect(PAGE_SOURCE).not.toMatch(/registerTranscriptReview\(\s*reviewMsgId,\s*userMsgId/);
  });

  it('page still wires handleSend into retry and the composer', () => {
    expect(PAGE_SOURCE).toMatch(/const\s+\{\s*handleSend[\s\S]*lastAttempt[\s\S]*\}\s*=\s*useSwanCoachSendRouting/);
    expect(PAGE_SOURCE).toMatch(/lastAttempt=\{lastAttempt\}/);
    expect(PAGE_SOURCE).toMatch(/onSend=\{handleSend\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/onClick=\{\(\)\s*=>\s*\{\s*void onSend\(lastAttempt\)/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/<CoachInputBar[\s\S]*onSend=\{\(text\)\s*=>\s*\{[\s\S]*void onSend\(text\)/);
  });

  it('hook stays under the project file-size ceiling', () => {
    const lines = SEND_ROUTING_SOURCE.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
