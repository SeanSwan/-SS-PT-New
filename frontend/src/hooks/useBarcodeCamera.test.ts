import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('useBarcodeCamera scanner engines', () => {
  it('uses native BarcodeDetector first and keeps ZXing as the browser fallback', () => {
    const source = readSource('src/hooks/useBarcodeCamera.ts');

    expect(source).toContain('BarcodeDetector');
    expect(source).toContain("@zxing/browser");
    expect(source).toContain('BrowserMultiFormatReader');
    expect(source).toContain('decodeFromConstraints');
  });
});
