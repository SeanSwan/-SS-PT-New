import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const appSource = read('src/App.tsx');
const layoutSource = read('src/components/Layout/layout.tsx');
const headerSource = read('src/components/Header/header.tsx');
const actionIconsSource = read('src/components/Header/components/ActionIcons.tsx');
const notificationSource = stripComments(read('src/components/Header/EnhancedNotificationSection.tsx'));
const notificationCenterSource = stripComments(read('src/hooks/useNotificationCenter.ts'));
const socketContextSource = stripComments(read('src/context/SocketContext.tsx'));
const realtimeSocketUrlSource = read('src/utils/realtimeSocketUrl.ts');
const socketManagerSource = read('../backend/socket/socketManager.mjs');
const notificationControllerSource = stripComments(read('../backend/controllers/notificationController.mjs'));
const notificationDeliveryServiceSource = stripComments(read('../backend/services/notificationDeliveryService.mjs'));

describe('header notification socket auth pipeline', () => {
  it('is mounted from the active app layout into the authenticated notification bell', () => {
    expect(appSource).toContain("import { SocketProvider } from './context/SocketContext'");
    expect(appSource).toContain('<SocketProvider>');
    expect(appSource).toContain('</SocketProvider>');
    expect(layoutSource).toContain("import Header from '../Header/header'");
    expect(layoutSource).toContain('<Header />');
    expect(headerSource).toContain('import ActionIcons from "./components/ActionIcons"');
    expect(actionIconsSource).toContain('<EnhancedNotificationSectionWrapper />');
    expect(notificationSource).toContain("import { useNotificationCenter } from '../../hooks/useNotificationCenter'");
    expect(notificationSource).toContain('useNotificationCenter({ subscribeToSocket: true');
  });

  it('authenticates the root Socket.IO connection before notification rooms are usable', () => {
    expect(notificationCenterSource).toContain("import { useSocket } from '../context/SocketContext'");
    expect(socketContextSource).toContain("import { useAuth } from './AuthContext'");
    expect(socketContextSource).toContain('resolveRealtimeSocketTransportOptions');
    expect(socketContextSource).toContain('resolveRealtimeSocketUrl');
    expect(socketContextSource).toContain('const { isAuthenticated, token } = useAuth()');
    expect(socketContextSource).toContain('resolveRealtimeSocketUrl()');
    expect(socketContextSource).toContain('resolveRealtimeSocketTransportOptions(socketUrl)');
    expect(socketContextSource).not.toContain("transports: ['websocket', 'polling']");
    expect(realtimeSocketUrlSource).toContain('https://ss-pt-new.onrender.com');
    expect(socketContextSource).toContain("socketInstance.emit('authenticate', { token })");
    expect(socketContextSource).toContain("socketInstance.on('authenticated'");
    expect(socketContextSource).toContain("socketInstance.on('auth_error'");
    expect(socketContextSource).not.toContain('setIsConnected(true);');
    expect(socketContextSource).not.toContain('localStorage.getItem');

    expect(socketManagerSource).toContain("socket.on('authenticate'");
    expect(socketManagerSource).toContain('await joinUserRoom(socket, user.id)');
    expect(notificationControllerSource).toContain("from '../services/notificationDeliveryService.mjs'");
    expect(notificationDeliveryServiceSource).toContain("io.to(`user:${userId}`).emit('notification:new'");
    expect(notificationDeliveryServiceSource).toContain("io.to(`user:${userId}`).emit('notification:count', { unreadCount })");
  });

  it('matches the backend unread-count payload shape', () => {
    expect(notificationCenterSource).toContain('data.unreadCount ?? data.count');
  });
});
