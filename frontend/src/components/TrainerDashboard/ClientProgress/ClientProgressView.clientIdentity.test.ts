import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';

const logicPath = resolve(__dirname, './ClientProgressView.logic.ts');
const overviewPath = resolve(__dirname, './ClientProgressView.tsx');
const enhancedPath = resolve(__dirname, './EnhancedClientProgressView.tsx');

describe('trainer client progress identity parsing', () => {
  it('exports a strict positive integer client id parser', async () => {
    expect(existsSync(logicPath)).toBe(true);

    const logicModuleUrl = pathToFileURL(logicPath).href;
    const { parseClientProgressId } = await import(/* @vite-ignore */ logicModuleUrl);

    expect(parseClientProgressId('61')).toBe(61);
    expect(parseClientProgressId(' 61 ')).toBe(61);
    expect(parseClientProgressId(61)).toBe(61);
    expect(parseClientProgressId('61junk')).toBeNull();
    expect(parseClientProgressId('0')).toBeNull();
    expect(parseClientProgressId(Number.NaN)).toBeNull();
    expect(parseClientProgressId(null)).toBeNull();
  });

  it('keeps the overview progress route from passing malformed ids to hooks or charts', () => {
    const source = readFileSync(overviewPath, 'utf8');

    expect(source).toContain("import { parseClientProgressId } from './ClientProgressView.logic';");
    expect(source).toContain('parseClientProgressId(initialClientId) ?? undefined');
    expect(source).toContain('const activeClientId = parseClientProgressId(activeClient?.id);');
    expect(source).toContain('setSelectedClientId(activeClientId);');
    expect(source).toContain("const resolvedClientId = user?.role === 'client'");
    expect(source).toContain('parseClientProgressId(user?.id) ?? undefined');
    expect(source).toContain('const id = parseClientProgressId(e.target.value);');
    expect(source).toContain('parseClientProgressId(c.id) === id');
    expect(source).not.toContain('Number(initialClientId)');
    expect(source).not.toContain('Number(activeClient.id)');
    expect(source).not.toContain('Number(user?.id)');
    expect(source).not.toContain('Number(c.id) === id');
  });

  it('normalizes the advanced progress shell before calling workout-form and analytics endpoints', () => {
    const source = readFileSync(enhancedPath, 'utf8');

    expect(source).toContain("import { parseClientProgressId } from './ClientProgressView.logic';");
    expect(source).toContain("const rawClientId = searchParams.get('clientId') ?? activeClient?.id?.toString() ?? '';");
    expect(source).toContain('const parsedClientId = parseClientProgressId(rawClientId);');
    expect(source).toContain("const clientId = parsedClientId ? String(parsedClientId) : '';");
    expect(source).not.toContain("const clientId = searchParams.get('clientId') || activeClient?.id?.toString() || '';");
  });
});
