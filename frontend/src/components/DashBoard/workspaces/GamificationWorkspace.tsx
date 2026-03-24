import React from 'react';
import AdminGamificationView from '../Pages/admin-gamification/admin-gamification-view';
import AITerminalPanel from '../../Shared/AITerminalPanel';

/**
 * GamificationWorkspace
 * Phase 3 consolidation: AdminGamificationView manages its own internal tabs
 * (Achievements, Rewards, Settings, Analytics), so the outer WorkspaceContainer
 * tabs were redundant duplicates. Now renders the view directly.
 */
const GamificationWorkspace: React.FC = () => (
  <>
    <div style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="gamification"
        label="Gamification Coach"
        emptyHint="Ask about achievements, badges, XP system, leaderboards, and tier progression."
        defaultOpen={false}
      />
    </div>
    <AdminGamificationView />
  </>
);

export default GamificationWorkspace;
