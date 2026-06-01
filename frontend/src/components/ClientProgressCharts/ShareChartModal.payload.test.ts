import { describe, expect, it } from 'vitest';
import { buildShareChartPostPayload } from './ShareChartModal.payload';

describe('ShareChartModal payload', () => {
  it('shares chart screenshots as transformation progress proof with canonical hashtags', () => {
    const chartImage = new File(['chart'], 'volume.png', { type: 'image/png' });

    const payload = buildShareChartPostPayload({
      caption: 'Check out my Volume Over Time progress!',
      chartTitle: 'Volume Over Time',
      chartImage,
      visibility: 'friends',
    });

    expect(payload).toMatchObject({
      type: 'transformation',
      visibility: 'friends',
      media: chartImage,
    });
    expect(payload.content).toContain('#SwanProgress');
    expect(payload.content).toContain('#Transformation');
  });

  it('uses a progress caption fallback when the user clears the text', () => {
    const chartImage = new File(['chart'], 'one-rep-max.png', { type: 'image/png' });

    const payload = buildShareChartPostPayload({
      caption: '',
      chartTitle: 'One Rep Max',
      chartImage,
      visibility: 'private',
    });

    expect(payload.content).toContain('My One Rep Max progress');
    expect(payload.type).toBe('transformation');
    expect(payload.visibility).toBe('private');
  });
});
