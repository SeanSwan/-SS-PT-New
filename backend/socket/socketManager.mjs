// backend/socket/socketManager.mjs
import { Server } from 'socket.io';
import logger from '../utils/logger.mjs';

// Global socket.io instance
let io = null;

/**
 * Initialize socket.io with an HTTP server
 * @param {object} httpServer - The HTTP server to attach socket.io to
 * @returns {object} The socket.io server instance
 */
export function initSocketIO(httpServer) {
  if (io) {
    logger.warn('Socket.io already initialized, reusing existing instance');
    return io;
  }

  try {
    // Create a new socket.io server with CORS setup
    io = new Server(httpServer, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          // Add any additional allowed origins here
        ],
        credentials: true
      }
    });

    // Connection handler
    io.on('connection', socket => {
      logger.info(`Socket connected: ${socket.id}`);

      // Handle authentication - add user to rooms based on role
      socket.on('authenticate', async data => {
        try {
          if (!data || !data.token) {
            socket.emit('auth_error', { message: 'Authentication required' });
            return;
          }

          // Decode JWT token and get user info (implementation depends on your auth system)
          const user = await getUserFromToken(data.token);
          if (!user) {
            socket.emit('auth_error', { message: 'Invalid authentication' });
            return;
          }

          // Store user data on socket
          socket.data.user = {
            id: user.id,
            role: user.role
          };

          // Join room based on user ID for direct messages
          socket.join(user.id);

          // Join room based on role for broadcasting to all admins, trainers, etc.
          socket.join(user.role.toLowerCase());
          
          // Join specific rooms
          if (user.role === 'ADMIN') {
            socket.join('admin');
            socket.join('dashboard:admin');
          } else if (user.role === 'TRAINER') {
            socket.join('trainer');
            socket.join('dashboard:trainer');
          } else if (user.role === 'CLIENT') {
            socket.join('client');
          }

          socket.emit('authenticated', { success: true });
          logger.info(`Socket ${socket.id} authenticated as ${user.id} (${user.role})`);
        } catch (error) {
          logger.error(`Socket authentication error: ${error.message}`);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Admin dashboard specific events
      if (socket.handshake.query.dashboard === 'admin') {
        logger.info(`Admin dashboard connected: ${socket.id}`);
        // Any specific admin dashboard setup can go here
      }

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.io initialized successfully');
    return io;
  } catch (error) {
    logger.error(`Error initializing Socket.io: ${error.message}`);
    return null;
  }
}

/**
 * Get the current socket.io instance
 * @returns {object|null} The socket.io server instance or null if not initialized
 */
export function getIO() {
  if (!io) {
    logger.warn('Attempted to access socket.io before initialization');
  }
  return io;
}

/**
 * Shutdown socket.io server
 */
export function closeSocketIO() {
  if (io) {
    io.close();
    io = null;
    logger.info('Socket.io server closed');
  }
}

/**
 * Helper function to extract user from JWT token
 * Depends on your authentication system
 * @private
 */
async function getUserFromToken(token) {
  try {
    // You should implement this based on your authentication system
    // For example, using jsonwebtoken to verify and decode the token
    
    // For now, return a dummy implementation
    // In production, you would verify the token and fetch the user
    return {
      id: 'user-id',
      role: 'ADMIN' // or 'TRAINER', 'CLIENT', etc.
    };
  } catch (error) {
    logger.error(`Error decoding token: ${error.message}`);
    return null;
  }
}
