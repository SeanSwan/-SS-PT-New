/**
 * MarketingCampaign model unit tests.
 * Validates the spine model's field contract (enums, required name, soft-delete config)
 * WITHOUT a database: database.mjs is mocked with a non-connecting Sequelize instance and
 * only in-memory .build().validate() is exercised (no query ever runs).
 */
import { describe, expect, it, vi } from 'vitest';
import { Sequelize } from 'sequelize';

vi.mock('../database.mjs', () => ({
  default: new Sequelize({
    dialect: 'postgres',
    database: 'test_db',
    username: 'test_user',
    password: 'test_password',
    logging: false,
  }),
}));

const { default: MarketingCampaign, OBJECTIVES, STATUSES } = await import('../models/MarketingCampaign.mjs');

describe('MarketingCampaign model', () => {
  it('exposes the campaign objective + status enums', () => {
    expect(OBJECTIVES).toEqual(expect.arrayContaining([
      'lead_generation', 'booking_assessments', 'newsletter_growth', 'local_seo', 'product_sale', 'retention',
    ]));
    expect(STATUSES).toEqual(expect.arrayContaining(['draft', 'active', 'paused', 'completed', 'archived']));
  });

  it('is a soft-delete (paranoid) model on the marketing_campaigns table', () => {
    expect(MarketingCampaign.options.paranoid).toBe(true);
    expect(MarketingCampaign.getTableName()).toBe('marketing_campaigns');
  });

  it('accepts a valid campaign', async () => {
    await expect(
      MarketingCampaign.build({ name: 'Q3 Booking Push', objective: 'booking_assessments', status: 'active' }).validate(),
    ).resolves.toBeTruthy();
  });

  it('rejects a campaign with no name', async () => {
    await expect(
      MarketingCampaign.build({ objective: 'lead_generation' }).validate(),
    ).rejects.toBeTruthy();
  });

  it('rejects an invalid objective', async () => {
    await expect(
      MarketingCampaign.build({ name: 'X', objective: 'world_domination' }).validate(),
    ).rejects.toBeTruthy();
  });

  it('rejects an invalid status', async () => {
    await expect(
      MarketingCampaign.build({ name: 'X', status: 'launched' }).validate(),
    ).rejects.toBeTruthy();
  });
});
