import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const explainRoutes = (await import('../../routes/foodScannerExplainRoutes.mjs')).default;

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/food-scanner', explainRoutes);
  return app;
};

const sampleProduct = {
  id: 77,
  barcode: '123456789012',
  name: 'Chocolate Protein Bar',
  brand: 'Swan Test Foods',
  dataSource: 'Open Food Facts',
  ingredientsList: 'dates, whey protein, cocoa, soy lecithin',
  ingredients: [{
    name: 'Soy lecithin',
    healthRating: 'okay',
    isGMO: true,
    isProcessed: true,
    iarcGroup: null,
    isEUBanned: false,
    healthConcerns: ['Label disclosure may matter for sourcing preference'],
  }],
  nutritionalInfo: {
    sugars_100g: 18,
    sodium_100g: 0.9,
    'saturated-fat_100g': 6,
  },
  overallRating: 'okay',
  isOrganic: false,
  isNonGMO: false,
  healthConcerns: ['Contains processed ingredient signals'],
};

describe('food scanner explain routes', () => {
  it('returns source-aware product explanations with categorized claims', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/explain-product')
      .send({ product: sampleProduct });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.explanation.sourceConfidence).toMatchObject({
      provider: 'Open Food Facts',
      confidence: 'community',
    });
    expect(response.body.explanation.flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'preference', label: expect.stringContaining('bioengineered/GMO disclosure preference') }),
      expect.objectContaining({ category: 'processing', label: expect.stringContaining('processed ingredient signal') }),
      expect.objectContaining({ category: 'nutrition threshold', label: expect.stringContaining('Sugar value') }),
    ]));
    expect(JSON.stringify(response.body)).not.toMatch(/GMO is unhealthy/i);
    expect(JSON.stringify(response.body)).toContain('Not medical advice');
  });

  it('returns ingredient explanations without raw server errors', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/explain-ingredient')
      .send({ product: sampleProduct, ingredient: sampleProduct.ingredients[0] });

    expect(response.status).toBe(200);
    expect(response.body.explanation.ingredientName).toBe('Soy lecithin');
    expect(response.body.explanation.sections.map((section) => section.title)).toContain('What this ingredient is');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|sequelize|postgres/i);
  });

  it('creates a draft-only video brief with guardrails and claim categories', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/video-brief')
      .send({ product: sampleProduct });

    expect(response.status).toBe(200);
    expect(response.body.videoBrief.status).toBe('draft_not_published');
    expect(response.body.videoBrief.scenes).toHaveLength(4);
    expect(response.body.videoBrief.guardrails).toEqual(expect.arrayContaining([
      expect.stringContaining('nothing is published automatically'),
    ]));
    expect(response.body.videoBrief.claims[0]).toEqual(expect.objectContaining({ category: expect.any(String) }));
  });

  it('is mounted before the legacy scanner router in core routes', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(process.cwd(), 'core/routes.mjs'), 'utf8');

    expect(source).toContain("import foodScannerExplainRoutes from '../routes/foodScannerExplainRoutes.mjs'");
    expect(source.indexOf("app.use('/api/food-scanner', foodScannerExplainRoutes)")).toBeLessThan(
      source.indexOf("app.use('/api/food-scanner', foodScannerRoutes)"),
    );
  });
});
