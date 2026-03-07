/**
 * BiomechanicsStudioPage — Exercise List + Studio Router
 * ========================================================
 * Phase 6e: Landing page at /biomechanics-studio showing the trainer's
 * custom exercises with create/edit/duplicate/archive actions.
 * Switches to BiomechanicsStudio wizard for create/edit flows.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import BiomechanicsStudio from './BiomechanicsStudio';
import { useCustomExerciseAPI } from '../../hooks/useCustomExerciseAPI';
import type { CustomExercise } from '../../hooks/useCustomExerciseAPI';

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
  padding: 24px;
`;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: #e0ecf4;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.5);
  margin: 4px 0 0;
`;

const CreateButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(135deg, #60c0f0 0%, #7851a9 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterPill = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => ($active ? '#60c0f0' : 'rgba(96, 192, 240, 0.2)')};
  background: ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.2)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#60c0f0' : 'rgba(224, 236, 244, 0.5)')};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 36px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
  }
`;

const ExerciseCard = styled(motion.div)`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ExerciseInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExerciseName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #e0ecf4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExerciseMeta = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.65);
  margin-top: 4px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'published'
      ? 'rgba(0, 255, 136, 0.15)'
      : $status === 'testing'
        ? 'rgba(255, 184, 0, 0.15)'
        : 'rgba(96, 192, 240, 0.15)'};
  color: ${({ $status }) =>
    $status === 'published' ? '#00FF88' : $status === 'testing' ? '#FFB800' : '#60C0F0'};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $variant?: 'danger' }>`
  padding: 6px 12px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 71, 87, 0.3)' : 'rgba(96, 192, 240, 0.2)'};
  background: transparent;
  border-radius: 6px;
  color: ${({ $variant }) => ($variant === 'danger' ? '#FF4757' : '#60c0f0')};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 36px;
  transition: all 0.2s;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(96, 192, 240, 0.1)'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: rgba(224, 236, 244, 0.65);
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 8px;
`;

const LoadingMsg = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(224, 236, 244, 0.65);
  font-size: 14px;
`;

// --- Component ---

type View = 'list' | 'create' | 'edit';

const BiomechanicsStudioPage: React.FC = () => {
  const api = useCustomExerciseAPI();
  const [view, setView] = useState<View>('list');
  const [editId, setEditId] = useState<number | undefined>();
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await api.listExercises(params);
      setExercises(res.exercises);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [api, filter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleEdit = (id: number) => {
    setEditId(id);
    setView('edit');
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateExercise(id);
      loadExercises();
    } catch {
      // silent
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await api.archiveExercise(id);
      loadExercises();
    } catch {
      // silent
    }
  };

  const handleSaved = () => {
    setView('list');
    setEditId(undefined);
    loadExercises();
  };

  const handleCancel = () => {
    setView('list');
    setEditId(undefined);
  };

  // Show studio wizard for create/edit
  if (view === 'create' || view === 'edit') {
    return (
      <BiomechanicsStudio
        editExerciseId={editId}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    );
  }

  // Show exercise list
  return (
    <PageWrapper>
      <Container>
        <Header>
          <div>
            <Title>Biomechanics Studio</Title>
            <Subtitle>Build and manage custom exercise analysis rules</Subtitle>
          </div>
          <CreateButton onClick={() => setView('create')}>+ New Exercise</CreateButton>
        </Header>

        <FilterBar>
          {['all', 'draft', 'testing', 'published'].map(f => (
            <FilterPill key={f} $active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </FilterPill>
          ))}
        </FilterBar>

        {loading ? (
          <LoadingMsg>Loading exercises...</LoadingMsg>
        ) : exercises.length === 0 ? (
          <EmptyState>
            <EmptyTitle>No custom exercises yet</EmptyTitle>
            <p>Create your first custom exercise or start from a built-in template.</p>
            <CreateButton onClick={() => setView('create')} style={{ marginTop: 16 }}>
              Get Started
            </CreateButton>
          </EmptyState>
        ) : (
          <AnimatePresence>
            {exercises.map(ex => (
              <ExerciseCard
                key={ex.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ExerciseInfo>
                  <ExerciseName>{ex.name}</ExerciseName>
                  <ExerciseMeta>
                    <span>{ex.category.replace(/_/g, ' ')}</span>
                    <span>v{ex.version}</span>
                    <span>{ex.mechanicsSchema?.formRules?.length || 0} rules</span>
                    <StatusBadge $status={ex.status}>{ex.status}</StatusBadge>
                  </ExerciseMeta>
                </ExerciseInfo>
                <ActionGroup>
                  <ActionBtn onClick={() => handleEdit(ex.id)}>Edit</ActionBtn>
                  <ActionBtn onClick={() => handleDuplicate(ex.id)}>Duplicate</ActionBtn>
                  <ActionBtn $variant="danger" onClick={() => handleArchive(ex.id)}>
                    Archive
                  </ActionBtn>
                </ActionGroup>
              </ExerciseCard>
            ))}
          </AnimatePresence>
        )}
      </Container>
    </PageWrapper>
  );
};

// --- Error Boundary ---

class BiomechanicsStudioErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <Container style={{ textAlign: 'center', paddingTop: 80 }}>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <p style={{ color: 'rgba(224, 236, 244, 0.5)', marginBottom: 16 }}>
              The Biomechanics Studio encountered an error.
            </p>
            <CreateButton onClick={() => this.setState({ hasError: false })}>
              Try Again
            </CreateButton>
          </Container>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const BiomechanicsStudioPageWithBoundary: React.FC = () => (
  <BiomechanicsStudioErrorBoundary>
    <BiomechanicsStudioPage />
  </BiomechanicsStudioErrorBoundary>
);

export default BiomechanicsStudioPageWithBoundary;
