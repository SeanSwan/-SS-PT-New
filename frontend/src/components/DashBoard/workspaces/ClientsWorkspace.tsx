import React from 'react';
import {
  Users, UserCheck, UserPlus, Mail,
  BarChart3, Link, FileSignature,
  ClipboardList, Ruler,
} from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'clients', label: 'Clients', icon: <Users size={18} />, path: '/dashboard/people' },
  { id: 'users', label: 'Users', icon: <Users size={18} />, path: '/dashboard/people/users' },
  { id: 'trainers', label: 'Trainers', icon: <UserCheck size={18} />, path: '/dashboard/people/trainers' },
  { id: 'orientations', label: 'Orientation Queue', icon: <ClipboardList size={18} />, path: '/dashboard/people/orientations' },
  { id: 'onboarding', label: 'Onboarding', icon: <UserPlus size={18} />, path: '/dashboard/people/onboarding' },
  { id: 'messages', label: 'Messages', icon: <Mail size={18} />, path: '/dashboard/people/messages' },
  { id: 'measurements', label: 'Measurements', icon: <Ruler size={18} />, path: '/dashboard/people/measurements' },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} />, path: '/dashboard/people/progress' },
  { id: 'assignments', label: 'Assignments', icon: <Link size={18} />, path: '/dashboard/people/assignments' },
  { id: 'waivers', label: 'Waivers', icon: <FileSignature size={18} />, path: '/dashboard/people/waivers' },
];

const ClientsWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Clients & Team"
    subtitle="Manage clients, trainers, and team operations"
    tabs={tabs}
  />
);

export default ClientsWorkspace;
