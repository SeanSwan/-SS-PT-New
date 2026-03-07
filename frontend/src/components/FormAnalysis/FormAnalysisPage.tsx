/**
 * FormAnalysisPage — Standalone Tabbed Form Analysis
 * ===================================================
 * Phase 4: Standalone route at /form-analysis
 * Three tabs: Upload, Live Camera, History
 *
 * Accessible to all authenticated users.
 */
import React, { lazy, Suspense, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const UploadTab = lazy(() => import('./UploadTab'));
const FormAnalyzer = lazy(() => import('./FormAnalyzer'));
const HistoryTab = lazy(() => import('./HistoryTab'));
const MovementProfilePage = lazy(() => import('./MovementProfilePage'));

type TabId = 'upload' | 'live' | 'history' | 'profile';

const TABS: { id: TabId; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'live', label: 'Live' },
  { id: 'history', label: 'History' },
  { id: 'profile', label: 'Profile' },
];

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #E0ECF4;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 20px 20px 0;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  color: #E0ECF4;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  min-height: 44px;
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? '#60C0F0' : 'transparent'};
  background: transparent;
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.4)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.6)'};
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
`;

const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: rgba(224, 236, 244, 0.4);
  font-size: 14px;
`;

const LiveWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

// --- Component ---

const FormAnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('upload');

  // Live tab renders full-screen, others render in scrollable container
  if (activeTab === 'live') {
    return (
      <Suspense fallback={<LoadingFallback>Loading camera...</LoadingFallback>}>
        <LiveWrapper>
          <FormAnalyzer />
        </LiveWrapper>
      </Suspense>
    );
  }

  return (
    <PageWrapper>
      <Header>
        <Title>Form Analysis</Title>
        <Subtitle>AI-powered exercise form checking</Subtitle>
      </Header>

      <TabBar>
        {TABS.map(tab => (
          <Tab
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </TabBar>

      <TabContent>
        <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
          {activeTab === 'upload' && <UploadTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'profile' && <MovementProfilePage />}
        </Suspense>
      </TabContent>
    </PageWrapper>
  );
};

export default FormAnalysisPage;
