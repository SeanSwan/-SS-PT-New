import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'ClientHubGridCard.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'ClientHubGridCard.styles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('ClientHubGridCard style extraction', () => {
  it('keeps local styled-components outside the active client card shell', () => {
    expect(componentSource).toContain("from './ClientHubGridCard.styles'");
    expect(componentSource).not.toContain('const CardShell = styled.');
    expect(componentSource).not.toContain('const CardButton = styled.');
    expect(stylesSource).toContain('export const CardShell');
    expect(stylesSource).toContain('export const Metric');
  });

  it('normalizes client source before passing visual tone into styled props', () => {
    expect(componentSource).toContain('getClientSourceTone');
    expect(componentSource).not.toContain('$source={client.clientSource}');
    expect(stylesSource).toContain("$source === 'mf'");
    expect(stylesSource).not.toContain("$source === 'move_fitness'");
  });

  it('lets compact metric notes wrap instead of clipping session policy text', () => {
    const metricNoteBlock = stylesSource.slice(
      stylesSource.indexOf('export const MetricNote'),
      stylesSource.indexOf('export const MetricNote') + 360
    );

    expect(metricNoteBlock).toContain('white-space: normal');
    expect(metricNoteBlock).toContain('overflow-wrap: anywhere');
    expect(metricNoteBlock).not.toContain('text-overflow: ellipsis');
  });
});
