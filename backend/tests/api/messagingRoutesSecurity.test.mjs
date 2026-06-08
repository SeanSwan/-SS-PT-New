import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging routes security hardening', () => {
  it('locks the live messaging API mount and frontend consumer surface', () => {
    const coreRoutesSource = readSource('core/routes.mjs');
    const routeSource = readSource('routes/messagingRoutes.mjs');
    const adminCommunicationSource = readSource('../frontend/src/components/DashBoard/Pages/admin-clients/components/CommunicationCenter.tsx');
    const chatWindowSource = readSource('../frontend/src/components/Messaging/ChatWindow.tsx');
    const newConversationSource = readSource('../frontend/src/components/Messaging/NewConversationModal.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/messaging', messagingRoutes)");
    expect(routeSource).toContain("router.post('/conversations'");
    expect(routeSource).toContain("router.post('/conversations/:id/messages'");
    expect(adminCommunicationSource).toContain("authAxios.get('/api/messaging/conversations'");
    expect(adminCommunicationSource).toContain("authAxios.post('/api/messaging/conversations'");
    expect(chatWindowSource).toContain('api.post(`/api/messaging/conversations/${conversationId}/messages`');
    expect(newConversationSource).toContain("api.post('/api/messaging/conversations'");
  });

  it('does not echo raw exception details from create/send message responses', () => {
    const controllerSource = readSource('controllers/messagingController.mjs');

    expect(controllerSource).not.toContain('Failed to create conversation: ${error.message}');
    expect(controllerSource).not.toContain('Failed to send message: ${error.message}');
    expect(controllerSource).not.toMatch(/res\.status\(500\)\.json\(\{\s*error:\s*`Failed to (create conversation|send message):/);
  });
});
