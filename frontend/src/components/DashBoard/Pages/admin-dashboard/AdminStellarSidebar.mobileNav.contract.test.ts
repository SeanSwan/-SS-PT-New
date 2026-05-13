import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');

describe('AdminStellarSidebar mobile navigation contract', () => {
  it('uses a current mobile drawer setter when nav items are selected', () => {
    expect(source).toContain('const setMobileOpen = useCallback');
    expect(source).toContain('if (onToggleMobile && val !== mobileOpen) onToggleMobile();');
    expect(source).toContain('}, [mobileOpen, onToggleMobile]);');
    expect(source).toContain('}, [navigate, isMobile, setMobileOpen]);');
  });
});
