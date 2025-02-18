import React, { useState } from 'react';
import { checkInGuard } from '../services/groupme';

const CheckInForm = ({ groupId, botId }) => {
  const [guardName, setGuardName] = useState('');

  const handleCheckIn = async (e) => {
    e.preventDefault();
    await checkInGuard(groupId, guardName, botId);
  };

  return (
    <form onSubmit={handleCheckIn}>
      <input
        type="text"
        value={guardName}
        onChange={(e) => setGuardName(e.target.value)}
        placeholder="Guard Name"
      />
      <button type="submit">Check In</button>
    </form>
  );
};

export default CheckInForm;