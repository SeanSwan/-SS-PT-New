/**
 * SwanMark3D contract tests.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every guard for this slice was originally built as a script under
 * `docs/ai-workflow/AI-HANDOFF/swan-logo-3d-2026-09-18/evidence/harness/`. Those
 * scripts are excellent evidence and they run nothing automatically. A refactor of
 * `Logo.tsx`, a re-run of the extractor, or a careless edit to the sizing policy
 * would have broken the mark silently.
 *
 * These are the same invariants, in the suite that actually runs. The pixel-level
 * checks (fidelity, geometry offset, fallback rendering) stay in the harness because
 * they need a real browser; what lives here is everything that can be decided from
 * source and from the payload.
 *
 * The payload half now lives in `swanMarkPayload.contract.test.ts` - see the header
 * there for why. Both files are listed in the Rule 4 check below, so neither can
 * grow past the cap unnoticed, which the single-file version could.
 */
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { computeBacking } from './sceneSupport';

const HERE = __dirname;
const read = (p: string) => readFileSync(resolve(HERE, p), 'utf-8');
const lines = (p: string) => read(p).split('\n').length;

/**
 * Strip block and line comments.
 *
 * Needed because `Logo.tsx` legitimately mentions `<img>` in its prose ("a drop-in
 * replacement for the <img>"), and a naive source-text assertion on `<img` flags the
 * comment instead of the code. First run of this file failed for exactly that reason.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const sceneSource = read('./swanMarkScene.ts');
const componentSource = read('./SwanMark3D.tsx');
const barrelSource = read('./index.ts');
const logoSource = read('../Header/components/Logo.tsx');

describe('sizing policy', () => {
  it('supersamples 2x by default and has no minimum floor', () => {
    // Both defaults are the result of in-browser measurement, and both were
    // surprising: 4x was chosen first from a Python model and was WORSE. If someone
    // "tidies" these back to a rounder number, the mark gets softer at small sizes.
    expect(sceneSource).toMatch(/supersample\s*=\s*2\b/);
    expect(sceneSource).toMatch(/minBacking\s*=\s*1\b/);
    expect(sceneSource).toMatch(/maxBacking\s*=\s*1024\b/);
    expect(sceneSource).toMatch(/maxPixelRatio\s*=\s*2\b/);
  });

  it('scales the backing store with css size and clamps it', () => {
    expect(computeBacking(28, 1, 2, 1, 1024)).toBe(56);
    expect(computeBacking(36, 2, 2, 1, 1024)).toBe(144);
    // clamped at the top
    expect(computeBacking(4096, 1, 2, 1, 1024)).toBe(1024);
    // a floor of 1 is not a floor at all - this is deliberate
    expect(computeBacking(16, 1, 2, 1, 1024)).toBe(32);
  });

  it('a minimum floor would force a downscale, which is why there is not one', () => {
    // Demonstrates the trap the measurement caught: with minBacking=128 a 16px mark
    // renders at 128 and is then downscaled 8x, which measured WORSE than native.
    expect(computeBacking(16, 1, 2, 128, 1024)).toBe(128);
    expect(computeBacking(16, 1, 2, 1, 1024)).toBeLessThan(128);
  });

  it('is re-exported from swanMarkScene so the barrel keeps one import site', () => {
    expect(sceneSource).toContain("export { computeBacking } from './sceneSupport'");
    expect(barrelSource).toContain('computeBacking');
  });
});

describe('header integration', () => {
  it('mounts the object, not the flat PNG, in the logo slot', () => {
    expect(logoSource).toContain('SwanMark3D');
    expect(logoSource).toContain('className="logo-mark"');
    // Comments in this file legitimately discuss the <img> it replaced, so the
    // assertion runs against the code with comments removed.
    expect(stripComments(logoSource)).not.toMatch(/<img[\s/>]/);
  });

  it('labels the mark exactly once', () => {
    // LogoContainer already carries role="button" + aria-label="Go to homepage".
    // A second label on the canvas would be announced twice.
    expect(logoSource).toContain('decorative');
    expect(logoSource).toContain('aria-label="Go to homepage"');
  });

  it('keeps the whole size ladder attached to the new host', () => {
    // The ladder used to select on `img`. If a breakpoint is left behind, the mark
    // silently stops resizing at that width - which is exactly the kind of thing
    // that only shows up on one device.
    const ladder = logoSource.match(/\.logo-mark\s*\{/g) ?? [];
    expect(ladder.length).toBe(8);
    for (const px of ['36px', '32px', '28px', '44px', '52px']) {
      expect(logoSource).toContain(px);
    }
  });

  it('still neutralises the float animation under reduced motion', () => {
    expect(logoSource).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

describe('progressive enhancement contract', () => {
  it('routes a drift change to the scene instead of dropping it', () => {
    // `drift` is a documented prop, but the scene is built exactly once (see the
    // mount-once effect). Before this was wired, changing `drift` at runtime did
    // nothing at all: the value was read at construction and then ignored forever.
    //
    // LIMIT OF THIS GUARD: there is no DOM in this suite, so this pins the SHAPE
    // of the wiring - an effect that calls setDrift and lists `drift` in its
    // dependency array - not the runtime behaviour. It catches deletion and
    // dep-list rot, which is how this broke. It cannot catch a wrong value.
    const effect = componentSource.match(
      /useEffect\(\(\) => \{[^}]*setDrift[^}]*\},\s*\[([^\]]*)\]\s*\)/s,
    );
    expect(effect, 'no effect calls scene.setDrift').not.toBeNull();
    expect(effect![1].replace(/\s+/g, '')).toContain('drift');
  });

  it('dynamically imports three and the spec, so neither is in the header entry', () => {
    // Proven against a real production build: the entry chunk contains
    // `import("./swan-mark.mesh.*.js")`, and index.html preloads no three chunk.
    expect(componentSource).toMatch(/import\('\.\/swanMarkScene'\)/);
    expect(componentSource).toMatch(/import\('\.\.\/\.\.\/three\/swanMark\/swan-mark\.mesh\.json'\)/);
    expect(componentSource).not.toMatch(/^import \* as THREE/m);
  });

  it('keeps a PNG fallback for the no-WebGL and reduced-motion paths', () => {
    expect(componentSource).toContain('fallbackSrc');
    // Comments in this module legitimately discuss the brand asset, so the
    // assertions run against the code with comments removed.
    const code = stripComments(componentSource);
    expect(code).toMatch(/assets\/Logo\.mark128\.png/);
    // It must NOT be the 1.2 MB brand asset: that is shared by ~30 other
    // components, and pointing the 28-52px fallback at it made every page
    // download 1.15 MiB. See the right-sizing test below.
    expect(code).not.toMatch(/assets\/Logo\.png/);
  });

  it('ships a fallback asset right-sized for a 28-52px mark', () => {
    // The ladder tops out at 52 CSS px (Logo.tsx, min-width: 3840px). At the
    // component's own maxPixelRatio of 2 that is 104 device px, so the asset has
    // to be at least that or the browser upscales it and the fallback goes soft.
    // It also has to stay small: this file is on the critical path of every page.
    const m = stripComments(componentSource).match(
      /import\s+\w+\s+from\s+'([^']*assets\/Logo\.mark128\.png)'/,
    );
    expect(m, 'no right-sized fallback import found').not.toBeNull();

    const assetPath = resolve(HERE, m![1]);
    const bytes = statSync(assetPath).size;
    expect(bytes, `${bytes} B is too heavy for a 36px mark`).toBeLessThan(64 * 1024);

    // Dimensions straight out of the PNG IHDR, so a wrongly-resized re-run of
    // make_fallback_mark.py fails here rather than in production.
    const buf = readFileSync(assetPath);
    expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    expect(w).toBe(h);
    expect(w, 'too small: 52px at dpr 2 needs 104 device px').toBeGreaterThanOrEqual(104);
    expect(w).toBeLessThanOrEqual(256);
  });

  it('probes for WebGL before handing three a canvas', () => {
    // Without the probe three logs a console error for every user without WebGL.
    // See evidence/red_me1_webgl_probe.py for the RED proof.
    expect(sceneSource).toContain('hasWebGL');
    expect(sceneSource).toMatch(/if\s*\(!hasWebGL\(\)\)\s*\{/);
    expect(sceneSource).toContain("throw new Error('SwanMarkScene: WebGL is unavailable')");
  });
});

describe('house rules', () => {
  it('keeps every module under rule 4s 300-line cap', () => {
    // This list used to omit the two test files, so this guard could not see its
    // OWN file growing past the cap - which it did, at 339 lines, once the round-3
    // shading tests landed. A guard that exempts itself is not a guard. Both test
    // files are listed now.
    const modules: [string, number][] = [
      ['./swanMarkScene.ts', lines('./swanMarkScene.ts')],
      ['./swanMarkReveal.ts', lines('./swanMarkReveal.ts')],
      ['./swanMarkPresentation.ts', lines('./swanMarkPresentation.ts')],
      ['./swanMarkLoop.ts', lines('./swanMarkLoop.ts')],
      ['./swanMarkReveal.test.ts', lines('./swanMarkReveal.test.ts')],
      ['./SwanMark3D.tsx', lines('./SwanMark3D.tsx')],
      ['./sceneSupport.ts', lines('./sceneSupport.ts')],
      ['./index.ts', lines('./index.ts')],
      ['./SwanMark3D.contract.test.ts', lines('./SwanMark3D.contract.test.ts')],
      ['./swanMarkPayload.contract.test.ts', lines('./swanMarkPayload.contract.test.ts')],
      ['../../three/swanMark/swanMarkFactory.ts', lines('../../three/swanMark/swanMarkFactory.ts')],
      ['../../three/swanMark/swanMarkSpec.ts', lines('../../three/swanMark/swanMarkSpec.ts')],
      ['../../three/swanMark/badgeField.ts', lines('../../three/swanMark/badgeField.ts')],
    ];
    for (const [name, n] of modules) {
      expect(n, `${name} is ${n} lines`).toBeLessThanOrEqual(300);
    }

    // And the list has to actually COVER this guard's own files, or the exemption
    // that let a 339-line test file pass simply comes back.
    const listed = modules.map(([name]) => name);
    expect(listed).toContain('./SwanMark3D.contract.test.ts');
    expect(listed).toContain('./swanMarkPayload.contract.test.ts');
    // The reveal sampler is the newest member of this surface. If it is dropped
    // from the list, the one module A8 adds is the one module the cap cannot see.
    expect(listed).toContain('./swanMarkReveal.ts');
    expect(listed).toContain('./swanMarkPresentation.ts');
    expect(listed).toContain('./swanMarkLoop.ts');
    expect(listed).toContain('./swanMarkReveal.test.ts');
  });

  it('uses no retired Galaxy-Swan tokens in the new modules', () => {
    const banned = ['#0a0a1a', '#00FFFF', '#7851A9'];
    for (const src of [sceneSource, componentSource, barrelSource]) {
      for (const hex of banned) {
        expect(src.toLowerCase()).not.toContain(hex.toLowerCase());
      }
    }
  });
});
