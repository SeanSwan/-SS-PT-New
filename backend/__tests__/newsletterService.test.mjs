/**
 * newsletterService — Tier 1.1 double-opt-in email list
 * =====================================================
 * Locks: invalid-email rejection, PENDING create with confirm token, no
 * re-add of an already-confirmed email, re-opt-in for a previously
 * unsubscribed email, token-based confirm (records consent + clears token),
 * and one-click unsubscribe. Subscriber model is vi.mock'd — no real DB.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscriberFindOne, subscriberCreate } = vi.hoisted(() => ({
  subscriberFindOne: vi.fn(),
  subscriberCreate: vi.fn(),
}));
vi.mock('../models/Subscriber.mjs', () => ({
  default: { findOne: subscriberFindOne, create: subscriberCreate },
}));

const { subscribe, confirm, unsubscribe } = await import('../services/newsletterService.mjs');

describe('newsletterService (Tier 1.1 double opt-in)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriberFindOne.mockResolvedValue(null);
    subscriberCreate.mockImplementation(async (d) => ({ id: 1, ...d }));
  });

  describe('subscribe', () => {
    it('rejects an invalid email without touching the DB', async () => {
      const r = await subscribe({ email: 'not-an-email' });
      expect(r).toEqual({ ok: false, error: 'invalid_email' });
      expect(subscriberCreate).not.toHaveBeenCalled();
    });

    it('creates a PENDING subscriber with confirm + unsubscribe tokens, normalizes email', async () => {
      const r = await subscribe({ email: 'New@Example.com', firstName: 'Ann', source: 'footer', consentIp: '1.2.3.4' });
      expect(subscriberCreate).toHaveBeenCalledTimes(1);
      const created = subscriberCreate.mock.calls[0][0];
      expect(created.email).toBe('new@example.com');
      expect(created.status).toBe('pending');
      expect(created.confirmToken).toBeTruthy();
      expect(created.unsubscribeToken).toBeTruthy();
      expect(r.ok).toBe(true);
      expect(r.action).toBe('created_pending');
      expect(r.confirmToken).toBeTruthy();
    });

    it('does NOT re-add an already-confirmed subscriber (no duplicate, no new confirm token)', async () => {
      subscriberFindOne.mockResolvedValue({ id: 9, status: 'confirmed', email: 'x@y.com' });
      const r = await subscribe({ email: 'x@y.com' });
      expect(subscriberCreate).not.toHaveBeenCalled();
      expect(r.action).toBe('already_confirmed');
      expect(r.confirmToken).toBeUndefined();
    });

    it('re-opens opt-in for a previously unsubscribed email (pending + fresh confirm token)', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      subscriberFindOne.mockResolvedValue({ id: 7, status: 'unsubscribed', email: 'back@y.com', unsubscribeToken: 'u', update });
      const r = await subscribe({ email: 'back@y.com' });
      expect(subscriberCreate).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
      const upd = update.mock.calls[0][0];
      expect(upd.status).toBe('pending');
      expect(upd.confirmToken).toBeTruthy();
      expect(upd.unsubscribedAt).toBeNull();
      expect(r.action).toBe('resubscribe_pending');
      expect(r.confirmToken).toBeTruthy();
    });
  });

  describe('confirm', () => {
    it('confirms a pending subscriber by token, records consent, clears the token', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      subscriberFindOne.mockResolvedValue({ id: 3, status: 'pending', update });
      const r = await confirm('tok123');
      expect(subscriberFindOne).toHaveBeenCalledWith({ where: { confirmToken: 'tok123' } });
      const upd = update.mock.calls[0][0];
      expect(upd.status).toBe('confirmed');
      expect(upd.confirmedAt).toBeInstanceOf(Date);
      expect(upd.consentAt).toBeInstanceOf(Date);
      expect(upd.confirmToken).toBeNull();
      expect(r.action).toBe('confirmed');
    });

    it('rejects an unknown/expired confirm token', async () => {
      subscriberFindOne.mockResolvedValue(null);
      expect(await confirm('bad')).toEqual({ ok: false, error: 'invalid_token' });
      expect(await confirm('')).toEqual({ ok: false, error: 'invalid_token' });
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes by token (one-click) and stamps unsubscribedAt', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      subscriberFindOne.mockResolvedValue({ id: 4, status: 'confirmed', update });
      const r = await unsubscribe('utok');
      expect(subscriberFindOne).toHaveBeenCalledWith({ where: { unsubscribeToken: 'utok' } });
      const upd = update.mock.calls[0][0];
      expect(upd.status).toBe('unsubscribed');
      expect(upd.unsubscribedAt).toBeInstanceOf(Date);
      expect(r.action).toBe('unsubscribed');
    });

    it('rejects an unknown unsubscribe token', async () => {
      subscriberFindOne.mockResolvedValue(null);
      expect(await unsubscribe('bad')).toEqual({ ok: false, error: 'invalid_token' });
    });
  });
});
