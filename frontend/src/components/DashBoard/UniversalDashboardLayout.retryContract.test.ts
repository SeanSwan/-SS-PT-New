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
    expect(source).not.toContain('React.ComponentType<any>');
    expect(source).not.toContain(' as any');
    expect(source).toContain('createUniversalDashboardTheme');
    expect(source).toContain('DefaultTheme');
    expect(source).toContain('component: React.ElementType;');
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