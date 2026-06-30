/**
 * FILE: ClientDashboardHome.quickActions.tsx
 * PURPOSE: First-viewport quick action controls for the client dashboard Home surface.
 */
import React from 'react';
import { Bot, CalendarDays, Dumbbell, LineChart, Sparkles, Trophy } from 'lucide-react';
import { ActionButton, QuickActionGrid } from './ClientDashboardHome.cardStyles';
import type { ClientDashboardAction, ClientDashboardHomeProps } from './ClientDashboardHome.types';

type ClientQuickActionsProps = {
  actions: ClientDashboardAction[];
} & Pick<ClientDashboardHomeProps, 'onNavigate' | 'onTarget'>;

const resolveQuickActionIcon = (action: ClientDashboardAction, index: number) => {
  if (action.target === 'challenges') return Trophy;
  if (action.target === 'progress') return LineChart;
  if (action.target === 'coach' || action.label === 'Ask Coach') return Bot;
  if (action.path?.includes('schedule')) return CalendarDays;
  if (action.path?.includes('log-workout') || index === 0) return Dumbbell;
  return Sparkles;
};

export function ClientQuickActions({ actions, onNavigate, onTarget }: ClientQuickActionsProps) {
  return (
    <QuickActionGrid>
      {actions.map((action, index) => {
        const Icon = resolveQuickActionIcon(action, index);
        return (
          <ActionButton
            key={action.label}
            type="button"
            $primary={index === 0}
            disabled={!!action.disabledReason}
            title={action.disabledReason || action.label}
            onClick={() => (action.path ? onNavigate(action.path) : action.target ? onTarget(action.target) : undefined)}
          >
            <Icon size={17} aria-hidden="true" />
            {action.label}
          </ActionButton>
        );
      })}
    </QuickActionGrid>
  );
}
