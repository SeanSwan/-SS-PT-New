/**
 * COMPONENT: WorkoutPlannerPage
 * PURPOSE: Admin/trainer workout planning entry point.
 * FLOW (S15): mount WorkoutPlannerProvider (all orchestration lives in
 * plannerContexts/useWorkoutPlannerOrchestration) -> render the layout,
 * which consumes the four planner contexts (Data / UI / Actions / Voice).
 * This file stays a thin shell — no state, no hooks, no network.
 */

import React from 'react';
import WorkoutPlannerProvider from './plannerContexts/WorkoutPlannerProvider';
import WorkoutPlannerPageLayout from './WorkoutPlannerPageLayout';

const WorkoutPlannerPage: React.FC = () => (
  <WorkoutPlannerProvider>
    <WorkoutPlannerPageLayout />
  </WorkoutPlannerProvider>
);

export default WorkoutPlannerPage;
