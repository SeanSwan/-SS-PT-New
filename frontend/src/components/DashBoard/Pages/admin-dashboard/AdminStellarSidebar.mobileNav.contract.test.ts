import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');
const sidebarStyleFiles = [
  resolve(__dirname, './AdminStellarSidebar.styles.ts'),
  resolve(__dirname, '../client-dashboard/ClientStellarSidebar.styles.ts'),
  resolve(__dirname, '../trainer-dashboard/TrainerStellarSidebar.styles.ts'),
];

describe('AdminStellarSidebar mobile navigation contract', () => {
  it('uses a current mobile drawer setter when nav items are selected', () => {
    expect(source).toContain('const setMobileOpen = useCallback');
    expect(source).toContain('if (onToggleMobile && val !== mobileOpen) onToggleMobile();');
    expect(source).toContain('}, [mobileOpen, onToggleMobile]);');
    expect(source).toContain('}, [navigate, isMobile, setMobileOpen]);');
  });

  it('keeps the active admin sidebar source within the project line cap', () => {
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps closed mobile dashboard sidebars out of the hit-test layer', () => {
    sidebarStyleFiles.forEach((styleFile) => {
      const styles = readFileSync(styleFile, 'utf8');

      expect(styles).toContain("pointer-events: ${({ $mobileOpen }) => ($mobileOpen ? 'auto' : 'none')};");
      expect(styles).toContain("visibility: ${({ $mobileOpen }) => ($mobileOpen ? 'visible' : 'hidden')};");
    });
  });
});
