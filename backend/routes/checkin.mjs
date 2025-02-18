import express from 'express';
import Guard from '../models/guard.mjs';
import { checkInGuard } from '../services/groupme.mjs';
import { io } from '../server.mjs'; // Correct import for io instance

const router = express.Router();

router.post('/checkin', async (req, res) => {
  const { groupId, guardName, botId } = req.body;
  try {
    const guard = await Guard.findOne({ where: { groupId, name: guardName } });
    if (guard) {
      guard.checkInTime = new Date();
      await guard.save();
    } else {
      await Guard.create({ groupId, name: guardName, checkInTime: new Date() });
    }
    // Send a notification to the GroupMe group
    await checkInGuard(groupId, guardName, botId);
    
    // Emit a WebSocket event for guard check-in
    io.emit('guard-update', { groupId, guardName, checkInTime: new Date() });

    res.status(200).send({ message: 'Check-in recorded.' });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

export default router;