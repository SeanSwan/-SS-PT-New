import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceFiles = [
  './UniversalDashboardLayout.tsx',
  './UniversalDashboardLayout.shell.tsx',
  './UniversalDashboardLayout.shellPieces.tsx',
  './UniversalDashboardLayout.routeComponents.tsx',
  './UniversalDashboardLayout.controls.ts',
  './UniversalDashboardLayout.routes.tsx',
  './UniversalDashboardLayout.styles.ts',
  './UniversalDashboardLayout.theme.ts',
];

const sourceByFile = Object.fromEntries(
  sourceFiles.map(file => [file, readFileSync(resolve(__dirname, file), 'utf8')])
);

const source = Object.values(sourceByFile).join('\n');

/**
 * The cast guards below are about CODE, not copy. Strip string/template literals
 * first so PROSE can't trip them: the /account-access route's description reads
 * "Log in as any client or trainer (audited)...", whose literal " as any" reddened
 * this suite even though the shell contains zero `as any` casts (2026-07-11).
 */
const stripLiterals = (src: string): string => {
  let result = '';
  let index = 0;
  while (index < src.length) {
    const quote = src[index];
    if (quote !== "'" && quote !== '"' && quote !== '`') {
      result += quote;
      index += 1;
      continue;
    }
    result += quote + quote;
    index += 1;
    while (index < src.length) {
      if (src[index] === '\\') {
        index += 2;
      } else if (quote === '`' && src[index] === '$' && src[index + 1] === '{') {
        const interpolationStart = index + 2;
        let depth = 1;
        index = interpolationStart;
        while (index < src.length && depth > 0) {
          if (src[index] === '{') depth += 1;
          else if (src[index] === '}') depth -= 1;
          index += 1;
        }
        result += src.slice(interpolationStart, index - 1);
      } else if (src[index] === quote) {
        index += 1;
        break;
      } else {
        index += 1;
      }
    }
  }
  return result;
};

const codeOnly = stripLiterals(source);

describe('UniversalDashboardLayout retry contract', () => {
  it('retries dashboard initialization without a hard page reload', () => {
    expect(source).not.toContain('window.location.reload()');
    expect(source).toContain('const [retryInitNonce, setRetryInitNonce]');
    expect(source).toContain('handleRetryInitialization');
    expect(source).toContain('setRetryInitNonce(prev => prev + 1)');
    expect(source).toContain('}, [user, userRole, dispatch, isValidRole, retryInitNonce]);');
  });

  it('keeps initialization diagnostics safe and form buttons explicit', () => {
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('console.warn');
    expect(source).toContain('reportDashboardDiagnostic(');
    expect(source).toContain("dashboardDiagnosticMeta(");
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain('role="alert" aria-live="assertive"');
    expect(source).toContain('<MobileBackBtn');
    expect(source).toContain('type="button"');
  });

  it('keeps the extracted route shell typed without any casts', () => {
    // codeOnly: literals stripped, so route/description copy can't false-positive.
    expect(codeOnly).not.toContain('React.ComponentType<any>');
    expect(codeOnly).not.toContain(' as any');
    expect(source).toContain('createUniversalDashboardTheme');
    expect(source).toContain('DefaultTheme');
    expect(source).toContain('component: React.ElementType;');
  });

  it('strips template copy but preserves interpolation code for cast scanning', () => {
    const template = '`visible copy ${value as any} and ${format(other)} end`';
    const stripped = stripLiterals(template);

    expect(stripped).not.toContain('visible copy');
    expect(stripped).toContain('value as any');
    expect(stripped).toContain('format(other)');
  });

  it('keeps extracted dashboard shell files under the section line cap', () => {
    Object.entries(sourceByFile).forEach(([file, fileSource]) => {
      const lineCount = fileSource.split(/\r?\n/).length;
      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps dashboard shell controls on the shared Lucide icon system', () => {
    expect(source).toContain("import { X } from 'lucide-react';");
    expect(source).toContain('<X size={20} aria-hidden="true" focusable="false" />');
    expect(source).not.toContain('<Mic size={20} aria-hidden="true" focusable="false" />');
    expect(source).not.toContain('<svg width="20" height="20"');
  });

  it('does not mount the retired global OmniTerminal assistant', () => {
    expect(source).not.toContain('<OmniTerminal');
    expect(source).not.toContain('<OmniTerminalFAB');
    expect(source).not.toContain('OmniTerminalFAB = styled.button');
    expect(source).not.toContain('omniTerminalOpen');
    expect(source).not.toContain('Open SwanStudios Assistant');
    expect(source).not.toContain("import('../Shared/OmniTerminal')");
  });

  it('keeps extracted dashboard shell styles tokenized and reduced-motion friendly', () => {
    expect(source).toContain('type="button"');
    expect(source).toContain('&:focus-visible');
    expect(source).not.toContain('style={{');
    expect(source).not.toContain('whileHover');
    expect(source).not.toContain('whileTap');
    expect(source).not.toContain('transition: all');
    expect(source).not.toContain('rgba(');
    expect(source).toContain('LoadingTitle');
    expect(source).toContain('ErrorActions');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('honors reduced motion for mounted dashboard frame and route transitions', () => {
    expect(source).toContain("import { AnimatePresence, useReducedMotion } from 'framer-motion';");
    expect(source).toContain('const prefersReducedMotion = Boolean(useReducedMotion());');
    expect(source).toContain('prefersReducedMotion={prefersReducedMotion}');
    expect(source).toContain('initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}');
    expect(source).toContain("transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}");
    expect(source).toContain('initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}');
    expect(source).toContain("transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}");
  });
});
