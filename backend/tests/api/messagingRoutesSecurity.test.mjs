import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const readMessagingControllerSource = () => [
  'controllers/messagingController.mjs',
  'controllers/messaging/conversationController.mjs',
  'controllers/messaging/groupController.mjs',
  'controllers/messaging/messageController.mjs',
  'services/messagingConversationQueries.mjs',
  'services/messagingSchemaRepository.mjs',
].map(readSource).join('\n');
const readSocketSource = () => readSource('socket/socket.mjs');

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

  it('requires protected group-management routes for rename, add, role, and removal actions', () => {
    const routeSource = readSource('routes/messagingRoutes.mjs');
    const controllerSource = readMessagingControllerSource();

    expect(routeSource).toContain("router.patch('/conversations/:id'");
    expect(routeSource).toContain("router.post('/conversations/:id/participants'");
    expect(routeSource).toContain("router.patch('/conversations/:id/participants/:userId'");
    expect(routeSource).toContain("router.delete('/conversations/:id/participants/:userId'");
    expect(controllerSource).toContain("ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';");
    expect(controllerSource).toContain('requireGroupManager');
    expect(controllerSource).toContain('canManageParticipantRole');
    expect(controllerSource).toContain('canRemoveParticipant');
  });

  it('does not echo raw exception details from create/send/group management responses', () => {
    const controllerSource = readMessagingControllerSource();

    expect(controllerSource).not.toContain('Failed to create conversation: ${error.message}');
    expect(controllerSource).not.toContain('Failed to send message: ${error.message}');
    expect(controllerSource).not.toMatch(/res\.status\(500\)\.json\(\{\s*error:\s*`Failed to (create conversation|send message|update conversation|add participants|update participant|remove participant):/);
  });

  it('keeps socket messaging aligned with REST membership and input security', () => {
    const socketSource = readSocketSource();

    expect(socketSource).toContain('const MAX_MESSAGE_LENGTH = 5000');
    expect(socketSource).toContain('decoded.userId ?? decoded.id');
    expect(socketSource).toContain('async function isActiveParticipant');
    expect(socketSource).toContain('AND deleted_at IS NULL');
    expect(socketSource).toContain('if (!(await isActiveParticipant(normalizedConversationId, socket.user.id)))');
    expect(socketSource).toContain('WITH inserted AS');
    expect(socketSource).toContain('ON CONFLICT (message_id, user_id) DO NOTHING');
    expect(socketSource).not.toContain("readReceipts.map(id => `('${id}', ${socket.user.id}, NOW())`)");
  });

  it('keeps user search compatible with full-name queries and mounted frontend fields', () => {
    const controllerSource = readMessagingControllerSource();

    expect(controllerSource).toContain('("firstName" || \' \' || "lastName") ILIKE :query');
    expect(controllerSource).toContain('displayName: `${u.firstName || \'\'} ${u.lastName || \'\'}`.trim() || u.username');
    expect(controllerSource).toContain("'firstName', u.\"firstName\"");
    expect(controllerSource).toContain("'lastName', u.\"lastName\"");
    expect(controllerSource).toContain("'role', CASE WHEN u.role = 'user' THEN 'client' ELSE u.role END");
  });
  it('gates messaging search and writes through policy plus route rate limits', () => {
    const routeSource = readSource('routes/messagingRoutes.mjs');
    const conversationSource = readSource('controllers/messaging/conversationController.mjs');
    const groupSource = readSource('controllers/messaging/groupController.mjs');
    const messageSource = readSource('controllers/messaging/messageController.mjs');
    const socketSource = readSocketSource();

    expect(routeSource).toContain('messagingSearchLimiter');
    expect(routeSource).toContain('messagingConversationLimiter');
    expect(routeSource).toContain('messagingSendLimiter');
    expect(routeSource).toContain("router.get('/users/search', protect, messagingTier, messagingSearchLimiter, searchUsers)");
    expect(routeSource).toContain("router.post('/conversations', protect, messagingTier, messagingConversationLimiter");
    expect(routeSource).toContain("router.post('/conversations/:id/participants', protect, messagingTier, messagingConversationLimiter");
    expect(routeSource).toContain("router.post('/conversations/:id/messages', protect, messagingTier, messagingSendLimiter, sendMessage)");

    expect(conversationSource).toContain('assertCanMessageUsers');
    expect(groupSource).toContain('assertCanMessageUsers');
    expect(messageSource).toContain('getMessagingSearchScope');
    expect(messageSource).toContain('if (query.length < 2) return res.json([]);');
    expect(messageSource).not.toContain('!query || query.length < 2');
    expect(messageSource).toContain('assertCanMessageConversation');
    expect(messageSource).not.toContain('OR email ILIKE :query');

    expect(socketSource).toContain('assertCanMessageConversation');
    expect(socketSource).toContain('isSocketRateLimited');
    expect(socketSource).toContain("event: 'send_message'");
    expect(socketSource).toContain("event: 'is_typing'");
  });
});
