import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('trainer home communications inbox contract', () => {
  it('mounts the canonical Communications OS strip on the active trainer overview', () => {
    const routesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const trainerHomeSource = readSource('src/components/DashBoard/Pages/trainer-dashboard/TrainerHomeTab.tsx');
    const messagingViewSource = readSource('src/components/Social/Messaging/MessagingView.tsx');

    expect(routesSource).toContain("{ path: '/overview', component: TrainerHomeTab");
    expect(messagingViewSource).toContain('<CommunicationsInboxStrip />');

    expect(trainerHomeSource).toContain("import CommunicationsInboxStrip from '../../../Communications/CommunicationsInboxStrip'");
    expect(trainerHomeSource).toContain('<CommunicationsInboxStrip />');
    expect(trainerHomeSource).not.toContain('useNotificationCenter(');
    expect(trainerHomeSource).not.toContain('/api/notifications');

    expect(trainerHomeSource.indexOf('<TrainerHomeObservatoryHero')).toBeLessThan(trainerHomeSource.indexOf('<CommunicationsInboxStrip />'));
    expect(trainerHomeSource.indexOf('<DashboardBackgroundSettingsPanel')).toBeLessThan(trainerHomeSource.indexOf('<CommunicationsInboxStrip />'));
    expect(trainerHomeSource.indexOf('<CommunicationsInboxStrip />')).toBeLessThan(trainerHomeSource.indexOf('<TrainerHomeMainGrid>'));
  });
});