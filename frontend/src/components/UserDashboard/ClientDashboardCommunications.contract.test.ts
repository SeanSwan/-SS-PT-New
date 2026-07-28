import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('client dashboard communications inbox contract', () => {
  it('mounts the canonical Communications OS strip on the active client overview', () => {
    const routesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const clientHomeSource = readSource('src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx');
    const clientHomeTabSource = readSource('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.tsx');
    const typesSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.types.ts');
    const messagingViewSource = readSource('src/components/Social/Messaging/MessagingView.tsx');

    expect(routesSource).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(clientHomeSource).toContain('<ClientDashboardHomeTab');
    expect(messagingViewSource).toContain('<CommunicationsInboxStrip />');

    expect(clientHomeTabSource).toContain("import CommunicationsInboxStrip from '../../Communications/CommunicationsInboxStrip'");
    expect(clientHomeTabSource).toContain('communicationInbox={<CommunicationsInboxStrip />}');
    expect(clientHomeTabSource).not.toContain('useNotificationCenter(');
    expect(clientHomeTabSource).not.toContain('/api/notifications');

    expect(typesSource).toContain('communicationInbox?: ReactNode;');
    expect(shellSource).toContain('{props.communicationInbox}');
    expect(shellSource.indexOf('<ClientProfileHero')).toBeLessThan(shellSource.indexOf('{props.communicationInbox}'));
    expect(shellSource.indexOf('{props.communicationInbox}')).toBeLessThan(shellSource.indexOf('<ClientQuickActions'));
  });
});
