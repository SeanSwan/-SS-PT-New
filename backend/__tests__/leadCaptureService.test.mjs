/**
 * leadCaptureService — captureLeadFromSignup (Tier 0.2b)
 * =====================================================
 * A public signup (non-Move-Fitness, non-admin/trainer) becomes an attributed
 * CRM Lead linked to the new user account. Business rules under test:
 *  - Move Fitness signups are FREE value-add clients (no-poach) → never a sales lead
 *  - admin/trainer roles are not sales prospects → skipped
 *  - dedupe by email (compose with the contact-form lead)
 *  - fully non-blocking (returns an error object, never throws)
 * Models are vi.mock'd — no real DB writes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { leadFindOrCreate, leadActivityCreate } = vi.hoisted(() => ({
  leadFindOrCreate: vi.fn(),
  leadActivityCreate: vi.fn(),
}));

vi.mock('../models/Lead.mjs', () => ({ default: { findOrCreate: leadFindOrCreate } }));
vi.mock('../models/LeadActivity.mjs', () => ({ default: { create: leadActivityCreate } }));

const {
  captureLeadFromCheckout,
  captureLeadFromContact,
  captureLeadFromNewsletter,
  captureLeadFromSignup,
} = await import('../services/leadCaptureService.mjs');

describe('captureLeadFromNewsletter (Tier 1.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindOrCreate.mockResolvedValue([{ id: 9, score: 0, tags: [], update: vi.fn() }, true]);
    leadActivityCreate.mockResolvedValue({ id: 1 });
  });

  it('creates a website lead from a confirmed subscriber (score 25, newsletter tag, normalized email)', async () => {
    const res = await captureLeadFromNewsletter({ email: 'Sub@Example.com', firstName: 'Sam' });
    expect(leadFindOrCreate).toHaveBeenCalledTimes(1);
    const call = leadFindOrCreate.mock.calls[0][0];
    expect(call.where).toEqual({ email: 'sub@example.com' });
    expect(call.defaults).toMatchObject({
      firstName: 'Sam',
      source: 'website',
      sourceDetail: 'Newsletter (confirmed opt-in)',
      status: 'new',
      score: 25,
      tags: ['newsletter'],
    });
    expect(res).toEqual({ leadId: 9, created: true });
  });

  it('falls back to a non-null firstName when the subscriber has no name', async () => {
    await captureLeadFromNewsletter({ email: 'noname@example.com' });
    expect(leadFindOrCreate.mock.calls[0][0].defaults.firstName).toBe('Subscriber');
  });

  it('tags an existing lead WITHOUT downgrading its score (dedupe by email)', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{ id: 9, score: 90, tags: ['contact-form'], update }, false]);
    const res = await captureLeadFromNewsletter({ email: 'hot@example.com' });
    expect(update).toHaveBeenCalledTimes(1);
    const upd = update.mock.calls[0][0];
    expect(upd.tags).toEqual(expect.arrayContaining(['contact-form', 'newsletter']));
    expect(upd).not.toHaveProperty('score'); // never lowers a hotter lead
    expect(res.created).toBe(false);
  });

  it('skips when there is no email', async () => {
    const res = await captureLeadFromNewsletter({ email: '' });
    expect(leadFindOrCreate).not.toHaveBeenCalled();
    expect(res.skipped).toBe('no_email');
  });

  it('is non-blocking: returns an error object instead of throwing', async () => {
    leadFindOrCreate.mockRejectedValue(new Error('db down'));
    const res = await captureLeadFromNewsletter({ email: 'x@example.com' });
    expect(res.error).toBeTruthy();
  });

  it('attributes a social acquisition channel -> social_media source + channel tag + activity metadata', async () => {
    const res = await captureLeadFromNewsletter({ email: 'fan@example.com', channel: 'youtube' });
    const defaults = leadFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults.source).toBe('social_media');
    expect(defaults.sourceDetail).toBe('Newsletter (confirmed opt-in) · via youtube');
    expect(defaults.tags).toEqual(expect.arrayContaining(['newsletter', 'channel:youtube']));
    expect(leadActivityCreate.mock.calls[0][0].metadata.channel).toBe('youtube');
    expect(res.created).toBe(true);
  });

  it('treats the legacy "website" channel as direct (website source, no channel tag)', async () => {
    await captureLeadFromNewsletter({ email: 'direct@example.com', channel: 'website' });
    const defaults = leadFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults.source).toBe('website');
    expect(defaults.sourceDetail).toBe('Newsletter (confirmed opt-in)');
    expect(defaults.tags).toEqual(['newsletter']);
    expect(leadActivityCreate.mock.calls[0][0].metadata.channel).toBe('direct');
  });

  it('adds the channel tag to an existing lead WITHOUT overwriting its source', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{ id: 9, score: 90, tags: ['contact-form'], update }, false]);
    await captureLeadFromNewsletter({ email: 'hot@example.com', channel: 'tiktok' });
    const upd = update.mock.calls[0][0];
    expect(upd.tags).toEqual(expect.arrayContaining(['contact-form', 'newsletter', 'channel:tiktok']));
    expect(upd).not.toHaveProperty('source'); // never overwrite an existing lead's source/score
  });
});

describe('captureLeadFromContact (Tier 0.2a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindOrCreate.mockResolvedValue([{ id: 5, score: 0, contactCount: 0, update: vi.fn() }, true]);
    leadActivityCreate.mockResolvedValue({ id: 1 });
  });

  it('creates a website lead from a contact submission', async () => {
    const res = await captureLeadFromContact({
      contact: { id: 101 },
      formData: { name: 'Jane Doe', email: 'Jane@Example.com', message: 'I want to train for golf' },
      consultationType: 'sports-performance',
    });

    expect(leadFindOrCreate).toHaveBeenCalledTimes(1);
    const call = leadFindOrCreate.mock.calls[0][0];
    expect(call.where).toEqual({ email: 'jane@example.com' });
    expect(call.defaults).toMatchObject({
      firstName: 'Jane',
      lastName: 'Doe',
      source: 'website',
      sourceDetail: 'Contact form — sports performance',
      status: 'new',
      score: 30,
      tags: ['contact-form'],
    });
    expect(leadActivityCreate.mock.calls[0][0].metadata.contactId).toBe(101);
    expect(res).toEqual({ leadId: 5, created: true });
  });

  it('bumps an existing contact lead instead of duplicating it', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{ id: 5, score: 95, contactCount: 2, update }, false]);

    const res = await captureLeadFromContact({
      contact: { id: 102 },
      formData: { name: 'Jane Doe', email: 'jane@example.com', message: 'Following up' },
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      contactCount: 3,
      score: 100,
    }));
    expect(leadActivityCreate.mock.calls[0][0].title).toBe('Repeat contact-form submission');
    expect(res).toEqual({ leadId: 5, created: false });
  });

  it('is non-blocking: returns an error object instead of throwing', async () => {
    leadFindOrCreate.mockRejectedValue(new Error('db down'));

    const res = await captureLeadFromContact({
      contact: { id: 103 },
      formData: { name: 'Bob', email: 'bob@example.com', message: 'hi' },
    });

    expect(res.error).toBe('db down');
  });

  it('attributes the acquisition channel from utm (youtube -> social_media + channel tag)', async () => {
    const res = await captureLeadFromContact({
      contact: { id: 200 },
      formData: { name: 'Lee Fan', email: 'lee@example.com', message: 'saw your video' },
      attribution: { utmSource: 'youtube' },
    });
    const defaults = leadFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults.source).toBe('social_media');
    expect(defaults.sourceDetail).toContain('· via youtube');
    expect(defaults.tags).toEqual(expect.arrayContaining(['contact-form', 'channel:youtube']));
    expect(leadActivityCreate.mock.calls[0][0].metadata.channel).toBe('youtube');
    expect(res.created).toBe(true);
  });
});

describe('captureLeadFromSignup (Tier 0.2b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindOrCreate.mockResolvedValue([{ id: 7, score: 0, update: vi.fn() }, true]);
    leadActivityCreate.mockResolvedValue({ id: 1 });
  });

  it('creates a website lead for a swanstudios client signup, linked to the user', async () => {
    const res = await captureLeadFromSignup({
      user: { id: 42, firstName: 'Ava', lastName: 'Stone', email: 'Ava@Example.com' },
      clientSource: 'swanstudios',
      role: 'client',
    });
    expect(leadFindOrCreate).toHaveBeenCalledTimes(1);
    const call = leadFindOrCreate.mock.calls[0][0];
    expect(call.where).toEqual({ email: 'ava@example.com' });
    expect(call.defaults.source).toBe('website');
    expect(call.defaults.firstName).toBe('Ava');
    expect(call.defaults.score).toBe(50);
    expect(call.defaults.tags).toContain('signup');
    // Lead has no metadata column (rule 58): user link lives in notes + the activity.
    expect(call.defaults.metadata).toBeUndefined();
    expect(call.defaults.notes).toContain('42');
    expect(leadActivityCreate).toHaveBeenCalledTimes(1);
    expect(leadActivityCreate.mock.calls[0][0].metadata.userId).toBe(42); // structured link on the activity
    expect(res.created).toBe(true);
  });

  it('maps an external source to the referral lead source', async () => {
    await captureLeadFromSignup({ user: { id: 1, firstName: 'B', email: 'b@x.com' }, clientSource: 'external', role: 'client' });
    expect(leadFindOrCreate.mock.calls[0][0].defaults.source).toBe('referral');
  });

  it('SKIPS Move Fitness signups (free, no-poach)', async () => {
    const res = await captureLeadFromSignup({ user: { id: 2, firstName: 'M', email: 'm@x.com' }, clientSource: 'move_fitness', role: 'client' });
    expect(leadFindOrCreate).not.toHaveBeenCalled();
    expect(res.skipped).toBe('move_fitness');
  });

  it('SKIPS admin and trainer roles (not sales prospects)', async () => {
    await captureLeadFromSignup({ user: { id: 3, firstName: 'T', email: 't@x.com' }, clientSource: 'swanstudios', role: 'trainer' });
    await captureLeadFromSignup({ user: { id: 4, firstName: 'A', email: 'a@x.com' }, clientSource: 'swanstudios', role: 'admin' });
    expect(leadFindOrCreate).not.toHaveBeenCalled();
  });

  it('dedupes by email and bumps an existing lead instead of duplicating', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{ id: 9, score: 30, update }, false]);
    const res = await captureLeadFromSignup({ user: { id: 5, firstName: 'C', email: 'c@x.com' }, clientSource: 'swanstudios', role: 'client' });
    expect(update).toHaveBeenCalledTimes(1);
    expect(res.created).toBe(false);
  });

  it('is non-blocking: returns an error object instead of throwing', async () => {
    leadFindOrCreate.mockRejectedValue(new Error('db down'));
    const res = await captureLeadFromSignup({ user: { id: 6, firstName: 'D', email: 'd@x.com' }, clientSource: 'swanstudios', role: 'client' });
    expect(res.error).toBeTruthy();
  });

  it('skips when there is no email to attribute/dedupe on', async () => {
    const res = await captureLeadFromSignup({ user: { id: 7, firstName: 'E', email: '' }, clientSource: 'swanstudios', role: 'client' });
    expect(leadFindOrCreate).not.toHaveBeenCalled();
    expect(res.skipped).toBe('no_email');
  });

  it('tags the utm channel WITHOUT overriding the authoritative clientSource lead source', async () => {
    const res = await captureLeadFromSignup({
      user: { id: 50, firstName: 'Ria', email: 'ria@x.com' },
      clientSource: 'swanstudios',
      role: 'client',
      attribution: { utmSource: 'tiktok' },
    });
    const defaults = leadFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults.source).toBe('website'); // clientSource swanstudios -> website stays authoritative
    expect(defaults.tags).toEqual(expect.arrayContaining(['signup', 'channel:tiktok']));
    expect(defaults.sourceDetail).toContain('· via tiktok');
    expect(leadActivityCreate.mock.calls[0][0].metadata.channel).toBe('tiktok');
    expect(res.created).toBe(true);
  });
});

describe('captureLeadFromCheckout (Tier 0.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindOrCreate.mockResolvedValue([{ id: 12, score: 50, status: 'new', tags: ['signup'], update: vi.fn() }, false]);
    leadActivityCreate.mockResolvedValue({ id: 1 });
  });

  it('marks an existing lead as converted when checkout verifies payment', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{
      id: 12,
      score: 50,
      status: 'new',
      tags: ['signup'],
      update,
    }, false]);

    const res = await captureLeadFromCheckout({
      cart: { id: 77, customerInfo: JSON.stringify({ name: 'Ava Stone', email: 'ava@example.com', phone: '555-0100' }) },
      user: { id: 42 },
      session: { id: 'cs_paid_123', amount_total: 175000, customer_details: { email: 'ava@example.com' } },
      sessionsAdded: 10,
    });

    expect(leadFindOrCreate.mock.calls[0][0].where).toEqual({ email: 'ava@example.com' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'converted',
      convertedUserId: 42,
      score: 100,
      phone: '555-0100',
      tags: ['signup', 'checkout', 'converted'],
    }));
    expect(leadActivityCreate.mock.calls[0][0]).toMatchObject({
      leadId: 12,
      type: 'status_change',
      title: 'Lead converted from checkout',
      metadata: {
        source: 'genesis_checkout',
        userId: 42,
        cartId: 77,
        sessionId: 'cs_paid_123',
        sessionsAdded: 10,
        from: 'new',
        to: 'converted',
      },
    });
    expect(res).toEqual({ leadId: 12, created: false, converted: true });
  });

  it('creates a converted lead when checkout is the first attributed touch', async () => {
    leadFindOrCreate.mockResolvedValue([{ id: 15, status: 'converted', update: vi.fn() }, true]);

    const res = await captureLeadFromCheckout({
      cart: { id: 88 },
      user: { id: 99, firstName: 'New', lastName: 'Buyer', email: 'new@example.com', phone: '555-0200' },
      session: { id: 'cs_paid_456', amount_total: 420000, customer_details: {} },
      sessionsAdded: 24,
    });

    const defaults = leadFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults).toMatchObject({
      firstName: 'New',
      lastName: 'Buyer',
      email: 'new@example.com',
      phone: '555-0200',
      source: 'website',
      sourceDetail: 'Checkout purchase',
      status: 'converted',
      score: 100,
      convertedUserId: 99,
      tags: ['checkout', 'converted'],
    });
    expect(leadActivityCreate.mock.calls[0][0].title).toBe('Lead converted from checkout');
    expect(res).toEqual({ leadId: 15, created: true, converted: true });
  });

  it('does not duplicate conversion activity for an already-converted lead', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{
      id: 21,
      status: 'converted',
      convertedUserId: 42,
      convertedAt: new Date('2026-06-01T00:00:00.000Z'),
      update,
    }, false]);

    const res = await captureLeadFromCheckout({
      cart: { id: 77, customerInfo: JSON.stringify({ email: 'ava@example.com' }) },
      user: { id: 42 },
      session: { id: 'cs_paid_123', customer_details: { email: 'ava@example.com' } },
    });

    expect(update).not.toHaveBeenCalled();
    expect(leadActivityCreate).not.toHaveBeenCalled();
    expect(res).toEqual({ leadId: 21, created: false, alreadyConverted: true });
  });
});
