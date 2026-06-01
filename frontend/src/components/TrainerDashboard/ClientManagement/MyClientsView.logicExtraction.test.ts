import { readFileSync } from 'fs';
import { resolve } from 'path';

const sourcePath = resolve(__dirname, 'MyClientsView.tsx');
const hookPath = resolve(__dirname, 'useTrainerClients.ts');
const typesPath = resolve(__dirname, 'MyClientsView.types.ts');
const logicPath = resolve(__dirname, 'MyClientsView.logic.ts');

describe('MyClientsView logic extraction', () => {
  it('keeps trainer-client types and pure helpers out of the route shell', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const hook = readFileSync(hookPath, 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(760);
    expect(source).not.toMatch(/^interface Client/m);
    expect(source).not.toMatch(/^interface ClientAssignment/m);
    expect(source).not.toMatch(/^const getInitials/m);
    expect(source).not.toMatch(/^const formatTimeAgo/m);
    expect(source).not.toMatch(/^const getMembershipColor/m);
    expect(source).not.toMatch(/^const getTrainerClientIntent/m);
    expect(hook).toContain("from './MyClientsView.types'");
    expect(source).toContain("from './MyClientsView.logic'");
  });

  it('keeps extracted logic and type files under the project line cap', () => {
    for (const path of [typesPath, logicPath]) {
      const source = readFileSync(path, 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }
  });
});
