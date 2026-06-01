import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readWorkspaceFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('ClientsWorkspace decomposition', () => {
  it('keeps the canonical workspace under the 300-line component cap', () => {
    const source = readWorkspaceFile('ClientsWorkspace.tsx');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('extracts the empty Client Hub state instead of growing the route component', () => {
    const source = readWorkspaceFile('ClientsWorkspace.tsx');

    expect(source).toContain("import ClientsWorkspaceEmptyState from './ClientsWorkspaceEmptyState'");
    expect(source).toContain('<ClientsWorkspaceEmptyState');
  });
});
