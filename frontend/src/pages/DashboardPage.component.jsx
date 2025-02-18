'use client';

import React, { useState } from 'react';

// Child Components
// import ClockInOutCard from '../components/ClockInOutCard/clock-in-out-card.component.jsx';
// import WorkSummaryCard from '../components/WorkSummaryCard/work-summary-card.component.jsx';
// import PerformanceCard from '../components/PerformanceCard/performance-card.component.jsx';
// import DARCard from '../components/DARCard/dar-card.component.jsx';
// import TimeOffRequestsCard from '../components/TimeOffRequestsCard/time-off-requests-card.component.jsx';
// import CommunicationCard from '../components/CommunicationCard/communication-card.component.jsx';
// import GamificationCard from '../components/GamificationCard/gamification-card.component.jsx';

export default function Dashboard() {
  const [isClockIn, setIsClockIn] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(5);
  const [currentPoints, setCurrentPoints] = useState(750);

  const handleClockInOut = () => {
    setIsClockIn(!isClockIn);
    // Here you would typically send a request to your backend to record the clock in/out
    console.log(`Clocked ${isClockIn ? 'out' : 'in'}`);
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Security Guard Dashboard</h1>
        <p className="text-gray-500">Welcome back, John Doe</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ClockInOutCard isClockIn={isClockIn} onClockInOut={handleClockInOut} />
        <WorkSummaryCard />
        <PerformanceCard />
        <DARCard />
        <TimeOffRequestsCard />
        <CommunicationCard />
        <GamificationCard currentLevel={currentLevel} currentPoints={currentPoints} />
      </div>
    </div>
  );
}