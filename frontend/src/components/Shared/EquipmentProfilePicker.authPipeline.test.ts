import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

/**
 * Every assertion here is a source grep, which has one specific bypass: code
 * that has been COMMENTED OUT still matches. Wrapping the chip in a JSX
 * comment renders nothing and shipped green — verified by mutation, so this
 * is a demonstrated hole, not a theoretical one.
 *
 * Block comments (which is how JSX gets disabled) and whole-line `//`
 * comments are removed before matching.
 *
 * Mid-line `//` is deliberately LEFT ALONE: stripping it would eat everything
 * after a `'https://...'` inside a string literal and silently delete the very
 * text an assertion is looking for. That trades a real bypass for an invisible
 * false PASS, which is the worse failure — the sanitiser must never be the
 * thing that breaks the test it protects.
 */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

const readSource = (relativePath: string) =>
  stripComments(readFileSync(resolve(repoRoot, relativePath), 'utf8'));

describe('EquipmentProfilePicker auth pipeline', () => {
  it('is consumed by mounted workout and bootcamp planning surfaces', () => {
    const pickerSource = readSource('frontend/src/components/Shared/EquipmentProfilePicker.tsx');
    const workoutLoggerSource = readSource('frontend/src/components/WorkoutLogger/WorkoutLogger.tsx');
    const bootcampConfigSource = readSource('frontend/src/components/BootcampBuilder/ConfigPanel.tsx');
    const longHorizonSource = readSource('frontend/src/components/DashBoard/Pages/admin-clients/components/LongHorizonContent.tsx');
    const longHorizonConfigureFormSource = readSource('frontend/src/components/DashBoard/Pages/admin-clients/components/LongHorizonConfigureForm.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');

    // WorkoutLogger deliberately STOPPED consuming the picker in 885ea7db6:
    // its passive equipment dropdown was replaced by the persistent
    // EquipmentContextChip ("derive-don't-ask": plan id > only profile >
    // default, with a corrective MismatchNotice). Pinning the retired import
    // here asserted the OLD design and went red the day the better one
    // shipped. What actually needs defending is that the logger still wires
    // equipment context at all — so that is what this pins now.
    expect(workoutLoggerSource).toContain("import EquipmentContextChip from '../Shared/EquipmentContextChip'");
    expect(workoutLoggerSource).toContain('<EquipmentContextChip');
    expect(workoutLoggerSource).toContain('selectedProfileId={equipmentProfileId}');
    expect(bootcampConfigSource).toContain("import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker'");
    expect(longHorizonSource).toContain("import LongHorizonConfigureForm from './LongHorizonConfigureForm'");
    expect(longHorizonSource).toContain('setEquipmentProfileId={workflow.setEquipmentProfileId}');
    expect(longHorizonConfigureFormSource).toContain("import EquipmentProfilePicker from '../../../../Shared/EquipmentProfilePicker'");
    expect(longHorizonConfigureFormSource).toContain('<EquipmentProfilePicker');
    expect(coreRoutesSource).toContain("app.use('/api/equipment-profiles', equipmentRoutes)");
    expect(pickerSource).toContain('const EquipmentProfilePicker: React.FC<EquipmentProfilePickerProps>');
  });

  it('loads profiles through the shared API service', () => {
    const pickerSource = readSource('frontend/src/components/Shared/EquipmentProfilePicker.tsx');

    expect(pickerSource).toContain("apiService.get('/api/equipment-profiles')");
    expect(pickerSource).not.toContain("localStorage.getItem('token')");
    expect(pickerSource).not.toContain("fetch('/api/equipment-profiles'");
    expect(pickerSource).not.toContain('Authorization');
  });
});
