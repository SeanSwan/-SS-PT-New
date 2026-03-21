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
        context="general"
        label="Gamification Assistant"
        emptyHint="Ask about achievements, rewards, engagement..."
        defaultOpen={false}
      />
    </div>
    <AdminGamificationView />
  </>
);

export default GamificationWorkspace;
