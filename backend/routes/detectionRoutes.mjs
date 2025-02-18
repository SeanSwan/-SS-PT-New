import express from 'express';
import { io } from '../server.mjs'; // Import the Socket.IO instance
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create a new PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PG_USER, // PostgreSQL user
  host: process.env.PG_HOST, // PostgreSQL host
  database: process.env.PG_DB, // PostgreSQL database name
  password: process.env.PG_PASSWORD, // PostgreSQL password
  port: process.env.PG_PORT, // PostgreSQL port
});

// POST /api/detections - Add a new detection
router.post('/', async (req, res) => {
  const { objects } = req.body;

  // Validate the request body
  if (!objects || !Array.isArray(objects)) {
    console.error('Invalid objects format:', objects);
    return res.status(400).json({ error: 'Invalid objects format' });
  }

  try {
    // Insert the detection data into the 'detections' table
    const query = 'INSERT INTO detections (data) VALUES ($1) RETURNING *';
    const result = await pool.query(query, [JSON.stringify(objects)]);
    const detection = result.rows[0];

    res.status(201).json(detection);

    // Emit a WebSocket event for new detection
    io.emit('new-detection', detection);
  } catch (err) {
    console.error('Error inserting detection:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/detections - Retrieve all detections
router.get('/', async (req, res) => {
  try {
    // Fetch all detections from the 'detections' table
    const result = await pool.query('SELECT * FROM detections');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching detections:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;