'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorkSummaryCard() {
  // These values can be fetched from backend or context
  const hoursWorked = 40;
  const lastShift = '8 hrs (9 PM - 5 AM)';
  const patrolsCompleted = 6;
  const patrolTimes = ['10 PM', '12 AM', '2 AM', '4 AM', '6 AM', '8 AM'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Hours Worked (This Period):</span>
            <span className="font-bold">{hoursWorked} hrs</span>
          </div>
          <div className="flex justify-between">
            <span>Last Shift:</span>
            <span className="font-bold">{lastShift}</span>
          </div>
          <div className="flex justify-between">
            <span>Patrols Completed:</span>
            <span className="font-bold">{patrolsCompleted}</span>
          </div>
          <div className="mt-2">
            <span className="font-bold">Patrol Times:</span>
            <ul className="list-disc list-inside ml-4">
              {patrolTimes.map((time, index) => (
                <li key={index}>{time}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}