import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './EnhancedAdminClientManagementView.tsx'), 'utf8');

describe('EnhancedAdminClientManagementView filter controls', () => {
  it('wires every visible filter control into the filtered client list', () => {
    expect(SOURCE).toContain("import { filterEnhancedAdminClients } from './EnhancedAdminClientManagementView.logic';");
    expect(SOURCE).toContain('return filterEnhancedAdminClients(clients, {');
    expect(SOURCE).toContain('level: filters.level');
    expect(SOURCE).toContain('engagement: filters.engagement');
    expect(SOURCE).toContain('}, [clients, searchTerm, sourceFilter, filters.level, filters.engagement]);');
  });

  it('does not expose a no-op advanced filters button', () => {
    expect(SOURCE).toContain('const resetClientFilters = useCallback(() => {');
    expect(SOURCE).toContain('onClick={resetClientFilters}');
    expect(SOURCE).toContain('Reset Filters');
    expect(SOURCE).not.toContain('TODO: Advanced filters modal');
    expect(SOURCE).not.toContain('Advanced Filters');
  });
});
