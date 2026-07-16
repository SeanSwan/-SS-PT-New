/**
 * PlanList Component
 * =================
 * Displays the list of saved workout plans
 */

import React from 'react';
import { PlannerHeader } from '../../../styles/WorkoutPlanner.styles';

interface PlanListProps {
  plans: Array<{
    id: string;
    title: string;
    description: string;
    durationWeeks: string | number;
    days: Array<{
      dayNumber: number;
      title: string;
      exercises: Array<any>;
    }>;
  }>;
  onEditPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

/**
 * PlanList Component
 * 
 * Displays the list of saved workout plans with options to edit or delete
 */
const PlanList: React.FC<PlanListProps> = ({ plans, onEditPlan, onDeletePlan }) => {
  return (
    <div className="manage-plans">
      <PlannerHeader>Manage Workout Plans</PlannerHeader>
      
      {plans.length === 0 ? (
        <p className="no-plans-message">
          You haven't created any workout plans yet. 
          Click "Create New Plan" to get started.
        </p>
      ) : (
        <div className="plans-list">
          {plans.map(plan => (
            <div key={plan.id} className="plan-card">
              <div className="plan-card-header">
                <h3>{plan.title}</h3>
                <span className="plan-duration">{plan.durationWeeks} weeks</span>
              </div>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-days-summary">
                <span>{plan.days.length} day{plan.days.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>
                  {plan.days.reduce((total, day) => total + day.exercises.length, 0)} exercises
                </span>
              </div>
              <div className="plan-card-actions">
                <button 
                  className="edit-button"
                  onClick={() => onEditPlan(plan.id)}
                >
                  Edit
                </button>
                <button 
                  className="delete-button"
                  onClick={() => onDeletePlan(plan.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanList;
