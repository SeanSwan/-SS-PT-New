import { readFileSync } from 'fs';
import { resolve } from 'path';

const sourcePath = resolve(__dirname, 'MyClientsView.tsx');
const sectionsPath = resolve(__dirname, 'MyClientsView.sections.tsx');

describe('MyClientsView section extraction', () => {
  it('moves the header, stats, and filter sections out of the route shell', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(650);
    expect(source).not.toMatch(/<HeaderSection>/);
    expect(source).not.toMatch(/<StatsRow/);
    expect(source).not.toMatch(/<FilterSection/);
    expect(source).toContain('TrainerClientsHeader');
    expect(source).toContain('TrainerClientsStats');
    expect(source).toContain('TrainerClientsFilters');
  });

  it('keeps the extracted section file focused under the project line cap', () => {
    const sections = readFileSync(sectionsPath, 'utf8');
    expect(sections.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
