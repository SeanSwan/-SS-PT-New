import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('EquipmentProfilePicker auth pipeline', () => {
  it('is consumed by mounted workout and bootcamp planning surfaces', () => {
    const pickerSource = readSource('frontend/src/components/Shared/EquipmentProfilePicker.tsx');
    const workoutLoggerSource = readSource('frontend/src/components/WorkoutLogger/WorkoutLogger.tsx');
    const bootcampConfigSource = readSource('frontend/src/components/BootcampBuilder/ConfigPanel.tsx');
    const longHorizonSource = readSource('frontend/src/components/DashBoard/Pages/admin-clients/components/LongHorizonContent.tsx');
    const longHorizonConfigureFormSource = readSource('frontend/src/components/DashBoard/Pages/admin-clients/components/LongHorizonConfigureForm.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');

    expect(workoutLoggerSource).toContain("import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker'");
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
