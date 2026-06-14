/**
 * FILE: AdminPersonalWorkoutLogger.tsx
 * PURPOSE: Owner/admin self-logging wrapper for the shared WorkoutLogger.
 *
 * Admins usually log workouts for clients through Client Hub. Sean also needs a
 * direct personal logger that behaves like the client self-route without
 * fabricating a selected client context.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { DailyWorkoutForm } from '../../services/nasmApiService';
import WorkoutLogger from './WorkoutLogger';

const ADMIN_COACH_ROUTE = '/dashboard/admin/coach-assistant';

const AdminPersonalWorkoutLogger: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = (_formData: DailyWorkoutForm) => {
    navigate(ADMIN_COACH_ROUTE);
  };

  const handleCancel = () => {
    navigate(ADMIN_COACH_ROUTE);
  };

  return (
    <WorkoutLogger
      forceSelfMode
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default AdminPersonalWorkoutLogger;
