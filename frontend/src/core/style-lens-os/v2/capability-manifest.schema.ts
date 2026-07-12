/**
 * FILE: capability-manifest.schema.ts (Recipe v2 core)
 * PURPOSE: Per-surface capability manifest for the Lens rollout
 * (SUPER-PROMPT §4). A SurfaceCapabilityManifest is a HostCapabilityManifest
 * plus a stable product-surface identity, with fail-closed validation.
 * FORBIDDEN BY LAW: layout fields (layout is host-owned), raw color values
 * (colors travel only as recipe tokens), and free-form version strings.
 */
import type { HostCapabilityManifest } from './hostCapabilityManifest';

export interface SurfaceCapabilityManifest extends HostCapabilityManifest {
  /** Stable kebab-case product-surface id (see config/canonical-surface-names.ts). */
  surfaceId: string;
  /** Reviewer-facing note; never rendered. */
  description?: string;
}

export interface SurfaceManifestIssue {
  path: string;
  message: string;
}

const KEBAB_PATTERN = /^[a-z][a-z0-9-]*$/;
const EXACT_SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const RAW_COLOR_PATTERN = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(/i;

const issue = (path: string, message: string): SurfaceManifestIssue => ({ path, message });

/**
 * Fail-closed validation. Returns [] when the manifest is sound; callers
 * must treat ANY issue as "surface not lens-ready" and keep host defaults.
 */
export function validateSurfaceCapabilityManifest(
  manifest: SurfaceCapabilityManifest,
): SurfaceManifestIssue[] {
  const issues: SurfaceManifestIssue[] = [];

  if (!KEBAB_PATTERN.test(manifest.surfaceId)) {
    issues.push(issue('surfaceId', 'surfaceId must be kebab-case'));
  }
  if (!KEBAB_PATTERN.test(manifest.hostId)) {
    issues.push(issue('hostId', 'hostId must be kebab-case'));
  }
  if (!EXACT_SEMVER_PATTERN.test(manifest.version)) {
    issues.push(issue('version', 'version must be exact semver — free-form version strings are forbidden'));
  }
  if ('layout' in (manifest as unknown as Record<string, unknown>)) {
    issues.push(issue('layout', 'layout is host-owned and forbidden in capability manifests'));
  }
  if (manifest.profiles.length === 0) {
    issues.push(issue('profiles', 'a surface must declare at least one container profile'));
  }

  for (const [slot, definition] of Object.entries(manifest.slots)) {
    if (!definition) continue;
    for (const variant of definition.supportedVariants) {
      if (RAW_COLOR_PATTERN.test(variant)) {
        issues.push(issue(`slots.${slot}`, `raw color value forbidden in variant "${variant}"`));
      } else if (!KEBAB_PATTERN.test(variant)) {
        issues.push(issue(`slots.${slot}`, `variant "${variant}" must be a kebab-case name`));
      }
    }
  }

  for (const template of Object.keys(manifest.templates)) {
    if (RAW_COLOR_PATTERN.test(template)) {
      issues.push(issue(`templates.${template}`, 'raw color value forbidden in template name'));
    } else if (!KEBAB_PATTERN.test(template)) {
      issues.push(issue(`templates.${template}`, 'template names must be kebab-case'));
    }
  }

  return issues;
}
