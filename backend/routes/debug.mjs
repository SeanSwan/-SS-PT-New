// backend/routes/debug.mjs
import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const BCRYPT_SALT_ROUNDS = 10; // Ensure this matches your authController

// --- Middleware for basic protection (optional, can be added later) ---
// const allowOnlyInDev = (req, res, next) => {
//   if (process.env.NODE_ENV !== 'production') {
//     next();
//   } else {
//     res.status(403).json({ message: 'Debug routes are disabled in production' });
//   }
// };
// router.use(allowOnlyInDev); // Apply to all debug routes

// --- Debug Routes ---

// 1. Check Database Connection via Sequelize
router.get('/check-db', async (req, res, next) => {
    logger.info('[Debug] /check-db called');
    try {
        await sequelize.authenticate();
        res.status(200).json({ success: true, message: 'Database connection successful via Sequelize.' });
    } catch (error) {
        logger.error('[Debug] /check-db failed:', error);
        // Pass error to the main error handler
        next(new Error(`Database connection failed: ${error.message}`));
    }
});

// 2. Check User Existence
router.get('/check-user/:identifier', async (req, res, next) => {
    const identifier = req.params.identifier;
    logger.info(`[Debug] /check-user called for: ${identifier}`);
    try {
        const isEmail = identifier.includes('@');
        const whereClause = isEmail ? { email: identifier } : { username: identifier };
        const user = await User.findOne({ where: whereClause, attributes: ['id', 'username', 'email', 'role', 'isActive'] }); // Exclude password hash

        if (user) {
            res.status(200).json({ success: true, found: true, user: user });
        } else {
            res.status(200).json({ success: true, found: false, message: `User not found with ${isEmail ? 'email' : 'username'} '${identifier}'.` });
        }
    } catch (error) {
        logger.error(`[Debug] /check-user failed for ${identifier}:`, error);
        next(new Error(`Error checking user: ${error.message}`));
    }
});

// 3. Verify Password for a User (using bcrypt.compare)
router.post('/verify-password', async (req, res, next) => {
    const { username, password } = req.body;
    logger.info(`[Debug] /verify-password called for username: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing username or password in request body.' });
    }

    try {
        const user = await User.findOne({ where: { username: username } });
        if (!user) {
            return res.status(200).json({ success: true, userFound: false, message: `User '${username}' not found.` });
        }

        // Adjust 'user.password' if your hash field name is different
        const passwordField = user.password || user.passwordHash;
        if (!passwordField) {
             return res.status(500).json({ success: false, message: `Password field missing for user '${username}'. Check model.` });
        }

        const isMatch = await bcrypt.compare(password, passwordField);

        res.status(200).json({
            success: true,
            userFound: true,
            username: user.username,
            passwordMatch: isMatch,
            message: isMatch ? 'Password verification successful.' : 'Password verification failed.'
        });

    } catch (error) {
        logger.error(`[Debug] /verify-password failed for ${username}:`, error);
        next(new Error(`Error verifying password: ${error.message}`));
    }
});

// 4. Hash a Test Password (Use GET for simplicity here, POST is better practice)
router.get('/hash-password/:password', async (req, res, next) => {
    const password = req.params.password;
    logger.info(`[Debug] /hash-password called.`);
    try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        res.status(200).json({ success: true, original: password, hash: hashedPassword });
    } catch (error) {
        logger.error('[Debug] /hash-password failed:', error);
        next(new Error(`Error hashing password: ${error.message}`));
    }
});

// 5. Echo Request Details
router.all('/echo', (req, res) => {
  logger.info(`[Debug] Echo endpoint called with ${req.method}`);
  const requestData = {
    method: req.method, url: req.originalUrl, headers: req.headers,
    query: req.query, body: req.body, cookies: req.cookies, ip: req.ip
  };
  res.status(200).json({ success: true, message: 'Request Echo', request: requestData });
});


export default router;