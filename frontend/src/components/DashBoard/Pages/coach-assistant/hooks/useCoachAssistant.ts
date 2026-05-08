/**
 * ============================================================================
 * FILE: useCoachAssistant.ts
 * PURPOSE: Orchestration hook for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-09
 * AI VILLAGE VALIDATED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps useAIChat with Coach Assistant-specific logic.
 * Sprint A: Routes messages through the command lane first. Falls back to the
 * chat lane for conversational queries. Exposes confirmCommand / cancelCommand
 * for inline confirmation cards.
 *
 * LANE ROUTING:
 *   sendMessage → executeCommand (POST /api/ai-command/execute)
 *     ├─ fallback_to_chat | error  → chat lane (sendMessageWithConversation)
 *     ├─ confirmation_required     → commandMessages (renders ConfirmationCard)
 *     ├─ executed                  → commandMessages (renders ExecutionResultCard)
 *     └─ debate_started            → commandMessages (info bubble)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIChat } from '../../../../../hooks/useAIChat';
import { isCommandLaneCandidate } from '../../../../../hooks/aiMessageLimits';
import { useCoachCommand } from '../../../../../hooks/useCoachCommand';
import { DEFAULT_RESPONSE_STYLE, WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachContext, ResponseStyle, CoachMessageData } from '../SwanCoachTypes';
import { safeCommandConfirmationFailure } from '../CoachIntakeOperationalText.logic';

// ─────────────────────────────────────────────────────────────
// SECTION: Human-readable result summaries
// PURPOSE: Replace machine "Done: log_workout" with real copy.
//          Only describe what we actually know — never invent values.
// ─────────────────────────────────────────────────────────────
function commandResultSummary(
  command: string,
  result: Record<string, unknown> | null,
  client: { id?: number; firstName?: string } | null,
): string {
  const r = result ?? {};
  const forClient = client?.firstName ? ` for ${client.firstName}` : '';
  switch (command) {
    case 'log_workout': {
      const count = typeof r.exerciseCount === 'number' ? ` ${r.exerciseCount} exercise(s),` : '';
      const sets = typeof r.totalSets === 'number' ? ` ${r.totalSets} sets.` : '.';
      const xp = typeof r.xpAwarded === 'number' ? ` +${r.xpAwarded} XP.` : '';
      return `Workout logged${forClient}.${count}${sets}${xp}`;
    }
    case 'log_meals': {
      const count = typeof r.mealsLogged === 'number' ? r.mealsLogged : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      if (count === 0) return `No meals logged${forClient}${dateStr}.`;
      const cal = typeof r.totalCalories === 'number' ? ` ${r.totalCalories} kcal.` : '.';
      const prot = typeof r.totalProtein === 'number' && r.totalProtein > 0 ? ` ${r.totalProtein}g protein.` : '';
      return `${count} meal${count !== 1 ? 's' : ''} logged${forClient}${dateStr}.${cal}${prot}`;
    }
    case 'create_client':
      // Specialized clientCreateResult card handles this — no plain-text needed.
      return 'Client created.';
    case 'view_nutrition_log': {
      const count = typeof r.mealCount === 'number' ? r.mealCount : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : ' today';
      const cal = typeof r.totalCalories === 'number' ? ` ${r.totalCalories} kcal.` : '.';
      const prot = typeof r.totalProtein === 'number' && r.totalProtein > 0 ? ` ${r.totalProtein}g protein.` : '';
      if (count === 0) return `No meals logged${forClient}${dateStr}.`;
      return `${count} meal${count !== 1 ? 's' : ''}${forClient}${dateStr}.${cal}${prot}`;
    }
    case 'view_macro_trends': {
      const days = typeof r.daysLogged === 'number' ? r.daysLogged : 0;
      const range = (typeof r.startDate === 'string' && typeof r.endDate === 'string')
        ? ` (${r.startDate} – ${r.endDate})`
        : ' (last 7 days)';
      if (days === 0) return `No nutrition logged${forClient} in the last 7 days.`;
      const avg = typeof r.avgCalories === 'number' ? ` Avg ${r.avgCalories} kcal/day.` : '.';
      const prot = typeof r.avgProtein === 'number' && r.avgProtein > 0 ? ` ${r.avgProtein}g protein avg.` : '';
      return `${days} day${days !== 1 ? 's' : ''} logged${forClient}${range}.${avg}${prot}`;
    }
    case 'view_measurement_trends': {
      const count = typeof r.totalMeasurements === 'number' ? r.totalMeasurements : 0;
      if (count === 0) return `No measurement history on file${forClient}.`;
      const unit = typeof r.weightUnit === 'string' ? r.weightUnit : 'lbs';
      const wt = typeof r.latestWeight === 'number' ? ` Latest: ${r.latestWeight} ${unit}.` : '.';
      const wChange = typeof r.weightChange === 'number' && r.weightChange !== 0
        ? ` Weight change: ${r.weightChange > 0 ? '+' : ''}${r.weightChange} ${unit}.` : '';
      const bfChange = typeof r.bodyFatChange === 'number' && r.bodyFatChange !== 0
        ? ` Body fat: ${r.bodyFatChange > 0 ? '+' : ''}${r.bodyFatChange}%.` : '';
      const days = typeof r.daysSinceStart === 'number' && r.daysSinceStart > 0
        ? ` Over ${r.daysSinceStart} days.` : '';
      return `${count} measurement${count !== 1 ? 's' : ''}${forClient}.${wt}${wChange}${bfChange}${days}`;
    }
    case 'view_latest_measurements': {
      if (r.measurementDate === null || r.measurementDate === undefined) return `No measurements on file${forClient}.`;
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}.` : '.';
      const bf = typeof r.bodyFatPercentage === 'number' && r.bodyFatPercentage > 0
        ? ` ${r.bodyFatPercentage}% body fat.` : '';
      return `Latest measurement${forClient} on ${r.measurementDate}.${wt}${bf}`;
    }
    case 'log_weighin': {
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}` : '';
      const dateStr = typeof r.measurementDate === 'string' ? ` on ${r.measurementDate}` : '';
      return `Weigh-in logged${forClient}${dateStr}.${wt}.`;
    }
    case 'log_measurements': {
      const dateStr = typeof r.measurementDate === 'string' ? ` on ${r.measurementDate}` : '';
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}.` : '';
      const bf = typeof r.bodyFatPercentage === 'number' ? ` ${r.bodyFatPercentage}% body fat.` : '';
      const circ = typeof r.fieldsLogged === 'number' && r.fieldsLogged > 0
        ? ` ${r.fieldsLogged} circumference field${r.fieldsLogged !== 1 ? 's' : ''}.` : '';
      return `Measurement logged${forClient}${dateStr}.${wt}${bf}${circ}`;
    }
    case 'view_active_pain': {
      const count = typeof r.count === 'number' ? r.count : 0;
      if (count === 0) return `No active pain entries on file${forClient}.`;
      const lvl = typeof r.highestPainLevel === 'number' ? ` Highest level: ${r.highestPainLevel}/10.` : '.';
      const reg = typeof r.regions === 'string' ? ` Regions: ${r.regions}.` : '';
      return `${count} active pain entr${count !== 1 ? 'ies' : 'y'}${forClient}.${lvl}${reg}`;
    }
    case 'add_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const lvl = typeof r.painLevel === 'number' ? ` Level ${r.painLevel}/10.` : '.';
      return `Pain entry logged${forClient} — ${region}.${lvl}`;
    }
    case 'resolve_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const date = typeof r.resolvedAt === 'string' ? ` on ${r.resolvedAt}` : '';
      return `Pain entry resolved${forClient} — ${region}${date}.`;
    }
    case 'update_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const lvl = typeof r.painLevel === 'number' ? ` Level ${r.painLevel}/10.` : '.';
      return `Pain entry updated${forClient} — ${region}.${lvl}`;
    }
    case 'cancel_session': {
      const sid = typeof r.sessionId === 'number' ? ` #${r.sessionId}` : '';
      const refund = r.refundIssued === true ? ' Session credit restored.' : '';
      const review = r.requiresAdminReview === true ? ' Flagged for admin review (late cancellation).' : '';
      return `Session${sid} cancelled${forClient}.${refund}${review}`;
    }
    case 'view_workout_history': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const last = typeof r.lastSessionDate === 'string' ? ` Last: ${r.lastSessionDate}.` : '';
      const title = typeof r.recentTitle === 'string' ? ` "${r.recentTitle}"` : '';
      return `${count} recent session${count !== 1 ? 's' : ''}${forClient}.${last}${title}`;
    }
    case 'create_availability_override': {
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      const time = (typeof r.startTime === 'string' && typeof r.endTime === 'string')
        ? ` ${r.startTime}–${r.endTime}` : '';
      const type = typeof r.type === 'string' ? r.type : 'blocked';
      const reason = typeof r.reason === 'string' ? ` (${r.reason})` : '';
      return `Availability ${type}${dateStr}${time}.${reason}`;
    }
    case 'view_trainer_availability': {
      const count = typeof r.recurringSlotCount === 'number' ? r.recurringSlotCount : 0;
      if (count === 0) return `No recurring availability on file.`;
      const days = typeof r.days === 'string' ? ` Days: ${r.days}.` : '';
      const hours = (typeof r.earliestStart === 'string' && typeof r.latestEnd === 'string')
        ? ` ${r.earliestStart}–${r.latestEnd}.` : '';
      const dw = typeof r.daysWithAvailability === 'number' ? r.daysWithAvailability : 0;
      return `${count} slot${count !== 1 ? 's' : ''} across ${dw} day${dw !== 1 ? 's' : ''}.${days}${hours}`;
    }
    case 'view_available_slots': {
      const count = typeof r.availableSlotCount === 'number' ? r.availableSlotCount : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      const duration = typeof r.durationMinutes === 'number' ? r.durationMinutes : 60;
      if (count === 0) return `No ${duration}-minute slots available${dateStr}.`;
      const first = typeof r.firstSlotStartUtc === 'string' ? ` First starts at ${r.firstSlotStartUtc} UTC.` : '';
      const last = typeof r.lastSlotEndUtc === 'string' ? ` Last ends at ${r.lastSlotEndUtc} UTC.` : '';
      return `${count} available slot${count !== 1 ? 's' : ''}${dateStr} for ${duration}-minute sessions.${first}${last}`;
    }
    case 'view_today_schedule':
    case 'view_today_sessions': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : ' today';
      if (count === 0) return `No sessions scheduled${dateStr}.`;
      const next = typeof r.nextSessionTime === 'string' ? ` Next: ${r.nextSessionTime} UTC.` : '';
      const done = typeof r.completedCount === 'number' && r.completedCount > 0
        ? ` ${r.completedCount} completed.` : '';
      return `${count} session${count !== 1 ? 's' : ''}${dateStr}.${next}${done}`;
    }
    case 'view_week_schedule': {
      const count = typeof r.sessionCount === 'number' ? r.sessionCount : 0;
      const range = (typeof r.startDate === 'string' && typeof r.endDate === 'string')
        ? ` (${r.startDate} – ${r.endDate})` : ' this week';
      if (count === 0) return `No sessions scheduled${range}.`;
      const days = typeof r.daysWithSessions === 'number'
        ? ` Across ${r.daysWithSessions} day${r.daysWithSessions !== 1 ? 's' : ''}.` : '';
      const first = typeof r.firstSessionDate === 'string'
        ? ` First: ${r.firstSessionDate}${typeof r.firstSessionTime === 'string' ? ` at ${r.firstSessionTime} UTC` : ''}.`
        : '';
      return `${count} session${count !== 1 ? 's' : ''}${range}.${days}${first}`;
    }
    case 'create_hermes_task': {
      const agent = typeof r.agentType === 'string' ? r.agentType : 'agent';
      const id = typeof r.taskId === 'string' ? ` (${r.taskId.slice(0, 8)}…)` : '';
      return `Task queued for ${agent} agent${id}.`;
    }
    case 'list_hermes_tasks': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const pending = typeof r.pending === 'number' ? r.pending : 0;
      return `${count} Hermes task${count !== 1 ? 's' : ''} found — ${pending} pending.`;
    }
    default: {
      if (command.startsWith('navigate_') || command.startsWith('scan_command')) {
        const dest = typeof r.destination === 'string' ? r.destination : command.replace(/_/g, ' ');
        return `Navigated to ${dest}.`;
      }
      if (command.startsWith('view_')) {
        return `${command.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} loaded.`;
      }
      return `${command.replace(/_/g, ' ')} completed.`;
    }
  }
}

interface UseCoachAssistantOptions {
  defaultContext?: CoachContext;
  defaultStyle?: ResponseStyle;
  /** Pass an external useAIChat instance to share state with the page */
  chat?: ReturnType<typeof useAIChat>;
  /** Target client ID for trainer/admin — routes AI data writes to this client */
  targetClientId?: number | null;
}

export function useCoachAssistant(options?: UseCoachAssistantOptions) {
  const {
    defaultContext = 'coach_assistant',
    defaultStyle = DEFAULT_RESPONSE_STYLE,
    chat: externalChat,
    targetClientId = null,
  } = options || {};

  const internalChat = useAIChat();
  const chat = externalChat || internalChat;
  const {
    executeCommand,
    confirmCommand: execConfirm,
    cancelCommand: execCancel,
    executingCommand,
  } = useCoachCommand();

  const [context, setContext] = useState<CoachContext>(defaultContext);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(defaultStyle);
  const [localMessages, setLocalMessages] = useState<CoachMessageData[]>([]);
  const [commandMessages, setCommandMessages] = useState<CoachMessageData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Merge chat-lane messages with command-lane messages ──
  const chatMessages: CoachMessageData[] = chat.activeConversation?.messages?.length
    ? chat.activeConversation.messages.map((m, i) => ({
        id: `${chat.activeConversation!.id}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata,
      }))
    : localMessages;

  const allMessages = [...chatMessages, ...commandMessages];

  const messages: CoachMessageData[] = allMessages.length > 0
    ? allMessages
    : [{
        id: 'welcome',
        role: WELCOME_MESSAGE.role,
        content: WELCOME_MESSAGE.content,
        timestamp: WELCOME_MESSAGE.timestamp,
      }];

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message (command lane first, chat lane fallback) ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || chat.sending || executingCommand) return;

    let cmdResult: Awaited<ReturnType<typeof executeCommand>> | { type: 'fallback_to_chat' };
    if (isCommandLaneCandidate(trimmedText)) {
      cmdResult = await executeCommand(trimmedText, { selectedClientId: targetClientId });
    } else {
      cmdResult = { type: 'fallback_to_chat' };
    }

    if (cmdResult.type === 'fallback_to_chat' || cmdResult.type === 'error') {
      // Route to chat lane as normal.
      // Phase 12 hotfix 2026-04-15: pass responseStyle through unchanged.
      // The old mapping rewrote 'balanced' → 'both' which forced the
      // backend's dual-mode "🎓 THE SCIENCE" / "💯 KEEPING IT 100"
      // template on every Balanced-mode message. The backend accepts
      // 'balanced' as a first-class style (aiChatService.mjs:988) and
      // returns a single unified response, which is what the UI label
      // actually promises.
      const backendStyle = responseStyle;
      const chatResult = await chat.sendMessageWithConversation(
        trimmedText,
        context as Parameters<typeof chat.sendMessageWithConversation>[1],
        'Swan Coach Session',
        targetClientId,
        backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
      );
      setLocalMessages([]);
      return chatResult;
    }

    // Command lane handled — inject messages into commandMessages
    const userMsg: CoachMessageData = {
      id: `cmd-user-${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date().toISOString(),
    };

    if (cmdResult.type === 'confirmation_required') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-confirm-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
        metadata: {
          commandConfirmation: {
            message: cmdResult.message,
            operationId: cmdResult.operationId,
            command: cmdResult.command,
            params: cmdResult.params,
            client: cmdResult.client,
            details: cmdResult.details,
            isDestructive: cmdResult.isDestructive,
          },
        },
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return cmdResult;
    }

    if (cmdResult.type === 'executed') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-result-${Date.now()}`,
        role: 'assistant',
        content: commandResultSummary(cmdResult.command, cmdResult.result, cmdResult.client),
        timestamp: new Date().toISOString(),
        metadata: {
          commandResult: {
            command: cmdResult.command,
            result: cmdResult.result,
            client: cmdResult.client,
          },
        },
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return cmdResult;
    }

    if (cmdResult.type === 'debate_started') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-debate-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return cmdResult;
    }

    if (cmdResult.type === 'not_wired') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-notwired-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return cmdResult;
    }
  }, [chat, context, responseStyle, targetClientId, executeCommand, executingCommand]);

  // ── Confirm a pending destructive/confirmation command ──
  const confirmCommand = useCallback(async (operationId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await execConfirm(operationId);

    if (!result.success) {
      // Leave the confirmation card in place — don't upgrade to result card
      return { success: false, error: safeCommandConfirmationFailure() };
    }

    setCommandMessages(prev => prev.map(msg => {
      if (msg.metadata?.commandConfirmation?.operationId !== operationId) return msg;
      const confirmation = msg.metadata.commandConfirmation!;
      const summary = commandResultSummary(confirmation.command, result.result, confirmation.client);
      return {
        ...msg,
        content: summary,
        metadata: {
          ...msg.metadata,
          commandConfirmation: undefined,
          commandResult: {
            command: confirmation.command,
            result: result.result,
            client: confirmation.client,
            message: summary,
          },
        },
      };
    }));
    return { success: true };
  }, [execConfirm]);

  // ── Cancel a pending command ──
  const cancelCommand = useCallback(async (operationId: string | null) => {
    if (operationId) await execCancel(operationId);
    setCommandMessages(prev =>
      prev.filter(msg => msg.metadata?.commandConfirmation?.operationId !== operationId)
    );
  }, [execCancel]);

  // ── Swan-first transcript intake helpers ──
  // These three helpers let the page wire useTranscriptIntake into the
  // existing commandMessages stream without exposing setCommandMessages.
  // The lifecycle the page drives is:
  //   1. user attaches transcript file + selects client + hits send
  //   2. page calls intake.uploadTranscript()
  //   3. on success: page calls appendTranscriptReview(reviewData)
  //   4. user clicks confirm in the review card
  //   5. page calls intake.applyParsedWorkout()
  //   6. on success: page calls transcriptReviewToResult(msgId, resultData)
  //   7. on cancel: page calls removeTranscriptMessage(msgId)
  //
  // The user-side message bubble is created here too so the conversation
  // shows "uploaded <filename>" from the user before the assistant card.

  const appendTranscriptReview = useCallback(
    (review: NonNullable<CoachMessageData['metadata']>['transcriptReview']): { userMsgId: string; reviewMsgId: string } => {
      if (!review) {
        return { userMsgId: '', reviewMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = `transcript-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reviewMsgId = `transcript-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: `Uploaded ${review.fileName} for review`,
        timestamp: ts,
      };

      const reviewMsg: CoachMessageData = {
        id: reviewMsgId,
        role: 'assistant',
        // Empty content — the card body is rendered from metadata.transcriptReview
        content: '',
        timestamp: ts,
        metadata: { transcriptReview: review },
      };

      setCommandMessages(prev => [...prev, userMsg, reviewMsg]);
      return { userMsgId, reviewMsgId };
    },
    [],
  );

  /**
   * Update an existing review-card message in place. Used to flip the
   * `applying` flag during the apply call, and to attach an `applyError`
   * if the apply failed (so the review stays visible and the user can retry).
   */
  const updateTranscriptReview = useCallback(
    (
      reviewMsgId: string,
      patch: Partial<NonNullable<NonNullable<CoachMessageData['metadata']>['transcriptReview']>>,
    ) => {
      setCommandMessages(prev =>
        prev.map(msg => {
          if (msg.id !== reviewMsgId) return msg;
          const existing = msg.metadata?.transcriptReview;
          if (!existing) return msg;
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              transcriptReview: { ...existing, ...patch },
            },
          };
        }),
      );
    },
    [],
  );

  /**
   * Replace a review card in place with a result card on successful apply.
   * Drops the transcriptReview metadata and adds transcriptResult so
   * CoachMessage renders the success state.
   */
  const transcriptReviewToResult = useCallback(
    (
      reviewMsgId: string,
      result: NonNullable<NonNullable<CoachMessageData['metadata']>['transcriptResult']>,
    ) => {
      setCommandMessages(prev =>
        prev.map(msg => {
          if (msg.id !== reviewMsgId) return msg;
          return {
            ...msg,
            content: `Workout logged${result.clientName ? ` for ${result.clientName}` : ''}.`,
            metadata: {
              ...msg.metadata,
              transcriptReview: undefined,
              transcriptResult: result,
            },
          };
        }),
      );
    },
    [],
  );

  /**
   * Remove a transcript message (both the user upload bubble and the
   * assistant review/result card) from the conversation. Used by the
   * Cancel button on the review card.
   */
  const removeTranscriptMessages = useCallback(
    (userMsgId: string, reviewMsgId: string) => {
      setCommandMessages(prev =>
        prev.filter(msg => msg.id !== userMsgId && msg.id !== reviewMsgId),
      );
    },
    [],
  );

  /**
   * Append a transcript-intake error card. Used for PRE-upload validation
   * failures (no client) and upload-stage failures (network / 4xx / 5xx).
   *
   * Returns the pair of message ids so the page can track them in the
   * same ref map used for review cards, enabling Dismiss via
   * removeTranscriptMessages.
   *
   * Phase 9.1 hotfix 2026-04-14 — previously these states were injected
   * as fake review cards with applyError set, which rendered a misleading
   * "0 parsed" card with a live (but broken) Apply button.
   */
  const appendTranscriptError = useCallback(
    (
      error: NonNullable<CoachMessageData['metadata']>['transcriptError'],
    ): { userMsgId: string; errorMsgId: string } => {
      if (!error) {
        return { userMsgId: '', errorMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = `transcript-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const errorMsgId = `transcript-error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Phase 9.1.1 polish 2026-04-14:
      // Truthful user-bubble copy per failure kind. The previous string
      // ("Uploaded X for review") was inaccurate for both error kinds:
      //   - no_client: no upload happened, the send was blocked before
      //     the file touched the network
      //   - upload_failed: a request was made but the file never reached
      //     the review step — it failed during upload/transcription/parse
      // The success path (appendTranscriptReview) still uses
      // "Uploaded X for review" because there the file actually reached
      // review state.
      const userBubbleContent =
        error.kind === 'upload_failed'
          ? `Tried to upload ${error.fileName}`
          : `Attached ${error.fileName}`;

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: userBubbleContent,
        timestamp: ts,
      };

      const errorMsg: CoachMessageData = {
        id: errorMsgId,
        role: 'assistant',
        content: '',
        timestamp: ts,
        metadata: { transcriptError: error },
      };

      setCommandMessages(prev => [...prev, userMsg, errorMsg]);
      return { userMsgId, errorMsgId };
    },
    [],
  );

  const appendAudioIntakeReceipt = useCallback(
    (
      receipt: NonNullable<CoachMessageData['metadata']>['audioIntakeReceipt'],
    ): { userMsgId: string; receiptMsgId: string } => {
      if (!receipt) {
        return { userMsgId: '', receiptMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = `audio-intake-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const receiptMsgId = `audio-intake-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const pieceCopy = `${receipt.acceptedCount} audio piece${receipt.acceptedCount !== 1 ? 's' : ''}`;

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: `Uploaded ${pieceCopy} to PLAUD intake`,
        timestamp: ts,
      };

      const receiptMsg: CoachMessageData = {
        id: receiptMsgId,
        role: 'assistant',
        content: '',
        timestamp: ts,
        metadata: { audioIntakeReceipt: receipt },
      };

      setCommandMessages(prev => [...prev, userMsg, receiptMsg]);
      return { userMsgId, receiptMsgId };
    },
    [],
  );

  // ── Send message with structured food context ──
  const sendMessageWithFood = useCallback(async (
    text: string,
    foodContext: Record<string, unknown>,
  ) => {
    if (!text.trim() || chat.sending) return null;
    // Phase 12 hotfix 2026-04-15: see comment at the earlier call site.
    // Pass responseStyle through unchanged; 'balanced' is a first-class
    // backend style, not an alias for 'both'.
    const backendStyle = responseStyle;
    const result = await chat.sendMessageWithConversation(
      text.trim(),
      'macro_logging' as Parameters<typeof chat.sendMessageWithConversation>[1],
      'Nutrition Coach',
      targetClientId,
      backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
      foodContext,
    );
    setLocalMessages([]);
    return result;
  }, [chat, responseStyle, targetClientId]);

  // ── Switch context ──
  const switchContext = useCallback((newContext: CoachContext) => {
    setContext(newContext);
    if (chat.activeConversation) {
      chat.newChat();
      setLocalMessages([]);
      setCommandMessages([]);
    }
  }, [chat]);

  // ── Clear conversation ──
  const clearConversation = useCallback(() => {
    chat.newChat();
    setLocalMessages([]);
    setCommandMessages([]);
  }, [chat]);

  return {
    messages,
    sending: chat.sending || executingCommand,
    loading: chat.loading,
    error: chat.error,
    lastErrorCode: chat.lastErrorCode,
    lastErrorRetryable: chat.lastErrorRetryable,
    context,
    responseStyle,
    setResponseStyle,
    switchContext,
    sendMessage,
    sendMessageWithFood,
    confirmCommand,
    cancelCommand,
    clearConversation,
    clearError: chat.clearError,
    messagesEndRef,
    // Swan-first transcript intake helpers — used by SwanCoachAssistantPage
    // to inject review/result cards into the existing message stream.
    appendTranscriptReview,
    updateTranscriptReview,
    transcriptReviewToResult,
    removeTranscriptMessages,
    appendTranscriptError,
    appendAudioIntakeReceipt,
  };
}
