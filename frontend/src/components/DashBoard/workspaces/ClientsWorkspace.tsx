import React from 'react';
import {
  Users, UserCheck, UserPlus, Mail, MessageSquare,
  FileText, UtensilsCrossed, Dumbbell, Camera,
  ClipboardCheck, BarChart3, Shield, Link, Globe, FileSignature,
} from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'users', label: 'Users', icon: <Users size={18} />, path: '/dashboard/people' },
  { id: 'clients', label: 'Clients', icon: <Users size={18} />, path: '/dashboard/people/clients' },
  { id: 'trainers', label: 'Trainers', icon: <UserCheck size={18} />, path: '/dashboard/people/trainers' },
  { id: 'onboarding', label: 'Onboarding', icon: <UserPlus size={18} />, path: '/dashboard/people/onboarding' },
  { id: 'messages', label: 'Messages', icon: <Mail size={18} />, path: '/dashboard/people/messages' },
  { id: 'sms-logs', label: 'SMS Logs', icon: <MessageSquare size={18} />, path: '/dashboard/people/sms-logs' },
  { id: 'notes', label: 'Notes', icon: <FileText size={18} />, path: '/dashboard/people/notes' },
  { id: 'nutrition', label: 'Nutrition', icon: <UtensilsCrossed size={18} />, path: '/dashboard/people/nutrition' },
  { id: 'workouts', label: 'Workouts', icon: <Dumbbell size={18} />, path: '/dashboard/people/workouts' },
  { id: 'photos', label: 'Photos', icon: <Camera size={18} />, path: '/dashboard/people/photos' },
  { id: 'nasm', label: 'NASM', icon: <ClipboardCheck size={18} />, path: '/dashboard/people/nasm' },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} />, path: '/dashboard/people/progress' },
  { id: 'permissions', label: 'Permissions', icon: <Shield size={18} />, path: '/dashboard/people/trainers/permissions' },
  { id: 'assignments', label: 'Assignments', icon: <Link size={18} />, path: '/dashboard/people/assignments' },
  { id: 'social', label: 'Social', icon: <Globe size={18} />, path: '/dashboard/people/social' },
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
