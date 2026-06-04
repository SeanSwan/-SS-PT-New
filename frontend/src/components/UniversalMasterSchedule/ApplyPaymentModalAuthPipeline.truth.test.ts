import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('ApplyPaymentModal auth pipeline', () => {
  it('covers the mounted schedule payment modal and backend payment routes', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalStackSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleConnectedModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const deductionRoutesSource = readSource('backend/routes/sessionDeductionRoutes.mjs');
    const chargeCardRoutesSource = readSource('backend/routes/adminChargeCardRoutes.mjs');
    const storefrontRoutesSource = readSource('backend/routes/storeFrontRoutes.mjs');

    expect(scheduleSource).toContain('showPaymentModal={showPaymentModal}');
    expect(modalStackSource).toContain("import ApplyPaymentModal from '../ApplyPaymentModal'");
    expect(modalStackSource).toContain('<ApplyPaymentModal');
    expect(modalStackSource).toContain('open={showPaymentModal}');
    expect(modalStackSource).toContain('preselectedClientId={preselectedPaymentClientId ?? undefined}');

    expect(coreRoutesSource).toContain("app.use('/api/sessions/deductions', sessionDeductionRoutes)");
    expect(coreRoutesSource.indexOf("app.use('/api/sessions/deductions', sessionDeductionRoutes)"))
      .toBeLessThan(coreRoutesSource.indexOf("app.use('/api/sessions', sessionsRoutes)"));
    expect(coreRoutesSource).toContain("app.use('/api/admin/charge-card', adminChargeCardRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/storefront', storefrontRoutes)");
    expect(deductionRoutesSource).toContain("router.get('/clients-needing-payment'");
    expect(deductionRoutesSource).toContain("router.get('/client-last-package/:clientId'");
    expect(deductionRoutesSource).toContain("router.post('/apply-payment'");
    expect(deductionRoutesSource).toContain("router.post('/apply-package-payment'");
    expect(deductionRoutesSource).toContain("router.post('/process'");
    expect(chargeCardRoutesSource).toContain("router.get('/payment-methods/:clientId'");
    expect(chargeCardRoutesSource).toContain("router.post('/charge'");
    expect(chargeCardRoutesSource).toContain("router.post('/test-card'");
    expect(storefrontRoutesSource).toContain("router.get('/', async");
  });

  it('keeps payment and deduction calls on apiService without breaking duplicate-payment 409 handling', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.tsx');
    const apiSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.api.ts');
    const controllerSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.controller.ts');
    const combinedPaymentSource = [modalSource, apiSource, controllerSource].join('\n');

    expect(apiSource).toContain("import apiService from '../../services/api.service';");
    expect(apiSource).toContain("apiService.get('/api/sessions/deductions/clients-needing-payment')");
    expect(apiSource).toContain("apiService.get('/api/storefront')");
    expect(apiSource).toContain("apiService.get(`/api/sessions/deductions/client-last-package/${clientId}`)");
    expect(apiSource).toContain("apiService.get(`/api/admin/charge-card/payment-methods/${clientId}`)");
    expect(apiSource).toContain("apiService.post('/api/sessions/deductions/apply-payment', {");
    expect(apiSource).toContain("apiService.post('/api/sessions/deductions/apply-package-payment', payload, {");
    expect(apiSource).toContain("apiService.post('/api/admin/charge-card/charge', payload, {");
    expect(apiSource).toContain("apiService.post('/api/admin/charge-card/test-card', {");
    expect(apiSource).toContain("apiService.post('/api/sessions/deductions/process')");
    expect(apiSource).toContain('validateStatus: (status) => status < 500');
    expect(controllerSource).toContain('response.status === 409');

    expect(combinedPaymentSource).not.toContain("localStorage.getItem('token')");
    expect(combinedPaymentSource).not.toContain('Authorization');
    expect(combinedPaymentSource).not.toContain('fetch(');
  });

  it('defensively filters non-deducting client sources out of payment recovery UI', () => {
    const apiSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.api.ts');
    const controllerSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.controller.ts');
    const typesSource = readSource('frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.types.ts');
    const deductionServiceSource = readSource('backend/services/sessionDeductionService.mjs');

    expect(deductionServiceSource).toContain('clientSource: { [Op.notIn]: Array.from(NON_DEDUCTING_CLIENT_SOURCES) }');
    expect(typesSource).toContain('clientSource?: string;');
    expect(apiSource).toContain('isNonDeductingClientSource');
    expect(apiSource).toContain('return (result.data || []).filter');
    expect(apiSource).toContain('!isNonDeductingClientSource(client.clientSource)');
    expect(controllerSource).toContain('setClients(await fetchPaymentRecoveryClients())');
  });
});
