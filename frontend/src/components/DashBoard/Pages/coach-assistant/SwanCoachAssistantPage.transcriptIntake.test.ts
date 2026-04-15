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
    // The guard must check selectedClient.id inside the transcript-class
    // branch. We verify the presence of both anchors; strict proximity is
    // not tested because Phase 9.1 reordered the branch body.
    expect(PAGE_SOURCE).toMatch(/hasTranscriptClassFile\(files\)/);
    expect(PAGE_SOURCE).toMatch(/!selectedClient\?\.id/);
    // And they must appear in source order (guard before the selected-
    // client check), so a future refactor that moves the check above the
    // branch still fails loudly.
    const guardIdx = PAGE_SOURCE.indexOf('hasTranscriptClassFile(files)');
    const checkIdx = PAGE_SOURCE.indexOf('!selectedClient?.id');
    expect(guardIdx).toBeGreaterThan(0);
    expect(checkIdx).toBeGreaterThan(guardIdx);
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

  it('handleSend clears attachments on the happy-path and existing-flow sends only', () => {
    // Phase 9.1.1 polish: error branches (no_client + upload_failed) no
    // longer clear attachments so the user can retry without re-picking
    // the file. Only the upload-success branch and the text-only
    // existing-flow branch should clear.
    const clearCount = (PAGE_SOURCE.match(/attachments\.clearFiles\(\)/g) ?? []).length;
    expect(clearCount).toBe(2);
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

describe('Phase 9.1 — selected-client hydration fix', () => {
  it('flips the fetch-started ref when clientList is already populated (state D)', () => {
    // The original ref gate only flipped on observed loadingClients=true,
    // which stranded pages navigated-into after clients were pre-loaded.
    // The fix: also flip the ref when `clientList.length > 0` because
    // that's implicit confirmation that a fetch cycle completed.
    expect(PAGE_SOURCE).toMatch(
      /!clientListFetchStartedRef\.current\s*&&\s*clientList\.length\s*>\s*0/,
    );
    expect(PAGE_SOURCE).toMatch(
      /clientListFetchStartedRef\.current\s*=\s*true/,
    );
  });

  it('still gates on genuine pre-load window (state A: empty list, no fetch observed)', () => {
    // Anti-regression: the state-A guard must still bail when the list
    // is empty AND no fetch has been observed. Otherwise the URL-param
    // branch would incorrectly clear selectedClient on a legitimate
    // clientId that hasn't loaded yet.
    expect(PAGE_SOURCE).toMatch(
      /if\s*\(!clientListFetchStartedRef\.current\)\s*return;/,
    );
  });
});

describe('Phase 9.1 — missing-client validation uses error card, not fake review', () => {
  it('handleSend calls appendTranscriptError on no-client, NOT appendTranscriptReview', () => {
    // The no-client branch is the `if (!selectedClient?.id) { ... }` block
    // followed by `const upload = await intake.uploadTranscript(`. Bound
    // the search to that range so we don't accidentally match the later
    // success branch's appendTranscriptReview call.
    const noClientGuardIdx = PAGE_SOURCE.indexOf('!selectedClient?.id');
    expect(noClientGuardIdx).toBeGreaterThan(0);
    const uploadCallIdx = PAGE_SOURCE.indexOf(
      'const upload = await intake.uploadTranscript(',
      noClientGuardIdx,
    );
    expect(uploadCallIdx).toBeGreaterThan(noClientGuardIdx);
    const slice = PAGE_SOURCE.slice(noClientGuardIdx, uploadCallIdx);
    expect(slice).toMatch(/coach\.appendTranscriptError\(/);
    expect(slice).not.toMatch(/coach\.appendTranscriptReview\(/);
  });

  it('no-client error path captures errorMsgId into transcriptReviewsRef', () => {
    // The Phase 9 bug: the no-client branch discarded the return value,
    // leaving Dismiss as a no-op. Lock that the ids are stored.
    expect(PAGE_SOURCE).toMatch(
      /appendTranscriptError[\s\S]{0,800}transcriptReviewsRef\.current\.set\(\s*errorMsgId/,
    );
  });

  it('upload-failure branch also uses appendTranscriptError', () => {
    // Second bug site: the upload-failed branch had the same dead-id bug.
    expect(PAGE_SOURCE).toMatch(
      /kind:\s*['"]upload_failed['"][\s\S]{0,500}transcriptReviewsRef\.current\.set\(\s*errorMsgId/,
    );
  });

  it('transcriptReviewsRef type allows null review for error entries', () => {
    // Error entries store `review: null` so handleConfirmTranscript can
    // safely early-return on non-actionable entries.
    expect(PAGE_SOURCE).toMatch(/review:\s*Parameters<[^>]+>\[0\]\s*\|\s*null/);
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
    expect(COACH_HOOK_SOURCE).toMatch(
      /appendTranscriptError[\s\S]{0,1200}\{\s*userMsgId[\s\S]{0,200}errorMsgId/,
    );
  });

  it('appendTranscriptError injects a message with transcriptError metadata', () => {
    expect(COACH_HOOK_SOURCE).toMatch(
      /metadata:\s*\{\s*transcriptError:/,
    );
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

describe('Phase 9.1.1 — truthful error-state user bubble copy', () => {
  it('appendTranscriptError uses state-specific user bubble copy, not "Uploaded ... for review"', () => {
    // The Phase 9.1 bug was that errorful paths reused "Uploaded X for
    // review" which is false: no_client never uploaded, upload_failed
    // never reached review. Lock that the new helper branches on kind.
    expect(COACH_HOOK_SOURCE).toMatch(
      /error\.kind\s*===\s*['"]upload_failed['"]/,
    );
    // Both truthful phrasings must be present in the appendTranscriptError
    // function body.
    expect(COACH_HOOK_SOURCE).toMatch(/`Tried to upload \$\{error\.fileName\}`/);
    expect(COACH_HOOK_SOURCE).toMatch(/`Attached \$\{error\.fileName\}`/);
    // And the stale "Uploaded X for review" must NOT appear inside the
    // appendTranscriptError function body. (The success-path
    // appendTranscriptReview helper still uses that phrasing for real
    // reviews — correctly — so we scope the negative check to the
    // error function body by slicing.)
    const errorFnIdx = COACH_HOOK_SOURCE.indexOf('const appendTranscriptError');
    const nextFnIdx = COACH_HOOK_SOURCE.indexOf('const ', errorFnIdx + 30);
    expect(errorFnIdx).toBeGreaterThan(0);
    const errorFnSlice = COACH_HOOK_SOURCE.slice(
      errorFnIdx,
      nextFnIdx > 0 ? nextFnIdx : errorFnIdx + 3000,
    );
    expect(errorFnSlice).not.toMatch(/Uploaded \$\{error\.fileName\} for review/);
  });

  it('appendTranscriptReview success-path wording is unchanged', () => {
    // Anti-regression: the real-review user bubble still says
    // "Uploaded X for review" because there the file actually reached
    // review state.
    expect(COACH_HOOK_SOURCE).toMatch(/`Uploaded \$\{review\.fileName\} for review`/);
  });
});

describe('Phase 9.1.1 — no-client and upload-failure preserve attachments', () => {
  it('no_client branch does NOT call attachments.clearFiles()', () => {
    // The no-client IF block runs from `!selectedClient?.id` to the next
    // `const upload = await intake.uploadTranscript(` line. Slice that
    // range and assert no clearFiles() call is present.
    const guardIdx = PAGE_SOURCE.indexOf('!selectedClient?.id');
    const uploadCallIdx = PAGE_SOURCE.indexOf(
      'const upload = await intake.uploadTranscript(',
      guardIdx,
    );
    expect(guardIdx).toBeGreaterThan(0);
    expect(uploadCallIdx).toBeGreaterThan(guardIdx);
    const slice = PAGE_SOURCE.slice(guardIdx, uploadCallIdx);
    expect(slice).not.toMatch(/attachments\.clearFiles\(\)/);
  });

  it('upload_failed branch does NOT call attachments.clearFiles()', () => {
    // The upload-failure branch runs from `kind: 'upload_failed'` to the
    // next `// Existing flow` comment that starts the text-only path.
    // Bound the slice explicitly so it does not leak into the existing
    // flow's legitimate clearFiles() call.
    const failureIdx = PAGE_SOURCE.indexOf("kind: 'upload_failed'");
    expect(failureIdx).toBeGreaterThan(0);
    const existingIdx = PAGE_SOURCE.indexOf('// Existing flow', failureIdx);
    expect(existingIdx).toBeGreaterThan(failureIdx);
    const slice = PAGE_SOURCE.slice(failureIdx, existingIdx);
    expect(slice).not.toMatch(/attachments\.clearFiles\(\)/);
  });

  it('success branch STILL clears attachments (happy-path unchanged)', () => {
    // Anti-regression: Phase 9 behavior is intentionally preserved for
    // the happy path — once a review card is injected, the file has
    // been consumed and should not re-upload on the next send.
    const successIdx = PAGE_SOURCE.indexOf('appendTranscriptReview(upload.review)');
    expect(successIdx).toBeGreaterThan(0);
    const slice = PAGE_SOURCE.slice(successIdx, successIdx + 500);
    expect(slice).toMatch(/attachments\.clearFiles\(\)/);
  });

  it('existing text-only flow STILL clears attachments (unchanged)', () => {
    // Anti-regression: text-only send + non-transcript image/json
    // attachments still clear after the chat send fires. That path
    // is outside the transcript branch entirely.
    const existingIdx = PAGE_SOURCE.indexOf('// Existing flow');
    expect(existingIdx).toBeGreaterThan(0);
    const slice = PAGE_SOURCE.slice(existingIdx, existingIdx + 500);
    expect(slice).toMatch(/attachments\.clearFiles\(\)/);
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
