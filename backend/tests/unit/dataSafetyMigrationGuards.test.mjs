import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const names = [
  '20240115000000-update-orientation-model.cjs',
  '20250129000000-add-cancellation-charge-fields.cjs',
  '20260212000005-add-coaching-cues-to-exercises.cjs',
  '20260308-add-enhancement-credits.cjs',
  '20260308-add-gallery-visitor-user-link.cjs',
];
for (const name of names) {
  for (const direction of ['up', 'down']) {
    test(`${name} ${direction}: absent table has no schema side effects`, async () => {
      const qi = new Proxy({ tableExists: async () => false }, { get(target, key) {
        if (key in target) return target[key];
        throw new Error(`Unexpected query interface access: ${String(key)}`);
      }});
      await require(`../../migrations/${name}`)[direction](qi, {});
    });
  }
}
test('visitor rollback propagates database failure instead of claiming success', async () => {
  const qi = {
    tableExists: async () => true,
    describeTable: async () => ({ user_id: {} }),
    showIndex: async () => [{ name: 'idx_gallery_visitors_user_id' }],
    removeIndex: async () => { throw new Error('synthetic database failure'); },
    removeColumn: async () => { throw new Error('synthetic database failure'); },
  };
  await assert.rejects(require('../../migrations/20260308-add-gallery-visitor-user-link.cjs').down(qi), /synthetic database failure/);
});
