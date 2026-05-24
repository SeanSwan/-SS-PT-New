import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminSettingsRoutes.mjs'), 'utf8');

describe('admin settings API key test truth contract', () => {
  it('does not claim external API connectivity from environment presence alone', () => {
    expect(routeSource).not.toContain('This would be a simple API call');
    expect(routeSource).not.toContain('Stripe API key is valid and responsive');
    expect(routeSource).not.toContain('SendGrid API key is configured');
    expect(routeSource).not.toContain('Twilio credentials are configured');
    expect(routeSource).toContain('connectivityVerified: false');
    expect(routeSource).toContain('configurationStatus');
  });

  it('does not claim service health from configuration presence alone', () => {
    expect(routeSource).not.toContain("overall: 'healthy'");
    expect(routeSource).not.toContain("responseTime: '< 50ms'");
    expect(routeSource).not.toContain('Service health check completed');
    expect(routeSource).toContain("overall: 'not_verified'");
    expect(routeSource).toContain("healthVerified: false");
  });

  it('does not expose raw settings route errors to admin clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
  });
});
