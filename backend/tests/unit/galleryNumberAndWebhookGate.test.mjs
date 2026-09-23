import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(__dirname, '../../', p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

const gallery = read('routes/adminGalleryRoutes.mjs');
const galleryCompact = strip(gallery);
const sub = read('routes/subscriptionRoutes.mjs');
const subCompact = strip(sub);

describe('photo number allocation is serialized (E-09)', () => {
  it('routes allocation through one locked helper', () => {
    expect(galleryCompact).toContain('async function allocatePhotoNumbers(eventId, count)');
    // the lock that makes read-modify-write atomic
    expect(galleryCompact).toContain('lock: transaction.LOCK.UPDATE');
    expect(galleryCompact).toContain('await sequelize.transaction()');
  });

  it('no call site computes max(photoNumber)+1 itself anymore', () => {
    // exactly one occurrence: inside the helper
    const hits = galleryCompact.split("max('photoNumber'").length - 1;
    expect(hits).toBe(1);
  });

  it('batch presign reserves the whole batch up front', () => {
    expect(galleryCompact).toContain('allocatePhotoNumbers(event.id, files.length)');
    expect(galleryCompact).toContain('const photoNumber = reservedNumbers[i]');
  });

  it('rolls back the transaction on failure', () => {
    expect(galleryCompact).toContain('await transaction.rollback()');
    expect(galleryCompact).toContain('await transaction.commit()');
  });
});

describe('unsigned Stripe webhook requires an explicit opt-in (E-10)', () => {
  it('gates the unsigned dev branch behind SWAN_DEV_UNSIGNED_WEBHOOKS', () => {
    expect(subCompact).toContain("process.env.SWAN_DEV_UNSIGNED_WEBHOOKS !== '1'");
  });

  it('refuses rather than falls through when the flag is absent', () => {
    // the gate must sit before the branch that parses the body
    const gateIdx = subCompact.indexOf("process.env.SWAN_DEV_UNSIGNED_WEBHOOKS !== '1'");
    const parseIdx = subCompact.indexOf('JSON.parse(req.body.toString())');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(parseIdx).toBeGreaterThan(gateIdx);
  });

  it('still refuses unsigned webhooks in production', () => {
    expect(subCompact).toContain("process.env.NODE_ENV === 'production'");
  });
});
