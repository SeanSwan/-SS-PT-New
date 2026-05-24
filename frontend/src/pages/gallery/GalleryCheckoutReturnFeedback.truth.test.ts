import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');

describe('Gallery checkout return feedback contract', () => {
  it('surfaces credit and donation checkout return states on the active gallery page', () => {
    expect(pageSource).toContain('const [toastMessage, setToastMessage] = useState');
    expect(pageSource).toContain("params.get('credits')");
    expect(pageSource).toContain("params.get('donation')");
    expect(pageSource).toContain("showToast('Enhancement credits are ready. Select your photos when you are ready.')");
    expect(pageSource).toContain("showToast('Thank you for supporting SwanStudios.')");
    expect(pageSource).toContain("url.searchParams.delete('credits')");
    expect(pageSource).toContain("url.searchParams.delete('donation')");
    expect(pageSource).toContain("url.searchParams.delete('package')");
    expect(pageSource).toContain('{toastMessage}');
  });
});
