import { describe, expect, it } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { UPLOADS_ROOT, resolveLocalUploadPath, DISK_URL_PREFIX } from '../../services/photoStorageService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('upload disk paths share one root (E-11)', () => {
  it('resolves a stored /uploads URL to an absolute path inside the uploads root', () => {
    const resolved = resolveLocalUploadPath('/uploads/profiles/1234-uuid.jpg');
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved.startsWith(UPLOADS_ROOT)).toBe(true);
    expect(resolved).toBe(path.join(UPLOADS_ROOT, 'profiles', '1234-uuid.jpg'));
  });

  it('accepts all three shapes the codebase stores', () => {
    const a = resolveLocalUploadPath('/uploads/banners/x.png');
    const b = resolveLocalUploadPath('uploads/banners/x.png');
    const c = resolveLocalUploadPath('banners/x.png');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('refuses path traversal out of the uploads root', () => {
    expect(() => resolveLocalUploadPath('/uploads/../../etc/passwd')).toThrow(/outside uploads root/);
    expect(() => resolveLocalUploadPath('../../.env')).toThrow(/outside uploads root/);
  });

  it('agrees with the express.static mount in core/middleware/index.mjs', () => {
    // The static mount resolves '../../uploads' from backend/core; the service
    // resolves '../../uploads' from backend/services. Both must be the same dir
    // or uploads are written somewhere the server cannot serve.
    const fromCore = path.resolve(path.join(__dirname, '../../core', '../../uploads'));
    expect(path.resolve(UPLOADS_ROOT)).toBe(fromCore);
    expect(UPLOADS_ROOT.endsWith('uploads')).toBe(true);
  });

  it('uses the /uploads URL prefix the static mount serves', () => {
    expect(DISK_URL_PREFIX).toBe('/uploads');
  });

  it('no longer derives any disk path from process.cwd()', () => {
    const source = readFileSync(join(__dirname, '../../services/photoStorageService.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toContain("process.cwd(), 'uploads'");
    expect(source).not.toContain('path.join(process.cwd()');
  });

  it('serve-photo proxies read from the same root', () => {
    const routes = readFileSync(join(__dirname, '../../core/routes.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(routes).toContain('resolveLocalUploadPath');
    // the cwd-based fallback must be gone from BOTH proxies
    expect(routes).not.toContain("path.join(process.cwd(), 'uploads'");
  });
});
