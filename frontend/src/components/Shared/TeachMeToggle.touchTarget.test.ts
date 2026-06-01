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
});
