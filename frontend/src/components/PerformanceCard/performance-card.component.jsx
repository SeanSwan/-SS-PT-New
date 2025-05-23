'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function PerformanceCard() {
  // These values can be fetched from backend or context
  const onTimePercentage = 98;
  const lunchCompliance = 95;
  const patrolEfficiency = 92;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span>On-Time Percentage:</span>
              <span>{onTimePercentage}%</span>
            </div>
            <Progress value={onTimePercentage} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span>Lunch Compliance:</span>
              <span>{lunchCompliance}%</span>
            </div>
            <Progress value={lunchCompliance} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span>Patrol Efficiency:</span>
              <span>{patrolEfficiency}%</span>
            </div>
            <Progress value={patrolEfficiency} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}