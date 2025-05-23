/**
 * Debug Login Response Script
 * ===========================
 * This script tests the exact login response for the admin user
 * to debug why the frontend might not receive the correct role
 */

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';
import { Op } from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Simple login endpoint for testing
app.post('/test-login', async (req, res) => {
  try {
    console.log('\n=== DEBUG LOGIN TEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password required' 
      });
    }
    
    console.log('\n1. Finding user...');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('User found:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Email:', user.email);
    console.log('- Role:', user.role);
    console.log('- Role Type:', typeof user.role);
    console.log('- Raw dataValues:', JSON.stringify(user.dataValues, null, 2));
    
    console.log('\n2. Checking password...');
    const isMatch = await user.checkPassword(password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    console.log('\n3. Generating JWT...');
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role,
        tokenType: 'access'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '3h' }
    );
    
    // Decode token to verify
    const decoded = jwt.decode(token);
    console.log('JWT payload:', JSON.stringify(decoded, null, 2));
    
    console.log('\n4. Preparing response...');
    const sanitizedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      photo: user.photo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('Sanitized user:', JSON.stringify(sanitizedUser, null, 2));
    
    const response = {
      success: true,
      user: sanitizedUser,
      token: token
    };
    
    console.log('\n5. Final response:', JSON.stringify(response, null, 2));
    console.log('\n=== END DEBUG ===\n');
    
    res.json(response);
    
  } catch (error) {
    console.error('\nERROR in test login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test endpoint to check user
app.get('/test-user/:username', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      roleType: typeof user.role,
      dataValues: user.dataValues
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🔧 Debug server running on http://localhost:${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- POST /test-login (with username and password)`);
  console.log(`- GET /test-user/:username`);
  console.log(`\n🧪 Test admin login:`);
  console.log(`curl -X POST http://localhost:${PORT}/test-login \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"username":"admin","password":"admin123"}'`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down debug server...');
  process.exit(0);
});
