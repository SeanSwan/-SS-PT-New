/**
 * WorkoutsWorkspace — Unified Workout Workspace with Client Drawer
 * Per Gemini 3.1 Pro design authority: drawer-based client selection,
 * cosmic empty state, and floating active-client header.
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  ClipboardList,
  Activity,
  Brain,
  User,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import WorkoutClientDrawer from './WorkoutClientDrawer';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';

// ---- Types ----

interface SelectedClient {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  photo?: string;
  availableSessions?: number;
}

// ---- Tabs ----

const TABS = [
  { id: 'plans', label: 'Plans', icon: <Dumbbell size={16} />, path: '/dashboard/workouts' },
  { id: 'logger', label: 'Logger', icon: <ClipboardList size={16} />, path: '/dashboard/workouts/logger' },
  { id: 'movement', label: 'Movement', icon: <Activity size={16} />, path: '/dashboard/workouts/movement' },
  { id: 'ai', label: 'AI Protocols', icon: <Brain size={16} />, path: '/dashboard/workouts/ai' },
];

// ---- Component ----

const WorkoutsWorkspace: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleClientSelect = useCallback((client: any) => {
    setSelectedClient({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      photo: client.photo,
      availableSessions: client.availableSessions,
    });
  }, []);

  const activeTabId = TABS.find((t) => location.pathname === t.path)?.id || 'plans';

  return (
    <WorkspaceRoot>
      {/* Tab Navigation */}
      <TabBar>
        <TabBarInner>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              $active={activeTabId === tab.id}
              onClick={() => navigate(tab.path)}
              aria-selected={activeTabId === tab.id}
              role="tab"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabButton>
          ))}
        </TabBarInner>
      </TabBar>

      {/* Active Client Header / Trigger */}
      <ActiveClientHeader
        onClick={() => setIsDrawerOpen(true)}
        whileHover={{ boxShadow: '0 0 16px rgba(0, 255, 255, 0.15)' }}
        whileTap={{ scale: 0.98 }}
        aria-label={selectedClient ? `Selected: ${selectedClient.firstName} ${selectedClient.lastName}. Click to change.` : 'Select a client'}
      >
        {selectedClient ? (
          <>
            <ClientHeaderAvatar $src={selectedClient.photo}>
              {!selectedClient.photo &&
                `${selectedClient.firstName[0]}${selectedClient.lastName[0]}`}
            </ClientHeaderAvatar>
            <ClientHeaderInfo>
              <ClientHeaderName>
                {selectedClient.firstName} {selectedClient.lastName}
              </ClientHeaderName>
              {selectedClient.availableSessions != null && (
                <ClientHeaderSessions>
                  <Zap size={12} /> {selectedClient.availableSessions} sessions
                </ClientHeaderSessions>
              )}
            </ClientHeaderInfo>
            <ChangeLabel>
              Change <ChevronDown size={14} />
            </ChangeLabel>
          </>
        ) : (
          <>
            <SelectIcon>
              <User size={18} />
            </SelectIcon>
            <SelectLabel>Select a Client</SelectLabel>
            <ChevronDown size={16} style={{ color: '#00FFFF' }} />
          </>
        )}
      </ActiveClientHeader>

      {/* Content Area */}
      <ContentArea>
        <AnimatePresence mode="wait">
          {!selectedClient ? (
            <CosmicEmptyState
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyOrb>
                <Dumbbell size={40} />
              </EmptyOrb>
              <EmptyTitle>Select a Client to Begin</EmptyTitle>
              <EmptySubtitle>
                Choose a client from the drawer to start logging workouts,
                building plans, or running AI protocols.
              </EmptySubtitle>
              <EmptyAction
                onClick={() => setIsDrawerOpen(true)}
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                <User size={18} />
                Open Client Drawer
              </EmptyAction>
            </CosmicEmptyState>
          ) : (
            <WorkspaceContent
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, staggerChildren: 0.1 }}
            >
              <Suspense fallback={<CosmicSuspenseLoader />}>
                <Outlet context={{ clientId: selectedClient.id, client: selectedClient }} />
              </Suspense>
            </WorkspaceContent>
          )}
        </AnimatePresence>
      </ContentArea>

      {/* Client Selection Drawer */}
      <WorkoutClientDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handleClientSelect}
      />
    </WorkspaceRoot>
  );
};

export default WorkoutsWorkspace;

// ---- Styled Components ----

const WorkspaceRoot = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  color: #e2e8f0;
`;

const TabBar = styled.div`
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabBarInner = styled.div`
  display: flex;
  gap: 4px;
  min-width: max-content;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? '#00FFFF' : 'transparent')};
  background: transparent;
  color: ${(p) => (p.$active ? '#00FFFF' : 'rgba(255,255,255,0.65)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  min-height: 48px;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    color: ${(p) => (p.$active ? '#00FFFF' : 'rgba(255,255,255,0.9)')};
    background: rgba(255, 255, 255, 0.02);
  }

  &:focus-visible {
    outline: 2px solid #00FFFF;
    outline-offset: -2px;
  }
`;

const ActiveClientHeader = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 0 20px;
  height: 56px;
  border-radius: 28px;
  border: 1px solid rgba(0, 255, 255, 0.12);
  background: rgba(10, 10, 26, 0.5);
  backdrop-filter: blur(12px);
  cursor: pointer;
  color: inherit;
  transition: border-color 0.2s;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    margin: 12px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    height: 52px;
    padding: 0 12px;
  }
`;

const ClientHeaderAvatar = styled.div<{ $src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${(p) =>
    p.$src
      ? `url(${p.$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, #7851A9, #00FFFF)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #0a0a1a;
  flex-shrink: 0;
  text-transform: uppercase;
`;

const ClientHeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
  text-align: left;
`;

const ClientHeaderName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
`;

const ClientHeaderSessions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #00ffff;
`;

const ChangeLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
`;

const SelectIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px dashed rgba(0, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffff;
  flex-shrink: 0;
`;

const SelectLabel = styled.span`
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
`;

const ContentArea = styled.div`
  flex: 1;
  position: relative;
  overflow-y: auto;
  padding: 0 16px 24px;
`;

const CosmicEmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  gap: 16px;
`;

const EmptyOrb = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(120, 81, 169, 0.3), rgba(0, 255, 255, 0.08));
  border: 1px solid rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffff;
  margin-bottom: 8px;
`;

const EmptyTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #f0f0ff;
  margin: 0;
`;

const EmptySubtitle = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.65);
  max-width: 360px;
  margin: 0;
  line-height: 1.5;
`;

const EmptyAction = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 14px 32px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #00FFFF 0%, #0088FF 100%);
  color: #0a0a1a;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  min-height: 48px;
  letter-spacing: 0.3px;
`;

const WorkspaceContent = styled(motion.div)`
  width: 100%;
`;
