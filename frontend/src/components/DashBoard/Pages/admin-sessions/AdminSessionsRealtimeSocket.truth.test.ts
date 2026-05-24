import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

const pageSource = read('./enhanced-admin-sessions-view.tsx');
const dashboardLayoutSource = read('../../UniversalDashboardLayout.tsx');
const socketManagerSource = read('../../../../../../backend/socket/socketManager.mjs');
const stripeWebhookSource = read('../../../../../../backend/webhooks/stripeWebhook.mjs');
const notificationServiceSource = read('../../../../../../backend/services/notificationService.mjs');
const realTimeScheduleServiceSource = read('../../../../../../backend/services/realTimeScheduleService.mjs');

describe('admin sessions realtime socket pipeline', () => {
  it('covers the active admin sessions route', () => {
    expect(dashboardLayoutSource).toContain("{ path: '/admin-sessions', component: EnhancedAdminSessionsView");
  });

  it('uses the authenticated Socket.IO context instead of the retired raw ws endpoint', () => {
    expect(pageSource).toContain('import { useSocket } from "../../../../context/SocketContext"');
    expect(pageSource).toContain('const { socket } = useSocket();');
    expect(pageSource).not.toContain('from "../../../../hooks/use-socket"');
    expect(pageSource).not.toContain("useSocket('/ws/admin-dashboard')");
    expect(pageSource).not.toContain('/ws/admin-dashboard');
  });

  it('listens for backend Socket.IO purchase and schedule events that can refresh the surface', () => {
    expect(pageSource).toContain("socket.on('user_purchased_sessions', handleUserPurchasedSessions)");
    expect(pageSource).toContain("socket.on('dashboard:update', handleDashboardUpdate)");
    expect(pageSource).toContain("socket.on('schedule:update', handleScheduleUpdate)");
    expect(pageSource).toContain("socket.on('schedule:sync_required', handleScheduleUpdate)");
    expect(pageSource).toContain("socket.off('user_purchased_sessions', handleUserPurchasedSessions)");
    expect(pageSource).toContain("socket.off('dashboard:update', handleDashboardUpdate)");
    expect(pageSource).toContain("socket.off('schedule:update', handleScheduleUpdate)");
    expect(pageSource).toContain("socket.off('schedule:sync_required', handleScheduleUpdate)");
  });

  it('normalizes dashboard purchase wrappers before passing them to the purchase handler', () => {
    expect(pageSource).toContain('const purchasePayload = payload.data ?? payload;');
    expect(pageSource).toContain('handleUserPurchasedSessions({');
    expect(pageSource).toContain('userName: purchasePayload.userName,');
    expect(pageSource).toContain('sessions: purchasePayload.sessions,');
    expect(pageSource).toContain('sessionsPurchased: purchasePayload.sessionsPurchased,');
    expect(pageSource).not.toContain('handleUserPurchasedSessions(payload.data || payload)');
  });

  it('matches actual backend Socket.IO rooms and event names', () => {
    expect(socketManagerSource).toContain("rooms.push('admin', 'trainer', 'client', 'user')");
    expect(socketManagerSource).toContain("dashboardRooms.push('dashboard:admin', 'dashboard:trainer', 'dashboard:client')");
    expect(stripeWebhookSource).toContain("io.to('admin').emit('user_purchased_sessions'");
    expect(notificationServiceSource).toContain("io.to('admin').emit('dashboard:update'");
    expect(realTimeScheduleServiceSource).toContain("rooms: ['admin', 'dashboard:admin']");
  });
});
