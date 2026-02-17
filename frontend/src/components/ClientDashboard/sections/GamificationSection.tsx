import React from 'react';

// Import the GamificationDashboard component
import GamificationDashboard from '../../Gamification/GamificationDashboard';

/**
 * GamificationSection Component
 *
 * A wrapper component that integrates the GamificationDashboard
 * into the client dashboard layout.
 */
const GamificationSection: React.FC = () => {
  return (
    <div>
      <GamificationDashboard />
    </div>
  );
};

export default GamificationSection;
