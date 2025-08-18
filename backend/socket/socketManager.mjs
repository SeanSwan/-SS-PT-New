// backend/socket/socketManager.mjs - Enhanced for SwanStudios Real-Time Scheduling
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.mjs';
import { getUser } from '../models/index.mjs';

// Global socket.io instance
let io = null;

// Track active connections and rooms for analytics
const connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  adminConnections: 0,
  trainerConnections: 0,
  clientConnections: 0,
  userConnections: 0,
  roomMemberships: new Map() // roomName -> Set of socketIds
};

/**
 * Initialize socket.io with an HTTP server - Enhanced for SwanStudios
 * @param {object} httpServer - The HTTP server to attach socket.io to
 * @returns {object} The socket.io server instance
 */
export function initSocketIO(httpServer) {
  if (io) {
    logger.warn('Socket.io already initialized, reusing existing instance');
    return io;
  }

  try {
    // Enhanced CORS configuration for SwanStudios platform
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'http://localhost:5174',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      // Add development origins
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3001', 'http://localhost:8080'] : [])
    ];

    // Create a new socket.io server with enhanced configuration
    io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
      },
      // Enhanced configuration for production
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true // Backward compatibility
    });

    logger.info(`Socket.io server initialized with CORS origins: ${allowedOrigins.join(', ')}`);

    // Enhanced connection handler with SwanStudios-specific features
    io.on('connection', socket => {
      connectionMetrics.totalConnections++;
      connectionMetrics.activeConnections++;
      
      logger.info(`Socket connected: ${socket.id} (Total: ${connectionMetrics.activeConnections})`);

      // Enhanced authentication with JWT integration
      socket.on('authenticate', async data => {
        try {
          if (!data || !data.token) {
            socket.emit('auth_error', { 
              message: 'Authentication token required',
              code: 'NO_TOKEN'
            });
            return;
          }

          // Verify JWT token and get user info
          const user = await authenticateSocketUser(data.token);
          if (!user) {
            socket.emit('auth_error', { 
              message: 'Invalid or expired authentication token',
              code: 'INVALID_TOKEN'
            });
            return;
          }

          // Store enhanced user data on socket
          socket.data.user = {
            id: user.id,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            authenticatedAt: new Date().toISOString()
          };

          // Join user-specific room for direct messages
          await joinUserRoom(socket, user.id);

          // Join role-based rooms with enhanced room management
          await joinRoleBasedRooms(socket, user.role, user.id);
          
          // Join dashboard-specific rooms
          await joinDashboardRooms(socket, user.role);

          // Update connection metrics
          updateConnectionMetrics(user.role, 'connect');

          // Send authentication success with user context
          socket.emit('authenticated', { 
            success: true,
            user: {
              id: user.id,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName
            },
            serverTime: new Date().toISOString(),
            roomsJoined: Array.from(socket.rooms)
          });

          // Send initial schedule sync if user is in scheduling roles
          if (['ADMIN', 'TRAINER', 'CLIENT'].includes(user.role)) {
            socket.emit('schedule:sync_required', {
              message: 'Please sync your schedule data',
              priority: 'normal'
            });
          }

          logger.info(`Socket ${socket.id} authenticated as ${user.firstName} ${user.lastName} (${user.role}) - Rooms: ${Array.from(socket.rooms).join(', ')}`);
        } catch (error) {
          logger.error(`Socket authentication error: ${error.message}`);
          socket.emit('auth_error', { 
            message: 'Authentication failed',
            code: 'AUTH_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      });

      // Enhanced schedule-specific event handlers
      socket.on('schedule:join_session', async (sessionId) => {
        try {
          if (!socket.data.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          await joinSessionRoom(socket, sessionId);
          socket.emit('schedule:session_joined', { sessionId });
          logger.info(`Socket ${socket.id} joined session room: ${sessionId}`);
        } catch (error) {
          logger.error(`Error joining session room: ${error.message}`);
          socket.emit('error', { message: 'Failed to join session room' });
        }
      });

      socket.on('schedule:leave_session', async (sessionId) => {
        try {
          await leaveSessionRoom(socket, sessionId);
          socket.emit('schedule:session_left', { sessionId });
          logger.info(`Socket ${socket.id} left session room: ${sessionId}`);
        } catch (error) {
          logger.error(`Error leaving session room: ${error.message}`);
        }
      });

      // Heartbeat for connection health monitoring
      socket.on('heartbeat', () => {
        socket.emit('heartbeat_ack', { 
          timestamp: new Date().toISOString(),
          serverUptime: process.uptime()
        });
      });

      // Enhanced error handling
      socket.on('error', (error) => {
        logger.error(`Socket error from ${socket.id}:`, error);
      });

      // Enhanced admin dashboard events
      if (socket.handshake.query.dashboard === 'admin') {
        logger.info(`Admin dashboard connected: ${socket.id}`);
        socket.join('dashboard:admin:active');
        
        // Send admin-specific initial data
        socket.emit('admin:dashboard_ready', {
          connectionsActive: connectionMetrics.activeConnections,
          serverStatus: 'healthy',
          timestamp: new Date().toISOString()
        });
      }

      // Enhanced disconnect handler with cleanup
      socket.on('disconnect', (reason) => {
        const user = socket.data.user;
        
        // Update connection metrics
        connectionMetrics.activeConnections--;
        if (user) {
          updateConnectionMetrics(user.role, 'disconnect');
          
          // Clean up room memberships
          cleanupUserRooms(socket, user.id);
          
          logger.info(`Socket disconnected: ${socket.id} (${user.firstName} ${user.lastName} - ${user.role}) - Reason: ${reason} (Active: ${connectionMetrics.activeConnections})`);
        } else {
          logger.info(`Unauthenticated socket disconnected: ${socket.id} - Reason: ${reason} (Active: ${connectionMetrics.activeConnections})`);
        }
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

// ==================== ENHANCED AUTHENTICATION & ROOM MANAGEMENT ====================

/**
 * Authenticate socket user using JWT token integration with existing auth system
 * @param {string} token - JWT authentication token
 * @returns {object|null} User object or null if authentication fails
 */
async function authenticateSocketUser(token) {
  try {
    // Verify JWT token using the same secret as the main auth system
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured for socket authentication');
      return null;
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded || !decoded.userId) {
      logger.warn('Invalid token structure - missing userId');
      return null;
    }

    // Fetch user from database to ensure current data
    const User = getUser();
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive']
    });

    if (!user) {
      logger.warn(`User not found for token userId: ${decoded.userId}`);
      return null;
    }

    if (!user.isActive) {
      logger.warn(`Inactive user attempted socket connection: ${user.id}`);
      return null;
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token for socket authentication');
    } else if (error.name === 'TokenExpiredError') {
      logger.warn('Expired JWT token for socket authentication');
    } else {
      logger.error(`Socket authentication error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Join user to their personal room for direct messages
 */
async function joinUserRoom(socket, userId) {
  const roomName = `user:${userId}`;
  await socket.join(roomName);
  
  // Track room membership
  if (!connectionMetrics.roomMemberships.has(roomName)) {
    connectionMetrics.roomMemberships.set(roomName, new Set());
  }
  connectionMetrics.roomMemberships.get(roomName).add(socket.id);
  
  logger.debug(`Socket ${socket.id} joined user room: ${roomName}`);
}

/**
 * Join user to role-based rooms for broadcasting
 */
async function joinRoleBasedRooms(socket, userRole, userId) {
  const rooms = [];
  
  // Role-based rooms
  switch (userRole) {
    case 'ADMIN':
      rooms.push('admin', 'trainer', 'client', 'user'); // Admins see everything
      break;
    case 'TRAINER':
      rooms.push('trainer', 'client'); // Trainers see trainer and client events
      break;
    case 'CLIENT':
      rooms.push('client', 'user'); // Clients see client and public events
      break;
    case 'USER':
    default:
      rooms.push('user'); // Users see only public events
      break;
  }

  // Join each room and track membership
  for (const roomName of rooms) {
    await socket.join(roomName);
    
    if (!connectionMetrics.roomMemberships.has(roomName)) {
      connectionMetrics.roomMemberships.set(roomName, new Set());
    }
    connectionMetrics.roomMemberships.get(roomName).add(socket.id);
  }
  
  logger.debug(`Socket ${socket.id} joined role rooms: ${rooms.join(', ')}`);
}

/**
 * Join user to dashboard-specific rooms
 */
async function joinDashboardRooms(socket, userRole) {
  const dashboardRooms = [];
  
  switch (userRole) {
    case 'ADMIN':
      dashboardRooms.push('dashboard:admin', 'dashboard:trainer', 'dashboard:client');
      break;
    case 'TRAINER':
      dashboardRooms.push('dashboard:trainer');
      break;
    case 'CLIENT':
      dashboardRooms.push('dashboard:client');
      break;
  }

  for (const roomName of dashboardRooms) {
    await socket.join(roomName);
    
    if (!connectionMetrics.roomMemberships.has(roomName)) {
      connectionMetrics.roomMemberships.set(roomName, new Set());
    }
    connectionMetrics.roomMemberships.get(roomName).add(socket.id);
  }
  
  logger.debug(`Socket ${socket.id} joined dashboard rooms: ${dashboardRooms.join(', ')}`);
}

/**
 * Join user to a specific session room for real-time collaboration
 */
async function joinSessionRoom(socket, sessionId) {
  const roomName = `session:${sessionId}`;
  await socket.join(roomName);
  
  if (!connectionMetrics.roomMemberships.has(roomName)) {
    connectionMetrics.roomMemberships.set(roomName, new Set());
  }
  connectionMetrics.roomMemberships.get(roomName).add(socket.id);
  
  logger.debug(`Socket ${socket.id} joined session room: ${roomName}`);
}

/**
 * Leave a specific session room
 */
async function leaveSessionRoom(socket, sessionId) {
  const roomName = `session:${sessionId}`;
  await socket.leave(roomName);
  
  if (connectionMetrics.roomMemberships.has(roomName)) {
    connectionMetrics.roomMemberships.get(roomName).delete(socket.id);
    
    // Clean up empty rooms
    if (connectionMetrics.roomMemberships.get(roomName).size === 0) {
      connectionMetrics.roomMemberships.delete(roomName);
    }
  }
  
  logger.debug(`Socket ${socket.id} left session room: ${roomName}`);
}

/**
 * Update connection metrics by role
 */
function updateConnectionMetrics(userRole, action) {
  const metricKey = `${userRole.toLowerCase()}Connections`;
  
  if (connectionMetrics.hasOwnProperty(metricKey)) {
    if (action === 'connect') {
      connectionMetrics[metricKey]++;
    } else if (action === 'disconnect' && connectionMetrics[metricKey] > 0) {
      connectionMetrics[metricKey]--;
    }
  }
}

/**
 * Clean up user rooms when disconnecting
 */
function cleanupUserRooms(socket, userId) {
  // Remove socket from all room memberships
  for (const [roomName, socketSet] of connectionMetrics.roomMemberships.entries()) {
    socketSet.delete(socket.id);
    
    // Clean up empty rooms
    if (socketSet.size === 0) {
      connectionMetrics.roomMemberships.delete(roomName);
    }
  }
}

/**
 * Get comprehensive connection metrics
 */
export function getConnectionMetrics() {
  return {
    ...connectionMetrics,
    roomMemberships: Object.fromEntries(
      Array.from(connectionMetrics.roomMemberships.entries()).map(
        ([roomName, socketSet]) => [roomName, socketSet.size]
      )
    )
  };
}
