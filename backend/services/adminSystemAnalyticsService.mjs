/**
 * Admin System Analytics Service
 * ==============================
 *
 * Purpose:
 * - Build admin system-health payloads from live runtime and database checks.
 * - Return explicit insufficient-data markers for executive BI fields that do
 *   not have authoritative finance, market, or valuation backing yet.
 *
 * Architecture Overview:
 * Admin analytics routes -> this service -> process metrics / Sequelize health / User count.
 *
 * Truth Contract:
 * - No demo telemetry or generated business performance values.
 * - Unknown operational metrics stay at zero or empty collections until the app
 *   has a real source for those measurements.
 */

import sequelize from '../database.mjs';
import User from '../models/User.mjs';

const MB = 1024 * 1024;

const round = (value, precision = 2) => Number(value.toFixed(precision));

const toPercent = (value) => Math.max(0, Math.min(100, round(value)));

const zeroChanges = () => ({
  revenue: 0,
  growth: 0,
  ltv: 0,
  market: 0,
  profit: 0,
  brand: 0,
  advantage: 0,
  valuation: 0,
});

const zeroProjection = () => ({
  revenue: 0,
  growth: 0,
  confidence: 0,
});

function getMemoryMetrics() {
  const memory = process.memoryUsage();
  const heapUsedPercent = memory.heapTotal > 0
    ? toPercent((memory.heapUsed / memory.heapTotal) * 100)
    : 0;

  return {
    rssMb: Math.round(memory.rss / MB),
    heapUsedMb: Math.round(memory.heapUsed / MB),
    heapTotalMb: Math.round(memory.heapTotal / MB),
    heapUsedPercent,
  };
}

function getCpuUsagePercent() {
  const cpu = process.cpuUsage();
  const uptimeMicros = Math.max(process.uptime() * 1_000_000, 1);
  return toPercent(((cpu.user + cpu.system) / uptimeMicros) * 100);
}

async function checkDatabaseHealth() {
  const startedAt = Date.now();

  try {
    await sequelize.authenticate();
    return {
      status: 'online',
      responseTime: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: 'offline',
      responseTime: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : 'Database health check failed',
    };
  }
}

export async function buildSystemHealthStatistics() {
  const db = await checkDatabaseHealth();
  const memory = getMemoryMetrics();
  const cpuUsage = getCpuUsagePercent();
  const uptimePercent = db.status === 'online' ? 100 : 0;

  return {
    uptime: uptimePercent,
    changePercent: 0,
    responseTime: db.responseTime,
    errorRate: 0,
    throughput: 0,
    uptimeSeconds: Math.round(process.uptime()),
    systemMetrics: {
      errorRate: 0,
      throughput: 0,
      uptime: uptimePercent,
      cpuUsage,
      memoryUsage: memory.heapUsedPercent,
    },
    services: [
      {
        name: 'Database',
        status: db.status,
        responseTime: db.responseTime,
        uptime: uptimePercent,
        requestsPerMin: 0,
        memoryRssMb: memory.rssMb,
      },
    ],
    trend: [db.responseTime],
  };
}

export async function buildSystemHealthSnapshot() {
  const stats = await buildSystemHealthStatistics();
  const memory = getMemoryMetrics();
  const cpuUsage = getCpuUsagePercent();
  const now = new Date();
  const databaseService = stats.services[0];
  const isHealthy = databaseService.status === 'online';

  return {
    overallStatus: isHealthy ? 'healthy' : 'degraded',
    systemMetrics: {
      uptime: stats.uptime,
      responseTime: stats.responseTime,
      throughput: 0,
      errorRate: 0,
      cpuUsage,
      memoryUsage: memory.heapUsedPercent,
    },
    services: [
      {
        name: 'API Runtime',
        status: 'online',
        responseTime: 0,
        uptime: 100,
        requestsPerMin: 0,
        memoryRssMb: memory.rssMb,
        icon: 'server',
      },
      {
        ...databaseService,
        icon: 'database',
      },
    ],
    performanceHistory: [
      {
        time: now.toISOString(),
        hour: now.getHours(),
        responseTime: stats.responseTime,
        cpuUsage,
        memoryUsage: memory.heapUsedPercent,
        throughput: 0,
      },
    ],
    alerts: isHealthy
      ? []
      : [{
          level: 'critical',
          message: 'Database health check failed',
          time: now.toISOString(),
        }],
    resourceUsage: [
      { name: 'CPU', usage: cpuUsage, max: 100 },
      { name: 'Memory', usage: memory.heapUsedPercent, max: 100 },
    ],
  };
}

export async function buildExecutiveSummary() {
  const userCount = await User.count().catch(() => 0);

  return {
    source: 'runtime-and-user-count',
    dataQuality: 'insufficient_financial_data',
    userCount,
    executiveKPIs: {
      totalRevenue: 0,
      annualGrowthRate: 0,
      customerLifetimeValue: 0,
      marketCapture: 0,
      profitMargin: 0,
      brandStrength: 0,
      competitiveAdvantage: 0,
      futureValuation: 0,
    },
    changes: zeroChanges(),
    growthTrajectory: [],
    marketPosition: [],
    financialProjections: {
      nextQuarter: zeroProjection(),
      nextYear: zeroProjection(),
      threeYear: zeroProjection(),
    },
    riskAssessment: {
      overallRisk: 'Unknown',
      marketRisk: 0,
      competitionRisk: 0,
      operationalRisk: 0,
      financialRisk: 0,
    },
    limitations: [
      'Revenue, market, profit, customer lifetime value, and valuation require authoritative datasets before display as production truth.',
    ],
  };
}
