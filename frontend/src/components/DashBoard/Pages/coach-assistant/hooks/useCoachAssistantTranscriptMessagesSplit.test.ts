import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../../../..');
const assistantHookPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts');
const transcriptHookPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistantTranscriptMessages.ts');

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('useCoachAssistant transcript-message split', () => {
  it('keeps transcript/audio message helpers out of the main assistant hook', () => {
    const source = readSource(assistantHookPath);

    expect(source).toContain("import { useCoachAssistantTranscriptMessages } from './useCoachAssistantTranscriptMessages';");
    expect(source).toContain('useCoachAssistantTranscriptMessages(setCommandMessages)');
    expect(source).not.toContain('safeAttachmentSourceLabel');
    expect(source).not.toContain('const appendTranscriptReview = useCallback');
    expect(source).not.toContain('const appendTranscriptError = useCallback');
    expect(source).not.toContain('const appendAudioIntakeReceipt = useCallback');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(380);
  });

  it('keeps the intake message lifecycle in a capped transcript helper hook', () => {
    const source = readSource(transcriptHookPath);

    expect(source).toContain('export function useCoachAssistantTranscriptMessages');
    expect(source).toContain('safeAttachmentSourceLabel');
    expect(source).toContain('appendTranscriptReview');
    expect(source).toContain('updateTranscriptReview');
    expect(source).toContain('transcriptReviewToResult');
    expect(source).toContain('removeTranscriptMessages');
    expect(source).toContain('appendTranscriptError');
    expect(source).toContain('appendAudioIntakeReceipt');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(240);
  });
});
