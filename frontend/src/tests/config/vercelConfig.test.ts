import { resolve } from 'path';
import { readFileSync } from 'fs';

describe('frontend public vercel config', () => {
  it('does not proxy API requests to the retired Render host', () => {
    const rawConfig = readFileSync(resolve(process.cwd(), 'public', 'vercel.json'), 'utf8');
    const config = JSON.parse(rawConfig) as {
      rewrites?: Array<{ source: string; destination: string }>;
    };

    const apiRewrite = config.rewrites?.find(
      (entry) => entry.source === '/api/(.*)',
    );

    expect(rawConfig).not.toContain('ss-pt-new.onrender.com');
    expect(apiRewrite?.destination).toBe('https://sswanstudios.com/api/$1');
  });
});
