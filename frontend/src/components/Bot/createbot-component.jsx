import React, { useState } from 'react';
import { createBot } from '../services/groupme';

const CreateBot = ({ groupId }) => {
  const [botName, setBotName] = useState('');
  const [botId, setBotId] = useState('');

  const handleCreateBot = async () => {
    const bot = await createBot(groupId, botName);
    setBotId(bot.bot_id);
  };

  return (
    <div>
      <input
        type="text"
        value={botName}
        onChange={(e) => setBotName(e.target.value)}
        placeholder="Bot Name"
      />
      <button onClick={handleCreateBot}>Create Bot</button>
      {botId && <p>Bot ID: {botId}</p>}
    </div>
  );
};

export default CreateBot;