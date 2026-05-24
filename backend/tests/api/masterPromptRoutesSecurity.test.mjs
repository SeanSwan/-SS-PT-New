import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/masterPrompt/index.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('master prompt route security guard', () => {
  it('keeps the mounted master-prompt subtree behind auth before child routes mount', () => {
    expect(coreRoutesSource).toContain("app.use('/api/master-prompt', masterPromptRoutes)");
    expect(routeSource).toContain("import { protect } from '../../middleware/authMiddleware.mjs';");

    const protectIndex = routeSource.indexOf('router.use(protect);');
    expect(protectIndex).toBeGreaterThan(-1);
    expect(protectIndex).toBeLessThan(routeSource.indexOf("router.use('/ethical-ai'"));
    expect(protectIndex).toBeLessThan(routeSource.indexOf("router.get('/status'"));
    expect(protectIndex).toBeLessThan(routeSource.indexOf("router.get('/features'"));
    expect(protectIndex).toBeLessThan(routeSource.indexOf("router.get('/compliance'"));
  });

  it('does not echo raw Master Prompt runtime errors to clients', () => {
    const responseBlocks = [...routeSource.matchAll(/res\.status\(500\)\.json\(\{[\s\S]*?\n\s*\}\);/g)]
      .map((match) => match[0]);

    expect(responseBlocks.length).toBeGreaterThan(0);
    for (const block of responseBlocks) {
      expect(block).not.toContain('error: error.message');
      expect(block).not.toContain('message: error.message');
    }
    expect(routeSource).toContain("error: 'internal_error'");
  });
});
