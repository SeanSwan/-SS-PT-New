import { readFileSync } from 'fs';
import { resolve } from 'path';

const sourcePath = resolve(__dirname, 'MyClientsView.tsx');
const cardPath = resolve(__dirname, 'MyClientsView.clientCard.tsx');

describe('MyClientsView client card extraction', () => {
  it('moves the repeated trainer client card renderer out of the route shell', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(460);
    expect(source).not.toMatch(/<ClientCard/);
    expect(source).not.toMatch(/Workout Proof/);
    expect(source).toContain('TrainerClientCard');
  });

  it('keeps the extracted card file focused under the project line cap', () => {
    const card = readFileSync(cardPath, 'utf8');
    expect(card.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
