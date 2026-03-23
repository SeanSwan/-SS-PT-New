/**
 * FormAnalysisCrystalline
 * ==================
 * Dashboard-embedded form analysis section for the client dashboard.
 * Uses the same lazy-loaded tabs from FormAnalysis/ but styled for the Crystalline Swan theme.
 */
import React, { lazy, Suspense, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Upload, Camera, History, User, Loader2 } from 'lucide-react';

const UploadTab = lazy(() => import('../../FormAnalysis/UploadTab'));
const FormAnalyzer = lazy(() => import('../../FormAnalysis/FormAnalyzer'));
const HistoryTab = lazy(() => import('../../FormAnalysis/HistoryTab'));
const MovementProfilePage = lazy(() => import('../../FormAnalysis/MovementProfilePage'));

type TabId = 'upload' | 'live' | 'history' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'upload', label: 'Upload Video', icon: Upload },
  { id: 'live', label: 'Live Camera', icon: Camera },
  { id: 'history', label: 'History', icon: History },
  { id: 'profile', label: 'Movement Profile', icon: User },
];

const TAB_COMPONENTS: Record<TabId, React.LazyExoticComponent<React.ComponentType>> = {
  upload: UploadTab,
  live: FormAnalyzer,
  history: HistoryTab,
  profile: MovementProfilePage,
};

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 4px;
  &::-webkit-scrollbar { height: 0; }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${({ $active }) => $active ? '#8B5CF6' : '#94a3b8'};
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    color: #8B5CF6;
  }
`;

const ContentWrapper = styled(motion.div)`
  min-height: 400px;
`;

const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(255, 255, 255, 0.5);
  gap: 10px;
  font-size: 0.9rem;
`;

const SpinningLoader = styled(Loader2)`
  animation: spin 0.6s linear infinite;
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const InfoCard = styled.div`
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 1.5rem;
  color: #94a3b8;
  font-size: 0.88rem;
  line-height: 1.5;

  strong {
    color: #8B5CF6;
  }
`;

const FormAnalysisCrystalline: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <>
      <InfoCard>
        <strong>Movement Analysis</strong> — Upload a workout video or use your camera to get real-time
        form feedback powered by MediaPipe pose detection. Supports 81 exercises with rep counting,
        compensation detection, and corrective recommendations.
      </InfoCard>

      <TabBar>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <TabButton
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </TabButton>
          );
        })}
      </TabBar>

      <ContentWrapper
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Suspense fallback={<LoadingFallback><SpinningLoader size={20} /> Loading...</LoadingFallback>}>
          <ActiveComponent />
        </Suspense>
      </ContentWrapper>
    </>
  );
};

export default FormAnalysisCrystalline;
