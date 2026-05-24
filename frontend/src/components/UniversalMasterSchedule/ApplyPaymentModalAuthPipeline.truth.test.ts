import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('ApplyPaymentModal auth pipeline', () => {
  it('covers the mounted schedule payment modal and backend payment routes', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalsSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const deductionRoutesSource = readSource('backend/routes/sessionDeductionRoutes.mjs');
    const chargeCardRoutesSource = readSource('backend/routes/adminChargeCardRoutes.mjs');
    const storefrontRoutesSource = readSource('backend/routes/storeFrontRoutes.mjs');

    expect(scheduleSource).toContain('showPaymentModal={showPaymentModal}');
    expect(modalsSource).toContain("import ApplyPaymentModal from '../ApplyPaymentModal'");
    expect(modalsSource).toContain('<ApplyPaymentModal');
    expect(modalsSource).toContain('open={showPaymentModal}');
    expect(modalsSource).toContain('preselectedClientId={preselectedPaymentClientId ?? undefined}');

    expect(coreRoutesSource).toContain("app.use('/api/sessions/deductions', sessionDeductionRoutes)");
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

    expect(modalSource).toContain("import apiService from '../../services/api.service';");
    expect(modalSource).toContain("apiService.get('/api/sessions/deductions/clients-needing-payment')");
    expect(modalSource).toContain("apiService.get('/api/storefront')");
    expect(modalSource).toContain("apiService.get(`/api/sessions/deductions/client-last-package/${clientId}`)");
    expect(modalSource).toContain("apiService.get(`/api/admin/charge-card/payment-methods/${clientId}`)");
    expect(modalSource).toContain("apiService.post('/api/sessions/deductions/apply-payment', {");
    expect(modalSource).toContain("apiService.post('/api/sessions/deductions/apply-package-payment', payload, {");
    expect(modalSource).toContain("apiService.post('/api/admin/charge-card/charge', payload, {");
    expect(modalSource).toContain("apiService.post('/api/admin/charge-card/test-card', {");
    expect(modalSource).toContain("apiService.post('/api/sessions/deductions/process')");
    expect(modalSource).toContain('validateStatus: (status) => status < 500');

    expect(modalSource).not.toContain("localStorage.getItem('token')");
    expect(modalSource).not.toContain('Authorization');
    expect(modalSource).not.toContain('fetch(');
  });
});
