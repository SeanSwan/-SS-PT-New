import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(__dirname, 'TeachMeToggle.tsx'), 'utf8');

describe('TeachMeToggle touch targets', () => {
  it('keeps every interactive control at the project 44px minimum', () => {
    expect(SOURCE).toMatch(/const ToggleBtn[\s\S]*min-height:\s*44px/);
    expect(SOURCE).toMatch(/const CloseBtn[\s\S]*width:\s*44px/);
    expect(SOURCE).toMatch(/const CloseBtn[\s\S]*height:\s*44px/);
    expect(SOURCE).toMatch(/const AskAIBtn[\s\S]*min-height:\s*44px/);
  });

  it('supports popover panels that do not add page height', () => {
    expect(SOURCE).toContain("panelMode?: 'inline' | 'popover'");
    expect(SOURCE).toMatch(/const Panel = styled\.div[\s\S]*position:\s*absolute/);
    expect(SOURCE).toMatch(/@media \(max-width: 560px\)[\s\S]*position:\s*fixed/);
  });
});
