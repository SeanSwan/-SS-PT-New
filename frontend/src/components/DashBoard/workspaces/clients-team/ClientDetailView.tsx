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
import { ArrowLeft, Activity, Heart, BarChart3, Settings } from 'lucide-react';
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
  MobileBackButton,
} from './MasterDetailStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

type DetailTab = 'training' | 'biometrics' | 'overview' | 'settings';

interface ClientDetailViewProps {
  client: MiniCardClient;
  onBack: () => void;
  /** Render props for tab content — keeps this component lean */
  renderTraining?: (clientId: number | string) => React.ReactNode;
  renderBiometrics?: (clientId: number | string) => React.ReactNode;
  renderOverview?: (clientId: number | string) => React.ReactNode;
  renderSettings?: (clientId: number | string) => React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Configuration
// ─────────────────────────────────────────────────────────────

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'training', label: 'Training', icon: <Activity size={14} /> },
  { id: 'biometrics', label: 'Biometrics', icon: <Heart size={14} /> },
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string): string => {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  onBack,
  renderTraining,
  renderBiometrics,
  renderOverview,
  renderSettings,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('training');

  // Reset tab to Training when switching clients (avoids stale tab state)
  useEffect(() => {
    setActiveTab('training');
  }, [client.id]);

  const handleTabChange = useCallback((tab: DetailTab) => {
    setActiveTab(tab);
  }, []);

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'training':
        return renderTraining ? renderTraining(client.id) : (
          <PlaceholderContent label="Training" description="Workouts, sessions, and AI generation." />
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
  }, [activeTab, client.id, renderTraining, renderBiometrics, renderOverview, renderSettings]);

  return (
    <>
      <MobileBackButton onClick={onBack} aria-label="Back to client list">
        <ArrowLeft size={18} />
        Back
      </MobileBackButton>

      <DetailContentWrapper>
        <DetailHeader>
          <DetailClientInfo>
            <DetailAvatar $tier={client.tier}>
              {getInitials(client.firstName, client.lastName)}
            </DetailAvatar>
            <div>
              <DetailName>{client.firstName} {client.lastName}</DetailName>
              <DetailSubtext>
                {client.email || '—'} · {client.status} · {client.tier || 'Bronze Forge'}
              </DetailSubtext>
            </div>
          </DetailClientInfo>
        </DetailHeader>

        <DetailTabBar role="tablist" aria-label="Client detail tabs">
          {TABS.map((tab) => (
            <DetailTabButton
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`detail-panel-${tab.id}`}
              $active={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              <span style={{ marginLeft: 6 }}>{tab.label}</span>
            </DetailTabButton>
          ))}
        </DetailTabBar>

        <div
          role="tabpanel"
          id={`detail-panel-${activeTab}`}
          style={{ opacity: 1, transition: 'opacity 200ms ease-in-out' }}
        >
          {tabContent}
        </div>
      </DetailContentWrapper>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Placeholder Content
// PURPOSE: Temporary content for tabs being wired up
// ─────────────────────────────────────────────────────────────

const PlaceholderContent: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <div style={{
    padding: '48px 24px',
    textAlign: 'center',
    background: 'var(--bg-surface, #141419)',
    borderRadius: '12px',
    border: '1px solid rgba(224, 236, 244, 0.05)',
  }}>
    <h3 style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '18px',
      color: 'var(--text-primary, #E0ECF4)',
      margin: '0 0 8px',
    }}>
      {label}
    </h3>
    <p style={{
      fontFamily: "'Sora', sans-serif",
      fontSize: '14px',
      color: 'var(--text-secondary, #4070C0)',
      margin: 0,
    }}>
      {description}
    </p>
  </div>
);

export default ClientDetailView;
