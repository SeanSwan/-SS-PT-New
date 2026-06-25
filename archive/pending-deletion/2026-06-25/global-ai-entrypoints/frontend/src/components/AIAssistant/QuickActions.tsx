/**
 * QuickActions
 * ============
 * Context-aware one-tap action chips shown when a client is selected.
 * Each chip pre-fills the AI context and sends a prompt automatically.
 */
import React from 'react';
import styled from 'styled-components';
import { Dumbbell, Utensils, TrendingUp, Ruler, Brain } from 'lucide-react';
import type { AIContext } from '../../hooks/useAIChat';
import { CS } from '../../styles/crystallineSwanTheme';

const ActionsBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid ${CS.borderSubtle};
  &::-webkit-scrollbar { height: 0; }

  @media (min-width: 480px) {
    padding: 8px 16px;
  }
`;

const ActionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);
  color: ${CS.textPrimary};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  svg { color: ${CS.iceWing}; flex-shrink: 0; }

  &:hover {
    border-color: ${CS.wingPurple};
    background: ${CS.hoverBg};
  }

  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
    outline-offset: 2px;
  }
`;

interface QuickAction {
  label: string;
  icon: React.ElementType;
  context: AIContext;
  prompt: string;
}

interface QuickActionsProps {
  clientName: string;
  onAction: (context: AIContext, prompt: string) => void;
  userRole: 'trainer' | 'admin';
}

const QuickActions: React.FC<QuickActionsProps> = ({ clientName, onAction, userRole }) => {
  const actions: QuickAction[] = [
    { label: 'Log Workout', icon: Dumbbell, context: 'workout_generation', prompt: `Create a workout for ${clientName} based on their current NASM phase and recent session history.` },
    { label: 'Check Nutrition', icon: Utensils, context: 'macro_logging', prompt: `Show me ${clientName}'s recent nutrition logs and macro targets. Any recommendations?` },
    { label: 'Review Progress', icon: TrendingUp, context: 'client_review', prompt: `Give me a comprehensive progress review for ${clientName}. Include session adherence, strength gains, and any concerns.` },
    { label: 'Measurements', icon: Ruler, context: 'client_review', prompt: `What are ${clientName}'s latest body measurements? Show trends over the last month.` },
  ];

  if (userRole === 'admin') {
    actions.push({
      label: 'Full Analysis',
      icon: Brain,
      context: 'data_management',
      prompt: `Run a full data analysis for ${clientName}. Include all available metrics, flags, and recommendations.`,
    });
  }

  return (
    <ActionsBar>
      {actions.map(action => (
        <ActionChip
          key={action.label}
          onClick={() => onAction(action.context, action.prompt)}
          aria-label={`${action.label} for ${clientName}`}
        >
          <action.icon size={14} />
          {action.label}
        </ActionChip>
      ))}
    </ActionsBar>
  );
};

export default QuickActions;
