import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const SOCKET_SRC = readSource('socket/socket.mjs');
const STARTUP_SRC = readSource('core/startup.mjs');

describe('messaging socket namespace source contract', () => {
  it('uses the primary socket manager instead of creating a second server', () => {
    expect(SOCKET_SRC).toMatch(/getManagedSocketIO\(\)/);
    expect(SOCKET_SRC).toMatch(/managedIO\.of\(['"]\/messaging['"]\)/);
    expect(SOCKET_SRC).not.toMatch(/new\s+Server\(/);
  });

  it('queries the canonical Users table with quoted casing', () => {
    expect(SOCKET_SRC).toMatch(/FROM\s+"Users"/);
    expect(SOCKET_SRC).not.toMatch(/FROM\s+users\b/);
  });

  it('initializes the primary socket manager before server.mjs adds messaging handlers', () => {
    expect(STARTUP_SRC).toMatch(/initSocketIO\(httpServer\)/);
  });

  it('routes message notifications through the canonical communications orchestrator', () => {
    expect(SOCKET_SRC).toContain("from '../services/communications/notificationOrchestratorService.mjs'");
    expect(SOCKET_SRC).toContain('createMessageNotificationEvent');
    expect(SOCKET_SRC).not.toContain('INSERT INTO notifications');
    expect(SOCKET_SRC).not.toContain('new_notification');
    expect(SOCKET_SRC).not.toContain('type, content, created_at');
  });

  it('uses ackable clientMessageId message sends instead of content-text reconciliation', () => {
    expect(SOCKET_SRC).toContain("socket.on('send_message', async (payload, ack)");
    expect(SOCKET_SRC).toContain('clientMessageId');
    expect(SOCKET_SRC).toContain('ackMessageSend');
    expect(SOCKET_SRC).toContain('ok: true');
    expect(SOCKET_SRC).toContain('messageId: newMessage.id');
  });

  it('uses the message repository for retry-safe socket idempotency', () => {
    expect(SOCKET_SRC).toContain("import { createMessageRecord");
    expect(SOCKET_SRC).toContain('clientMessageId: normalizedClientMessageId');
    expect(SOCKET_SRC).toContain('wasIdempotentReplay');
    expect(SOCKET_SRC).not.toContain('INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)');
  });

  it('does not emit or notify again when a clientMessageId is replayed', () => {
    const replayBranchIndex = SOCKET_SRC.indexOf('newMessage.wasIdempotentReplay');
    const emitIndex = SOCKET_SRC.indexOf("io.to(roomName).emit('new_message'");
    const fanoutIndex = SOCKET_SRC.indexOf('createMessageNotificationEvent({');

    expect(replayBranchIndex).toBeGreaterThan(-1);
    expect(emitIndex).toBeGreaterThan(replayBranchIndex);
    expect(fanoutIndex).toBeGreaterThan(replayBranchIndex);
  });

  it('acks persisted socket messages before optional notification fanout', () => {
    const successAckIndex = SOCKET_SRC.indexOf('ackMessageSend(ack, {\n          ok: true');
    const fanoutIndex = SOCKET_SRC.indexOf('createMessageNotificationEvent({');

    expect(successAckIndex).toBeGreaterThan(-1);
    expect(fanoutIndex).toBeGreaterThan(successAckIndex);
    expect(SOCKET_SRC).toContain('Message notification fanout failed');
  });

  it('tracks online presence per user across multiple sockets', () => {
    expect(SOCKET_SRC).toContain('addOnlineSocket(socket.user.id, socket.id)');
    expect(SOCKET_SRC).toContain('removeOnlineSocket(socket.user.id, socket.id)');
    expect(SOCKET_SRC).toContain('isUserOnline');
    expect(SOCKET_SRC).not.toContain('onlineUsers.set(socket.user.id, socket.id)');
    expect(SOCKET_SRC).not.toContain('onlineUsers.delete(socket.user.id)');
  });
});