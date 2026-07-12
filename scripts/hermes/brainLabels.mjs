/**
 * brainLabels.mjs � deterministic collision resolver for graph overlay labels.
 * Labels keep device-pixel type while their anchor coordinates remain in the
 * graph's 1280�700 design space. Crowded labels degrade to a titled hover tier.
 */
const FONT_PX = 16;
const LINE_H = 20;
const CX = 640;
const CY = 350;

const rectOf = (item) => {
  const chars = Math.max(item.label.length, String(item.sub || '').length);
  const width = Math.min(300, Math.max(48, chars * 0.68 * FONT_PX)) + 16;
  const left = item.anchor === 'right' ? item.x - width : item.anchor === 'center' ? item.x - width / 2 : item.x;
  const height = item.sub ? LINE_H * 2 : LINE_H;
  return { left: left - 8, right: left + width + 8, top: item.y - height / 2 - 6, bottom: item.y + height / 2 + 6 };
};

export function labelRectsOverlap(a, b) {
  const x = a.rect || rectOf(a);
  const y = b.rect || rectOf(b);
  return x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
}

export function resolveLabelLayout(nodes, renderedWidth = 1280) {
  const scale = 1280 / Math.max(320, renderedWidth);
  const placed = [];
  const ordered = [...nodes].sort((a, b) => String(a.cluster).localeCompare(String(b.cluster)) || a.angle - b.angle || String(a.id).localeCompare(String(b.id)));
  for (const node of ordered) {
    const dx = node.x - CX;
    const dy = node.y - CY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const base = 34 * scale;
    let candidate;
    let accepted = false;
    for (let step = 0; step <= 2 && !accepted; step += 1) {
      const distance = base + step * 18 * scale;
      const anchor = ux > 0.35 ? 'left' : ux < -0.35 ? 'right' : 'center';
      candidate = { ...node, x: node.x + ux * distance, y: node.y + uy * distance, anchor, tier: 'full' };
      candidate.rect = rectOf(candidate);
      accepted = !placed.some((p) => p.tier === 'full' && labelRectsOverlap(candidate, p));
    }
    if (!accepted) {
      candidate = { ...candidate, anchor: candidate.anchor === 'left' ? 'right' : candidate.anchor === 'right' ? 'left' : 'center' };
      candidate.rect = rectOf(candidate);
      accepted = !placed.some((p) => p.tier === 'full' && labelRectsOverlap(candidate, p));
    }
    if (!accepted) {
      const sides = ux >= 0 ? [{ x: 1248, anchor: 'right' }, { x: 32, anchor: 'left' }] : [{ x: 32, anchor: 'left' }, { x: 1248, anchor: 'right' }];
      let lane = null;
      for (const side of sides) {
        for (let y = 48; y <= 652; y += 52) {
          const next = { ...candidate, x: side.x, y, anchor: side.anchor, tier: 'hover' };
          next.rect = rectOf(next);
          if (!placed.some((p) => labelRectsOverlap(next, p))) { lane = next; break; }
        }
        if (lane) break;
      }
      candidate = lane || { ...candidate, tier: 'hover' };
    }
    placed.push(candidate);
  }
  return placed;
}
