/**
 * FILE: modelRegistryDrift.test.mjs
 * PURPOSE: The model-registry drift tripwire. Makes "silently missing" impossible.
 * OWNER: SwanStudios QA.
 *
 * THE FAILURE THIS WAS WRITTEN AGAINST:
 *   RenewalAlert had a model file, a migration, a service, a controller, mounted
 *   routes (/api/renewal-alerts) and an automation cron tick — and was never
 *   registered in associations.mjs. getModel() THROWS on an unknown key, so
 *   every renewal-alert path failed at runtime: the API 500'd and the cron
 *   swallowed the throw into a log line and carried on. A churn-risk feature
 *   that looked completely wired could not work, and nothing failed loudly.
 *
 * Both external reviewers independently ranked this drift class #1.
 */

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  BACKEND_ROOT,
  readGetModelCallSites,
  readModelFiles,
  readRegisteredModels,
  readRegistryBindingProblems,
} from '../../utils/modelRegistryAudit.mjs';
import { DORMANT_MODELS, DORMANT_MODEL_NAMES } from '../../models/dormantModels.mjs';

describe('model registry drift tripwire', () => {
  it('parses a real registry and a real enumeration — never an empty set', () => {
    // An empty set on either side makes every assertion below vacuously true.
    const registered = readRegisteredModels();
    const files = readModelFiles();

    expect(registered.size).toBeGreaterThan(50);
    expect(files.length).toBeGreaterThan(50);
  });

  it('throws loudly if the registry object moves, rather than checking nothing', () => {
    // THIS TEST USED TO PASS FOR THE WRONG REASON (Kimi K3, 2026-08-14).
    // It passed `new URL(import.meta.url).pathname`, which on Windows is
    // "/C:/..." — an invalid path, so readFileSync threw ENOENT rather than the
    // guard. The assertion still went green only because this FILE'S NAME
    // contains "Registry" and the matcher was /return \{|registry/i. It would
    // have passed on literally any error.
    //
    // Now: a real, readable file that genuinely lacks the anchor, and an
    // assertion on the guard's own wording rather than an incidental substring.
    const realFileWithoutRegistry = path.join(BACKEND_ROOT, 'models', 'RenewalAlert.mjs');
    expect(existsSync(realFileWithoutRegistry)).toBe(true);

    expect(() => readRegisteredModels(realFileWithoutRegistry))
      .toThrow(/no "return \{"/);
  });

  it('every getModel() call site names a REGISTERED model', () => {
    // Highest severity: getModel throws on an unknown key, so a call site naming
    // an unregistered model is a guaranteed runtime failure on whatever path
    // reaches it. This is the assertion that would have caught RenewalAlert.
    const registered = readRegisteredModels();
    const broken = readGetModelCallSites()
      .filter((site) => !registered.has(site.model))
      .map((site) => `${site.model} <- ${site.file}`);

    expect(
      broken,
      'getModel() would THROW for these — the model is not in associations.mjs. '
      + 'Register it; this cannot be acknowledged away.',
    ).toEqual([]);
  });

  it('every model file is registered or explicitly acknowledged as dormant', () => {
    const registered = readRegisteredModels();
    const unaccounted = readModelFiles()
      .filter((entry) => !registered.has(entry.name) && !DORMANT_MODEL_NAMES.has(entry.name))
      .map((entry) => `${entry.name} (${entry.file})`);

    expect(
      unaccounted,
      'These define a model but are neither wired into associations.mjs nor listed in '
      + 'models/dormantModels.mjs. Register them, or acknowledge them there with a reason.',
    ).toEqual([]);
  });

  it('no dormant acknowledgement is stale — a registered model must not be listed', () => {
    // A stale entry is a standing licence to skip a model that is now wired, and
    // it would silently absorb a future model of the same name.
    const registered = readRegisteredModels();
    const stale = DORMANT_MODELS
      .filter((entry) => registered.has(entry.name))
      .map((entry) => entry.name);

    expect(stale, 'listed as dormant but actually registered — remove the entry').toEqual([]);
  });

  it('no dormant acknowledgement hides a guaranteed runtime throw', () => {
    // Belt and braces with the getModel assertion above: acknowledging a model
    // that a getModel() call site names would convert a loud test failure into a
    // silent production 500.
    const called = new Set(readGetModelCallSites().map((site) => site.model));
    const contradictory = DORMANT_MODELS
      .filter((entry) => called.has(entry.name))
      .map((entry) => entry.name);

    expect(
      contradictory,
      'acknowledged as dormant, but a getModel() call site names it — that combination is a '
      + 'guaranteed throw and may never be acknowledged',
    ).toEqual([]);
  });

  it('every registry entry is shorthand and actually bound — a NAME check is not a VALUE check', () => {
    // External review (HY3, 2026-08-14): proving a name appears in the returned
    // object cannot prove it is bound to the right model. `RenewalAlert: Notification`,
    // or keeping the key while deleting the import, passes a name-only check and
    // still throws at runtime — the exact failure this tripwire exists to catch.
    expect(readRegistryBindingProblems()).toEqual([]);
  });

  it('every dormant entry carries a real reason and a valid kind', () => {
    for (const entry of DORMANT_MODELS) {
      expect(['dormant', 'direct'], `${entry.name}: bad kind`).toContain(entry.kind);
      expect(entry.reason.length, `${entry.name} needs a real reason`).toBeGreaterThan(30);
      expect(entry.reason, `${entry.name}: not a reason`)
        .not.toMatch(/^(unused|legacy|old|todo|wip|later)\.?$/i);
    }
  });
});
