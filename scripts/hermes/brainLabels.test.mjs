/**
 * brainLabels.test.mjs — V1 deterministic label-collision contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLabelLayout, labelRectsOverlap } from './brainLabels.mjs';

const nodes = Array.from({ length: 18 }, (_, i) => ({
  id: `skill-${i}`,
  label: `skill-${String(i).padStart(2, '0')}-long-label`,
  x: 980 + Math.cos(i / 17 * Math.PI / 2) * 230,
  y: 350 + Math.sin(i / 17 * Math.PI / 2) * 230,
  angle: i,
  cluster: 'skills',
}));

for (const width of [1280, 1920, 2560]) {
  test(`V1 labels: deterministic non-overlapping visible tiers at ${width}px`, () => {
    const first = resolveLabelLayout(nodes, width);
    const second = resolveLabelLayout(nodes, width);
    assert.deepEqual(first, second);
    const visible = first;
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        assert.equal(labelRectsOverlap(visible[i], visible[j]), false, `${visible[i].id} overlaps ${visible[j].id}`);
      }
    }
    assert.ok(first.every((x) => ['full', 'hover'].includes(x.tier)));
  });
}

