/**
 * +--- PANEL: Dependency Health Widget --------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: npm audit results, outdated dependency tracker, license   |
 * |          compliance overview. One-click fix suggestions.           |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { DependencyEntry, NpmAuditSummary } from './security.types';
import { SEVERITY_CONFIG } from './security.types';
import {
  SecurityCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  MetricRow, MetricBox, MetricValue, MetricLabel,
  DepStatusChip, ActionButton, DataTable, PillTabs, PillTab,
} from './security.styles';

// --- Demo data -----------------------------------------------------------
const DEMO_AUDIT: NpmAuditSummary = {
  totalPackages: 1247,
  vulnerabilities: { critical: 0, high: 2, medium: 3, low: 5 },
  fixAvailable: 8,
  lastAuditDate: '2026-04-05T08:30:00Z',
};

const DEMO_DEPS: DependencyEntry[] = [
  { name: 'express', currentVersion: '4.19.2', latestVersion: '4.21.0', status: 'outdated', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-03-15', type: 'production' },
  { name: 'sequelize', currentVersion: '6.37.3', latestVersion: '6.37.5', status: 'vulnerable', license: 'MIT', licenseRisk: 'none', vulnerabilities: 1, lastUpdated: '2026-02-28', type: 'production' },
  { name: 'react', currentVersion: '18.3.1', latestVersion: '18.3.1', status: 'current', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-04-01', type: 'production' },
  { name: 'react-dom', currentVersion: '18.3.1', latestVersion: '18.3.2', status: 'outdated', license: 'MIT', licenseRisk: 'none', vulnerabilities: 1, lastUpdated: '2026-04-01', type: 'production' },
  { name: 'pg', currentVersion: '8.13.0', latestVersion: '8.13.1', status: 'vulnerable', license: 'MIT', licenseRisk: 'none', vulnerabilities: 1, lastUpdated: '2026-03-20', type: 'production' },
  { name: 'jsonwebtoken', currentVersion: '9.0.2', latestVersion: '9.0.3', status: 'outdated', license: 'MIT', licenseRisk: 'none', vulnerabilities: 1, lastUpdated: '2026-01-15', type: 'production' },
  { name: 'styled-components', currentVersion: '6.1.13', latestVersion: '6.1.13', status: 'current', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-03-10', type: 'production' },
  { name: 'victory', currentVersion: '37.3.2', latestVersion: '37.3.2', status: 'current', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-03-25', type: 'production' },
  { name: 'vite', currentVersion: '5.4.14', latestVersion: '5.5.0', status: 'outdated', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-03-01', type: 'dev' },
  { name: 'vitest', currentVersion: '2.1.8', latestVersion: '2.1.8', status: 'current', license: 'MIT', licenseRisk: 'none', vulnerabilities: 0, lastUpdated: '2026-03-28', type: 'dev' },
];

type FilterTab = 'all' | 'vulnerable' | 'outdated' | 'current';

// --- Component -----------------------------------------------------------
const DependencyHealthWidget: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const audit = DEMO_AUDIT;

  const filtered = activeFilter === 'all'
    ? DEMO_DEPS
    : DEMO_DEPS.filter(d => d.status === activeFilter);

  const totalVulns = audit.vulnerabilities.critical + audit.vulnerabilities.high + audit.vulnerabilities.medium + audit.vulnerabilities.low;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Audit summary */}
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg="rgba(139, 92, 246, 0.12)" $color="#8B5CF6">
              <Package size={18} />
            </IconWrap>
            <div>
              <CardTitle>npm Audit Summary</CardTitle>
              <CardSubtitle>{audit.totalPackages} packages scanned — {new Date(audit.lastAuditDate).toLocaleDateString()}</CardSubtitle>
            </div>
          </HeaderLeft>
          <ActionButton $variant="secondary">
            <AlertTriangle size={14} style={{ marginRight: 6 }} />
            Run npm audit
          </ActionButton>
        </CardHeader>

        <MetricRow>
          <MetricBox>
            <MetricValue $color={SEVERITY_CONFIG.critical.color}>{audit.vulnerabilities.critical}</MetricValue>
            <MetricLabel>Critical</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color={SEVERITY_CONFIG.high.color}>{audit.vulnerabilities.high}</MetricValue>
            <MetricLabel>High</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color={SEVERITY_CONFIG.medium.color}>{audit.vulnerabilities.medium}</MetricValue>
            <MetricLabel>Medium</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color={SEVERITY_CONFIG.low.color}>{audit.vulnerabilities.low}</MetricValue>
            <MetricLabel>Low</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="#10B981">{audit.fixAvailable}</MetricValue>
            <MetricLabel>Fixable</MetricLabel>
          </MetricBox>
        </MetricRow>

        {totalVulns > 0 && audit.fixAvailable > 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10B981',
            fontFamily: 'Fira Code, monospace',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <CheckCircle size={16} />
            {audit.fixAvailable} of {totalVulns} vulnerabilities can be auto-fixed with <code style={{ background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 4 }}>npm audit fix</code>
          </div>
        )}
      </SecurityCard>

      {/* Dependency table */}
      <SecurityCard>
        <CardHeader>
          <CardTitle>Dependency Health ({filtered.length})</CardTitle>
        </CardHeader>

        <PillTabs>
          {(['all', 'vulnerable', 'outdated', 'current'] as FilterTab[]).map(tab => (
            <PillTab key={tab} $active={activeFilter === tab} onClick={() => setActiveFilter(tab)}>
              {tab === 'all' ? 'All' : tab === 'vulnerable' ? `Vulnerable (${DEMO_DEPS.filter(d => d.status === 'vulnerable').length})` : tab === 'outdated' ? `Outdated (${DEMO_DEPS.filter(d => d.status === 'outdated').length})` : `Current (${DEMO_DEPS.filter(d => d.status === 'current').length})`}
            </PillTab>
          ))}
        </PillTabs>

        <div style={{ overflowX: 'auto' }}>
          <DataTable>
            <thead>
              <tr>
                <th>Package</th>
                <th>Current</th>
                <th>Latest</th>
                <th>Status</th>
                <th>Vulns</th>
                <th>License</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(dep => (
                <tr key={dep.name}>
                  <td style={{ fontWeight: 600 }}>{dep.name}</td>
                  <td style={{ fontSize: 12 }}>{dep.currentVersion}</td>
                  <td style={{ fontSize: 12, color: dep.currentVersion !== dep.latestVersion ? '#F59E0B' : 'inherit' }}>
                    {dep.latestVersion}
                  </td>
                  <td><DepStatusChip $status={dep.status}>{dep.status}</DepStatusChip></td>
                  <td>
                    {dep.vulnerabilities > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444' }}>
                        <XCircle size={14} /> {dep.vulnerabilities}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                        <CheckCircle size={14} /> 0
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{dep.license}</td>
                  <td style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(224,236,244,0.5)' }}>{dep.type}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </SecurityCard>
    </div>
  );
};

export default DependencyHealthWidget;
