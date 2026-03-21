/**
 * ┌─── SUB-COMPONENT: AIContextSelector ───────────────────────┐
 * │ PARENT: AIAssistantDrawer                                   │
 * │ PURPOSE: Context pills + response style bar + welcome state │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────┐            │
 * │ │ [Gen] [Macros] [Form] [WO] [Plans] [Client] │            │
 * │ │  mobile: 2-col icon grid, tablet+: pill bar  │            │
 * │ │ [🎓💯 Both] [🎓 PhD] [💯 Keep It 100]       │            │
 * │ │                                              │            │
 * │ │    ✨ Generate Plans                         │            │
 * │ │    Create structured workout plans           │            │
 * │ │    [+ Start Chat]                            │            │
 * │ └──────────────────────────────────────────────┘            │
 * │ Props: { userRole, selectedContext, onContextChange,        │
 * │          selectedStyle, onStyleChange, onStartChat }        │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useMemo, memo } from 'react';
import {
  MessageSquare, Utensils, Dumbbell, Brain,
  Sparkles, Database, Plus,
} from 'lucide-react';
import type { AIContext, ResponseStyle } from '../../hooks/useAIChat';
import {
  ContextBar,
  ContextPill,
  ResponseStyleBar,
  StylePill,
  EmptyState,
  EmptyIcon,
  WelcomeTitle,
  WelcomeText,
  SendBtn,
} from './AIDrawerStyles';

// ── Context Config ──────────────────────────────────────────

interface ContextConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  roles: string[];
}

export const CONTEXTS: Record<AIContext, ContextConfig> = {
  general: { label: 'General', icon: MessageSquare, description: 'Ask me anything about fitness and wellness', roles: ['client', 'trainer', 'admin'] },
  macro_logging: { label: 'Macros', icon: Utensils, description: 'Log food — just tell me what you ate', roles: ['client', 'trainer', 'admin'] },
  form_tips: { label: 'Form Tips', icon: Dumbbell, description: 'Get exercise form guidance', roles: ['client', 'trainer', 'admin'] },
  workout_suggestions: { label: 'Workouts', icon: Sparkles, description: 'Get workout ideas and suggestions', roles: ['client', 'trainer', 'admin'] },
  workout_generation: { label: 'Generate Plans', icon: Brain, description: 'Create structured workout plans', roles: ['trainer', 'admin'] },
  client_review: { label: 'Client Review', icon: Brain, description: 'Analyze client progress and data', roles: ['trainer', 'admin'] },
  data_management: { label: 'Data Manager', icon: Database, description: 'Review, analyze, and manage platform data', roles: ['admin'] },
};

export const RESPONSE_STYLES: { key: ResponseStyle; label: string; emoji: string }[] = [
  { key: 'both', label: 'Both', emoji: '🎓💯' },
  { key: 'phd_only', label: 'PhD Mode', emoji: '🎓' },
  { key: 'simple_only', label: 'Keep It 100', emoji: '💯' },
];

// ── Component ───────────────────────────────────────────────

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
    [userRole]
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
          {CONTEXTS[selectedContext]?.label || 'AI Assistant'}
        </WelcomeTitle>
        <WelcomeText>{CONTEXTS[selectedContext]?.description}</WelcomeText>
        <SendBtn $active onClick={() => onStartChat(selectedContext)} style={{ width: 'auto', padding: '0 24px', borderRadius: 999 }}>
          <Plus size={16} />
          <span style={{ marginLeft: 6, fontWeight: 600, fontSize: '0.88rem' }}>Start Chat</span>
        </SendBtn>
      </EmptyState>
    </>
  );
});

AIContextSelector.displayName = 'AIContextSelector';
export default AIContextSelector;

// ── Re-export for parent usage ──
export { type AIContext, type ResponseStyle } from '../../hooks/useAIChat';
