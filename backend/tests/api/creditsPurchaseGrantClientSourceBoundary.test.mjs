import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { countCompletedPaidTrainingSessions } from '../../services/creditGrantLoyaltyService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const creditsRoutesSource = readFileSync(resolve(__dirname, '../../routes/creditsRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/creditsController.mjs'), 'utf8');

describe('credits purchase-and-grant clientSource boundary', () => {
  it('converts direct purchase credit grants to SwanStudios before future deductions', () => {
    const start = controllerSource.indexOf('async adminPurchaseAndGrant');
    const end = controllerSource.indexOf('async trainerPurchaseAndGrant', start);
    const source = controllerSource.slice(start, end);

    expect(coreRoutesSource).toContain("app.use('/api', creditsRoutes)");
    expect(creditsRoutesSource).toContain("'/admin/credits/purchase-and-grant'");
    expect(creditsRoutesSource).toContain("'/trainer/credits/purchase-and-grant'");
    expect(controllerSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source).toContain("clientCreditUpdate.clientSource = 'swanstudios';");
    expect(source).toContain("clientCreditUpdate.sessionBillingMode = 'paid_sessions';");
    expect(source.indexOf('isNonDeductingClient(client)'))
      .toBeLessThan(source.indexOf('await client.update(clientCreditUpdate'));
    expect(source).not.toContain('await client.update({ availableSessions: newCreditsBalance }');
  });

  it('bases loyalty bump eligibility on completed deducted sessions, not unused credit inventory', async () => {
    const transaction = { id: 'tx-loyalty-proof' };
    const Session = { count: vi.fn().mockResolvedValue(44) };
    const DailyWorkoutForm = { count: vi.fn().mockResolvedValue(103) };

    await expect(
      countCompletedPaidTrainingSessions(17, { Session, DailyWorkoutForm }, { transaction })
    ).resolves.toBe(103);

    expect(Session.count).toHaveBeenCalledWith({
      where: { userId: 17, status: 'completed', sessionDeducted: true },
      transaction,
    });
    expect(DailyWorkoutForm.count).toHaveBeenCalledWith({
      where: { clientId: 17, sessionDeducted: true },
      transaction,
    });
    expect(controllerSource).toContain('countCompletedPaidTrainingSessions');
    expect(controllerSource).not.toContain('const clientCompletedSessions = (client.availableSessions || 0)');
  });
});
