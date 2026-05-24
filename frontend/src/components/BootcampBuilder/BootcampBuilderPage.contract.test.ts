import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('BootcampBuilderPage workflow contract', () => {
  const pageSource = read('./BootcampBuilderPage.tsx');
  const previewSource = read('./ClassPreviewPanel.tsx');

  it('sends every visible generation control to the bootcamp API', () => {
    const generateCall = pageSource.match(/api\.generateClass\(\{[\s\S]*?\}\);/)?.[0] ?? '';

    expect(generateCall).toContain('classFormat,');
    expect(generateCall).toContain('classStyle,');
    expect(generateCall).toContain('dayType,');
    expect(generateCall).toContain('intensityCategory,');
    expect(generateCall).toContain('equipmentProfileId: equipmentProfileId || undefined');
    expect(generateCall).toContain('optPhase,');
    expect(generateCall).toContain('includeStretch,');
  });

  it('keeps manual and hybrid additions honest about target station placement', () => {
    expect(pageSource).toContain('placedStationIdx');
    expect(pageSource).toContain('stationIndex: placedStationIdx');
    expect(pageSource).toContain('Station ${placedStationIdx + 1}');
  });

  it('offers the required three-board class preview flow', () => {
    expect(previewSource).toContain("type BoardView = 'main' | 'jointFriendly' | 'lowImpact';");
    expect(previewSource).toContain('Board 1');
    expect(previewSource).toContain('Main Intensity');
    expect(previewSource).toContain('Board 2');
    expect(previewSource).toContain('Joint-Friendly Alternatives');
    expect(previewSource).toContain('Board 3');
    expect(previewSource).toContain('Low-Impact Swaps');
  });
});
