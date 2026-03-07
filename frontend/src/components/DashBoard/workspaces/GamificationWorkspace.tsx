import React from 'react';
import AdminGamificationView from '../Pages/admin-gamification/admin-gamification-view';

/**
 * GamificationWorkspace
 * Phase 3 consolidation: AdminGamificationView manages its own internal tabs
 * (Achievements, Rewards, Settings, Analytics), so the outer WorkspaceContainer
 * tabs were redundant duplicates. Now renders the view directly.
 */
const GamificationWorkspace: React.FC = () => <AdminGamificationView />;

export default GamificationWorkspace;
