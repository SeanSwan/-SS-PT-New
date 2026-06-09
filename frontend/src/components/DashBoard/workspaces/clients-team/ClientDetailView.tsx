/**
 * ============================================================================
 * FILE: ClientDetailView.tsx
 * PURPOSE: Right-pane detail view with 4 tabs (Training/Biometrics/Overview/Settings)
 * AUTHOR: Claude Opus 4.6 + Gemini 3.1 Pro | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the selected client's detail view in the right
 * pane of the master-detail layout. Contains 4 tabs that embed existing
 * components (workout logger, body map, measurements, etc.) into a unified view.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace → DetailPane → ClientDetailView
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, Activity, Heart, BarChart3, Settings, TrendingUp } from 'lucide-react';
import type { MiniCardClient } from './ClientMiniCard';
import {
  DetailContentWrapper,
  DetailHeader,
  DetailClientInfo,
  DetailAvatar,
  DetailName,
  DetailSubtext,
  DetailTabBar,
  DetailTabButton,
  DetailTabLabel,
  DetailTabPanel,
  MobileBackButton,
  PlaceholderShell,
  PlaceholderText,
  PlaceholderTitle,
} from './MasterDetailStyles';
import { getClientDisplayName, getClientInitials } from './clientIdentity';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export type DetailTab = 'training' | 'progress' | 'biometrics' | 'overview' | 'settings';

interface ClientDetailViewProps {
  client: MiniCardClient;
  onBack: () => void;
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
  /** Render props for tab content — keeps this component lean */
  renderTraining?: (clientId: number | string) => React.ReactNode;
  /** Phase 15.3: truthful 12-chart progress view for the selected client. */
  renderProgress?: (clientId: number | string) => React.ReactNode;
  renderBiometrics?: (clientId: number | string) => React.ReactNode;
  renderOverview?: (clientId: number | string) => React.ReactNode;
  renderSettings?: (clientId: number | string) => React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Configuration
// ─────────────────────────────────────────────────────────────

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'training', label: 'Training', icon: <Activity size={14} /> },
  { id: 'progress', label: 'Progress', icon: <TrendingUp size={14} /> },
  { id: 'biometrics', label: 'Biometrics', icon: <Heart size={14} /> },
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  onBack,
  activeTab: controlledActiveTab,
  onTabChange,
  renderTraining,
  renderProgress,
  renderBiometrics,
  renderOverview,
  renderSettings,
}) => {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<DetailTab>('training');
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;
  const clientName = getClientDisplayName(client);
  const clientEmail = client.email?.trim() || 'No email on file';
  const clientStatus = client.status || 'status pending';
  const clientTier = client.tier || 'Bronze Forge';
  const clientSubtext = `${clientEmail} / ${clientStatus} / ${clientTier}`;

  // Reset tab to Training when switching clients (avoids stale tab state)
  useEffect(() => {
    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab('training');
    }
  }, [client.id, controlledActiveTab]);

  const handleTabChange = useCallback((tab: DetailTab) => {
    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(tab);
    }
    onTabChange?.(tab);
  }, [controlledActiveTab, onTabChange]);

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'training':
        return renderTraining ? renderTraining(client.id) : (
          <PlaceholderContent label="Training" description="Workouts, sessions, and Swan Coach generation." />
        );
      case 'progress':
        return renderProgress ? renderProgress(client.id) : (
          <PlaceholderContent label="Progress" description="Truthful workout charts and analytics." />
        );
      case 'biometrics':
        return renderBiometrics ? renderBiometrics(client.id) : (
          <PlaceholderContent label="Biometrics" description="Measurements, body map, and progress." />
        );
      case 'overview':
        return renderOverview ? renderOverview(client.id) : (
          <PlaceholderContent label="Overview" description="Stats, engagement, and revenue." />
        );
      case 'settings':
        return renderSettings ? renderSettings(client.id) : (
          <PlaceholderContent label="Settings" description="Profile, permissions, and preferences." />
        );
      default:
        return null;
    }
  }, [activeTab, client.id, renderTraining, renderProgress, renderBiometrics, renderOverview, renderSettings]);

  return (
    <>
      <MobileBackButton type="button" onClick={onBack} aria-label="Back to client list">
        <ArrowLeft size={18} />
        Back
      </MobileBackButton>

      <DetailContentWrapper>
        <DetailHeader>
          <DetailClientInfo>
            <DetailAvatar $tier={client.tier}>
              {getClientInitials(client)}
            </DetailAvatar>
            <div>
              <DetailName>{clientName}</DetailName>
              <DetailSubtext data-swan-detail-subtext aria-label={clientSubtext} title={clientSubtext}>
                <span data-swan-detail-email="true">{clientEmail}</span>
                <span>{clientStatus}</span>
                <span>{clientTier}</span>
              </DetailSubtext>
            </div>
          </DetailClientInfo>
        </DetailHeader>

        <DetailTabBar role="tablist" aria-label="Client detail tabs">
          {TABS.map((tab) => (
            <DetailTabButton
              type="button"
              key={tab.id}
              role="tab"
              id={`detail-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`detail-panel-${tab.id}`}
              $active={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              <DetailTabLabel>{tab.label}</DetailTabLabel>
            </DetailTabButton>
          ))}
        </DetailTabBar>

        <DetailTabPanel
          role="tabpanel"
          id={`detail-panel-${activeTab}`}
          aria-labelledby={`detail-tab-${activeTab}`}
        >
          {tabContent}
        </DetailTabPanel>
      </DetailContentWrapper>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Placeholder Content
// PURPOSE: Temporary content for tabs being wired up
// ─────────────────────────────────────────────────────────────

const PlaceholderContent: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <PlaceholderShell>
    <PlaceholderTitle>{label}</PlaceholderTitle>
    <PlaceholderText>{description}</PlaceholderText>
  </PlaceholderShell>
);

export default ClientDetailView;
