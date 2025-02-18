'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin } from 'lucide-react';
import useCurrentTime from '../../hooks/useCurrentTime';
import useGeolocation from '../../hooks/useGeolocation';

export default function ClockInOutCard({ isClockIn, onClockInOut }) {
  const currentTime = useCurrentTime();
  const userLocation = useGeolocation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clock In/Out</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Clock className="mr-2" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2" />
            <span>
              {userLocation.latitude !== null
                ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
                : 'Location unavailable'}
            </span>
          </div>
        </div>
        <Button
          onClick={onClockInOut}
          className={`w-full ${
            isClockIn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isClockIn ? 'Clock Out' : 'Clock In'}
        </Button>
      </CardContent>
    </Card>
  );
}