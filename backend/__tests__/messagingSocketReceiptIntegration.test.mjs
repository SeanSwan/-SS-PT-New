import http from 'node:http';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Server } from 'socket.io';

const JWT_SECRET = 's5-local-socket-test-secret';
const state = {
  notificationFails: false,
  nextMessageId: 500,
  messages: [],
  notifications: [],
};

const fakeQuery = vi.fn(async (sql, options = {}) => {
  const text = String(sql);
  if (text.includes('FROM "Users"')) {
    const id = Number(options.replacements?.id);
    return [{ id, role: id === 1 ? 'user' : 'client', firstName: `User${id}`, lastName: 'Synthetic', username: `u${id}`, photo: null }];
  }
  if (text.includes('SELECT 1') && text.includes('conversation_participants')) {
    return [{ '?column?': 1 }];
  }
  if (text.includes('SELECT conversation_id') && text.includes('conversation_participants')) {
    return [{ conversation_id: 7 }];
  }
  if (text.includes('INSERT INTO messages')) {
    const id = state.nextMessageId++;
    const message = {
      id,
      conversation_id: Number(options.replacements.conversationId),
      sender_id: Number(options.replacements.senderId),
      content: options.replacements.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.messages.push(message);
    return [[message]];
  }
  if (text.includes('SELECT user_id') && text.includes('conversation_participants')) {
    return [{ user_id: 2 }];
  }
  return [];
});

const notificationModel = {
  create: vi.fn(async (payload) => {
    if (state.notificationFails) throw new Error('synthetic notification outage');
    const notification = { id: state.notifications.length + 1, ...payload };
    state.notifications.push(notification);
    return notification;
  }),
  count: vi.fn(async () => state.notifications.length),
};

const fakeSequelize = { query: fakeQuery };
const httpServer = http.createServer();
const primaryIO = new Server(httpServer, { cors: { origin: '*' } });

vi.mock('../database.mjs', () => ({ default: fakeSequelize }));
vi.mock('../socket/socketManager.mjs', () => ({
  getManagedSocketIO: () => primaryIO,
  getIO: () => primaryIO,
}));
vi.mock('../utils/jwtSecretGuard.mjs', () => ({
  getJwtSecret: () => JWT_SECRET,
  isJwtSecretConfigurationError: () => false,
}));
vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../services/messaging/blockGuard.mjs', () => ({
  BLOCKED_MESSAGE: 'You cannot message this user.',
  canSendToConversation: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('../services/messaging/messageRateLimit.mjs', () => ({
  MESSAGE_RATE_LIMITED: 'Too many messages. Please try again shortly.',
  checkMessageRate: vi.fn(() => ({ allowed: true })),
}));
vi.mock('../services/messagingAccessRepository.mjs', () => ({
  isRelationshipWriteAllowed: vi.fn(async () => true),
  resolveSocketCommunityAccess: vi.fn(async () => false),
}));
vi.mock('../models/index.mjs', () => ({
  getNotification: () => notificationModel,
}));

const { initializeSocket } = await import('../socket/socket.mjs');
const clientModule = await import('socket.io-client');

const once = (socket, event, timeout = 2000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout);
  socket.once(event, (...args) => { clearTimeout(timer); resolve(args); });
});

const tokenFor = (id) => jwt.sign({ userId: id, tokenType: 'access' }, JWT_SECRET);

describe('messaging Socket.IO authoritative receipt flow', () => {
  let port;

  beforeAll(async () => {
    initializeSocket();
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    port = httpServer.address().port;
  });

  afterAll(async () => {
    primaryIO.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  it('authenticates real local clients, persists one message, emits its echo and acks after persistence despite notification failure', async () => {
    state.notificationFails = true;
    const sender = clientModule.io(`http://127.0.0.1:${port}/messaging`, { auth: { token: tokenFor(1) }, transports: ['websocket'] });
    const recipient = clientModule.io(`http://127.0.0.1:${port}/messaging`, { auth: { token: tokenFor(2) }, transports: ['websocket'] });
    await Promise.all([once(sender, 'connect'), once(recipient, 'connect')]);
    const join = (client) => new Promise((resolve) => client.emit('join_conversations', [7], resolve));
    await Promise.all([join(sender), join(recipient)]);
    const [rejected] = await new Promise((resolve) => {
      sender.emit('send_message', { conversationId: 7, content: '' }, (...args) => resolve(args));
    });
    expect(rejected).toEqual({ success: false, message: 'Message content is invalid.' });
    const echo = once(recipient, 'new_message');
    const [ack] = await new Promise((resolve) => {
      sender.emit('send_message', { conversationId: 7, content: 'hello from socket' }, (...args) => resolve(args));
    });

    expect(ack.success).toBe(true);
    expect(ack.message).toEqual(expect.objectContaining({ id: 500, content: 'hello from socket' }));
    expect(await echo).toEqual([expect.objectContaining({ id: 500, content: 'hello from socket' })]);
    expect(state.messages).toHaveLength(1);
    expect(notificationModel.create).toHaveBeenCalled();
    sender.disconnect();
    recipient.disconnect();
    state.notificationFails = false;
  });

  it('retains online presence until the last socket for an account disconnects', async () => {
    const observer = clientModule.io(`http://127.0.0.1:${port}/messaging`, { auth: { token: tokenFor(2) }, transports: ['websocket'] });
    const first = clientModule.io(`http://127.0.0.1:${port}/messaging`, { auth: { token: tokenFor(1) }, transports: ['websocket'] });
    const second = clientModule.io(`http://127.0.0.1:${port}/messaging`, { auth: { token: tokenFor(1) }, transports: ['websocket'] });
    await Promise.all([once(observer, 'connect'), once(first, 'connect'), once(second, 'connect')]);
    first.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(observer.connected).toBe(true);
    second.disconnect();
    observer.disconnect();
  });
});
