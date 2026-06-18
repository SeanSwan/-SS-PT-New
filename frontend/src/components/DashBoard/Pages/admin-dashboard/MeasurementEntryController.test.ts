import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const controllerPath = resolve(__dirname, 'MeasurementEntry.controller.ts');
const controllerSource = existsSync(controllerPath) ? readFileSync(controllerPath, 'utf8') : '';

describe('MeasurementEntry controller extraction', () => {
  it('keeps API orchestration and measurement state outside the biometrics shell', () => {
    expect(shellSource).toContain("from './MeasurementEntry.controller'");
    expect(shellSource).not.toContain("apiService.get('/api/admin/clients')");
    expect(shellSource).not.toContain("apiService.post('/api/measurements'");
    expect(shellSource).not.toContain('useToast');
    expect(shellSource).not.toContain('useParams');
    expect(controllerSource).toContain("import { useAuth } from '../../../../context/AuthContext'");
    expect(controllerSource).toContain('if (embeddedClientId) {');
    expect(controllerSource).toContain("} else if (user?.role === 'admin') {");
    expect(controllerSource).toContain("apiService.get('/api/admin/clients')");
    expect(controllerSource).toContain('apiService.get(`/api/client-trainer-assignments/trainer/${user.id}`)');
    expect(controllerSource).toContain("apiService.post('/api/measurements'");
    expect(controllerSource).toContain('useToast');
    expect(controllerSource).toContain('useParams');
  });
});
