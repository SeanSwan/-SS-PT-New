import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readWorkspaceFile = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('ClientsWorkspace onboarding workbench wiring', () => {
  it('routes Client Hub workbench actions through the canonical Coach Command Center', () => {
    const logicSource = readWorkspaceFile('ClientsWorkspace.logic.ts');
    const containerSource = readWorkspaceFile('ClientsWorkspace.tsx');
    const adminNavSource = readWorkspaceFile('useClientHubAdminNav.ts');
    const viewSource = readWorkspaceFile('ClientsWorkspace.view.tsx');
    const topBarSource = readWorkspaceFile('ClientsWorkspaceTopBar.tsx');

    expect(logicSource).toContain("workspace: 'onboarding'");
    expect(logicSource).toContain("intent: client?.id ? 'client_profile_coverage_update' : 'client_onboarding'");
    expect(adminNavSource).toContain('buildClientOnboardingWorkbenchRoute(selectedClient)');
    expect(containerSource).toContain('useClientHubAdminNav(navigate, selectedClient)');
    expect(viewSource).toContain('onOpenOnboardingWorkbench={props.onOpenOnboardingWorkbench}');
    expect(topBarSource).toContain('Open onboarding workbench');
    expect(topBarSource).toContain('<ClipboardCheck size={16} />');
  });
});
