import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/CommunicationCenter.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
  'utf8',
);

describe('CommunicationCenter active surface truth contract', () => {
  it('is mounted by the admin client management communication tab', () => {
    expect(parentSource).toContain("import CommunicationCenter from './components/CommunicationCenter'");
    expect(parentSource).toContain('<CommunicationCenter');
    expect(parentSource).toContain('clientId={selectedClient.id}');
  });

  it('does not render hardcoded conversations, templates, messages, or analytics', () => {
    expect(source).not.toContain('// Mock data');
    expect(source).not.toContain('const mockParticipants');
    expect(source).not.toContain('const mockConversations');
    expect(source).not.toContain('const mockNotificationTemplates');
    expect(source).not.toContain('const mockAnalytics');
    expect(source).not.toContain('setConversations(mockConversations)');
    expect(source).not.toContain('Simulate message status updates');
  });

  it('uses the canonical messaging API for conversations, message history, and sending', () => {
    expect(source).toContain("authAxios.get('/api/messaging/conversations'");
    expect(source).toContain('`/api/messaging/conversations/${selectedConversation.id}/messages`');
    expect(source).toContain('authAxios.post(messagePath');
  });

  it('wires the voice composer button instead of rendering a dead mic control', () => {
    expect(source).toContain("import { useCommunicationVoiceDraft } from './useCommunicationVoiceDraft'");
    expect(source).toContain('const voiceDraft = useCommunicationVoiceDraft');
    expect(source).toContain('aria-label={voiceDraft.label}');
    expect(source).toContain('onClick={voiceDraft.toggle}');
    expect(source).not.toContain('<RoundButton title="Voice Message">');
  });

  it('does not leave communication call and thread-option controls as silent no-ops', () => {
    expect(source).toContain('disabled={!onCallStart}');
    expect(source).toContain('aria-label="Thread options unavailable"');
    expect(source).not.toContain('<RoundButton title="More Options">');
  });
});
