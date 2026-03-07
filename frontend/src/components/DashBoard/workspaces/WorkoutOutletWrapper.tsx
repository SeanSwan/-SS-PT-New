/**
 * WorkoutOutletWrapper — Bridges Outlet context to workout components.
 * Passes clientId from workspace-level state to WorkoutLogger / WorkoutPlanBuilder.
 */

import React from 'react';
import { useOutletContext } from 'react-router-dom';

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
  component: 'logger' | 'planner';
}

const WorkoutLogger = React.lazy(
  () => import('../../WorkoutLogger/WorkoutLogger')
);
const WorkoutPlanBuilder = React.lazy(
  () => import('../../WorkoutManagement/WorkoutPlanBuilder')
);

const WorkoutOutletWrapper: React.FC<Props> = ({ component }) => {
  const context = useOutletContext<WorkoutOutletContext>();

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

  return (
    <React.Suspense fallback={null}>
      <WorkoutPlanBuilder
          clientId={String(context.clientId)}
          clientName={`${context.client.firstName} ${context.client.lastName}`}
        />
    </React.Suspense>
  );
};

export default WorkoutOutletWrapper;
