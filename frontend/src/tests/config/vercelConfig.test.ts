import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

describe('frontend public vercel config', () => {
  it('does not proxy API requests to the retired Render host when a Vercel config exists', () => {
    const configPath = resolve(process.cwd(), 'public', 'vercel.json');
    if (!existsSync(configPath)) {
      expect(existsSync(configPath)).toBe(false);
      return;
    }

    const rawConfig = readFileSync(configPath, 'utf8');
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
