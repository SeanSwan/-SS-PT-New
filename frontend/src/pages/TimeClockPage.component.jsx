import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  align-items: center;
  justify-content: center;
  padding: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClockDisplay = styled.div`
  background: #e1e1e1;
  padding: 20px;
  text-align: center;
  font-size: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 1.2rem;
  cursor: pointer;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;

  &:disabled {
    background-color: #ccc;
  }
`;

const StatusDisplay = styled.div`
  text-align: center;
  font-size: 1.2rem;
`;

const TimeClockPage = () => {
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);

  useEffect(() => {
    // Placeholder: Replace this with a call to your backend to fetch the last clock-in and clock-out times
    const fetchData = async () => {
      // Simulate fetching data from the server
      const response = await new Promise(resolve => setTimeout(() => resolve({
        lastClockIn: new Date().toISOString(),
        lastClockOut: new Date(new Date().getTime() - 10000).toISOString()
      }), 1000));

      const { lastClockIn, lastClockOut } = response;
      setClockInTime(lastClockIn);
      setClockOutTime(lastClockOut);
      setIsClockedIn(!lastClockOut || new Date(lastClockIn) > new Date(lastClockOut));
    };

    fetchData();
  }, []);

  const handleClockIn = async () => {
    // Placeholder: Replace this with a call to your backend to perform a clock-in action
    const response = await new Promise(resolve => setTimeout(() => resolve(new Date().toISOString()), 1000));
    setClockInTime(response);
    setIsClockedIn(true);
  };

  const handleClockOut = async () => {
    // Placeholder: Replace this with a call to your backend to perform a clock-out action
    const response = await new Promise(resolve => setTimeout(() => resolve(new Date().toISOString()), 1000));
    setClockOutTime(response);
    setIsClockedIn(false);
  };

  return (
    <PageContainer>
      <ClockDisplay>
        Current Time: {new Date().toLocaleTimeString()}
      </ClockDisplay>
      <StatusDisplay>
        {isClockedIn ? `Clocked In at ${new Date(clockInTime).toLocaleTimeString()}` : 'Not Clocked In'}
      </StatusDisplay>
      <div>
        <Button onClick={handleClockIn} disabled={isClockedIn}>Clock In</Button>
        <Button onClick={handleClockOut} disabled={!isClockedIn}>Clock Out</Button>
      </div>
    </PageContainer>
  );
};

export default TimeClockPage;