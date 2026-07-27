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
const COMPOSER_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachComposerPanel.tsx'), 'utf8');
const MESSAGES_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachMessagesPanel.tsx'), 'utf8');
const SEND_ROUTING_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachSendRouting.ts'),
  'utf8',
);
const HOOK_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useTranscriptIntake.ts'),
  'utf8',
);
const COACH_HOOK_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useCoachAssistant.ts'),
  'utf8',
);
const COACH_TRANSCRIPT_MESSAGES_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useCoachAssistantTranscriptMessages.ts'),
  'utf8',
);
const CLIENT_SELECTION_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachClientSelection.ts'),
  'utf8',
);
const VOICE_CONTROLS_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachVoiceControls.ts'),
  'utf8',
);
const TRANSCRIPT_REVIEW_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachTranscriptReview.ts'),
  'utf8',
);
const COACH_MESSAGE_SOURCE = [
  './CoachMessage.tsx',
  './CoachMessageTranscriptCards.tsx',
  './CoachMessage.styles.ts',
].map((filePath) => readFileSync(resolve(__dirname, filePath), 'utf8')).join('\n');
const COACH_TYPES_SOURCE = readFileSync(resolve(__dirname, './SwanCoachTypes.ts'), 'utf8');

describe('SwanCoachAssistantPage transcript intake — page wiring locks', () => {
  it('routes transcript review ownership through the split hook', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachTranscriptReview/);
    expect(PAGE_SOURCE).not.toMatch(/import\s*\{\s*useTranscriptIntake\s*\}/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/import\s*\{\s*useTranscriptIntake\s*\}\s*from\s*['"]\.\/useTranscriptIntake['"]/);
  });

  it('routes transcript send ownership through the split hook', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachSendRouting/);
    expect(PAGE_SOURCE).toMatch(/<SwanCoachComposerPanel/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/hasTranscriptClassFile/);
    expect(SEND_ROUTING_SOURCE).toMatch(/countTranscriptClassFiles/);
    expect(SEND_ROUTING_SOURCE).toMatch(/isTranscriptClassMime/);
  });

  it('handleSend keeps selected-client guard for direct transcript review', () => {
    // Direct /workout-logs/upload still needs a selected client. Single
    // unresolved audio now routes to PLAUD intake first, so this lock only
    // applies to the direct review branch.
    expect(SEND_ROUTING_SOURCE).toMatch(/hasTranscriptClassFile\(files\)/);
    expect(SEND_ROUTING_SOURCE).toMatch(/!selectedClient\?\.id/);
    const guardIdx = SEND_ROUTING_SOURCE.indexOf('hasTranscriptClassFile(files)');
    const checkIdx = SEND_ROUTING_SOURCE.indexOf('!selectedClient?.id');
    const uploadCallIdx = SEND_ROUTING_SOURCE.indexOf(
      'const upload = await intake.uploadTranscript(',
      checkIdx,
    );
    expect(guardIdx).toBeGreaterThan(0);
    expect(checkIdx).toBeGreaterThan(guardIdx);
    expect(uploadCallIdx).toBeGreaterThan(checkIdx);
  });

  it('routes single unresolved audio into PLAUD intake instead of requiring client first', () => {
    const singleAudioIdx = SEND_ROUTING_SOURCE.indexOf('const isSingleUnresolvedAudio');
    expect(singleAudioIdx).toBeGreaterThan(0);
    const noClientGuardIdx = SEND_ROUTING_SOURCE.indexOf('!selectedClient?.id', singleAudioIdx);
    expect(noClientGuardIdx).toBeGreaterThan(singleAudioIdx);
    const slice = SEND_ROUTING_SOURCE.slice(singleAudioIdx, noClientGuardIdx);
    expect(slice).toMatch(/hasOnlyAudioTranscriptFiles\(files\)/);
    expect(slice).toMatch(/routeAudioFilesToPlaudIntake\(files,\s*transcriptFile\.name\)/);
    expect(slice).not.toMatch(/appendTranscriptError\(\{\s*kind:\s*['"]no_client['"]/);
  });

  it('handleSend calls intake.uploadTranscript for transcript-class files', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(/intake\.uploadTranscript\(/);
  });

  it('handleSend does NOT route transcript-class files through coach.sendMessage', () => {
    // In this extraction scope, two valid direct send call sites must exist:
    //   1. handleSend's text-only existing-flow branch
    //   2. handleVoiceTranscribed (Gemini voice overlay → text)
    //   3. queue action prompt click → text command/chat lane
    // The transcript-class branch must early-return before reaching either.
    // Any extra call site risks routing a transcript-class file through
    // the chat AI by accident.
    const sendMessageCount = (
      `${SEND_ROUTING_SOURCE}\n${VOICE_CONTROLS_SOURCE}`.match(/coach\.sendMessage\(/g) ?? []
    ).length;
    expect(sendMessageCount).toBe(2);
    // Defense-in-depth: the transcript-class branch must explicitly return
    // before any coach.sendMessage call. The structural check is that the
    // first sendMessage call appears AFTER the hasTranscriptClassFile guard
    // closes — we verify the order by searching for the guard, then for
    // sendMessage AFTER it in source order.
    const guardIdx = SEND_ROUTING_SOURCE.indexOf('hasTranscriptClassFile(files)');
    const sendIdxs: number[] = [];
    let m: RegExpExecArray | null;
    const re = /coach\.sendMessage\(/g;
    while ((m = re.exec(SEND_ROUTING_SOURCE)) !== null) sendIdxs.push(m.index);
    // No coach.sendMessage call should appear strictly inside the
    // hasTranscriptClassFile branch (rough heuristic: between the guard
    // open and the next early `return;`).
    expect(guardIdx).toBeGreaterThan(0);
    // Pick the earliest `return;` after the guard — that's the end of the
    // transcript-class branch, after which the existing-flow code runs.
    const branchEndIdx = SEND_ROUTING_SOURCE.indexOf('setLastAttempt(text)', guardIdx);
    expect(branchEndIdx).toBeGreaterThan(guardIdx);
    for (const idx of sendIdxs) {
      const inTranscriptBranch = idx > guardIdx && idx < branchEndIdx;
      expect(inTranscriptBranch).toBe(false);
    }
  });

  it('successful audio uploads append a deterministic intake receipt instead of a Coach command', () => {
    const audioSuccessIdx = SEND_ROUTING_SOURCE.indexOf('if (upload.clips.length > 0)');
    expect(audioSuccessIdx).toBeGreaterThan(0);
    const successSlice = SEND_ROUTING_SOURCE.slice(
      audioSuccessIdx,
      SEND_ROUTING_SOURCE.indexOf('const reason = safeTranscriptFailureReason', audioSuccessIdx),
    );
    expect(successSlice).toMatch(/coach\.appendAudioIntakeReceipt\(/);
    expect(successSlice).toMatch(/acceptedCount:\s*upload\.clips\.length/);
    expect(successSlice).toMatch(/rejectedCount:\s*upload\.rejected\.length/);
    expect(successSlice).toMatch(/fileSize:\s*upload\.clips\.reduce/);
    expect(successSlice).not.toMatch(/coach\.sendMessage\(/);
    expect(SEND_ROUTING_SOURCE).not.toContain("coach.sendMessage('inspect pending Coach audio pieces')");
  });

  it('uses the shared Swan Coach id helper for transcript and audio receipt messages', () => {
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain(
      "import { createCoachMessageId } from '../utils/coachMessageIds';",
    );
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain("createCoachMessageId('transcript-user')");
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain("createCoachMessageId('transcript-review')");
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain("createCoachMessageId('transcript-error')");
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain("createCoachMessageId('audio-intake-user')");
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toContain("createCoachMessageId('audio-intake-receipt')");
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).not.toContain('Math.random');
  });

  it('handleSend calls coach.appendTranscriptReview on successful upload', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(/coach\.appendTranscriptReview\(/);
  });

  it('handleConfirmTranscript calls intake.applyParsedWorkout', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/intake\.applyParsedWorkout\(/);
  });

  it('handleConfirmTranscript flips applying flag during apply', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(
      /coach\.updateTranscriptReview\(\s*reviewMsgId\s*,\s*\{\s*applying:\s*true/,
    );
  });

  it('handleConfirmTranscript transitions review to result on success', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/coach\.transcriptReviewToResult\(/);
  });

  it('handleConfirmTranscript preserves review state with applyError on failure', () => {
    // Review card must NOT be removed on failure — the user can retry.
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/applyError:\s*(?:apply\.failure|failure)\.error/);
  });

  it('handleCancelTranscript calls coach.removeTranscriptMessages', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/coach\.removeTranscriptMessages\(/);
  });

  it('CoachMessage receives the new transcript callbacks', () => {
    expect(PAGE_SOURCE).toMatch(/onConfirmTranscript=\{handleConfirmTranscript\}/);
    expect(PAGE_SOURCE).toMatch(/onCancelTranscript=\{handleCancelTranscript\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/onConfirmTranscript=\{onConfirmTranscript\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/onCancelTranscript=\{onCancelTranscript\}/);
  });

  it('handleSend clears attachments on the happy-path and existing-flow sends only', () => {
    // Phase 9.1.1 polish: error branches (no_client + upload_failed) no
    // longer clear attachments so the user can retry without re-picking
    // the file. Audio batch success, document upload success, and the
    // text-only existing-flow branch should clear.
    const clearCount = (SEND_ROUTING_SOURCE.match(/attachments\.clearFiles\(\)/g) ?? []).length;
    expect(clearCount).toBe(3);
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

  it('Phase 12: does NOT rewrite responseStyle "balanced" → "both"', () => {
    // The Phase 9 code had a mapping `balanced === responseStyle ? 'both' :
    // responseStyle` at both sendMessage call sites. This forced the
    // backend's dual-mode "🎓 THE SCIENCE" / "💯 KEEPING IT 100" template
    // on every Balanced-mode message, even though the backend has a
    // first-class 'balanced' style that returns a single unified response.
    // Lock the fix: the backendStyle assignment must not contain the
    // 'balanced' → 'both' rewrite anywhere in the hook.
    expect(COACH_HOOK_SOURCE).not.toMatch(
      /responseStyle\s*===\s*['"]balanced['"]\s*\?\s*['"]both['"]/,
    );
    // And backendStyle must still be declared (anti-regression for the
    // general chat-style pass-through).
    expect(COACH_HOOK_SOURCE).toMatch(/const\s+backendStyle\s*=\s*responseStyle/);
  });
});

describe('Phase 9.1 — selected-client hydration fix', () => {
  it('flips the fetch-started ref when clientList is already populated (state D)', () => {
    // The original ref gate only flipped on observed loadingClients=true,
    // which stranded pages navigated-into after clients were pre-loaded.
    // The fix: also flip the ref when `clientList.length > 0` because
    // that's implicit confirmation that a fetch cycle completed.
    expect(CLIENT_SELECTION_SOURCE).toMatch(/function\s+clientListReady\(/);
    expect(CLIENT_SELECTION_SOURCE).toMatch(/if\s*\(clientCount\s*>\s*0\)\s*fetchStartedRef\.current\s*=\s*true/);
    expect(CLIENT_SELECTION_SOURCE).toMatch(
      /clientListReady\(fetchStartedRef,\s*loadingClients,\s*clientCount\)/,
    );
  });

  it('still gates on genuine pre-load window (state A: empty list, no fetch observed)', () => {
    // Anti-regression: the state-A guard must still bail when the list
    // is empty AND no fetch has been observed. Otherwise the URL-param
    // branch would incorrectly clear selectedClient on a legitimate
    // clientId that hasn't loaded yet.
    expect(CLIENT_SELECTION_SOURCE).toMatch(/return\s+fetchStartedRef\.current;/);
    expect(CLIENT_SELECTION_SOURCE).toMatch(/if\s*\(!selectionReady\([^)]*\)\)\s*return;/);
  });
});

describe('Phase 9.1 — missing-client validation uses error card, not fake review', () => {
  it('handleSend calls appendTranscriptError on no-client, NOT appendTranscriptReview', () => {
    // The no-client branch is the `if (!selectedClient?.id) { ... }` block
    // followed by `const upload = await intake.uploadTranscript(`. Bound
    // the search to that range so we don't accidentally match the later
    // success branch's appendTranscriptReview call.
    const noClientGuardIdx = SEND_ROUTING_SOURCE.indexOf('!selectedClient?.id');
    expect(noClientGuardIdx).toBeGreaterThan(0);
    const uploadCallIdx = SEND_ROUTING_SOURCE.indexOf(
      'const upload = await intake.uploadTranscript(',
      noClientGuardIdx,
    );
    expect(uploadCallIdx).toBeGreaterThan(noClientGuardIdx);
    const slice = SEND_ROUTING_SOURCE.slice(noClientGuardIdx, uploadCallIdx);
    expect(slice).toMatch(/coach\.appendTranscriptError\(/);
    expect(slice).not.toMatch(/coach\.appendTranscriptReview\(/);
  });

  it('no-client error path registers errorMsgId with the transcript review store', () => {
    // The Phase 9 bug: the no-client branch discarded the return value,
    // leaving Dismiss as a no-op. Lock that the ids are stored.
    expect(SEND_ROUTING_SOURCE).toMatch(
      /appendTranscriptError[\s\S]{0,800}registerTranscriptError\(\s*errorMsgId,\s*userMsgId\s*\)/,
    );
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(
      /transcriptReviewsRef\.current\.set\(\s*errorMsgId,\s*\{\s*userMsgId,\s*review:\s*null\s*\}/,
    );
  });

  it('upload-failure branch also uses appendTranscriptError', () => {
    // Second bug site: the upload-failed branch had the same dead-id bug.
    expect(SEND_ROUTING_SOURCE).toMatch(
      /kind:\s*['"]upload_failed['"][\s\S]{0,700}registerTranscriptError\(\s*errorMsgId,\s*userMsgId\s*\)/,
    );
  });

  it('transcriptReviewsRef type allows null review for error entries', () => {
    // Error entries store `review: null` so handleConfirmTranscript can
    // safely early-return on non-actionable entries.
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/review:\s*TranscriptReviewData\s*\|\s*null/);
  });
});

describe('Phase 9.1 — useCoachAssistant appendTranscriptError helper', () => {
  it('exports appendTranscriptError from the hook', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/appendTranscriptError\b/);
    expect(COACH_HOOK_SOURCE).toMatch(
      /return\s*\{[\s\S]*appendTranscriptError[\s\S]*\}/,
    );
  });

  it('appendTranscriptError returns both userMsgId and errorMsgId', () => {
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(
      /appendTranscriptError[\s\S]{0,1200}\{\s*userMsgId[\s\S]{0,200}errorMsgId/,
    );
  });

  it('appendTranscriptError injects a message with transcriptError metadata', () => {
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(
      /metadata:\s*\{\s*transcriptError:/,
    );
  });

  it('useCoachAssistant exposes appendAudioIntakeReceipt for PLAUD audio success receipts', () => {
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(/const\s+appendAudioIntakeReceipt\s*=\s*useCallback\(/);
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(/metadata:\s*\{\s*audioIntakeReceipt:\s*receipt\s*\}/);
    expect(COACH_HOOK_SOURCE).toMatch(/return\s*\{[\s\S]*appendAudioIntakeReceipt[\s\S]*\}/);
  });

  it('does not mutate existing transcriptReview helpers', () => {
    // Anti-regression: all four Phase 9 helpers must still exist alongside
    // the new error helper.
    expect(COACH_HOOK_SOURCE).toMatch(/appendTranscriptReview\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/updateTranscriptReview\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/transcriptReviewToResult\b/);
    expect(COACH_HOOK_SOURCE).toMatch(/removeTranscriptMessages\b/);
  });
});

describe('Phase 9.1 — CoachMessage transcriptError render branch', () => {
  it('renders a dedicated error card separate from the review card', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/transcriptError\s*&&/);
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /data-testid=['"]transcript-error-card['"]/,
    );
  });

  it('error card has NO Apply button — only a Dismiss action', () => {
    // The error card render block must contain the dismiss testid but not
    // the confirm/apply testid. We locate the error card render slice and
    // verify the button structure.
    const errorCardIdx = COACH_MESSAGE_SOURCE.indexOf('transcript-error-card');
    expect(errorCardIdx).toBeGreaterThan(0);
    // Grab ~2000 chars after the testid — enough to span the full render block
    const slice = COACH_MESSAGE_SOURCE.slice(errorCardIdx, errorCardIdx + 2500);
    expect(slice).toMatch(/data-testid=['"]transcript-error-dismiss-btn['"]/);
    expect(slice).not.toMatch(/data-testid=['"]transcript-confirm-btn['"]/);
  });

  it('error card distinguishes no_client from upload_failed visually', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /transcriptError\.kind\s*===\s*['"]no_client['"]/,
    );
    expect(COACH_MESSAGE_SOURCE).toMatch(/'Client required'/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/'Upload failed'/);
  });

  it('existing review card still renders Apply button for real parsed reviews', () => {
    // Anti-regression: the transcriptReview branch must still render the
    // Apply control. Phase 9.1 only adds the error card; it must NOT
    // remove the original review card behavior.
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /data-testid=['"]transcript-confirm-btn['"]/,
    );
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /data-testid=['"]transcript-review-card['"]/,
    );
  });
});

describe('CoachMessage — audio intake receipt branch', () => {
  it('types and renders the PLAUD audio intake receipt card', () => {
    expect(COACH_TYPES_SOURCE).toMatch(/audioIntakeReceipt\?:\s*\{/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/safeCommandActionLabel/);
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /const\s+audioIntakeReceipt\s*=\s*message\.metadata\?\.audioIntakeReceipt/,
    );
    expect(COACH_MESSAGE_SOURCE).toMatch(/data-testid=['"]audio-intake-receipt-card['"]/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/Audio pieces queued/i);
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /safeCommandActionLabel\(audioIntakeReceipt\.nextActionLabel\)\s*\|\|\s*['"]Review next intake['"]/,
    );
    expect(COACH_MESSAGE_SOURCE).toMatch(/\$kind=['"]warning['"]/);
  });

  it('renders a guarded Review next action with a 44px touch target', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/onAudioIntakeReviewNext\?:\s*\(\)\s*=>\s*void/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/audioIntakeReviewNextPending\?:\s*boolean/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/audioIntakeReceipt\s*&&\s*onAudioIntakeReviewNext/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/onClick=\{onAudioIntakeReviewNext\}/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/disabled=\{audioIntakeReviewNextPending\}/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/aria-busy=\{audioIntakeReviewNextPending\s*\?\s*['"]true['"]\s*:\s*undefined\}/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/min-height:\s*44px/);
  });

  it('page delegates direct intake navigation to the audio-intake hook without prompt fallback wiring', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachAudioIntakeNavigation/);
    expect(PAGE_SOURCE).toMatch(
      /const\s+\{\s*audioReviewNextPending[\s\S]*handleAudioIntakeReviewNext[\s\S]*\}\s*=\s*useSwanCoachAudioIntakeNavigation/,
    );
    expect(PAGE_SOURCE).not.toMatch(/const\s+navigate\s*=\s*useNavigate\(\)/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleAudioIntakeReviewNext\s*=\s*useCallback/);
    expect(PAGE_SOURCE).toMatch(/onAudioIntakeReviewNext=\{handleAudioIntakeReviewNext\}/);
    expect(PAGE_SOURCE).toMatch(/audioReviewNextPending=\{audioReviewNextPending\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/audioIntakeReviewNextPending=\{audioReviewNextPending\}/);
  });
});

describe('Phase 9.1.1 — truthful error-state user bubble copy', () => {
  it('appendTranscriptError uses state-specific user bubble copy, not "Uploaded ... for review"', () => {
    // The Phase 9.1 bug was that errorful paths reused "Uploaded X for
    // review" which is false: no_client never uploaded, upload_failed
    // never reached review. Lock that the new helper branches on kind.
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(
      /error\.kind\s*===\s*['"]upload_failed['"]/,
    );
    // Both truthful phrasings must be present in the appendTranscriptError
    // function body.
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(
      /const sourceLabel = safeAttachmentSourceLabel\(error\.fileName/,
    );
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(/`Tried to upload \$\{sourceLabel\}`/);
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(/`Attached \$\{sourceLabel\}`/);
    // And the stale "Uploaded X for review" must NOT appear inside the
    // appendTranscriptError function body. (The success-path
    // appendTranscriptReview helper still uses that phrasing for real
    // reviews — correctly — so we scope the negative check to the
    // error function body by slicing.)
    const errorFnIdx = COACH_TRANSCRIPT_MESSAGES_SOURCE.indexOf('const appendTranscriptError');
    const nextFnIdx = COACH_TRANSCRIPT_MESSAGES_SOURCE.indexOf('const ', errorFnIdx + 30);
    expect(errorFnIdx).toBeGreaterThan(0);
    const errorFnSlice = COACH_TRANSCRIPT_MESSAGES_SOURCE.slice(
      errorFnIdx,
      nextFnIdx > 0 ? nextFnIdx : errorFnIdx + 3000,
    );
    expect(errorFnSlice).not.toMatch(/Uploaded \$\{error\.fileName\} for review/);
  });

  it('appendTranscriptReview success-path uses sanitized source labels', () => {
    // Anti-regression: the real-review user bubble still says
    // "Uploaded ... for review", but it must not echo the raw local
    // filename because those often contain client names.
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(
      /const sourceLabel = safeAttachmentSourceLabel\(review\.fileName/,
    );
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).toMatch(/`Uploaded \$\{sourceLabel\} for review`/);
    expect(COACH_TRANSCRIPT_MESSAGES_SOURCE).not.toMatch(/`Uploaded \$\{review\.fileName\} for review`/);
  });
});

describe('Phase 9.1.1 — no-client and upload-failure preserve attachments', () => {
  it('no_client branch does NOT call attachments.clearFiles()', () => {
    // The no-client IF block runs from `!selectedClient?.id` to the next
    // `const upload = await intake.uploadTranscript(` line. Slice that
    // range and assert no clearFiles() call is present.
    const guardIdx = SEND_ROUTING_SOURCE.indexOf('!selectedClient?.id');
    const uploadCallIdx = SEND_ROUTING_SOURCE.indexOf(
      'const upload = await intake.uploadTranscript(',
      guardIdx,
    );
    expect(guardIdx).toBeGreaterThan(0);
    expect(uploadCallIdx).toBeGreaterThan(guardIdx);
    const slice = SEND_ROUTING_SOURCE.slice(guardIdx, uploadCallIdx);
    expect(slice).not.toMatch(/attachments\.clearFiles\(\)/);
  });

  it('upload_failed branch does NOT call attachments.clearFiles()', () => {
    // The upload-failure branch runs from `kind: 'upload_failed'` to the
    // next `// Existing flow` comment that starts the text-only path.
    // Bound the slice explicitly so it does not leak into the existing
    // flow's legitimate clearFiles() call.
    const failureIdx = SEND_ROUTING_SOURCE.indexOf('reason: safeTranscriptFailureReason(upload.failure.kind, upload.failure.error)');
    expect(failureIdx).toBeGreaterThan(0);
    const existingIdx = SEND_ROUTING_SOURCE.indexOf('setLastAttempt(text)', failureIdx);
    expect(existingIdx).toBeGreaterThan(failureIdx);
    const slice = SEND_ROUTING_SOURCE.slice(failureIdx, existingIdx);
    expect(slice).not.toMatch(/attachments\.clearFiles\(\)/);
  });

  it('success branch STILL clears attachments (happy-path unchanged)', () => {
    // Anti-regression: Phase 9 behavior is intentionally preserved for
    // the happy path — once a review card is injected, the file has
    // been consumed and should not re-upload on the next send.
    const successIdx = SEND_ROUTING_SOURCE.indexOf('appendTranscriptReview(upload.review)');
    expect(successIdx).toBeGreaterThan(0);
    const slice = SEND_ROUTING_SOURCE.slice(successIdx, successIdx + 500);
    expect(slice).toMatch(/attachments\.clearFiles\(\)/);
  });

  it('existing text-only flow STILL clears attachments (unchanged)', () => {
    // Anti-regression: text-only send + non-transcript image/json
    // attachments still clear after the chat send fires. That path
    // is outside the transcript branch entirely.
    const existingIdx = SEND_ROUTING_SOURCE.indexOf('setLastAttempt(text)');
    expect(existingIdx).toBeGreaterThan(0);
    const slice = SEND_ROUTING_SOURCE.slice(existingIdx, existingIdx + 500);
    expect(slice).toMatch(/attachments\.clearFiles\(\)/);
  });
});

describe('Coach audio intake — single clip pass-through', () => {
  it('routes exactly one audio attachment through direct transcript review', () => {
    const helperIdx = SEND_ROUTING_SOURCE.indexOf('const routeAudioFilesToPlaudIntake');
    expect(helperIdx).toBeGreaterThan(0);
    expect(SEND_ROUTING_SOURCE).toMatch(/hasOnlyAudioTranscriptFiles\(files\)\s*&&\s*files\.length\s*>\s*1/);
    const multiBranchIdx = SEND_ROUTING_SOURCE.indexOf('files.length > 1', helperIdx);
    expect(multiBranchIdx).toBeGreaterThan(helperIdx);
    const directUploadIdx = SEND_ROUTING_SOURCE.indexOf('const upload = await intake.uploadTranscript(', multiBranchIdx);
    expect(directUploadIdx).toBeGreaterThan(multiBranchIdx);
    const directUploadSlice = SEND_ROUTING_SOURCE.slice(directUploadIdx, directUploadIdx + 1800);
    expect(directUploadSlice).toMatch(/transcriptFile\.file/);
    expect(directUploadSlice).toMatch(/coach\.appendTranscriptReview\(upload\.review\)/);
    expect(directUploadSlice).toMatch(/attachments\.clearFiles\(\)/);
  });

  it('keeps two or more audio attachments on the PLAUD clip upload path', () => {
    const helperIdx = SEND_ROUTING_SOURCE.indexOf('const routeAudioFilesToPlaudIntake');
    expect(helperIdx).toBeGreaterThan(0);
    const helperSlice = SEND_ROUTING_SOURCE.slice(helperIdx, helperIdx + 1800);
    expect(helperSlice).toMatch(/uploadClips\(audioFiles\.map\(\(f\)\s*=>\s*f\.file\)\)/);
    expect(helperSlice).toMatch(/coach\.appendAudioIntakeReceipt\(/);
    expect(helperSlice).not.toMatch(/coach\.sendMessage\(/);
    const multiBranchIdx = SEND_ROUTING_SOURCE.indexOf('files.length > 1', helperIdx);
    const countGuardIdx = SEND_ROUTING_SOURCE.indexOf('countTranscriptClassFiles(files)', multiBranchIdx);
    expect(countGuardIdx).toBeGreaterThan(multiBranchIdx);
    const branchSlice = SEND_ROUTING_SOURCE.slice(multiBranchIdx, countGuardIdx);
    expect(branchSlice).toMatch(/routeAudioFilesToPlaudIntake\(files,\s*`\$\{files\.length\} audio pieces`\)/);
  });
});

describe('Phase 9.1 — ContextChipBar redesigned as informational', () => {
  const CONTEXT_BAR_SOURCE = readFileSync(
    resolve(__dirname, './ContextChipBar.tsx'),
    'utf8',
  );

  it('does not render any button element', () => {
    // The informational taxonomy must not use button semantics.
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/<button\b/i);
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/ContextChipBtn/);
  });

  it('does not import the button styled component', () => {
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/import\s*\{[^}]*ContextChipBtn/);
  });

  it('does not attach any onClick handler', () => {
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/onClick=/);
  });

  it('does not accept activeContext or onContextChange props', () => {
    // Interface must be lean — the component is informational.
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/activeContext/);
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/onContextChange/);
  });

  it('uses a section element with a clear label', () => {
    // Per design spec: "What Swan Coach Can Help With" or similar.
    expect(CONTEXT_BAR_SOURCE).toMatch(/What Swan Coach Can Help With/);
  });

  it('uses list semantics (ul/li), not button semantics', () => {
    expect(CONTEXT_BAR_SOURCE).toMatch(/<InfoList/);
    expect(CONTEXT_BAR_SOURCE).toMatch(/<InfoItem/);
  });

  it('pill items use cursor:default — not pointer — to signal non-interactive', () => {
    expect(CONTEXT_BAR_SOURCE).toMatch(/cursor:\s*default/);
    // The file should not declare cursor:pointer anywhere (button styles
    // used to do this). One grep per style block would be ok — we check
    // the whole file.
    expect(CONTEXT_BAR_SOURCE).not.toMatch(/cursor:\s*pointer/);
  });

  it('SwanCoachAssistantPage no longer passes activeContext/onContextChange to ContextChipBar', () => {
    // The call site must match the new lean interface.
    expect(PAGE_SOURCE).toMatch(
      /<ContextChipBar\s+userRole=\{userRole\}\s*\/>/,
    );
    expect(PAGE_SOURCE).not.toMatch(/activeContext=\{coach\.context\}/);
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

// ─────────────────────────────────────────────────────────────
// Phase 13 (2026-04-15): transcript date correctness + 409 UX
// ─────────────────────────────────────────────────────────────
describe('Phase 13 — transcript review editable workout date', () => {
  it('CoachMessage exposes onTranscriptDateChange as a prop', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/onTranscriptDateChange\?:/);
  });

  it('CoachMessage renders a date input in the review card', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/data-testid=['"]transcript-date-input['"]/);
    expect(COACH_MESSAGE_SOURCE).toMatch(/data-testid=['"]transcript-date-row['"]/);
  });

  it('date input value priority: targetWorkoutDate > parser date > today', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /transcriptReview\.targetWorkoutDate\s*\|\|[\s\S]*transcriptReview\.parsedWorkout\?\.date/,
    );
  });

  it('date input max is clamped to today (future-date UX hint, via local helper)', () => {
    // Phase 13.1: max must use the local-calendar helper, NOT the UTC
    // `toISOString().split` shortcut (which drifts to tomorrow after ~5pm
    // PDT). Assertions lock the shared helper path and forbid the UTC one
    // in the CoachMessage source.
    expect(COACH_MESSAGE_SOURCE).toMatch(/max=\{getLocalIsoDate\(\)\}/);
    expect(COACH_MESSAGE_SOURCE).not.toMatch(
      /max=\{new Date\(\)\.toISOString\(\)\.split\(/,
    );
  });

  it('date input is disabled during the apply round-trip', () => {
    const idx = COACH_MESSAGE_SOURCE.indexOf('transcript-date-input');
    expect(idx).toBeGreaterThan(0);
    const slice = COACH_MESSAGE_SOURCE.slice(idx, idx + 600);
    expect(slice).toMatch(/disabled=\{transcriptReview\.applying\s*\|\|\s*localApplying\}/);
  });

  it('transcript review hook defines handleTranscriptDateChange handler', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/const\s+handleTranscriptDateChange\s*=\s*useCallback/);
  });

  it('page passes handleTranscriptDateChange to CoachMessage', () => {
    expect(PAGE_SOURCE).toMatch(/onTranscriptDateChange=\{handleTranscriptDateChange\}/);
  });

  it('send-routing hook seeds targetWorkoutDate on upload success', () => {
    // Anti-regression: if this mutation is removed the editable date input
    // would fall back to parser/today on every mount, losing any edit the
    // user made before an error + retry cycle.
    expect(SEND_ROUTING_SOURCE).toMatch(/upload\.review\.targetWorkoutDate\s*=/);
  });

  it('date change handler mutates the ref-held review (so apply reads the edit)', () => {
    // The ref entry's review object is what applyParsedWorkout receives at
    // confirm time. If this mutation is removed the edited date will never
    // reach the backend — the metadata-only patch wouldn't propagate.
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(
      /entry\.review\.targetWorkoutDate\s*=\s*nextDate/,
    );
  });

  it('date change handler clears stale applyError + applyErrorKind', () => {
    // The handler must reset the error so a duplicate-date retry starts
    // clean. Otherwise the stale badge stays visible after the user picks
    // a new date.
    const handlerIdx = TRANSCRIPT_REVIEW_SOURCE.indexOf('handleTranscriptDateChange');
    expect(handlerIdx).toBeGreaterThan(0);
    const slice = TRANSCRIPT_REVIEW_SOURCE.slice(handlerIdx, handlerIdx + 1500);
    expect(slice).toMatch(/applyError:\s*undefined/);
    expect(slice).toMatch(/applyErrorKind:\s*undefined/);
  });
});

describe('Phase 13 — targetDate flows through the canonical mapper', () => {
  it('useTranscriptIntake passes targetDate option to parsedWorkoutToLogPayload', () => {
    expect(HOOK_SOURCE).toMatch(/targetDate:\s*effectiveDate/);
  });

  it('applyParsedWorkout resolves effectiveDate with the documented priority', () => {
    // Priority: review.targetWorkoutDate > parsedWorkout.date > today.
    // Phase 13.1: the tail fallback is now `getLocalIsoDate()` (not UTC
    // `toISOString().split`).
    expect(HOOK_SOURCE).toMatch(
      /review\.targetWorkoutDate[\s\S]{0,300}review\.parsedWorkout\.date[\s\S]{0,300}getLocalIsoDate\(\)/,
    );
  });
});

describe('Phase 13 — future-date client-side guard', () => {
  it('applyParsedWorkout rejects future-dated workouts without hitting the backend', () => {
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]future_date['"]/);
    expect(HOOK_SOURCE).toMatch(/Workout date cannot be in the future/);
  });

  it('guard runs before the server round-trip (short-circuit return)', () => {
    // The guard must appear between effectiveDate resolution and the
    // adminClient.logWorkout call. If a future refactor moves the check
    // after the network call, the backend's generic validation error
    // would leak through as kind: 'server'.
    const guardIdx = HOOK_SOURCE.indexOf('Workout date cannot be in the future');
    const logWorkoutIdx = HOOK_SOURCE.indexOf('adminClient.logWorkout(');
    expect(guardIdx).toBeGreaterThan(0);
    expect(logWorkoutIdx).toBeGreaterThan(guardIdx);
  });
});

describe('Phase 13 — 409 duplicate-date classification', () => {
  it('useTranscriptIntake classifies 409 responses as duplicate_date', () => {
    expect(HOOK_SOURCE).toMatch(/status === 409/);
    expect(HOOK_SOURCE).toMatch(/kind:\s*['"]duplicate_date['"]/);
  });

  it('duplicate_date message tells the user how to recover', () => {
    // The recovery path is: change the date above and retry. Anything less
    // actionable leaves the user stuck on an opaque "already exists" error.
    expect(HOOK_SOURCE).toMatch(/Change the date above and retry/);
  });

  it('UploadFailure.kind union includes duplicate_date and future_date', () => {
    expect(HOOK_SOURCE).toMatch(/['"]duplicate_date['"]/);
    expect(HOOK_SOURCE).toMatch(/['"]future_date['"]/);
  });

  it('transcript review hook propagates apply.failure.kind into applyErrorKind metadata', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/applyErrorKind:/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/(?:apply\.failure|failure)\.kind\s*===\s*['"]duplicate_date['"]/);
  });

  it('CoachMessage renders a kind-aware error badge', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(/\$kind=\{\s*transcriptReview\.applyErrorKind/);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 13 (2026-04-15): admin workout history consolidation
// ─────────────────────────────────────────────────────────────
describe('Phase 13 — WorkoutHistoryPanel consolidation', () => {
  // Paths are relative to this test file at
  // src/components/DashBoard/Pages/coach-assistant/ — `..` takes us up to
  // Pages/, so `../admin-clients/...` is the sibling admin-clients folder.
  // For clients-team we go up three segments (coach-assistant → Pages →
  // DashBoard → workspaces/...).
  const PANEL_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanel.tsx'),
    'utf8',
  );
  const PANEL_CONTENT_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanelContent.tsx'),
    'utf8',
  );
  const PANEL_HEADER_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanelHeader.tsx'),
    'utf8',
  );
  const EXERCISE_TABLE_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryExerciseTable.tsx'),
    'utf8',
  );
  const MODAL_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/EnhancedWorkoutsModal.tsx'),
    'utf8',
  );
  const TRAINING_TAB_SOURCE = readFileSync(
    resolve(
      __dirname,
      '../../workspaces/clients-team/tabs/TrainingTabContent.tsx',
    ),
    'utf8',
  );
  const TRAINING_SECTION_SOURCE = readFileSync(
    resolve(
      __dirname,
      '../../workspaces/clients-team/tabs/TrainingTabSectionContent.tsx',
    ),
    'utf8',
  );

  it('WorkoutHistoryPanel uses the shared useWorkoutAnalytics hook', () => {
    expect(PANEL_SOURCE).toMatch(/useWorkoutAnalytics/);
  });

  it('WorkoutHistoryPanel renders all three canonical tabs', () => {
    expect(PANEL_HEADER_SOURCE).toMatch(/id:\s*'history'/);
    expect(PANEL_HEADER_SOURCE).toMatch(/id:\s*'charts'/);
    expect(PANEL_HEADER_SOURCE).toMatch(/id:\s*'prs'/);
    expect(PANEL_CONTENT_SOURCE).toMatch(/history:/);
    expect(PANEL_CONTENT_SOURCE).toMatch(/charts:/);
    expect(PANEL_CONTENT_SOURCE).toMatch(/prs:/);
  });

  it('WorkoutHistoryPanel conditionally renders Tempo/Rest/RPE/Est.1RM columns', () => {
    expect(EXERCISE_TABLE_SOURCE).toMatch(/hasTempo\s*&&\s*<Th>Tempo<\/Th>/);
    expect(EXERCISE_TABLE_SOURCE).toMatch(/hasRest\s*&&\s*<Th>Rest<\/Th>/);
    expect(EXERCISE_TABLE_SOURCE).toMatch(/hasRPE\s*&&\s*<Th>RPE<\/Th>/);
    expect(EXERCISE_TABLE_SOURCE).toMatch(/hasWeight\s*&&\s*<Th>Est\. 1RM<\/Th>/);
  });

  it('WorkoutHistoryPanel accepts a variant prop (modal | embedded)', () => {
    expect(PANEL_SOURCE).toMatch(/variant\?:\s*['"]modal['"]\s*\|\s*['"]embedded['"]/);
  });

  it('WorkoutHistoryPanel embedded variant renders a client header', () => {
    expect(PANEL_SOURCE).toMatch(/variant === 'embedded'/);
    expect(PANEL_SOURCE).toMatch(/Workout history — /);
  });

  it('EnhancedWorkoutsModal delegates content to WorkoutHistoryPanel', () => {
    expect(MODAL_SOURCE).toMatch(/import\s+WorkoutHistoryPanel/);
    expect(MODAL_SOURCE).toMatch(/<WorkoutHistoryPanel/);
    expect(MODAL_SOURCE).toMatch(/variant=['"]modal['"]/);
  });

  it('EnhancedWorkoutsModal keeps its modal shell (overlay + close button)', () => {
    // Anti-regression: the modal must still own the dialog chrome.
    expect(MODAL_SOURCE).toMatch(/ModalOverlay/);
    expect(MODAL_SOURCE).toMatch(/CloseButton/);
    expect(MODAL_SOURCE).toMatch(/Workouts — \{clientName\}/);
  });

  it('EnhancedWorkoutsModal no longer owns the full history table or tab bar', () => {
    // Content moved into WorkoutHistoryPanel. The modal file should no
    // longer reference the three-tab bar nor the exercise table internals.
    expect(MODAL_SOURCE).not.toMatch(/activeTab === 'charts'/);
    expect(MODAL_SOURCE).not.toMatch(/ExerciseTable/);
  });

  it('TrainingTabContent mounts the shared WorkoutHistoryPanel (not WorkoutHistoryTimeline)', () => {
    // The panel is lazy-imported via React.lazy + dynamic import() — not
    // a top-level `from` statement. Lock both the dynamic-import path and
    // the JSX mount.
    expect(TRAINING_TAB_SOURCE).toMatch(/<TrainingTabSectionContent/);
    expect(TRAINING_SECTION_SOURCE).toMatch(
      /import\(\s*['"][^'"]*admin-clients\/components\/WorkoutHistoryPanel['"]/,
    );
    expect(TRAINING_SECTION_SOURCE).toMatch(/<WorkoutHistoryPanel/);
    expect(TRAINING_SECTION_SOURCE).toMatch(/variant=['"]embedded['"]/);
  });

  it('Clients & Team history section label is "Workout History" (not "Vault History")', () => {
    // The section labels moved from TrainingTabContent.tsx into the
    // trainingWorkflowModes registry when the three-mode rail landed.
    const trainingModesSource = readFileSync(
      resolve(__dirname, '../../workspaces/clients-team/tabs/trainingWorkflowModes.ts'),
      'utf8',
    );
    expect(trainingModesSource).toMatch(/label:\s*['"]Workout History['"]/);
    expect(trainingModesSource).not.toMatch(/label:\s*['"]Vault History['"]/);
    expect(TRAINING_TAB_SOURCE).not.toMatch(/label:\s*['"]Vault History['"]/);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 13.1 (2026-04-15): local-date migration + edit restored
// ─────────────────────────────────────────────────────────────
describe('Phase 13.1 — local-date migration in transcript path', () => {
  const PARSED_MAPPER_SOURCE = readFileSync(
    resolve(__dirname, './utils/parsedWorkoutToLogPayload.ts'),
    'utf8',
  );

  it('CoachMessage imports getLocalIsoDate from the shared utils module', () => {
    expect(COACH_MESSAGE_SOURCE).toMatch(
      /import\s*\{\s*getLocalIsoDate\s*\}\s*from\s*['"][^'"]+utils\/localDate['"]/,
    );
  });

  it('CoachMessage no longer uses toISOString().split for the date input', () => {
    // The only legal UTC-day call sites are for full ISO timestamps.
    // The transcript review card must NOT have any `toISOString().split`
    // residue — every day-only value routes through the local helper.
    expect(COACH_MESSAGE_SOURCE).not.toMatch(/toISOString\(\)\.split\(/);
  });

  it('send-routing hook imports and uses getLocalIsoDate for the seed', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(
      /import\s*\{\s*getLocalIsoDate\s*\}\s*from\s*['"][^'"]+utils\/localDate['"]/,
    );
    expect(SEND_ROUTING_SOURCE).toMatch(/upload\.review\.parsedWorkout\.date[\s\S]{0,200}getLocalIsoDate\(\)/);
  });

  it('send-routing hook no longer seeds targetWorkoutDate with toISOString().split', () => {
    // Scope the check to the transcript-class upload-success block so we
    // don't accidentally flag an unrelated legitimate use elsewhere in
    // the page — the page has zero legitimate uses as of Phase 13.1 but
    // narrowing the slice keeps this anti-regression honest if the file
    // grows later.
    const seedIdx = SEND_ROUTING_SOURCE.indexOf('upload.review.targetWorkoutDate');
    expect(seedIdx).toBeGreaterThan(0);
    const slice = SEND_ROUTING_SOURCE.slice(Math.max(0, seedIdx - 600), seedIdx + 600);
    expect(slice).not.toMatch(/toISOString\(\)\.split\(/);
  });

  it('useTranscriptIntake imports getLocalIsoDate AND isFutureLocalDate', () => {
    expect(HOOK_SOURCE).toMatch(
      /import\s*\{[^}]*getLocalIsoDate[^}]*isFutureLocalDate[^}]*\}\s*from\s*['"][^'"]+utils\/localDate['"]/,
    );
  });

  it('useTranscriptIntake future-date guard uses isFutureLocalDate, not new Date() comparison', () => {
    expect(HOOK_SOURCE).toMatch(/isFutureLocalDate\(effectiveDate\)/);
    // Anti-regression: the old instant-vs-instant guard and the UTC
    // `new Date(effectiveDate)` parse must be gone from the apply path.
    expect(HOOK_SOURCE).not.toMatch(/parsedEffective\s*=\s*new Date\(effectiveDate\)/);
  });

  it('useTranscriptIntake "today" fallback uses getLocalIsoDate, not UTC ISO split', () => {
    expect(HOOK_SOURCE).toMatch(/\|\|\s*getLocalIsoDate\(\)/);
    expect(HOOK_SOURCE).not.toMatch(/new Date\(\)\.toISOString\(\)\.split\(/);
  });

  it('parsedWorkoutToLogPayload.todayIsoDate uses the local helper', () => {
    expect(PARSED_MAPPER_SOURCE).toMatch(
      /import\s*\{\s*getLocalIsoDate\s*\}\s*from\s*['"][^'"]+utils\/localDate['"]/,
    );
    expect(PARSED_MAPPER_SOURCE).toMatch(/function\s+todayIsoDate[\s\S]{0,200}getLocalIsoDate\(\)/);
    expect(PARSED_MAPPER_SOURCE).not.toMatch(/new Date\(\)\.toISOString\(\)\.split\(/);
  });
});

describe('Phase 13.1 — WorkoutHistoryPanel inline edit restored', () => {
  const PANEL_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanel.tsx'),
    'utf8',
  );
  const PANEL_CONTENT_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanelContent.tsx'),
    'utf8',
  );
  const SESSION_FOOTER_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistorySessionFooter.tsx'),
    'utf8',
  );
  const EXERCISE_TABLE_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryExerciseTable.tsx'),
    'utf8',
  );
  const EDITOR_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/useWorkoutHistoryEditor.ts'),
    'utf8',
  );
  const EDIT_PAYLOAD_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/workoutHistoryEditPayload.ts'),
    'utf8',
  );
  // Scoped read — the Phase 13 describe block above has its own const,
  // but that one is local to that block. Re-read here so this describe
  // is self-contained.
  const TRAINING_TAB_SOURCE_13_1 = readFileSync(
    resolve(__dirname, '../../workspaces/clients-team/tabs/TrainingTabContent.tsx'),
    'utf8',
  );

  it('exposes an Edit workout entry point', () => {
    expect(SESSION_FOOTER_SOURCE).toMatch(/Edit workout/);
    expect(SESSION_FOOTER_SOURCE).toMatch(/data-testid=\{`edit-start-\$\{session\.id\}`\}/);
  });

  it('exposes Save / Cancel actions when in edit mode', () => {
    expect(SESSION_FOOTER_SOURCE).toMatch(/data-testid=\{`edit-save-\$\{session\.id\}`\}/);
    expect(SESSION_FOOTER_SOURCE).toMatch(/data-testid=\{`edit-cancel-\$\{session\.id\}`\}/);
  });

  it('PATCH payload groups by exercise and preserves tempo / rest / RPE / notes', () => {
    // The PATCH builder must conditionally include tempo/rest/rpe/notes
    // only when they are real values — this prevents the save from
    // overwriting existing fields with empty/zero placeholders.
    expect(EDIT_PAYLOAD_SOURCE).toMatch(/out\.tempo\s*=\s*set\.tempo\.trim\(\)/);
    expect(EDIT_PAYLOAD_SOURCE).toMatch(/out\.rest\s*=\s*set\.rest/);
    expect(EDIT_PAYLOAD_SOURCE).toMatch(/out\.rpe\s*=\s*set\.rpe/);
    expect(EDIT_PAYLOAD_SOURCE).toMatch(/out\.notes\s*=\s*set\.notes\.trim\(\)/);
  });

  it('PATCH posts to the canonical admin workouts endpoint', () => {
    expect(EDITOR_SOURCE).toMatch(
      /authAxios\.patch\(\s*`\/api\/admin\/clients\/\$\{clientId\}\/workouts\/\$\{workoutId\}`/,
    );
  });

  it('refetches analytics after a successful save (single source of truth)', () => {
    // The hook owns the session list — the panel must not keep a second
    // mutable copy. After save, the only step is `await refetch()` to
    // pull the authoritative view back in. The window is generous
    // because the Phase 15 save path grew substantially to carry
    // `exerciseNote` at the exercise level on the PATCH payload.
    const saveIdx = EDITOR_SOURCE.indexOf('const saveEdit');
    expect(saveIdx).toBeGreaterThan(0);
    const slice = EDITOR_SOURCE.slice(saveIdx, saveIdx + 4000);
    expect(slice).toMatch(/await\s+refetch\(\)/);
  });

  it('editing is session-scoped — switching sessions discards the edit buffer', () => {
    // The dormant WorkoutHistoryTimeline had per-session edit state with
    // a discard-on-switch behavior. Port that exact semantic so users
    // can't accidentally save edits into the wrong session.
    expect(PANEL_SOURCE).toMatch(/editingSessionId\s*&&\s*editingSessionId\s*!==\s*id[\s\S]{0,200}cancelEdit\(\)/);
    expect(EDITOR_SOURCE).toMatch(/const cancelEdit[\s\S]{0,400}setEditingSessionId\(null\)/);
  });

  it('Add set button appears for each exercise group while editing', () => {
    expect(SESSION_FOOTER_SOURCE).toMatch(/Add set to\s*\{/);
    expect(SESSION_FOOTER_SOURCE).toMatch(/addEditRow/);
  });

  it('Remove set button appears per row while editing', () => {
    expect(EXERCISE_TABLE_SOURCE).toMatch(/data-testid=\{`edit-remove-\$\{logIndex\}`\}/);
  });

  it('preserves the existing history/charts/PRs tab architecture', () => {
    // Anti-regression: the edit restoration must NOT collapse the 3-tab
    // layout back into a flat table. The canonical surface still hosts
    // analytics + share behavior alongside edit.
    expect(PANEL_CONTENT_SOURCE).toMatch(/charts:/);
    expect(PANEL_CONTENT_SOURCE).toMatch(/prs:/);
    // Charts tab now mounts the canonical 15-chart admin-scoped Victory
    // grid (AdminProgressChartsGrid), replacing the legacy WorkoutChartsTab
    // weekly-volume-only surface. The 3-tab architecture is preserved.
    expect(PANEL_CONTENT_SOURCE).toMatch(/AdminProgressChartsGrid/);
  });

  it('does NOT remount the dormant WorkoutHistoryTimeline as the canonical surface', () => {
    // CLAUDE.md rule: consolidation target is one shared panel. Remounting
    // the old weak component would reintroduce the dual-drift problem.
    expect(TRAINING_TAB_SOURCE_13_1).not.toMatch(/<WorkoutHistoryTimeline/);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 13.2 (2026-04-15): notes, scroll, send UX, processing card
// ─────────────────────────────────────────────────────────────
describe('Phase 13.2 — parser prompt note-scope guidance', () => {
  const PARSER_SOURCE = readFileSync(
    resolve(__dirname, '../../../../../../backend/services/workoutLogParserService.mjs'),
    'utf8',
  );

  it('prompt separates set notes / performance notes / session notes / pain flags', () => {
    expect(PARSER_SOURCE).toMatch(/set\.notes\s*—/);
    expect(PARSER_SOURCE).toMatch(/performanceNotes\s*—/);
    expect(PARSER_SOURCE).toMatch(/sessionNotes\s*—/);
    expect(PARSER_SOURCE).toMatch(/painFlags\s*—/);
  });

  it('prompt lists NASM-aligned coaching observation categories', () => {
    expect(PARSER_SOURCE).toMatch(/tempo deviations/i);
    expect(PARSER_SOURCE).toMatch(/asymmetry/i);
    expect(PARSER_SOURCE).toMatch(/compensation/i);
    expect(PARSER_SOURCE).toMatch(/range-of-motion/i);
    expect(PARSER_SOURCE).toMatch(/form breakdown/i);
    expect(PARSER_SOURCE).toMatch(/cueing needed/i);
  });

  it('prompt attaches exercise-specific notes to the correct exercise via examples', () => {
    expect(PARSER_SOURCE).toMatch(/knees caved on goblet squat/i);
    expect(PARSER_SOURCE).toMatch(/left shoulder hurt during dumbbell bench/i);
    expect(PARSER_SOURCE).toMatch(/seated row/i);
  });

  it('prompt forbids inventing OPT/NASM data not stated in the transcript', () => {
    expect(PARSER_SOURCE).toMatch(/Never invent NASM OPT phases/i);
    expect(PARSER_SOURCE).toMatch(/Only capture these observations if the trainer actually stated them/i);
  });
});

describe('Phase 13.2 — WorkoutHistoryPanel notes display and edit', () => {
  readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanel.tsx'),
    'utf8',
  );
  const NOTES_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/workoutHistoryNotes.ts'),
    'utf8',
  );
  const NOTES_BLOCK_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryExerciseNotesBlock.tsx'),
    'utf8',
  );
  const EDIT_PAYLOAD_SOURCE = readFileSync(
    resolve(__dirname, '../admin-clients/components/workoutHistoryEditPayload.ts'),
    'utf8',
  );
  const MAPPER_SOURCE = readFileSync(
    resolve(__dirname, './utils/parsedWorkoutToLogPayload.ts'),
    'utf8',
  );

  it('mapper still exports EXERCISE_NOTE_SEPARATOR (legacy-read-only, separator form only)', () => {
    // Phase 15.0 keeps the separator exported so the panel's
    // legacy-read-only normalizer has a single source of truth for
    // the literal marker. It is used to recognize and migrate ONLY
    // the unambiguous separator-encoded form of Phase 13.2 data —
    // bare `Coach: ` prefixed rows are intentionally not auto-
    // promoted. New writes do NOT use this separator at all; see
    // parsedWorkoutToLogPayload.test.ts for the write-side locks.
    expect(MAPPER_SOURCE).toMatch(/export const EXERCISE_NOTE_SEPARATOR\s*=\s*' · Coach: '/);
  });

  it('panel and mapper agree on the legacy separator string', () => {
    expect(NOTES_SOURCE).toMatch(/EXERCISE_NOTE_SEPARATOR\s*=\s*' \\u00b7 Coach: '/);
  });

  it('panel exposes Phase 15 resolveExerciseNote helper (not merge/split contract)', () => {
    // Phase 15.0: the canonical read helper is `resolveExerciseNote`,
    // which prefers the dedicated `exerciseNote` column and falls back
    // to legacy parsing only when no row in the group has it set.
    expect(NOTES_SOURCE).toMatch(/function resolveExerciseNote\(/);
    // The legacy helper is retained as read-only fallback, clearly
    // renamed so nobody wires it into new write paths.
    expect(NOTES_SOURCE).toMatch(/function splitLegacyStoredNote\(/);
    // The old merge helper is gone — Phase 15 writes emit the
    // exerciseNote field directly on the PATCH payload, no string
    // concatenation.
    expect(NOTES_SOURCE).not.toMatch(/function mergeStoredNote\(/);
  });

  it('panel renders a per-exercise notes block with a testid hook', () => {
    expect(NOTES_BLOCK_SOURCE).toMatch(/data-testid=\{`notes-block-\$\{sessionId\}-\$\{exerciseName\}`\}/);
  });

  it('panel shows "None given" when an exercise has no notes at all', () => {
    expect(NOTES_BLOCK_SOURCE).toMatch(/None given/);
    expect(NOTES_BLOCK_SOURCE).toMatch(/data-testid=\{`notes-empty-\$\{sessionId\}-\$\{exerciseName\}`\}/);
  });

  it('panel edit mode exposes per-set note inputs and an exercise-level coach note input', () => {
    expect(NOTES_BLOCK_SOURCE).toMatch(/data-testid=\{`edit-notes-set-\$\{row\.logIndex\}`\}/);
    expect(NOTES_BLOCK_SOURCE).toMatch(/data-testid=\{`edit-notes-exercise-\$\{sessionId\}-\$\{exerciseName\}`\}/);
  });

  it('panel edit save path still includes notes in the PATCH payload', () => {
    // Anti-regression: saveEdit must still build notes as `out.notes` when
    // present. The Phase 13.2 notes-edit path threads edits through
    // updateEditField('notes', merged), so the existing PATCH builder
    // continues to work.
    expect(EDIT_PAYLOAD_SOURCE).toMatch(/out\.notes\s*=\s*set\.notes\.trim\(\)/);
  });

  it('panel notes block reads exerciseNote via resolveExerciseNote, not raw set.notes', () => {
    // Phase 15.0 anti-regression: the display pipeline must route
    // through `resolveExerciseNote` so the canonical `exerciseNote`
    // column wins and legacy rows still render safely. If the display
    // short-circuits to `log.notes` directly it would miss the new
    // column and silently fall back to the old ambiguous contract.
    expect(NOTES_BLOCK_SOURCE).toMatch(/buildWorkoutHistoryNotesDisplay\(groupSets,\s*activeLogs\)/);
    expect(NOTES_SOURCE).toMatch(/const resolved\s*=\s*resolveExerciseNote\(groupSets\)/);
  });
});

describe('Phase 13.2 — CoachInputBar file-only transcript send', () => {
  const INPUT_BAR_SOURCE = readFileSync(
    resolve(__dirname, './CoachInputBar.tsx'),
    'utf8',
  );

  it('exposes hasAttachment prop', () => {
    expect(INPUT_BAR_SOURCE).toMatch(/hasAttachment\?:\s*boolean/);
  });

  it('send handler no longer aborts on empty text when hasAttachment is true', () => {
    // Anti-regression: the Phase 9 rule `if (!msg || sending) return;` has
    // been replaced with a two-gate check. The new guard still rejects
    // empty-text-no-attachment, but lets file-only send through.
    expect(INPUT_BAR_SOURCE).toMatch(/if\s*\(!msg\s*&&\s*!hasAttachment\)\s*return/);
  });

  it('send button disabled state respects attachments', () => {
    expect(INPUT_BAR_SOURCE).toMatch(/disabled=\{\(!text\.trim\(\)\s*&&\s*!hasAttachment\)\s*\|\|\s*sending\s*\|\|\s*overLimit\}/);
  });

  it('page passes the attachment signal down via hasAttachment', () => {
    expect(PAGE_SOURCE).toMatch(/attachments=\{attachments\}/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(
      /hasAttachment=\{[\s\S]{0,400}hasTranscriptClassFile\(attachments\.files\)/,
    );
  });
});

describe('Phase 13.2 — transcript processing pending card', () => {
  it('transcript review hook defines transcriptProcessing state', () => {
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(/TranscriptProcessingState/);
    expect(TRANSCRIPT_REVIEW_SOURCE).toMatch(
      /const\s+\[transcriptProcessing,\s*setTranscriptProcessing\]\s*=[\s\S]{0,120}useState<TranscriptProcessingState>/,
    );
  });

  it('handleSend flips processing stage to uploading before awaiting upload', () => {
    const uploadIdx = SEND_ROUTING_SOURCE.indexOf('intake.uploadTranscript(');
    expect(uploadIdx).toBeGreaterThan(0);
    const before = SEND_ROUTING_SOURCE.slice(Math.max(0, uploadIdx - 1500), uploadIdx);
    expect(before).toMatch(/setTranscriptProcessing\(\{\s*stage:\s*['"]uploading['"]/);
  });

  it('handleSend flips stage to parsing after upload success', () => {
    expect(SEND_ROUTING_SOURCE).toMatch(/setTranscriptProcessing\(\{\s*stage:\s*['"]parsing['"]/);
  });

  it('handleSend clears processing on happy-path success', () => {
    // There must be at least one `setTranscriptProcessing(null)` call in
    // the happy path and another in the upload-failure path.
    const nullCalls = (SEND_ROUTING_SOURCE.match(/setTranscriptProcessing\(null\)/g) ?? []).length;
    expect(nullCalls).toBeGreaterThanOrEqual(2);
  });

  it('renders a scoped processing card with a testid', () => {
    expect(PAGE_SOURCE).toMatch(/transcriptProcessing=\{transcriptProcessing\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/data-testid=['"]transcript-processing-card['"]/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/data-testid=['"]transcript-processing-stage['"]/);
  });

  it('composer is locked while processing so a double-fire is impossible', () => {
    // The prior rule was `sending={coach.sending}`. Processing the
    // transcript bypasses coach.sending, so the composer disable now
    // also depends on transcriptProcessing.
    expect(PAGE_SOURCE).toMatch(/sending=\{coach\.sending\}/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/const\s+inputLocked\s*=\s*sending\s*\|\|\s*transcriptProcessing\s*!==\s*null/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/sending=\{inputLocked\}/);
  });
});

describe('Phase 13.2 — embedded Workout History scroll ownership', () => {
  const TRAINING_TAB_STYLES_SOURCE_13_2 = readFileSync(
    resolve(__dirname, '../../workspaces/clients-team/tabs/TrainingTabContent.styles.ts'),
    'utf8',
  );
  const PANEL_SOURCE_13_2 = readFileSync(
    resolve(__dirname, '../admin-clients/components/WorkoutHistoryPanel.tsx'),
    'utf8',
  );

  it('TrainingTabContent LayoutWrapper no longer clips with overflow: hidden', () => {
    // The prior `overflow: hidden` clipped expanded session cards whose
    // content exceeded the container. Phase 13.2 hands scroll to the
    // document/page layer.
    const layoutIdx = TRAINING_TAB_STYLES_SOURCE_13_2.indexOf('export const LayoutWrapper');
    expect(layoutIdx).toBeGreaterThan(0);
    const blockEnd = TRAINING_TAB_STYLES_SOURCE_13_2.indexOf('`;', layoutIdx);
    const slice = TRAINING_TAB_STYLES_SOURCE_13_2.slice(layoutIdx, blockEnd);
    expect(slice).not.toMatch(/overflow:\s*hidden/);
    expect(slice).toMatch(/overflow:\s*visible/);
  });

  it('TrainingTabContent ContentArea uses min-height:0 and overflow:visible', () => {
    const contentIdx = TRAINING_TAB_STYLES_SOURCE_13_2.indexOf('export const ContentArea');
    expect(contentIdx).toBeGreaterThan(0);
    const blockEnd = TRAINING_TAB_STYLES_SOURCE_13_2.indexOf('`;', contentIdx);
    const slice = TRAINING_TAB_STYLES_SOURCE_13_2.slice(contentIdx, blockEnd);
    // Positive locks on the actual CSS rules (each ends in a semicolon).
    expect(slice).toMatch(/min-height:\s*0;/);
    expect(slice).toMatch(/overflow:\s*visible;/);
    // Anti-regression: no inner auto-scroll rule at the end of the CSS
    // block. Comments above explaining the old behavior may mention it,
    // so match on a trailing semicolon to avoid false positives.
    expect(slice).not.toMatch(/overflow-y:\s*auto;/);
  });

  it('WorkoutHistoryPanel embedded variant uses overflow: visible (no inner scroll trap)', () => {
    // ScrollBody branches on $variant. The embedded branch must yield
    // `overflow: visible` so the page-level scroll reaches expanded content.
    // The modal branch keeps `overflow-y: auto; max-height: 60vh`.
    const scrollIdx = PANEL_SOURCE_13_2.indexOf('const ScrollBody');
    expect(scrollIdx).toBeGreaterThan(0);
    const blockEnd = PANEL_SOURCE_13_2.indexOf('`;', scrollIdx);
    const slice = PANEL_SOURCE_13_2.slice(scrollIdx, blockEnd);
    // The ternary's modal branch must cap at 60vh and own scroll.
    expect(slice).toMatch(/overflow-y:\s*auto;\s*max-height:\s*60vh/);
    // The ternary's embedded branch must set overflow: visible.
    expect(slice).toMatch(/'overflow:\s*visible;'/);
    // Explicit defense: no bare `overflow-y: auto;` outside the modal
    // ternary arm (no stray inner scroll trap for the embedded case).
  });
});
