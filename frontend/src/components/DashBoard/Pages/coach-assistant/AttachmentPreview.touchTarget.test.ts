import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './AttachmentPreview.tsx'), 'utf8');

describe('AttachmentPreview touch target contract', () => {
  it('keeps attachment remove buttons at the app minimum touch target size', () => {
    expect(source).toMatch(/const RemoveBtn = styled\.button`[\s\S]*width: 44px;/);
    expect(source).toMatch(/const RemoveBtn = styled\.button`[\s\S]*height: 44px;/);
  });
});
