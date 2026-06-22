import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'ClientHubGridCard.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'ClientHubGridCard.styles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('ClientHubGridCard style extraction', () => {
  it('keeps the active admin client card under the project line cap', () => {
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });


  it('keeps client-card internals responsive to card width instead of viewport width', () => {
    expect(stylesSource).toContain('container: clientcard / inline-size');
    expect(stylesSource).toContain('@container clientcard (min-width: 420px)');
    expect(stylesSource).toContain('@container clientcard (max-width: 300px)');
    expect(stylesSource).toContain('@container clientcard (max-width: 280px)');
    expect(stylesSource).toContain('font-size: clamp(17px, 3.4cqi, 21px)');
    expect(stylesSource).not.toContain('@media (max-width: 430px)');
    expect(stylesSource).not.toContain('@media (max-width: 360px)');
  });
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

  it('uses a stretchable trainer-style shell so admin cards keep equal grid height', () => {
    const shellBlock = stylesSource.slice(
      stylesSource.indexOf('export const CardShell'),
      stylesSource.indexOf('export const CardButton')
    );

    expect(shellBlock).toContain('display: flex');
    expect(shellBlock).toContain('flex-direction: column');
    expect(shellBlock).toContain('align-self: stretch');
    expect(shellBlock).toContain('height: 100%');
    expect(shellBlock).toContain('min-height: 0');
    expect(shellBlock).toContain('overflow: hidden');
    expect(shellBlock).not.toContain('height: max-content');
    expect(shellBlock).not.toContain('align-self: start');
  });

  it('caps volatile desktop text so one client cannot stretch the card taller than its row', () => {
    const nameBlock = stylesSource.slice(
      stylesSource.indexOf('export const Name'),
      stylesSource.indexOf('export const Pill')
    );
    const contactLineBlock = stylesSource.slice(
      stylesSource.indexOf('export const ContactLine'),
      stylesSource.indexOf('export const GoalLine')
    );

    expect(nameBlock).toContain('-webkit-line-clamp: 2');
    expect(nameBlock).toContain('overflow: hidden');
    expect(contactLineBlock).toContain('-webkit-line-clamp: 2');
    expect(contactLineBlock).toContain('-webkit-box-orient: vertical');
  });

  it('keeps contact identity and metric facts readable on phone-width cards', () => {
    const contactLineBlock = stylesSource.slice(
      stylesSource.indexOf('export const ContactLine'),
      stylesSource.indexOf('export const ContactLine') + 420
    );
    const metricBlock = stylesSource.slice(
      stylesSource.indexOf('export const Metric ='),
      stylesSource.indexOf('export const MetricStack')
    );

    expect(contactLineBlock).toContain('white-space: normal');
    expect(contactLineBlock).toContain('overflow-wrap: anywhere');
    expect(contactLineBlock).toContain('word-break: break-word');
    expect(contactLineBlock).not.toContain('white-space: nowrap');
    expect(contactLineBlock).not.toContain('text-overflow: ellipsis');
    expect(metricBlock).toContain('overflow-wrap: anywhere');
    expect(metricBlock).not.toContain('overflow: hidden');
  });
});
