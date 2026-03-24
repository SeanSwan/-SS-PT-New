import React, { useState, useCallback } from 'react';
import {
  Users, UserCheck, UserPlus, Mail,
  BarChart3, Link, FileSignature,
  ClipboardList, Ruler, Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';
import AdminViewAsBar from '../Pages/admin-clients/components/AdminViewAsBar';

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
  { id: 'leads', label: 'Leads CRM', icon: <Target size={18} />, path: '/dashboard/people/leads' },
];

const ClientsWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [viewingUser, setViewingUser] = useState<{ id: number | string; firstName: string; lastName: string; email: string; role: string } | null>(null);

  const handleSelectUser = useCallback((user: { id: number | string; firstName: string; lastName: string; email: string; role: string }) => {
    setViewingUser(user);
    navigate(`/dashboard/people/view-as/${user.id}`);
  }, [navigate]);

  const handleExitView = useCallback(() => {
    setViewingUser(null);
    navigate('/dashboard/people');
  }, [navigate]);

  return (
    <>
      <div style={{ padding: '24px 24px 0' }}>
        <AdminViewAsBar
          viewingUser={viewingUser}
          onSelectUser={handleSelectUser}
          onExit={handleExitView}
        />
        <AITerminalPanel
          context="client_review"
          label="Client Assistant"
          emptyHint="Ask about client management, progress, onboarding..."
          defaultOpen={false}
        />
      </div>
      <WorkspaceContainer
        title="Clients & Team"
        subtitle="Manage clients, trainers, and team operations"
        tabs={tabs}
      />
    </>
  );
};

export default ClientsWorkspace;
