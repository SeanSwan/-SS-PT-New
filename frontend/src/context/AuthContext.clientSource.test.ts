import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AuthContext clientSource persistence', () => {
  it('maps clientSource through the shared auth user formatter used by auth paths', () => {
    const source = readFileSync(resolve(__dirname, 'AuthContextProvider.tsx'), 'utf8');

    expect(source).toContain('clientSource: userData.clientSource');
    expect(source).toContain('const formattedUser = formatAuthUser(userData, undefined, readStoredUser());');
    expect(source).toContain('const formattedUser = formatAuthUser(userData, username, readStoredUser());');
    expect(source).toContain('...formatAuthUser(userData, data.username, readStoredUser()),');
    expect(source).toContain('const refreshedUser = formatAuthUser(userData, undefined, user || readStoredUser());');
  });
});
