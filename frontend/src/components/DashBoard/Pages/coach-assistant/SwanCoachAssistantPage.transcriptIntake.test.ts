/**
 * SwanCoachAssistantPage transcript intake — source-level locks
 * =============================================================
 * The full SwanCoachAssistantPage component has 30+ provider/context
 * dependencies (useAIChat, useGlobalClient, usePaywall, useGeminiTranscription,
 * usePremiumTTS, useScrollLock, paywall context, search params, etc.) which
 * makes a full mounted-render integration test prohibitively expensive to
 * mock for this slice. Instead, we lock the page-level wiring contract via
 * source-text assertions that are race-free, deterministic, and catch any
 * accidental refactor that would break the transcript intake routing.
 *
 * The page-level wiring is also covered by:
 *   - parsedWorkoutToLogPayload.test.ts (mapper unit tests, 20/20)
 *   - useFileAttachment.test.ts (validation rules, 15/15)
 *
 * What this file specifically locks:
 *   - handleSend routes transcript-class files to /api/workout-logs/upload
 *     (NOT /api/ai-command/execute)
 *   - selected-client requirement before transcript upload
 *   - failure path preserves review state (applyError set, no message removal)
 *   - text-only sends still call coach.sendMessage (existing flow unchanged)
 *   - confirm path posts to canonical adminClientService.logWorkout (which
 *     hits POST /api/admin/clients/:clientId/workouts)
 *   - review/result message lifecycle goes through the four exposed
 *     useCoachAssistant helpers
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const HOOK_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useTranscriptIntake.ts'),
  'utf8',
);
const COACH_HOOK_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useCoachAssistant.ts'),
  'utf8',
);
const COACH_MESSAGE_SOURCE = readFileSync(resolve(__dirname, './CoachMessage.tsx'), 'utf8');

describe('SwanCoachAssistantPage transcript intake — page wiring locks', () => {
  it('imports useTranscriptIntake', () => {
    expect(PAGE_SOURCE).toMatch(/import\s*\{\s*useTranscriptIntake\s*\}\s*from\s*['"]\.\/hooks\/useTranscriptIntake['"]/);
  });

  it('imports the transcript-class detection helpers from useFileAttachment', () => {
    expect(PAGE_SOURCE).toMatch(/hasTranscriptClassFile/);
    expect(PAGE_SOURCE).toMatch(/countTranscriptClassFiles/);
    expect(PAGE_SOURCE).toMatch(/isTranscriptClassMime/);
  });

  it('handleSend gates transcript-class uploads on a selected client', () => {
    // The guard must check selectedClient.id before allowing upload.
    expect(PAGE_SOURCE).toMatch(
      /hasTranscriptClassFile[\s\S]{0,800}!selectedClient\?\.id/,
    );
  });

  it('handleSend calls intake.uploadTranscript for transcript-class files', () => {
    expect(PAGE_SOURCE).toMatch(/intake\.uploadTranscript\(/);
  });

  it('handleSend does NOT route transcript-class files through coach.sendMessage', () => {
    // Two valid call sites must exist (and exactly two):
    //   1. handleSend's text-only existing-flow branch
    //   2. handleVoiceTranscribed (Gemini voice overlay → text)
    // The transcript-class branch must early-return before reaching either.
    // Any third call site risks routing a transcript-class file through
    // the chat AI by accident.
    const sendMessageCount = (PAGE_SOURCE.match(/coach\.sendMessage\(/g) ?? []).length;
    expect(sendMessageCount).toBe(2);
    // Defense-in-depth: the transcript-class branch must explicitly return
    // before any coach.sendMessage call. The structural check is that the
    // first sendMessage call appears AFTER the hasTranscriptClassFile guard
    // closes — we verify the order by searching for the guard, then for
    // sendMessage AFTER it in source order.
    const guardIdx = PAGE_SOURCE.indexOf('hasTranscriptClassFile(files)');
    const sendIdxs: number[] = [];
    let from = 0;
    let m: RegExpExecArray | null;
    const re = /coach\.sendMessage\(/g;
    while ((m = re.exec(PAGE_SOURCE)) !== null) sendIdxs.push(m.index);
    // No coach.sendMessage call should appear strictly inside the
    // hasTranscriptClassFile branch (rough heuristic: between the guard
    // open and the next early `return;`).
    expect(guardIdx).toBeGreaterThan(0);
    // Pick the earliest `return;` after the guard — that's the end of the
    // transcript-class branch, after which the existing-flow code runs.
    const branchEndIdx = PAGE_SOURCE.indexOf('// Existing flow', guardIdx);
    expect(branchEndIdx).toBeGreaterThan(guardIdx);
    for (const idx of sendIdxs) {
      const inTranscriptBranch = idx > guardIdx && idx < branchEndIdx;
      expect(inTranscriptBranch).toBe(false);
    }
  });

  it('handleSend calls coach.appendTranscriptReview on successful upload', () => {
    expect(PAGE_SOURCE).toMatch(/coach\.appendTranscriptReview\(/);
  });

  it('handleConfirmTranscript calls intake.applyParsedWorkout', () => {
    expect(PAGE_SOURCE).toMatch(/intake\.applyParsedWorkout\(/);
  });

  it('handleConfirmTranscript flips applying flag during apply', () => {
    expect(PAGE_SOURCE).toMatch(
      /coach\.updateTranscriptReview\(\s*reviewMsgId\s*,\s*\{\s*applying:\s*true/,
    );
  });

  it('handleConfirmTranscript transitions review to result on success', () => {
    expect(PAGE_SOURCE).toMatch(/coach\.transcriptReviewToResult\(/);
  });

  it('handleConfirmTranscript preserves review state with applyError on failure', () => {
    // Review card must NOT be removed on failure — the user can retry.
    expect(PAGE_SOURCE).toMatch(/applyError:\s*apply\.failure\.error/);
  });

  it('handleCancelTranscript calls coach.removeTranscriptMessages', () => {
    expect(PAGE_SOURCE).toMatch(/coach\.removeTranscriptMessages\(/);
  });

  it('CoachMessage receives the new transcript callbacks', () => {
    expect(PAGE_SOURCE).toMatch(/onConfirmTranscript=\{handleConfirmTranscript\}/);
    expect(PAGE_SOURCE).toMatch(/onCancelTranscript=\{handleCancelTranscript\}/);
  });

  it('handleSend clears attachments on both transcript success and existing-flow paths', () => {
    // Defense-in-depth: every send path must clear attachments to prevent
    // a stale file from being re-sent on the next message.
    const clearCount = (PAGE_SOURCE.match(/attachments\.clearFiles\(\)/g) ?? []).length;
    expect(clearCount).toBeGreaterThanOrEqual(3); // success, failure, existing flow
  });
});

describe('useTranscriptIntake — backend contract locks', () => {
  it('uploadTranscript posts to /api/workout-logs/upload', () => {
    // The exact path string is the contract with backend/routes/
    // workoutLogUploadRoutes.mjs:81 — locking against accidental drift.
    expect(HOOK_SOURCE).toMatch(/['"]\/api\/workout-logs\/upload['"]/);
  });

  it('uploadTranscript does NOT post to /api/ai-command/execute', () => {
    expect(HOOK_SOURCE).not.toMatch(/\/api\/ai-command\/execute/);
  });

  it('applyParsedWorkout calls adminClient.logWorkout (canonical write path)', () => {
    expect(HOOK_SOURCE).toMatch(/adminClient\.logWorkout\(/);
  });

  it('uploadTranscript validates clientId presence before posting', () => {
    expect(HOOK_SOURCE).toMatch(
      /if\s*\(!clientId\)[\s\S]{0,400}A client must be selected/,
    );
  });

  it('uploadTranscript uses parsedWorkoutToLogPayload via applyParsedWorkout', () => {
    expect(HOOK_SOURCE).toMatch(/parsedWorkoutToLogPayload\(/);
  });

  it('uploadTranscript distinguishes failure kinds for UX', () => {
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]validation['"]/);
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]rate_limit['"]/);
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]network['"]/);
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]server['"]/);
  });
});

describe('useCoachAssistant — transcript intake helper exports', () => {
  it('exposes appendTranscriptReview', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/appendTranscriptReview\b/);
    // Returned in the hook's return object
    expect(COACH_HOOK_SOURCE).toMatch(/return\s*\{[\s\S]*appendTranscriptReview[\s\S]*\}/);
  });

  it('exposes updateTranscriptReview', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/updateTranscriptReview\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/return\s*\{[\s\S]*updateTranscriptReview[\s\S]*\}/);
  });

  it('exposes transcriptReviewToResult', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/transcriptReviewToResult\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/return\s*\{[\s\S]*transcriptReviewToResult[\s\S]*\}/);
  });

  it('exposes removeTranscriptMessages', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/removeTranscriptMessages\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/return\s*\{[\s\S]*removeTranscriptMessages[\s\S]*\}/);
  });

  it('preserves the existing sendMessage text/command/chat flow', () => {
    // Anti-regression: text/command flow must still route through
    // executeCommand → fallback chat → commandMessages, untouched.
    expect(COACH_HOOK_SOURCE).toMatch(/const\s+sendMessage\s*=\s*useCallback\(/);
    expect(COACH_HOOK_SOURCE).toMatch(/executeCommand\(/);
    expect(COACH_HOOK_SOURCE).toMatch(/sendMessageWithConversation\(/);
  });
});

describe('CoachMessage — transcript card render branches', () => {
  it('renders TranscriptReviewCard when message has transcriptReview metadata', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/transcriptReview\s*&&/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/data-testid=['"]transcript-review-card['"]/);
  });

  it('renders TranscriptResultCard when message has transcriptResult metadata', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/transcriptResult\s*&&/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/data-testid=['"]transcript-result-card['"]/);
  });

  it('exposes confirm + cancel handlers as new props', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/onConfirmTranscript\?:/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/onCancelTranscript\?:/);
  });

  it('confirm button is disabled while applying', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /disabled=\{transcriptReview\.applying\s*\|\|\s*localApplying\}/,
    );
  });
});
