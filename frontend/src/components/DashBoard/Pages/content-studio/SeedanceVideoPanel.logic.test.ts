import { describe, expect, it } from 'vitest';
import {
  getSeedanceJobErrorMessage,
  resolveSeedanceJobResult,
} from './SeedanceVideoPanel.logic';

describe('SeedanceVideoPanel response mapping', () => {
  it('keeps provider queued responses out of the complete state', () => {
    expect(resolveSeedanceJobResult({
      status: 'queued',
      providerJobId: 'provider-job-123',
      videoUrl: null,
    })).toEqual({
      status: 'queued',
      providerJobId: 'provider-job-123',
      videoUrl: undefined,
    });
  });

  it('marks jobs complete only when a video URL is available', () => {
    expect(resolveSeedanceJobResult({
      status: 'completed',
      providerJobId: 'provider-job-123',
      videoUrl: 'https://cdn.swanstudios.test/generated/deadlift.mp4',
    })).toEqual({
      status: 'complete',
      providerJobId: 'provider-job-123',
      videoUrl: 'https://cdn.swanstudios.test/generated/deadlift.mp4',
    });
  });

  it('surfaces backend dependency messages instead of generic Axios text', () => {
    const error = {
      response: {
        data: {
          message: 'Seedance video generation is not configured yet. Set SEEDANCE_API_KEY and SEEDANCE_API_URL on Render.',
        },
      },
      message: 'Request failed with status code 424',
    };

    expect(getSeedanceJobErrorMessage(error)).toBe(
      'Seedance video generation is not configured yet. Set SEEDANCE_API_KEY and SEEDANCE_API_URL on Render.',
    );
  });
});
