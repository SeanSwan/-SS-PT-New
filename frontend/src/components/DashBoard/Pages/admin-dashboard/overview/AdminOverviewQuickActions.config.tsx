import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { BarChart3, Brain, ClipboardList, Dumbbell, Mail, UserCheck, UserPlus, UserRound, Users } from 'lucide-react';
import { buildClientCoachOnboardingRoute } from '../../../workspaces/clients-team/clientDailyTrainingRoutes';
import { ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE } from '../../coach-assistant/SwanCoachWorkoutLoggerRoute';
import { AdminQuickAction } from './AdminOverview.types';

const buildAdminCoachCommandRoute = () => {
  const params = new URLSearchParams({
    intent: 'admin_daily_command',
    source: 'admin-overview',
    returnTo: '/dashboard/admin/overview',
  });
  return `/dashboard/admin/coach-assistant?${params.toString()}`;
};

export const buildAdminOverviewQuickActions = (
  navigate: NavigateFunction
): AdminQuickAction[] => [
  {
    id: 'coach-command',
    title: 'Coach Command',
    description: 'Ask what to do next',
    icon: <Brain size={20} />,
    action: () => navigate(buildAdminCoachCommandRoute()),
  },
  {
    id: 'log-client-workout',
    title: 'Log Client',
    description: 'Choose client, log today',
    icon: <Dumbbell size={20} />,
    action: () => navigate('/dashboard/admin/client-management?intent=log_workout'),
  },
  {
    id: 'my-workout',
    title: 'My Workout',
    description: 'Log my workout',
    icon: <UserRound size={20} />,
    action: () => navigate(ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE),
  },
  {
    id: 'coach-client-intake',
    title: 'Onboard Client',
    description: 'Start Swan Coach intake',
    icon: <UserPlus size={20} />,
    action: () => navigate(buildClientCoachOnboardingRoute()),
  },
  {
    id: 'client-activation-queue',
    title: 'Activation Queue',
    description: 'Finish paid-client setup',
    icon: <UserCheck size={20} />,
    action: () => navigate('/dashboard/admin/client-management'),
  },
  {
    id: 'view-reports',
    title: 'Analytics',
    description: 'Analytics & insights',
    icon: <BarChart3 size={20} />,
    action: () => navigate('/dashboard/admin/revenue'),
  },
  {
    id: 'manage-users',
    title: 'User Management',
    description: 'Manage platform users',
    icon: <Users size={20} />,
    action: () => navigate('/dashboard/admin/user-management'),
  },
  {
    id: 'session-packages',
    title: 'Packages',
    description: 'Manage session packages',
    icon: <ClipboardList size={20} />,
    action: () => navigate('/dashboard/admin/admin-packages'),
  },
  {
    id: 'notifications',
    title: 'Messages',
    description: 'Client & trainer messages',
    icon: <Mail size={20} />,
    action: () => navigate('/dashboard/admin/messages'),
  },
];
