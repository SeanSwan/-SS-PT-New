import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { BarChart3, ClipboardList, Dumbbell, Mail, UserPlus, Users } from 'lucide-react';
import { buildClientCoachOnboardingRoute } from '../../../workspaces/clients-team/clientDailyTrainingRoutes';
import { AdminQuickAction } from './AdminOverview.types';

export const buildAdminOverviewQuickActions = (
  navigate: NavigateFunction
): AdminQuickAction[] => [
  {
    id: 'coach-client-intake',
    title: 'Onboard Client',
    description: 'Start Swan Coach intake',
    icon: <UserPlus size={20} />,
    action: () => navigate(buildClientCoachOnboardingRoute()),
  },
  {
    id: 'log-client-workout',
    title: 'Log Workout',
    description: 'Choose client, log today',
    icon: <Dumbbell size={20} />,
    action: () => navigate('/dashboard/admin/client-management?intent=log_workout'),
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
