import { expect, test } from '@playwright/test';

const catalogPayload = {
  success: true,
  items: [
    {
      id: 10,
      name: '10-Session Pack',
      description: 'Ten one-hour personal training sessions.',
      packageType: 'fixed',
      sessions: 10,
      price: '1750.00',
      displayPrice: '1750.00',
      pricePerSession: '175.00',
      itemKind: 'training_package',
      fulfillmentType: 'none',
      isTaxable: false,
      variants: [],
    },
    {
      id: 42,
      name: 'Buddy Fat Skin Recovery Drink',
      description: 'Fresh ginger, lemon, honey, tea, and spices prepared for local recovery support.',
      packageType: 'custom',
      price: '17.00',
      displayPrice: '17.00',
      itemKind: 'physical_product',
      fulfillmentType: 'local_delivery',
      isTaxable: true,
      variants: [
        { id: 7, storefrontItemId: 42, label: 'Everyday 16oz Trial', price: '6.50', displayOrder: 1, isActive: true },
        { id: 8, storefrontItemId: 42, label: 'Organic 1.5L Day Bottle', price: '24.00', displayOrder: 2, isActive: true },
      ],
    },
  ],
};

const viewports = [
  { width: 390, height: 844, label: 'iPhone 12' },
  { width: 414, height: 896, label: 'iPhone XR' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 1440, height: 900, label: 'desktop' },
  { width: 2560, height: 1440, label: 'QHD' },
  { width: 3840, height: 2160, label: '4K' },
];

test.describe('storefront physical product responsive layout', () => {
  for (const viewport of viewports) {
    test(`product card is usable without overflow at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.route('**/api/storefront**', async (route) => route.fulfill({ json: catalogPayload }));

      await page.goto('/store');
      await expect(page.getByText('SwanStudios Recovery Products')).toBeVisible({ timeout: 30_000 });
      await page.getByText('Buddy Fat Skin Recovery Drink').scrollIntoViewIfNeeded();

      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth - document.body.clientWidth,
        root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));

      expect(overflow.body).toBeLessThanOrEqual(1);
      expect(overflow.root).toBeLessThanOrEqual(1);

      const variantTargets = await page.getByRole('radio').evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
      );

      expect(variantTargets.length).toBeGreaterThanOrEqual(2);
      for (const target of variantTargets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }

      await expect(page.getByText(/local delivery \/ pickup only/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login to add product/i })).toBeDisabled();
    });
  }
});
