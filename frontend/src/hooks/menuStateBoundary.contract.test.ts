import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = (relativePath: string) => resolve(process.cwd(), relativePath);
const readSource = (relativePath: string) => readFileSync(sourcePath(relativePath), 'utf8');

describe('menu state Fast Refresh boundary', () => {
  it('mounts the component-only provider from App', () => {
    const appSource = readSource('src/App.tsx');

    expect(appSource).toContain("import MenuStateProvider from './hooks/MenuStateProvider'");
    expect(appSource).not.toContain("import MenuStateProvider from './hooks/useMenuState'");
  });

  it('separates contexts, hooks, and the provider by module responsibility', () => {
    expect(existsSync(sourcePath('src/hooks/MenuStateProvider.tsx'))).toBe(true);
    expect(existsSync(sourcePath('src/hooks/menuStateContext.ts'))).toBe(true);
    expect(existsSync(sourcePath('src/hooks/useMenuState.ts'))).toBe(true);
    expect(existsSync(sourcePath('src/hooks/useMenuState.tsx'))).toBe(false);

    const providerSource = readSource('src/hooks/MenuStateProvider.tsx');
    const hooksSource = readSource('src/hooks/useMenuState.ts');

    expect(providerSource).not.toContain('createContext');
    expect(providerSource).not.toContain('useContext');
    expect(hooksSource).not.toContain('<MenuStateContext.Provider');
  });
});
