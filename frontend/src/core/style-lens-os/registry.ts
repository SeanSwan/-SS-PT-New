import {
  CORE_RENDERER_ALLOWLIST,
  DEFAULT_STYLE_LENS_ID,
} from './constants';
import type {
  RendererAllowlist,
  StyleLensManifest,
  StyleLensRegistry,
} from './types';
import { validateStyleLensManifest } from './validation';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

export const createStyleLensRegistry = (
  manifests: readonly StyleLensManifest[],
  allowlist: RendererAllowlist = CORE_RENDERER_ALLOWLIST,
): StyleLensRegistry => {
  const byId = new Map<string, StyleLensManifest>();
  const issueMap = new Map<string, readonly string[]>();

  for (const manifest of manifests) {
    if (byId.has(manifest.id)) {
      throw new Error(`Duplicate Style Lens id: ${manifest.id}`);
    }
    byId.set(manifest.id, deepFreeze(manifest));
  }

  const safety = byId.get(DEFAULT_STYLE_LENS_ID);
  if (!safety) throw new Error('Default safety lens is required');
  if (safety.fallbackLensId !== DEFAULT_STYLE_LENS_ID) {
    throw new Error('Default safety lens must fall back to itself');
  }

  for (const manifest of byId.values()) {
    const result = validateStyleLensManifest(manifest, allowlist);
    const issues = [...result.issues];
    if (
      manifest.id !== DEFAULT_STYLE_LENS_ID &&
      manifest.fallbackLensId !== DEFAULT_STYLE_LENS_ID
    ) {
      issues.push('fallbackLensId must resolve to Default in one hop');
    }
    if (manifest.promotion.status !== 'approved') {
      issues.push('lens is not promoted');
    }
    issueMap.set(manifest.id, Object.freeze(issues));
  }

  if ((issueMap.get(DEFAULT_STYLE_LENS_ID)?.length ?? 0) > 0) {
    throw new Error(
      `Default safety lens is invalid: ${issueMap.get(DEFAULT_STYLE_LENS_ID)?.join(', ')}`,
    );
  }

  const isAvailable = (manifest?: StyleLensManifest): manifest is StyleLensManifest =>
    Boolean(manifest && (issueMap.get(manifest.id)?.length ?? 0) === 0);

  return Object.freeze({
    get: (id: string) => byId.get(id),
    resolve: (id: string) => {
      const candidate = byId.get(id);
      return isAvailable(candidate) ? candidate : safety;
    },
    available: () =>
      Object.freeze([...byId.values()].filter(isAvailable)) as StyleLensManifest[],
    issues: (id: string) => issueMap.get(id) ?? Object.freeze(['lens is unknown']),
  });
};
