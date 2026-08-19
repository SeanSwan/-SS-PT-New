/** Positive controls for the D4 URL redaction mechanism. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../../redact-urls.mjs';

test('POSITIVE CONTROL - third-party URLs are stripped', () => {
  const { out, count } = redact('see https://ui.aceternity.com/components/shimmer and https://21st.dev/x');
  assert.equal(count, 2);
  assert.ok(!out.includes('aceternity.com') && !out.includes('21st.dev'));
});

test('own-product and artifact URLs survive', () => {
  const text = 'live at https://sswanstudios.com/store and https://claude.ai/code/artifact/abc plus https://github.com/SeanSwan/-SS-PT-New';
  const { out, count } = redact(text);
  assert.equal(count, 0);
  assert.equal(out, text);
});

test('markdown link forms are caught, repo paths untouched', () => {
  const { out, count } = redact('[x](https://reactbits.dev/y) and docs/ai-workflow/design-brain/design.md');
  assert.equal(count, 1);
  assert.ok(out.includes('docs/ai-workflow/design-brain/design.md'));
});
