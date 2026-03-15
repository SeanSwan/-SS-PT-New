/**
 * WorkoutsWorkspace — Unified Workout Workspace with Client Drawer
 * Per Gemini 3.1 Pro design authority: drawer-based client selection,
 * cosmic empty state, and floating active-client header.
 */

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
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
  Video,
  HeartPulse,
  Users,
  Camera,
  Apple,
  ScanBarcode,
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
  { id: 'ai', label: 'Deep Research', icon: <Brain size={16} />, path: '/dashboard/workouts/ai' },
  { id: 'form-analysis', label: 'Movement Analysis', icon: <Video size={16} />, path: '/dashboard/workouts/form-analysis' },
  { id: 'body-map', label: 'Body Map', icon: <HeartPulse size={16} />, path: '/dashboard/workouts/body-map' },
  { id: 'bootcamp', label: 'Boot Camp', icon: <Users size={16} />, path: '/dashboard/workouts/bootcamp' },
  { id: 'equipment', label: 'Equipment', icon: <Camera size={16} />, path: '/dashboard/workouts/equipment' },
  { id: 'nutrition', label: 'Nutrition', icon: <Apple size={16} />, path: '/dashboard/workouts/nutrition' },
  { id: 'food-scanner', label: 'Scanner', icon: <ScanBarcode size={16} />, path: '/dashboard/workouts/food-scanner' },
];

// ---- Component ----

const WorkoutsWorkspace: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for AI "Apply to Logger" navigation event
  useEffect(() => {
    const handler = () => {
      if (location.pathname !== '/dashboard/workouts/logger') {
        navigate('/dashboard/workouts/logger');
      }
    };
    window.addEventListener('navigateToWorkoutLogger', handler);
    return () => window.removeEventListener('navigateToWorkoutLogger', handler);
  }, [navigate, location.pathname]);

  const handleClientSelect = useCallback((client: any) => {
    setSelectedClient({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      photo: client.photo,
      availableSessions: client.availableSessions,
    });
    // Store selected client ID for AI Assistant enrichment
    try { sessionStorage.setItem('ai_target_client_id', String(client.id)); } catch { /* ignore */ }
  }, []);

  const activeTabId = TABS.find((t) => location.pathname === t.path)?.id || 'plans';

  // Tabs that don't require client selection (e.g., group class builder, equipment manager)
  const clientFreeTab = activeTabId === 'bootcamp' || activeTabId === 'equipment' || activeTabId === 'nutrition' || activeTabId === 'food-scanner';

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

      {/* Client-free tabs render Outlet directly, skip client header */}
      {clientFreeTab ? (
        <ContentArea>
          <WorkspaceContent
            key="content-no-client"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<CosmicSuspenseLoader />}>
              <Outlet />
            </Suspense>
          </WorkspaceContent>
        </ContentArea>
      ) : (
      <>
      {/* Active Client Header / Trigger */}
      <ActiveClientHeader
        onClick={() => setIsDrawerOpen(true)}
        whileHover={{ boxShadow: '0 0 16px rgba(139, 92, 246, 0.15)' }}
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
            <ChevronDown size={16} style={{ color: '#8B5CF6' }} />
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
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
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
      </>
      )}
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
  scrollbar-width: none;
  scroll-snap-type: x mandatory;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    padding: 6px 8px;
    border-bottom: none;
    background: rgba(0, 32, 96, 0.3);
    border-radius: 12px;
    margin: 8px;
  }
`;

const TabBarInner = styled.div`
  display: flex;
  gap: 4px;
  min-width: max-content;

  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? '#8B5CF6' : 'transparent')};
  background: transparent;
  color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255,255,255,0.65)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  min-height: 48px;
  white-space: nowrap;
  transition: all 0.15s;
  scroll-snap-align: start;

  &:hover {
    color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255,255,255,0.9)')};
    background: rgba(255, 255, 255, 0.02);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 12px;
    min-height: 36px;
    gap: 5px;
    border-bottom: none;
    border-radius: 18px;
    background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.15)' : 'transparent')};
    border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.3)' : 'transparent')};

    svg {
      width: 14px;
      height: 14px;
    }
  }

  @media (max-width: 430px) {
    padding: 6px 10px;
    font-size: 11px;
    min-height: 32px;
    gap: 4px;
  }

  @media (max-width: 375px) {
    padding: 6px 8px;
    font-size: 11px;

    /* Hide label on very small screens, show icon only */
    span {
      display: none;
    }
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
  border: 1px solid rgba(139, 92, 246, 0.12);
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(12px);
  cursor: pointer;
  color: inherit;
  transition: border-color 0.2s;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
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
      : 'linear-gradient(135deg, #8B5CF6, #8B5CF6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #002060;
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
  color: #8B5CF6;
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
  border: 2px dashed rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
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
  background: radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
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
  background: linear-gradient(135deg, #8B5CF6 0%, #0088FF 100%);
  color: #002060;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  min-height: 48px;
  letter-spacing: 0.3px;
`;

const WorkspaceContent = styled(motion.div)`
  width: 100%;
`;
