import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readComponentSource = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/components/${path}`), 'utf8');

const COMPONENT_SOURCE = readComponentSource('ClientTimeline.tsx');
const STYLE_SOURCE = readComponentSource('ClientTimeline.styles.ts');
const THEME_SOURCE = readComponentSource('ClientTimeline.theme.ts');

describe('UniversalMasterSchedule ClientTimeline theme bridge', () => {
  it('keeps the client timeline on extracted Crystalline Swan styles', () => {
    expect(COMPONENT_SOURCE).toContain('./ClientTimeline.styles');
    expect(THEME_SOURCE).toContain('CLIENT_TIMELINE_THEME');
    expect(THEME_SOURCE).toContain('var(--accent-primary, #60C0F0)');

    const combinedRuntime = `${COMPONENT_SOURCE}\n${STYLE_SOURCE}`;
    expect(combinedRuntime).not.toContain('rgba(0, 32, 96');
    expect(combinedRuntime).not.toContain('#f0f0ff');
    expect(combinedRuntime).not.toContain('#8892b0');
    expect(combinedRuntime).not.toContain('#00' + 'FFFF');

    expect(COMPONENT_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
