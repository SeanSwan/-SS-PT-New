import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery donation checkout minimum contract', () => {
  it('applies the Stripe checkout minimum to both card and Venmo donation sessions', () => {
    expect(routeSource).toContain("if ((method === 'stripe' || method === 'venmo') && donationAmount < 0.50)");
    expect(routeSource).not.toContain("if (method === 'stripe' && donationAmount < 0.50)");
  });
});
