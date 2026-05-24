import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const chatRouteSource = readFileSync(resolve(ROOT, 'routes/aiChatRoutes.mjs'), 'utf8');
const commandRouteSource = readFileSync(resolve(ROOT, 'routes/aiCommandRoutes.mjs'), 'utf8');

describe('AI long prompt route limits', () => {
  it('keeps command payloads capped and returns a structured command-too-long code', () => {
    expect(commandRouteSource).toMatch(/AI_COMMAND_MESSAGE_MAX_CHARS\s*=\s*2000/);
    expect(commandRouteSource).toContain('COMMAND_MESSAGE_TOO_LONG');
    expect(commandRouteSource).toContain('maxChars: AI_COMMAND_MESSAGE_MAX_CHARS');
  });

  it('raises the chat cap for onboarding prompts and returns a structured too-long code', () => {
    expect(chatRouteSource).toMatch(/AI_CHAT_MESSAGE_MAX_CHARS\s*=\s*12000/);
    expect(chatRouteSource).toContain('MESSAGE_TOO_LONG');
    expect(chatRouteSource).toContain('maxChars: AI_CHAT_MESSAGE_MAX_CHARS');
  });

  it('keeps transcription provider/config errors out of client responses', () => {
    expect(chatRouteSource).toContain('buildTranscriptionErrorResponse');
    expect(chatRouteSource).toContain('TRANSCRIPTION_NOT_CONFIGURED');
    expect(chatRouteSource).toContain('TRANSCRIPTION_FAILED');
    expect(chatRouteSource).not.toContain("error: err.message || 'Transcription failed'");
  });
});
