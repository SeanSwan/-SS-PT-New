/**
 * AI/auth transport regression locks
 * ==================================
 *
 * These source-level locks cover the production console failure where Coach and
 * admin client requests returned 401s while bypassing the central apiService
 * token-refresh/redirect path. The live hooks have deep provider trees, so this
 * test protects the transport contract directly.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USE_AI_CHAT_SOURCE = readFileSync(resolve(__dirname, './useAIChat.ts'), 'utf8');
const USE_COACH_COMMAND_SOURCE = readFileSync(resolve(__dirname, './useCoachCommand.ts'), 'utf8');
const ADMIN_CLIENT_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/adminClientService.ts'), 'utf8');
const PLAUD_INTAKE_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/plaudIntakeService.ts'), 'utf8');
const PLAUD_CLIP_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/plaudClipService.ts'), 'utf8');
const PLAUD_MERGE_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/plaudMergeService.ts'), 'utf8');
const COACH_INTAKE_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/coachIntakeService.ts'), 'utf8');
const COACH_PROPOSAL_SERVICE_SOURCE = readFileSync(resolve(__dirname, '../services/coachProposalService.ts'), 'utf8');
const COACH_TRANSCRIPTION_SOURCE = readFileSync(
  resolve(__dirname, '../components/DashBoard/Pages/coach-assistant/hooks/useGeminiTranscription.ts'),
  'utf8',
);
const COACH_TTS_SOURCE = readFileSync(
  resolve(__dirname, '../components/DashBoard/Pages/coach-assistant/hooks/usePremiumTTS.ts'),
  'utf8',
);
const COACH_TEACH_MODE_SOURCE = readFileSync(
  resolve(__dirname, '../components/DashBoard/Pages/coach-assistant/hooks/useCoachTeachMode.ts'),
  'utf8',
);
const PLAUD_APPLY_SOURCE = readFileSync(resolve(__dirname, '../components/PlaudClipMerge/PlaudMergeWorkspace.apply.ts'), 'utf8');
const SPA_SW_SOURCE = readFileSync(resolve(__dirname, '../../public/spa-sw.js'), 'utf8');

describe('AI and admin auth transport', () => {
  it('routes Coach chat requests through the central production apiService', () => {
    expect(USE_AI_CHAT_SOURCE).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/services\/api\.service['"]/);
    expect(USE_AI_CHAT_SOURCE).toMatch(/apiService\.get\(`\/api\/ai-chat\/conversations/);
    expect(USE_AI_CHAT_SOURCE).toMatch(/apiService\.post\(['`]\/api\/ai-chat\/conversations/);
    expect(USE_AI_CHAT_SOURCE).not.toMatch(/fetch\(`\$\{API_BASE\}\/api\/ai-chat/);
    expect(USE_AI_CHAT_SOURCE).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  });

  it('routes Coach command requests through the central production apiService', () => {
    expect(USE_COACH_COMMAND_SOURCE).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/services\/api\.service['"]/);
    expect(USE_COACH_COMMAND_SOURCE).toMatch(/apiService\.post\('\/api\/ai-command\/execute'/);
    expect(USE_COACH_COMMAND_SOURCE).toMatch(/apiService\.post\('\/api\/ai-command\/confirm'/);
    expect(USE_COACH_COMMAND_SOURCE).not.toMatch(/fetch\(`\$\{API_BASE\}\/api\/ai-command/);
    expect(USE_COACH_COMMAND_SOURCE).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  });

  it('does not create a standalone admin-client axios auth lane', () => {
    expect(ADMIN_CLIENT_SERVICE_SOURCE).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
    expect(ADMIN_CLIENT_SERVICE_SOURCE).toMatch(/constructor\(apiInstance/);
    expect(ADMIN_CLIENT_SERVICE_SOURCE).toMatch(/createAdminClientService\s*=\s*\(apiInstance\?: AdminApiTransport\)[\s\S]*new AdminClientService\(apiInstance\)/);
    expect(ADMIN_CLIENT_SERVICE_SOURCE).not.toMatch(/axios\.create/);
    expect(ADMIN_CLIENT_SERVICE_SOURCE).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  });

  it('routes PLAUD protected requests through the central production apiService', () => {
    for (const source of [
      PLAUD_INTAKE_SERVICE_SOURCE,
      PLAUD_CLIP_SERVICE_SOURCE,
      PLAUD_MERGE_SERVICE_SOURCE,
    ]) {
      expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
      expect(source).not.toMatch(/axios\.create/);
      expect(source).not.toMatch(/interceptors\.request\.use/);
      expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    }

    expect(PLAUD_INTAKE_SERVICE_SOURCE).toMatch(/apiService\.get[\s\S]{0,160}\(['"]\/api\/plaud\/intake/);
    expect(PLAUD_CLIP_SERVICE_SOURCE).toMatch(/apiService\.get[\s\S]{0,160}\(['"]\/api\/plaud\/clips/);
    expect(PLAUD_CLIP_SERVICE_SOURCE).toMatch(/apiService\.post[\s\S]{0,160}\(['"]\/api\/plaud\/clips\/upload/);
    expect(PLAUD_MERGE_SERVICE_SOURCE).toMatch(/apiService\.post[\s\S]{0,160}\(['"]\/api\/plaud\/merge/);
    expect(PLAUD_MERGE_SERVICE_SOURCE).toMatch(/apiService\.get[\s\S]{0,160}\(['"]\/api\/plaud\/merge-requests/);
  });

  it('routes PLAUD workout-approval writes through the central production apiService', () => {
    expect(PLAUD_APPLY_SOURCE).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
    expect(PLAUD_APPLY_SOURCE).toMatch(/apiService\.post[\s\S]{0,180}\(`\/api\/admin\/clients\/\$\{args\.clientId\}\/workouts`/);
    expect(PLAUD_APPLY_SOURCE).not.toMatch(/axios\.post/);
    expect(PLAUD_APPLY_SOURCE).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  });

  it('routes Coach intake and proposal requests through the central production apiService', () => {
    for (const source of [
      COACH_INTAKE_SERVICE_SOURCE,
      COACH_PROPOSAL_SERVICE_SOURCE,
    ]) {
      expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
      expect(source).not.toMatch(/axios\.create/);
      expect(source).not.toMatch(/interceptors\.request\.use/);
      expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    }

    expect(COACH_INTAKE_SERVICE_SOURCE).toMatch(/apiService\.get[\s\S]{0,180}\(['"]\/api\/coach\/intake\/queue/);
    expect(COACH_INTAKE_SERVICE_SOURCE).toMatch(/apiService\.post[\s\S]{0,180}\(['"]\/api\/coach\/intake/);
    expect(COACH_PROPOSAL_SERVICE_SOURCE).toMatch(/apiService\.get[\s\S]{0,180}\(`\/api\/coach\/proposals\/\$\{encodeURIComponent\(id\)\}`/);
    expect(COACH_PROPOSAL_SERVICE_SOURCE).toMatch(/apiService\.post[\s\S]*`\/api\/coach\/proposals\/\$\{encodeURIComponent\(id\)\}\/approve`/);
    expect(COACH_PROPOSAL_SERVICE_SOURCE).toMatch(/apiService\.post[\s\S]*`\/api\/coach\/proposals\/\$\{encodeURIComponent\(id\)\}\/reject`/);
  });

  it('routes Coach transcription, voice readback, and teach-mode calls through apiService', () => {
    for (const source of [
      COACH_TRANSCRIPTION_SOURCE,
      COACH_TTS_SOURCE,
      COACH_TEACH_MODE_SOURCE,
    ]) {
      expect(source).toMatch(/import\s+apiService\s+from\s+['"][^'"]*services\/api\.service['"]/);
      expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
      expect(source).not.toMatch(/sessionStorage\.getItem\(['"]token['"]\)/);
      expect(source).not.toMatch(/Authorization:\s*`Bearer/);
    }

    expect(COACH_TRANSCRIPTION_SOURCE).toMatch(/apiService\.post/);
    expect(COACH_TRANSCRIPTION_SOURCE).toContain("'/api/ai-chat/transcribe'");
    expect(COACH_TTS_SOURCE).toMatch(/apiService\.post/);
    expect(COACH_TTS_SOURCE).toContain("'/api/ai-chat/tts'");
    expect(COACH_TTS_SOURCE).toMatch(/responseType:\s*['"]blob['"]/);
    expect(COACH_TEACH_MODE_SOURCE).toMatch(/apiService\.get/);
    expect(COACH_TEACH_MODE_SOURCE).toContain("'/api/exercises'");
  });

  it('does not synthesize 503 responses from the disabled service worker', () => {
    expect(SPA_SW_SOURCE).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
    expect(SPA_SW_SOURCE).not.toMatch(/\.respondWith\s*\(/);
    expect(SPA_SW_SOURCE).not.toMatch(/new Response\('Service Worker: Network error'/);
  });
});
