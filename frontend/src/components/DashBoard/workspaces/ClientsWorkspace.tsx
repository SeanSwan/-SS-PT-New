/**
 * ============================================================================
 * FILE: ClientsWorkspace.tsx
 * PURPOSE: Entry point for Clients & Team workspace — Master-Detail layout
 * AUTHOR: Claude Opus 4.6 + Gemini 3.1 Pro | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the Clients & Team workspace using the new
 * master-detail layout with 4-pillar navigation (Roster/Growth/Studio/Comms).
 * Replaces the old 11-tab flat WorkspaceContainer pattern.
 *
 * HOW IT FITS IN THE APP: UnifiedAdminRoutes → ClientsWorkspace → MasterDetailLayout
 *
 * KEY DECISIONS: Master-detail replaces flat tabs. AdminViewAsBar and AITerminal
 * remain available but AI terminal is collapsed by default to save space.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterDetailLayout } from './clients-team';
import AdminViewAsBar from '../Pages/admin-clients/components/AdminViewAsBar';
import { AICommandBar } from '../../Shared/AICommandBar';

const ClientsWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [viewingUser, setViewingUser] = useState<{
    id: number | string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null>(null);

  const handleSelectUser = useCallback((user: {
    id: number | string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) => {
    setViewingUser(user);
    navigate(`/dashboard/people/view-as/${user.id}`);
  }, [navigate]);

  const handleExitView = useCallback(() => {
    setViewingUser(null);
    navigate('/dashboard/people');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* SwanStudios Assistant — embedded command bar */}
      <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
        <AICommandBar context="client_review" />
      </div>

      {/* Admin View-As bar (compact) */}
      <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
        <AdminViewAsBar
          viewingUser={viewingUser}
          onSelectUser={handleSelectUser}
          onExit={handleExitView}
        />
      </div>

      {/* Master-Detail Layout */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MasterDetailLayout />
      </div>
    </div>
  );
};

export default ClientsWorkspace;
