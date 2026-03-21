/**
 * ┌─── SUB-COMPONENT: ChatMessage ─────────────────────────────┐
 * │ PARENT: AIAssistantDrawer                                   │
 * │ PURPOSE: Memoized message bubble with workout/action parsing│
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────┐                    │
 * │ │ [Message text bubble]                │                    │
 * │ │ [Apply 4 exercises to Logger] btn    │                    │
 * │ │ ┌─ Action Card ──────────────────┐   │                    │
 * │ │ │ 💪 Create Workout              │   │                    │
 * │ │ │ 4 exercises detected           │   │                    │
 * │ │ │ [Confirm & Save]              │   │                    │
 * │ │ └───────────────────────────────┘   │                    │
 * │ Props: { role, content }                                    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useMemo, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'react-toastify';
import { parseAIWorkoutPlan, dispatchApplyToLogger } from '../../utils/parseAIWorkoutPlan';
import { parseAIActions, stripActionBlocks, ACTION_META, type AIAction } from '../../utils/parseAIActions';
import { CS } from '../../styles/crystallineSwanTheme';
import {
  MessageBubble,
  ApplyToLoggerBtn,
  ActionCard,
  ActionHeader,
  ActionConfirmBtn,
} from './AIDrawerStyles';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const ACTION_EMOJI: Record<string, string> = {
  CREATE_WORKOUT: '💪',
  LOG_NUTRITION: '🥗',
  UPDATE_MEASUREMENTS: '📏',
  ADD_NOTE: '📝',
  CREATE_PLAN: '📋',
};

const ChatMessage = React.memo<ChatMessageProps>(({ role, content }) => {
  const parsedExercises = useMemo(
    () => role === 'assistant' ? parseAIWorkoutPlan(content) : null,
    [role, content]
  );

  const actions = useMemo(
    () => role === 'assistant' ? parseAIActions(content) : [],
    [role, content]
  );

  const displayContent = useMemo(
    () => actions.length > 0 ? stripActionBlocks(content) : content,
    [content, actions]
  );

  const handleActionConfirm = useCallback(async (action: AIAction) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

      if (action.type === 'CREATE_WORKOUT') {
        if (parsedExercises && parsedExercises.length > 0) {
          dispatchApplyToLogger(parsedExercises);
          toast.success(`Sent ${parsedExercises.length} exercises to Workout Logger`);
        }
        return;
      }

      const typeMap: Record<string, string> = {
        LOG_NUTRITION: 'macro_log',
        UPDATE_MEASUREMENTS: 'body_measurement',
        ADD_NOTE: 'client_note',
        CREATE_PLAN: 'goal',
      };

      const updateType = typeMap[action.type];
      if (!updateType) return;

      const res = await fetch(`${API_BASE}/api/ai-chat/data-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ updateType, data: action.data }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`${ACTION_META[action.type].label} saved successfully`);
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to execute action');
    }
  }, [parsedExercises]);

  return (
    <>
      <MessageBubble $role={role}>{displayContent}</MessageBubble>

      {/* Legacy: workout exercise parser (works even without action blocks) */}
      {parsedExercises && parsedExercises.length > 0 && actions.length === 0 && (
        <ApplyToLoggerBtn
          onClick={() => {
            dispatchApplyToLogger(parsedExercises);
            toast.success(`Sent ${parsedExercises.length} exercises to Workout Logger`);
          }}
        >
          <ClipboardList size={14} />
          Apply {parsedExercises.length} exercises to Logger
        </ApplyToLoggerBtn>
      )}

      {/* Structured action cards */}
      {actions.map((action, idx) => {
        const meta = ACTION_META[action.type];
        return (
          <ActionCard key={idx} $color={meta.color}>
            <ActionHeader>
              <span style={{ fontSize: '1rem' }}>{ACTION_EMOJI[action.type] || '📋'}</span>
              {meta.label}
            </ActionHeader>
            <div style={{ fontSize: '0.78rem', color: CS.textSecondary, lineHeight: 1.4 }}>
              {action.type === 'CREATE_WORKOUT' && parsedExercises
                ? `${parsedExercises.length} exercises detected`
                : 'Ready to save'
              }
            </div>
            <ActionConfirmBtn $color={meta.color} onClick={() => handleActionConfirm(action)}>
              {meta.confirmLabel}
            </ActionConfirmBtn>
          </ActionCard>
        );
      })}
    </>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
