/**
 * SWA-104 — the policy must actually SHIP, and must not silently drift.
 * =====================================================================
 * The whole point of this slice is that a security policy written in config
 * never reached visitors. A test that only asserted "the string contains
 * object-src 'none'" would repeat that mistake at a smaller scale, so these
 * checks are anchored to the three delivery facts that can each break alone:
 *
 *   1. the policy itself is well-formed and keeps its load-bearing directives
 *   2. the meta path is BUILD-ONLY (a dev document carrying
 *      upgrade-insecure-requests breaks the http://localhost API proxy)
 *   3. render.yaml's header value and the bundled value cannot diverge
 *
 * Path resolution copies the cwd-candidates pattern from
 * adapters/style-lens-swan/worlds/fontLoading.test.ts because vitest's cwd
 * differs depending on how the suite is invoked.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FRAME_ANCESTORS_DIRECTIVE,
  injectCspMeta,
  PRODUCTION_CSP,
  PRODUCTION_CSP_DIRECTIVES,
  PRODUCTION_CSP_HEADER,
} from './contentSecurityPolicy';

const findFile = (candidates: string[], label: string): string => {
  const found = candidates.map((p) => resolve(process.cwd(), p)).find(existsSync);
  if (!found) {
    throw new Error(
      `CSP guard cannot locate ${label} from cwd ${process.cwd()} — update the ` +
        `candidate list (do NOT delete this check).`,
    );
  }
  return found;
};

const readFrom = (candidates: string[], label: string) =>
  readFileSync(findFile(candidates, label), 'utf8');

const indexHtml = readFrom(
  ['index.html', '../index.html', 'frontend/index.html'],
  'index.html',
);
const viteConfig = readFrom(
  ['vite.config.ts', '../vite.config.ts', 'frontend/vite.config.ts'],
  'vite.config.ts',
);
const renderYaml = readFrom(
  ['../render.yaml', 'render.yaml', '../../render.yaml'],
  'render.yaml',
);

describe('production CSP — policy shape', () => {
  it('keeps the directives that carry the policy', () => {
    // These four stop real attack classes and cannot break a resource load,
    // so they are the ones that must never be quietly relaxed.
    expect(PRODUCTION_CSP_DIRECTIVES).toContain("object-src 'none'");
    expect(PRODUCTION_CSP_DIRECTIVES).toContain("base-uri 'self'");
    expect(PRODUCTION_CSP_DIRECTIVES).toContain("form-action 'self'");
    expect(PRODUCTION_CSP_DIRECTIVES).toContain('upgrade-insecure-requests');
  });

  it("does not grant 'unsafe-eval' (no bundle needs it)", () => {
    // Verified against the production build: zero `new Function(` across all
    // 446 emitted chunks. WebAssembly still needs the narrower grant.
    expect(PRODUCTION_CSP).not.toContain("'unsafe-eval'");
    expect(PRODUCTION_CSP).toContain("'wasm-unsafe-eval'");
  });

  it('omits frame-ancestors from the meta policy but keeps it in the header', () => {
    // Browsers IGNORE frame-ancestors in a <meta> tag and log a console warning.
    // Shipping it there would look like clickjacking protection while providing
    // none — the exact failure mode this ticket exists to fix.
    expect(PRODUCTION_CSP).not.toContain('frame-ancestors');
    expect(PRODUCTION_CSP_HEADER).toContain(FRAME_ANCESTORS_DIRECTIVE);
  });

  it('is a single line with no stray separators', () => {
    expect(PRODUCTION_CSP).not.toMatch(/[\r\n]/);
    expect(PRODUCTION_CSP).not.toMatch(/;\s*;/);
    expect(PRODUCTION_CSP.trim()).toBe(PRODUCTION_CSP);
    expect(PRODUCTION_CSP.endsWith(';')).toBe(false);
    // A stray double quote would silently truncate the meta content attribute.
    expect(PRODUCTION_CSP).not.toContain('"');
  });
});

describe('production CSP — delivery', () => {
  it('is wired into a BUILD-ONLY vite plugin', () => {
    expect(viteConfig).toContain('injectCspMeta');
    // apply: 'build' is what keeps upgrade-insecure-requests out of `npm run dev`,
    // where it would rewrite the http://localhost:10000 API proxy to https://.
    expect(viteConfig).toMatch(/apply:\s*'build'/);
    expect(viteConfig).toContain('swan-production-csp-meta');
  });

  it('injects the policy immediately after <meta charset>', () => {
    const out = injectCspMeta(indexHtml);
    const charsetEnd = out.indexOf('>', out.search(/<meta\s+charset=/i)) + 1;
    const cspStart = out.indexOf('<meta http-equiv="Content-Security-Policy"');

    expect(cspStart).toBeGreaterThan(charsetEnd);
    // Nothing but whitespace may sit between them — anything that fetches a
    // resource in that gap would escape the policy.
    expect(out.slice(charsetEnd, cspStart).trim()).toBe('');
    expect(out).toContain(`content="${PRODUCTION_CSP}"`);
  });

  it('keeps <meta charset> inside the browser 1024-byte encoding window', () => {
    // The reason the policy is anchored AFTER charset instead of head-prepend:
    // prepending ~900 bytes left charset with ~310 bytes of headroom, and the
    // next directive added would have pushed it out silently.
    const out = injectCspMeta(indexHtml);
    const charsetEnd = out.indexOf('>', out.search(/<meta\s+charset=/i)) + 1;
    expect(Buffer.byteLength(out.slice(0, charsetEnd), 'utf8')).toBeLessThanOrEqual(1024);
  });

  it('fails the build loudly when the charset anchor is gone', () => {
    // A silent no-op would reproduce this exact ticket: a policy that exists in
    // the source tree and reaches no visitor.
    expect(() => injectCspMeta('<!doctype html><html><head></head></html>')).toThrow(
      /no <meta charset> anchor/i,
    );
  });

  it('is NOT hardcoded into index.html (dev must stay policy-free)', () => {
    expect(indexHtml).not.toMatch(/http-equiv=["']Content-Security-Policy["']/i);
  });

  it('ships Referrer-Policy via the one meta form browsers honour', () => {
    // <meta name="referrer"> is respected; <meta http-equiv="Referrer-Policy"> is not.
    expect(indexHtml).toMatch(
      /<meta\s+name=["']referrer["']\s+content=["']strict-origin-when-cross-origin["']/i,
    );
  });

  it('does not publish the site’s security gaps in shipped HTML', () => {
    // index.html comments are served to every visitor. An earlier draft of this
    // slice explained the missing controls inline and would have told an attacker
    // exactly which protections were absent.
    for (const term of ['frame-ancestors', 'X-Frame-Options', 'Strict-Transport-Security']) {
      expect(indexHtml).not.toContain(term);
    }
  });

  it('keeps render.yaml byte-identical to the bundled header policy', () => {
    const match = renderYaml.match(
      /name:\s*Content-Security-Policy\s*\n\s*value:\s*"([^"]+)"/,
    );
    expect(
      match,
      'render.yaml has no enforcing Content-Security-Policy header entry',
    ).not.toBeNull();
    expect(match?.[1]).toBe(PRODUCTION_CSP_HEADER);
  });

  it('no longer ships the report-only policy that would have broken production', () => {
    // The superseded value had no jsdelivr (MediaPipe wasm / world atlas), no
    // unpkg (ffmpeg core) and no 'wasm-unsafe-eval'.
    expect(renderYaml).not.toContain('Content-Security-Policy-Report-Only');
  });
});
