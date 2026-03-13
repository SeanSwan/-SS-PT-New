/**
 * CanadaImmigrationTab.tsx
 * ──────────────────────────────────────────────────────────────────
 * Main container for the Canada Immigration admin mini-app.
 * 7 sub-tabs: Overview, Checklist, Documents, CRS Calculator,
 *             Study Hub, Resources, Timeline
 *
 * Uses Crystalline Swan theme tokens throughout.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';

import ImmigrationDashboard from './ImmigrationDashboard';
import MasterChecklist from './MasterChecklist';
import DocumentTracker from './DocumentTracker';
import CRSCalculator from './CRSCalculator';
import StudyPlatform from './StudyPlatform';
import ResourceHub from './ResourceHub';
import ImmigrationTimeline from './ImmigrationTimeline';

/* ────────── API helpers ────────── */

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ────────── Types ────────── */

export interface ImmigrationTask {
  id: number;
  phase: number;
  category: string;
  title: string;
  owner: string;
  priority: string;
  status: string;
  cost: string | null;
  resourceUrl: string | null;
  resourceLabel: string | null;
  notes: string | null;
  dueDate: string | null;
  sortOrder: number;
}

export interface ImmigrationDocument {
  id: number;
  category: string;
  name: string;
  status: string;
  score: string | null;
  notes: string | null;
}

export interface StudySession {
  id: number;
  category: string;
  score: number | null;
  notes: string | null;
  date: string;
}

export interface ImmigrationData {
  tasks: ImmigrationTask[];
  documents: ImmigrationDocument[];
  studySessions: StudySession[];
  loading: boolean;
  error: string | null;
}

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #001040 0%, #002060 50%, #001840 100%);
  color: #E0ECF4;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  animation: ${fadeIn} 0.4s ease-out;
`;

const Header = styled.div`
  padding: 24px 24px 0;

  @media (max-width: 768px) {
    padding: 16px 12px 0;
  }
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #E0ECF4 0%, #60C0F0 50%, #C6A84B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: rgba(224, 236, 244, 0.6);
  margin: 0 0 20px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 24px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    padding: 0 8px;
    gap: 2px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;

  background: ${(p) =>
    p.$active
      ? 'rgba(139, 92, 246, 0.25)'
      : 'rgba(0, 48, 128, 0.3)'};
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.5)')};
  border-bottom: 2px solid ${(p) => (p.$active ? '#8B5CF6' : 'transparent')};

  ${(p) => p.$active && css`animation: ${glowPulse} 2s ease-in-out infinite;`}

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 11px;
    gap: 4px;
  }
`;

const TabIcon = styled.span`
  font-size: 18px;
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const TabLabel = styled.span`
  @media (max-width: 480px) {
    display: none;
  }
`;

const ContentArea = styled.div`
  padding: 24px;
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const ErrorBanner = styled.div`
  margin: 24px;
  padding: 16px 20px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 14px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 16px;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(96, 192, 240, 0.2);
  border-top-color: #60C0F0;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  color: rgba(224, 236, 244, 0.6);
  font-size: 14px;
`;

/* ────────── Tab Config ────────── */

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: '\u{1F4CA}' },
  { id: 'checklist', label: 'Checklist', icon: '\u2611\uFE0F' },
  { id: 'documents', label: 'Documents', icon: '\u{1F4C1}' },
  { id: 'crs', label: 'CRS Calculator', icon: '\u{1F5A9}' },
  { id: 'study', label: 'Study Hub', icon: '\u{1F4DA}' },
  { id: 'resources', label: 'Resources', icon: '\u{1F517}' },
  { id: 'timeline', label: 'Timeline', icon: '\u{1F4C5}' },
];

/* ────────── Main Component ────────── */

const CanadaImmigrationTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<ImmigrationTask[]>([]);
  const [documents, setDocuments] = useState<ImmigrationDocument[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch helpers ── */

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/immigration/tasks`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load tasks');
    const data = await res.json();
    return Array.isArray(data) ? data : data.tasks ?? [];
  }, []);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/immigration/documents`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load documents');
    const data = await res.json();
    return Array.isArray(data) ? data : data.documents ?? [];
  }, []);

  const fetchStudySessions = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/immigration/study-sessions`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load study sessions');
    const data = await res.json();
    return Array.isArray(data) ? data : data.studySessions ?? [];
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, d, s] = await Promise.all([fetchTasks(), fetchDocuments(), fetchStudySessions()]);
      setTasks(t);
      setDocuments(d);
      setStudySessions(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, fetchDocuments, fetchStudySessions]);

  /* ── Seed & initial load ── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetch(`${API_BASE}/api/immigration/seed`, {
          method: 'POST',
          headers: authHeaders(),
        });
      } catch {
        // seed endpoint may not exist yet; continue anyway
      }
      if (!cancelled) await loadAll();
    })();
    return () => { cancelled = true; };
  }, [loadAll]);

  /* ── Task mutation ── */

  const updateTask = useCallback(async (id: number, updates: Partial<ImmigrationTask>) => {
    try {
      const res = await fetch(`${API_BASE}/api/immigration/tasks/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch {
      await loadAll();
    }
  }, [loadAll]);

  /* ── Document mutation ── */

  const updateDocument = useCallback(async (id: number, updates: Partial<ImmigrationDocument>) => {
    try {
      const res = await fetch(`${API_BASE}/api/immigration/documents/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    } catch {
      await loadAll();
    }
  }, [loadAll]);

  /* ── Study session creation ── */

  const addStudySession = useCallback(async (session: Omit<StudySession, 'id' | 'date'>) => {
    try {
      const res = await fetch(`${API_BASE}/api/immigration/study-sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(session),
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();
      setStudySessions((prev) => [...prev, created]);
    } catch {
      await loadAll();
    }
  }, [loadAll]);

  /* ── Render ── */

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingContainer>
          <Spinner />
          <LoadingText>Loading immigration data...</LoadingText>
        </LoadingContainer>
      );
    }

    const sharedProps = {
      tasks,
      documents,
      studySessions,
      updateTask,
      updateDocument,
      addStudySession,
      reload: loadAll,
    };

    switch (activeTab) {
      case 'overview':
        return <ImmigrationDashboard {...sharedProps} />;
      case 'checklist':
        return <MasterChecklist {...sharedProps} />;
      case 'documents':
        return <DocumentTracker {...sharedProps} />;
      case 'crs':
        return <CRSCalculator />;
      case 'study':
        return <StudyPlatform {...sharedProps} />;
      case 'resources':
        return <ResourceHub />;
      case 'timeline':
        return <ImmigrationTimeline {...sharedProps} />;
      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>Canada Immigration Tracker</Title>
        <Subtitle>Express Entry pathway — complete planning & progress hub</Subtitle>
      </Header>

      <TabBar>
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <TabIcon>{tab.icon}</TabIcon>
            <TabLabel>{tab.label}</TabLabel>
          </TabButton>
        ))}
      </TabBar>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <ContentArea key={activeTab}>{renderContent()}</ContentArea>
    </Container>
  );
};

export default CanadaImmigrationTab;
