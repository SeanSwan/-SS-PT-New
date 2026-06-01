import { readFileSync } from 'fs';
import { resolve } from 'path';

const sourcePath = resolve(__dirname, 'MyClientsView.tsx');
const clientCardPath = resolve(__dirname, 'MyClientsView.clientCard.tsx');
const layoutPath = resolve(__dirname, 'MyClientsView.layoutStyles.ts');
const cardPath = resolve(__dirname, 'MyClientsView.cardStyles.ts');

describe('MyClientsView style extraction', () => {
  it('moves local styled-components out of the live trainer clients route shell', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const clientCard = readFileSync(clientCardPath, 'utf8');
    const lineCount = source.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(850);
    expect(source).not.toMatch(/styled\./);
    expect(source).not.toMatch(/keyframes`/);
    expect(source).toContain("from './MyClientsView.layoutStyles'");
    expect(clientCard).toContain("from './MyClientsView.cardStyles'");
  });

  it('keeps extracted style files focused under the project line cap', () => {
    for (const path of [layoutPath, cardPath]) {
      const source = readFileSync(path, 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }
  });
});
