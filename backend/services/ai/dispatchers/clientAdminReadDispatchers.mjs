/**
 * Client Admin Read Dispatchers
 * =============================
 *
 * Swan Coach admin/trainer read commands for client rosters, exports,
 * compliance risk, and billing summaries. Results are scalar and ID-based.
 */

import { Op } from 'sequelize';
import defaultSequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import logger from '../../../utils/logger.mjs';
import {
  buildAtRiskComplianceClient,
  buildAtRiskComplianceQuery,
  sortAtRiskClients,
} from '../../../utils/adminComplianceHelpers.mjs';
import {
  NON_DEDUCTING_CLIENT_SOURCES,
  normalizeClientSource,
  normalizePaidSessionCount,
} from '../../sessionBillingPolicy.mjs';
import { toDateOnly } from '../../clientTrainingSafeReadValueService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const pageFrom = (params = {}) => Math.max(1, Number.parseInt(params.page, 10) || 1);

const limitFrom = (params = {}) => (
  Math.min(100, Math.max(1, Number.parseInt(params.limit, 10) || 20))
);

const sequelizeFrom = (ctx = {}) => ctx.options?.sequelize || ctx.sequelize || defaultSequelize;

const atRiskLimitFrom = (params = {}) => params.limit || 20;

const rowData = (row) => (typeof row.toJSON === 'function' ? row.toJSON() : row);

const countFrom = (count) => (Array.isArray(count) ? count.length : Number(count) || 0);

const rowsFrom = (value) => (Array.isArray(value) ? value : []);

const sourceFor = (client) => normalizeClientSource(client.clientSource);

const countBy = (clients, predicate) => clients.filter(predicate).length;

const hasRiskLevel = (level) => (client) => client.riskLevel === level;

const isFreeTrackingClient = (client) => client.isFreeTracking;

const hasLowPaidSessionBalance = (client) => (
  !client.isFreeTracking
  && client.sessionsRemaining !== null
  && client.sessionsRemaining <= 2
);

const clientIdsFrom = (clients) => (
  clients.map((client) => client.id).filter((id) => id !== undefined && id !== null)
);

const activeClientIncludeFor = ({ ClientTrainerAssignment, ctx }) => {
  if (ctx.user?.role !== 'trainer') return [];

  return [{
    model: ClientTrainerAssignment,
    as: 'clientAssignments',
    required: true,
    where: { trainerId: ctx.user.id, status: 'active' },
    attributes: [],
  }];
};

const activeClientWhereFor = (params = {}) => {
  const where = { role: 'client' };
  if (params.status === 'active' || !params.status) where.isActive = true;
  if (params.status === 'inactive') where.isActive = false;
  return where;
};

const exportWhereFor = (params = {}) => {
  const where = { role: 'client' };
  if (params.status === 'active') where.isActive = true;
  if (params.status === 'inactive') where.isActive = false;

  const normalizedClientSource = normalizeClientSource(params.clientSource, null);
  if (normalizedClientSource) where.clientSource = normalizedClientSource;
  return where;
};

const exportSearchParamsFor = ({ format, params, where }) => {
  const searchParams = new URLSearchParams({ format });
  if (params.status === 'active' || params.status === 'inactive') {
    searchParams.set('status', params.status);
  }
  if (where.clientSource) searchParams.set('clientSource', where.clientSource);
  return searchParams;
};

const atRiskRowsFrom = async ({ sequelize, sql, replacements }) => {
  try {
    const [queryRows] = await sequelize.query(sql, { replacements });
    return rowsFrom(queryRows);
  } catch (error) {
    logger.warn('[CommandDispatcher] at_risk_clients query failed: %s', error.message);
    return [];
  }
};

const riskClientsFrom = (rows) => (
  sortAtRiskClients(rows.map(buildAtRiskComplianceClient).filter(Boolean))
);

const riskCountsFrom = (atRisk) => ({
  criticalCount: countBy(atRisk, hasRiskLevel('critical')),
  warningCount: countBy(atRisk, hasRiskLevel('warning')),
  watchCount: countBy(atRisk, hasRiskLevel('watch')),
  freeTrackingCount: countBy(atRisk, isFreeTrackingClient),
  lowSessionPaidCount: countBy(atRisk, hasLowPaidSessionBalance),
});

const firstRiskValueFrom = (atRisk, key) => atRisk[0]?.[key] ?? null;

const riskResultFrom = (atRisk) => ({
  atRiskCount: atRisk.length,
  ...riskCountsFrom(atRisk),
  firstClientId: firstRiskValueFrom(atRisk, 'id'),
  highestRiskLevel: firstRiskValueFrom(atRisk, 'riskLevel'),
});

const findBillingClient = ({ User, clientId }) => (
  User.findOne({
    where: { id: clientId, role: 'client' },
    attributes: ['id', 'availableSessions', 'clientSource'],
  })
);

const loadBillingRows = async ({ Order, Session, clientId }) => {
  const [lastPurchase, pendingOrders, nextSession, recentSessions] = await Promise.all([
    Order.findOne({
      where: { userId: clientId, status: 'completed' },
      order: [['completedAt', 'DESC']],
      attributes: ['id', 'totalAmount', 'completedAt', 'paymentAppliedAt'],
    }),
    Order.findAll({
      where: { userId: clientId, status: { [Op.in]: ['pending_payment', 'pending'] } },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'totalAmount', 'status', 'createdAt'],
    }),
    Session.findOne({
      where: {
        userId: clientId,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        sessionDate: { [Op.gte]: new Date() },
      },
      order: [['sessionDate', 'ASC']],
      attributes: ['id', 'sessionDate', 'duration', 'status'],
    }),
    Session.findAll({
      where: { userId: clientId, status: 'completed' },
      order: [['sessionDate', 'DESC']],
      limit: 5,
      attributes: ['id', 'sessionDate', 'duration', 'status'],
    }),
  ]);

  return { lastPurchase, pendingOrders, nextSession, recentSessions };
};

const sessionsRemainingFor = ({ deductsSessions, availableSessions }) => {
  if (!deductsSessions) return 0;
  return normalizePaidSessionCount(availableSessions);
};

const orderAmountOrNull = (order) => {
  if (!order) return null;
  return Number(order.totalAmount || 0);
};

const dateValueFrom = (record, key) => toDateOnly(record?.[key]);

const hasRecord = (record) => Boolean(record);

const pendingOrderTotalFrom = (orders) => (
  orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0)
);

const billingResultFrom = ({ clientId, clientSource, deductsSessions, data, billingRows }) => ({
  clientId,
  found: true,
  clientSource,
  deductsSessions,
  sessionsRemaining: sessionsRemainingFor({
    deductsSessions,
    availableSessions: data.availableSessions,
  }),
  hasLastPurchase: hasRecord(billingRows.lastPurchase),
  lastPurchaseAmount: orderAmountOrNull(billingRows.lastPurchase),
  lastPurchaseDate: dateValueFrom(billingRows.lastPurchase, 'completedAt'),
  paymentApplied: hasRecord(billingRows.lastPurchase?.paymentAppliedAt),
  pendingOrderCount: billingRows.pendingOrders.length,
  pendingOrderTotal: pendingOrderTotalFrom(billingRows.pendingOrders),
  hasNextSession: hasRecord(billingRows.nextSession),
  nextSessionDate: dateValueFrom(billingRows.nextSession, 'sessionDate'),
  recentCompletedSessions: billingRows.recentSessions.length,
  lastCompletedSessionDate: dateValueFrom(billingRows.recentSessions[0], 'sessionDate'),
});

export const dispatchListActiveClients = async (params = {}, ctx = {}) => {
  const { User, ClientTrainerAssignment } = getAllModels();
  const page = pageFrom(params);
  const limit = limitFrom(params);
  const result = await User.findAndCountAll({
    where: activeClientWhereFor(params),
    include: activeClientIncludeFor({ ClientTrainerAssignment, ctx }),
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['password', 'refreshTokenHash', 'masterPromptJson'] },
  });

  const clients = rowsFrom(result.rows).map(rowData);
  const clientIds = clientIdsFrom(clients);

  return {
    totalCount: countFrom(result.count),
    returnedCount: clients.length,
    activeCount: clients.filter((client) => client.isActive !== false).length,
    inactiveCount: clients.filter((client) => client.isActive === false).length,
    swanStudiosCount: clients.filter((client) => (
      !NON_DEDUCTING_CLIENT_SOURCES.has(sourceFor(client))
    )).length,
    moveFitnessCount: clients.filter((client) => sourceFor(client) === 'move_fitness').length,
    externalCount: clients.filter((client) => sourceFor(client) === 'external').length,
    firstClientId: clientIds[0] ?? null,
    clientIds: clientIds.length ? clientIds.join(', ') : null,
    page,
    limit,
  };
};

export const dispatchExportClientList = async (params = {}) => {
  const { User } = getAllModels();
  const format = params.format === 'json' ? 'json' : 'csv';
  const where = exportWhereFor(params);
  const searchParams = exportSearchParamsFor({ format, params, where });
  const matchingClients = await User.count({ where });

  return {
    exportReady: true,
    format,
    matchingClients: Number(matchingClients) || 0,
    downloadPath: `/api/admin/clients/export?${searchParams.toString()}`,
    includesPIIInCommandResult: false,
  };
};

export const dispatchAtRiskClients = async (params = {}, ctx = {}) => {
  const { sql, replacements } = buildAtRiskComplianceQuery({
    user: ctx.user,
    limit: atRiskLimitFrom(params),
  });
  const rows = await atRiskRowsFrom({ sequelize: sequelizeFrom(ctx), sql, replacements });
  return riskResultFrom(riskClientsFrom(rows));
};

export const dispatchClientBillingOverview = async (params = {}, ctx = {}) => {
  const { User, Order, Session } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const client = await findBillingClient({ User, clientId });

  if (!client) return { clientId, found: false };

  const data = rowData(client);
  const clientSource = normalizeClientSource(data.clientSource);
  const deductsSessions = !NON_DEDUCTING_CLIENT_SOURCES.has(clientSource);
  const billingRows = await loadBillingRows({ Order, Session, clientId });
  return billingResultFrom({ clientId, clientSource, deductsSessions, data, billingRows });
};
