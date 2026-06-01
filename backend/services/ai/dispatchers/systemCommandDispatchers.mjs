/**
 * System command dispatchers
 * ==========================
 * Read-only operational receipts for AI monitoring and validation reports.
 * Validation report bodies are intentionally not echoed into command cards.
 */
import {
  getVillageHealth,
  readLatestReport,
} from '../aiVillageService.mjs';
import {
  getMetricsSnapshot,
  getSystemHealth,
} from '../../monitoring/monitoringService.mjs';
import { getActiveAlerts } from '../../monitoring/alertEngine.mjs';

const countKeys = (value) => Object.keys(value || {}).length;

const listFirstKey = (value) => Object.keys(value || {})[0] || null;

const compactMonitoringStatus = async () => {
  const snapshot = getMetricsSnapshot();
  const health = getSystemHealth();
  const alerts = await getActiveAlerts();
  const overview = snapshot?.overview || {};

  return {
    overallStatus: health?.overall?.status || snapshot?.systemHealth?.status || 'unknown',
    successRate: health?.overall?.successRate || overview.successRate || null,
    totalRequests: Number(overview.totalRequests || 0),
    failedRequests: Number(overview.failedRequests || 0),
    totalTokensUsed: Number(overview.totalTokensUsed || 0),
    activeUsers: Number(overview.activeUsers || 0),
    activeFeatureCount: countKeys(snapshot?.features),
    activeAlertCount: Array.isArray(alerts) ? alerts.length : 0,
  };
};

export const dispatchViewValidationResults = async (params = {}) => {
  const requestedTrack = params.track || null;
  const report = readLatestReport(requestedTrack || undefined);
  const reports = report?.reports || {};
  const trackCount = countKeys(reports);

  return {
    found: Boolean(report?.summary || trackCount),
    timestamp: report?.timestamp || null,
    hasSummary: Boolean(report?.summary),
    trackCount,
    firstTrack: listFirstKey(reports),
    requestedTrack,
  };
};

export const dispatchViewAiSystemStatus = async () => compactMonitoringStatus();

export const dispatchRunHealthCheck = async (params = {}) => {
  const status = await compactMonitoringStatus();
  const village = params.includeVillage === false ? null : getVillageHealth();

  return {
    overallStatus: status.overallStatus,
    aiSuccessRate: status.successRate,
    activeFeatureCount: status.activeFeatureCount,
    activeAlertCount: status.activeAlertCount,
    villageReady: village ? Boolean(village.ready) : null,
    validationRunning: village ? Boolean(village.running) : null,
    latestValidationRun: village?.latestRun || null,
  };
};
