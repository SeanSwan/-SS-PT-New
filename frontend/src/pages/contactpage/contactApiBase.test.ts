/**
 * Contact form API base contract.
 * The public contact forms must post same-origin in production, staging, and
 * preview hosts; only local dev should target the local backend port.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveContactApiBase } from './contactApiBase';

const readContactSource = (fileName: string) =>
  readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8');

describe('contact API base', () => {
  it('uses localhost backend only for local development hosts', () => {
    expect(resolveContactApiBase('localhost')).toBe('http://localhost:5000');
    expect(resolveContactApiBase('127.0.0.1')).toBe('http://localhost:5000');
    expect(resolveContactApiBase('sswanstudios.com')).toBe('');
    expect(resolveContactApiBase('swan-preview.onrender.com')).toBe('');
  });

  it('keeps all contact page variants on the shared same-origin base', () => {
    for (const fileName of ['ContactV2.tsx', 'ContactV3.tsx', 'EnhancedContactPage.tsx']) {
      const source = readContactSource(fileName);
      expect(source).toContain('resolveContactApiBase(window.location.hostname)');
      expect(source).not.toContain("origin.includes('sswanstudios.com')");
    }
  });

  it('passes acquisition attribution through every contact form variant', () => {
    for (const fileName of ['ContactV2.tsx', 'ContactV3.tsx', 'EnhancedContactPage.tsx']) {
      const source = readContactSource(fileName);
      expect(source).toContain('readAcquisitionParams');
      expect(source).toContain('...readAcquisitionParams()');
    }
  });
});
