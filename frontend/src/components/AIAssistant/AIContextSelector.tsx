/**
 * AIContextSelector - context pills, response-style controls, and welcome state.
 *
 * Parent: AIAssistantDrawer
 * Constants live in AIContextOptions.ts so this component remains Fast Refresh clean.
 */
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { Plus, Sparkles } from 'lucide-react';
import type { AIContext, ResponseStyle } from '../../hooks/useAIChat';
import {
  ContextBar,
  ContextPill,
  EmptyIcon,
  EmptyState,
  ResponseStyleBar,
  SendBtn,
  StylePill,
  WelcomeText,
  WelcomeTitle,
} from './AIDrawerStyles';
import { CONTEXTS, RESPONSE_STYLES } from './AIContextOptions';

const StartChatButton = styled(SendBtn)`
  width: auto;
  padding: 0 24px;
  border-radius: 999px;
`;

const StartChatText = styled.span`
  margin-left: 6px;
  font-weight: 600;
  font-size: 0.88rem;
`;

interface AIContextSelectorProps {
  userRole: 'client' | 'trainer' | 'admin';
  selectedContext: AIContext;
  onContextChange: (ctx: AIContext) => void;
  selectedStyle: ResponseStyle;
  onStyleChange: (style: ResponseStyle) => void;
  onStartChat: (ctx: AIContext) => void;
}

const AIContextSelector: React.FC<AIContextSelectorProps> = memo(({
  userRole,
  selectedContext,
  onContextChange,
  selectedStyle,
  onStyleChange,
  onStartChat,
}) => {
  const availableContexts = useMemo(() =>
    Object.entries(CONTEXTS)
      .filter(([, cfg]) => cfg.roles.includes(userRole))
      .map(([key]) => key as AIContext),
    [userRole],
  );

  return (
    <>
      <ContextBar>
        {availableContexts.map(ctx => {
          const cfg = CONTEXTS[ctx];
          const Icon = cfg.icon;
          return (
            <ContextPill
              key={ctx}
              $active={selectedContext === ctx}
              onClick={() => onContextChange(ctx)}
              aria-pressed={selectedContext === ctx}
            >
              <Icon size={14} />
              {cfg.label}
            </ContextPill>
          );
        })}
      </ContextBar>

      <ResponseStyleBar>
        {RESPONSE_STYLES.map(style => (
          <StylePill
            key={style.key}
            $active={selectedStyle === style.key}
            onClick={() => onStyleChange(style.key)}
            aria-pressed={selectedStyle === style.key}
            title={style.key === 'both' ? 'PhD + Grandma-friendly' : style.key === 'phd_only' ? 'Expert-level detail' : 'Simple & friendly'}
          >
            {style.emoji} {style.label}
          </StylePill>
        ))}
      </ResponseStyleBar>

      <EmptyState>
        <EmptyIcon><Sparkles size={28} /></EmptyIcon>
        <WelcomeTitle>
          {CONTEXTS[selectedContext]?.label || 'Swan Coach Assistant'}
        </WelcomeTitle>
        <WelcomeText>{CONTEXTS[selectedContext]?.description}</WelcomeText>
        <StartChatButton $active onClick={() => onStartChat(selectedContext)}>
          <Plus size={16} />
          <StartChatText>Start Chat</StartChatText>
        </StartChatButton>
      </EmptyState>
    </>
  );
});

AIContextSelector.displayName = 'AIContextSelector';

export type { AIContext, ResponseStyle } from '../../hooks/useAIChat';
export default AIContextSelector;
