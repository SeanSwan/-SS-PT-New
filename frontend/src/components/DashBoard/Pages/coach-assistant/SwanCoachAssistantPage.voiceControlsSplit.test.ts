import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readCoachFile = (filePath: string) =>
  readFileSync(resolve(__dirname, filePath), 'utf8');

describe('SwanCoachAssistantPage voice controls split', () => {
  it('keeps voice overlay and TTS behavior in a capped hook', () => {
    const pageSource = readCoachFile('./SwanCoachAssistantPage.tsx');
    const hookSource = readCoachFile('./hooks/useSwanCoachVoiceControls.ts');

    expect(pageSource).toContain("from './hooks/useSwanCoachVoiceControls'");
    expect(pageSource).toContain('useSwanCoachVoiceControls({ coach })');
    expect(pageSource).not.toContain("from './hooks/usePremiumTTS'");
    expect(pageSource).not.toContain('setVoiceOverlayOpen');
    expect(pageSource).not.toContain('lastMsgRef');

    expect(hookSource).toContain("from './usePremiumTTS'");
    expect(hookSource).toContain('handleVoiceTranscribed');
    expect(hookSource).toContain('handleVoiceEditTranscript');
    expect(hookSource).toContain('handleReadAloud');
    expect(hookSource).toContain('tts.stop()');
    expect(hookSource).toContain('lastMsgRef');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
