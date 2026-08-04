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
    const dashboardQueriesSource = readSource('../frontend/src/hooks/useDashboardQueries.ts');
    const messagingApiFetchSource = readSource('../frontend/src/components/Social/Messaging/messagingApiFetch.ts');
    const messagingHookSource = readSource('../frontend/src/components/Social/Messaging/useMessaging.ts');

    expect(coreRoutesSource).toContain("app.use('/api/messaging', messagingRoutes)");
    expect(routeSource).toContain("router.post('/conversations'");
    expect(routeSource).toContain("router.post('/conversations/:id/messages'");
    expect(dashboardQueriesSource).toContain("authAxios.get('/api/messaging/conversations'");
    expect(messagingApiFetchSource).toContain("const API_BASE = '/api/messaging'");
    expect(messagingHookSource).toContain("apiFetch<unknown>('/conversations')");
    expect(messagingHookSource).toContain("apiFetch<unknown>('/conversations', {");
    expect(messagingHookSource).toContain('apiFetch<unknown>(`/conversations/${segment}/messages`, {');
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

  it('escapes LIKE wildcards in user search so `%` cannot dump the directory', () => {
    // Regression 2026-08-04 (Kimi hostile pass): the search wrapped raw input as
    // `%${query}%`, so query=`%` became `%%%` and ILIKE-matched every user — a
    // one-character dump of the whole directory. The query replacement must run the
    // input through the LIKE-escape helper, never interpolate it raw.
    const controllerSource = readMessagingControllerSource();
    expect(controllerSource).toContain('const escapeLikePattern =');
    expect(controllerSource).toContain('`%${escapeLikePattern(query)}%`');
    expect(controllerSource).not.toContain('query: `%${query}%`');
  });
});
