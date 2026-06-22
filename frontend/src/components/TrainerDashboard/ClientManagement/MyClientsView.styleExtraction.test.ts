import { readFileSync } from 'fs';
import { resolve } from 'path';

const sourcePath = resolve(__dirname, 'MyClientsView.tsx');
const clientCardPath = resolve(__dirname, 'MyClientsView.clientCard.tsx');
const layoutPath = resolve(__dirname, 'MyClientsView.layoutStyles.ts');
const cardPath = resolve(__dirname, 'MyClientsView.cardStyles.ts');
const readinessPath = resolve(__dirname, 'MyClientsView.readinessStyles.ts');
const actionRailPath = resolve(__dirname, 'MyClientsView.clientCardActions.tsx');

describe('MyClientsView style extraction', () => {
  it('moves local styled-components out of the live trainer clients route shell', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const clientCard = readFileSync(clientCardPath, 'utf8');
    const lineCount = source.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(850);
    expect(source).not.toMatch(/styled\./);
    expect(source).not.toMatch(/keyframes`/);
    expect(source).not.toContain('style={{');
    expect(source).toContain("from './MyClientsView.layoutStyles'");
    expect(clientCard).not.toContain("from './MyClientsView.cardStyles'");
    expect(clientCard).toContain("from '../../DashBoard/workspaces/clients-team/ClientHubGridCard'");
  });

  it('keeps the old trainer action rail orphaned from the live admin-card adapter', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const clientCard = readFileSync(clientCardPath, 'utf8');
    const actionRail = readFileSync(actionRailPath, 'utf8');

    expect(actionRail).toContain('TrainerClientActionRail');
    expect(source).not.toContain('TrainerClientActionRail');
    expect(source).not.toContain('MyClientsView.clientCardActions');
    expect(clientCard).not.toContain('TrainerClientActionRail');
    expect(clientCard).not.toContain('MyClientsView.clientCardActions');
    expect(clientCard).toContain('ClientHubGridCard');
  });

  it('keeps extracted style files focused under the project line cap', () => {
    for (const path of [layoutPath, cardPath, readinessPath]) {
      const source = readFileSync(path, 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }
  });

  it('keeps trainer readiness facts in a wrapping mobile grid', () => {
    const source = readFileSync(readinessPath, 'utf8');

    expect(source).toContain('repeat(auto-fit, minmax(148px, 1fr))');
    expect(source).toContain('@media (max-width: 520px)');
    expect(source).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(source).toContain('overflow-wrap: anywhere');
  });

  it('keeps trainer card identity compact and filter controls wrapping on mobile', () => {
    const cardSource = readFileSync(cardPath, 'utf8');
    const clientCardSource = readFileSync(clientCardPath, 'utf8');
    const layoutSource = readFileSync(layoutPath, 'utf8');
    const emailBlock = cardSource.slice(
      cardSource.indexOf("[data-swan-trainer-email='true']"),
      cardSource.indexOf("[data-swan-trainer-email='true']") + 520
    );

    expect(emailBlock).toContain('white-space: nowrap');
    expect(emailBlock).toContain('overflow: hidden');
    expect(emailBlock).toContain('mask-image');
    expect(emailBlock).not.toContain('text-overflow: ellipsis');
    expect(clientCardSource).toContain('ClientHubGridCard');
    expect(clientCardSource).toContain('onQuickAction={handleQuickAction}');
    expect(cardSource).not.toContain('text-overflow: ellipsis');
    expect(layoutSource).toContain('overflow-wrap: anywhere');
    expect(layoutSource).not.toContain('white-space: nowrap');
  });

  it('renders the skeleton loading state with no inline route styles', () => {
    const source = readFileSync(sourcePath, 'utf8');

    // Updated 2026-06-20 (GLM 5.2 Finding 4): loading state is now a structured shimmer
    // skeleton grid (SkeletonCard); the old <LoadingContainer> typography block was removed
    // (dead export, was orphaned when the spinner path was replaced). This guards the live
    // skeleton render + the no-inline-route-styles intent.
    expect(source).toContain('<SkeletonCard');
    expect(source).toContain('aria-busy="true"');
    expect(source).not.toContain('<h3 style=');
    expect(source).not.toContain('<p style=');
    expect(source).not.toContain("rgba(255, 255, 255, 0.7)', margin: 0");
  });

  it('locks the GLM-refactor WCAG / motion / contrast fixes against silent revert', () => {
    const layout = readFileSync(layoutPath, 'utf8');
    const route = readFileSync(sourcePath, 'utf8');
    const sectionsSrc = readFileSync(resolve(__dirname, 'MyClientsView.sections.tsx'), 'utf8');

    // WCAG contrast fix: active status filter uses the deep purple-sapphire mix (white/frost passes),
    // not the old light #8B5CF6 fill that failed 4.5:1.
    expect(layout).toContain('var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060)');
    // Windows High Contrast (forced-colors) fallback for the gradient-clipped H1.
    expect(layout).toContain('@media (forced-colors: active)');
    expect(layout).toContain('CanvasText');
    // CSS reduced-motion gates present (FilterButton / StatCard hovers).
    expect(layout).toContain('@media (prefers-reduced-motion: reduce)');
    // framer-motion reduced-motion gating + Copilot focus restoration code present.
    expect(route).toContain('useReducedMotion');
    expect(route).toContain('copilotTriggerRef');
    expect(route).toContain('requestAnimationFrame');
    expect(sectionsSrc).toContain('useReducedMotion');
  });
});
