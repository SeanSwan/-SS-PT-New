import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readComponentSource = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/components/${path}`), 'utf8');

const COMPONENT_SOURCE = readComponentSource('BookingDrawer.tsx');
const STYLE_SOURCE = readComponentSource('BookingDrawer.styles.ts');
const CLIENT_STYLE_SOURCE = readComponentSource('BookingDrawer.client.styles.ts');
const THEME_SOURCE = readComponentSource('BookingDrawer.theme.ts');

describe('UniversalMasterSchedule BookingDrawer theme bridge', () => {
  it('keeps the quick-book drawer on extracted Crystalline Swan styles', () => {
    expect(COMPONENT_SOURCE).toContain('./BookingDrawer.styles');
    expect(THEME_SOURCE).toContain('BOOKING_DRAWER_THEME');
    expect(THEME_SOURCE).toContain('var(--accent-primary, #60C0F0)');

    const combinedRuntime = `${COMPONENT_SOURCE}\n${STYLE_SOURCE}\n${CLIENT_STYLE_SOURCE}`;
    expect(combinedRuntime).not.toContain('rgba(0, 32, 96');
    expect(combinedRuntime).not.toContain('rgba(255');
    expect(combinedRuntime).not.toContain('#0088FF');
    expect(combinedRuntime).not.toContain('#f0f0ff');
    expect(combinedRuntime).not.toContain('#8892b0');

    expect(COMPONENT_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(CLIENT_STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
