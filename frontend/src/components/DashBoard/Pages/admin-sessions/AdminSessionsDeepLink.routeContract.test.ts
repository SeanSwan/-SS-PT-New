import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readLocal = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('Admin sessions activation deep link route contract', () => {
  it('seeds the new-session dialog from a canonical clientId query param', () => {
    const pageSource = readLocal('./enhanced-admin-sessions-view.tsx');
    const mutationSource = readLocal('./useAdminSessionsMutations.ts');

    expect(pageSource).toContain("import { useLocation } from 'react-router-dom';");
    expect(pageSource).toContain('getAdminSessionsClientIdFromSearch(location.search)');
    expect(pageSource).toContain('initialNewSessionClientId');
    expect(mutationSource).toContain('initialNewSessionClientId');
  });
});
