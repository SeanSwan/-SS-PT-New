/**
 * +--- PANEL: Dependency Health Widget --------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: npm audit results, outdated dependency tracker, license   |
 * |          compliance overview, and one-click fix suggestions.        |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Package, XCircle } from 'lucide-react';
import type { DependencyEntry, NpmAuditSummary } from './security.types';
import {
  CardHeader, CardSubtitle, CardTitle, DataTable, DepStatusChip, EmptyState,
  HeaderLeft, IconWrap, MetricBox, MetricLabel, MetricRow, MetricValue,
  PillTab, PillTabs, SecurityCard,
} from './security.styles';
import {
  AutoFixBanner, AutoFixCode, InlineActionButton, LatestVersionCell,
  PanelStack, SmallCell, StatusCount, StrongCell, TableScroll, TypeCell,
} from './securityPanelExtras.styles';

type FilterTab = 'all' | 'vulnerable' | 'outdated' | 'current';

const EMPTY_AUDIT: NpmAuditSummary = {
  totalPackages: 0,
  vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
  fixAvailable: 0,
  lastAuditDate: '',
};

const DEPENDENCIES: DependencyEntry[] = [];

const FILTER_TABS: FilterTab[] = ['all', 'vulnerable', 'outdated', 'current'];

const DependencyHealthWidget: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const audit = EMPTY_AUDIT;

  const filtered = activeFilter === 'all'
    ? DEPENDENCIES
    : DEPENDENCIES.filter(d => d.status === activeFilter);
  const totalVulns = audit.vulnerabilities.critical
    + audit.vulnerabilities.high
    + audit.vulnerabilities.medium
    + audit.vulnerabilities.low;
  const lastAuditLabel = audit.lastAuditDate
    ? new Date(audit.lastAuditDate).toLocaleDateString()
    : 'not connected';

  return (
    <PanelStack>
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap
              $bg="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)"
              $color="var(--accent-secondary, #8B5CF6)"
            >
              <Package size={18} />
            </IconWrap>
            <div>
              <CardTitle>npm Audit Summary</CardTitle>
              <CardSubtitle>{audit.totalPackages} packages scanned - {lastAuditLabel}</CardSubtitle>
            </div>
          </HeaderLeft>
          <InlineActionButton $variant="secondary">
            <AlertTriangle size={14} />
            Run npm audit
          </InlineActionButton>
        </CardHeader>

        <MetricRow>
          <MetricBox>
            <MetricValue $color="var(--feedback-danger, #EF4444)">
              {audit.vulnerabilities.critical}
            </MetricValue>
            <MetricLabel>Critical</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--feedback-warning, #F59E0B)">
              {audit.vulnerabilities.high}
            </MetricValue>
            <MetricLabel>High</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--accent-primary, #60C0F0)">
              {audit.vulnerabilities.medium}
            </MetricValue>
            <MetricLabel>Medium</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--feedback-success, #10B981)">
              {audit.vulnerabilities.low}
            </MetricValue>
            <MetricLabel>Low</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--feedback-success, #10B981)">{audit.fixAvailable}</MetricValue>
            <MetricLabel>Fixable</MetricLabel>
          </MetricBox>
        </MetricRow>

        {totalVulns > 0 && audit.fixAvailable > 0 && (
          <AutoFixBanner>
            <CheckCircle size={16} />
            {audit.fixAvailable} of {totalVulns} vulnerabilities can be auto-fixed with
            <AutoFixCode>npm audit fix</AutoFixCode>
          </AutoFixBanner>
        )}
      </SecurityCard>

      <SecurityCard>
        <CardHeader>
          <CardTitle>Dependency Health ({filtered.length})</CardTitle>
        </CardHeader>

        <PillTabs>
          {FILTER_TABS.map(tab => (
            <PillTab key={tab} $active={activeFilter === tab} onClick={() => setActiveFilter(tab)}>
              {tab === 'all'
                ? 'All'
                : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${DEPENDENCIES.filter(d => d.status === tab).length})`}
            </PillTab>
          ))}
        </PillTabs>

        {filtered.length === 0 ? (
          <EmptyState>
            <Package size={32} />
            Dependency health has no connected audit data yet.
          </EmptyState>
        ) : (
          <TableScroll>
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
                    <StrongCell>{dep.name}</StrongCell>
                    <SmallCell>{dep.currentVersion}</SmallCell>
                    <LatestVersionCell $changed={dep.currentVersion !== dep.latestVersion}>
                      {dep.latestVersion}
                    </LatestVersionCell>
                    <td><DepStatusChip $status={dep.status}>{dep.status}</DepStatusChip></td>
                    <td>
                      <StatusCount $danger={dep.vulnerabilities > 0}>
                        {dep.vulnerabilities > 0 ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        {dep.vulnerabilities}
                      </StatusCount>
                    </td>
                    <SmallCell>{dep.license}</SmallCell>
                    <TypeCell>{dep.type}</TypeCell>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableScroll>
        )}
      </SecurityCard>
    </PanelStack>
  );
};

export default DependencyHealthWidget;
