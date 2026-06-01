import { readFileSync } from 'fs';
import { resolve } from 'path';

const routePath = resolve(__dirname, 'MyClientsView.tsx');
const hookPath = resolve(__dirname, 'useTrainerClients.ts');

describe('MyClientsView data hook extraction', () => {
  it('moves assignment loading, filtering, and stats out of the route shell', () => {
    const route = readFileSync(routePath, 'utf8');

    expect(route.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(route).toContain('useTrainerClients');
    expect(route).not.toMatch(/\/api\/client-trainer-assignments\/trainer/);
    expect(route).not.toMatch(/\/api\/sessions\/history/);
    expect(route).not.toMatch(/admin-viewas-/);
    expect(route).not.toMatch(/clientList\.map/);
  });

  it('keeps canonical trainer-client data truth inside the extracted hook', () => {
    const hook = readFileSync(hookPath, 'utf8');

    expect(hook.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(hook).toMatch(/\/api\/client-trainer-assignments\/trainer/);
    expect(hook).toMatch(/\/api\/sessions\/history/);
    expect(hook).toMatch(/\/api\/sessions\/upcoming/);
    expect(hook).toMatch(/admin-viewas-/);
    expect(hook).toMatch(/isNonDeductingClientSource/);
    expect(hook).toMatch(/paidSessionInventory/);
  });
});
