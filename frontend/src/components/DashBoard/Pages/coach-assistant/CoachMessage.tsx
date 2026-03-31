/**
 * ┌─── SUB-COMPONENT: CoachMessage ────────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Renders a single AI or user message bubble         │
 * │ WIREFRAME:                                                  │
 * │ ┌─────────────────────────────────┐                         │
 * │ │ Message text (16px mobile min)  │                         │
 * │ │ [🔊 Read] [📋 Copy]            │  ← AI messages only     │
 * │ │ 2:34 PM                         │                         │
 * │ └─────────────────────────────────┘                         │
 * │ Props: { message, onReadAloud }                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useCallback } from 'react';
import { Volume2, Copy, Check } from 'lucide-react';
import {
  MessageBubbleAI,
  MessageBubbleUser,
  MessageTime,
  MessageActions,
  MessageActionBtn,
} from './SwanCoachStyles';
import MarkdownRenderer from './MarkdownRenderer';
import ProviderBadge from './ProviderBadge';
import type { CoachMessageData } from './SwanCoachTypes';

interface CoachMessageProps {
  message: CoachMessageData;
  onReadAloud?: (text: string) => void;
}

const CoachMessageComponent: React.FC<CoachMessageProps> = ({ message, onReadAloud }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [message.content]);

  const handleReadAloud = useCallback(() => {
    onReadAloud?.(message.content);
  }, [message.content, onReadAloud]);

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (message.role === 'user') {
    return (
      <MessageBubbleUser>
        {message.content}
        <MessageTime>{timeStr}</MessageTime>
      </MessageBubbleUser>
    );
  }

  return (
    <MessageBubbleAI>
      <MarkdownRenderer content={message.content} />
      <MessageActions>
        {onReadAloud && (
          <MessageActionBtn onClick={handleReadAloud} aria-label="Read aloud">
            <Volume2 size={14} /> Read
          </MessageActionBtn>
        )}
        <MessageActionBtn onClick={handleCopy} aria-label="Copy message">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </MessageActionBtn>
      </MessageActions>
      <MessageTime>
        {timeStr}
        {message.metadata?.model && (
          <ProviderBadge provider={message.metadata.provider} model={message.metadata.model} />
        )}
      </MessageTime>
    </MessageBubbleAI>
  );
};

export const CoachMessage = memo(CoachMessageComponent);
