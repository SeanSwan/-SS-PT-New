/**
 * WorkoutOutletWrapper — Bridges Outlet context to workout components.
 * Passes clientId from workspace-level state to WorkoutLogger / WorkoutPlanBuilder / AI Copilot.
 *
 * The 'planner' mode includes a Manual Builder / AI Generator toggle
 * (AI tab merged per master prompt consensus).
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Wrench } from 'lucide-react';

interface WorkoutOutletContext {
  clientId: number;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    availableSessions?: number;
  };
}

interface Props {
  component: 'logger' | 'planner' | 'ai' | 'body-map';
}

const WorkoutLogger = React.lazy(
  () => import('../../WorkoutLogger/WorkoutLogger')
);
const WorkoutPlanBuilder = React.lazy(
  () => import('../../WorkoutManagement/WorkoutPlanBuilder')
);
const WorkoutCopilotPanel = React.lazy(
  () => import('../Pages/admin-clients/components/WorkoutCopilotPanel')
);
const BodyMap = React.lazy(
  () => import('../../BodyMap')
);

const WorkoutOutletWrapper: React.FC<Props> = ({ component }) => {
  const context = useOutletContext<WorkoutOutletContext>();
  const [plannerMode, setPlannerMode] = useState<'manual' | 'ai'>('manual');

  if (!context?.clientId) return null;

  if (component === 'logger') {
    return (
      <React.Suspense fallback={null}>
        <WorkoutLogger
          clientId={context.clientId}
          onComplete={() => {}}
          onCancel={() => {}}
        />
      </React.Suspense>
    );
  }

  if (component === 'body-map') {
    return (
      <React.Suspense fallback={null}>
        <BodyMap
          userId={context.clientId}
          mode="trainer"
        />
      </React.Suspense>
    );
  }

  // Legacy route — redirect handled in routes, but keep as fallback
  if (component === 'ai') {
    return (
      <React.Suspense fallback={null}>
        <WorkoutCopilotPanel
          open={true}
          onClose={() => {}}
          clientId={context.clientId}
          clientName={`${context.client.firstName} ${context.client.lastName}`}
          autoGenerate
          inline
        />
      </React.Suspense>
    );
  }

  // Planner mode: Manual Builder + AI Generator toggle
  return (
    <>
      <ModeToggleBar>
        <ModeButton
          $active={plannerMode === 'manual'}
          onClick={() => setPlannerMode('manual')}
        >
          <Wrench size={15} />
          Manual Builder
        </ModeButton>
        <ModeButton
          $active={plannerMode === 'ai'}
          onClick={() => setPlannerMode('ai')}
        >
          <Sparkles size={15} />
          AI Generator
        </ModeButton>
      </ModeToggleBar>

      <React.Suspense fallback={null}>
        {plannerMode === 'manual' ? (
          <WorkoutPlanBuilder
            clientId={String(context.clientId)}
            clientName={`${context.client.firstName} ${context.client.lastName}`}
          />
        ) : (
          <WorkoutCopilotPanel
            open={true}
            onClose={() => setPlannerMode('manual')}
            clientId={context.clientId}
            clientName={`${context.client.firstName} ${context.client.lastName}`}
            autoGenerate
            inline
          />
        )}
      </React.Suspense>
    </>
  );
};

export default WorkoutOutletWrapper;

// ---- Styled Components ----

const ModeToggleBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 0 16px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.1)')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.02)')};
  color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255,255,255,0.65)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)')};
    color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255,255,255,0.85)')};
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;
