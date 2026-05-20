/**
 * +--- PANEL: CVE Watch List ------------------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: Track CVEs relevant to the SwanStudios tech stack and     |
 * |          expand each entry for mitigation notes and references.     |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import { ExternalLink, Eye, Plus } from 'lucide-react';
import type { CVEStatus, CVEWatch } from './security.types';
import {
  CardHeader, CardSubtitle, CardTitle, CVEStatusChip, DataTable, EmptyState,
  HeaderLeft, IconWrap, PillTab, PillTabs, SecurityCard, SeverityBadge,
} from './security.styles';
import {
  ClickableRow, CveIdCell, CveTitleCell, CvssValue, ExpandedCell,
  ExpandedDescription, ExpandedMeta, InlineActionButton, PanelStack,
  ReferenceMeta, SmallCell, TableScroll,
} from './securityPanelExtras.styles';

type StatusFilter = 'all' | CVEStatus;

const WATCHLIST: CVEWatch[] = [];
const STATUS_FILTERS: StatusFilter[] = ['all', 'affected', 'monitoring', 'mitigated', 'patched'];

const CVEWatchList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = statusFilter === 'all'
    ? WATCHLIST
    : WATCHLIST.filter(c => c.status === statusFilter);
  const affectedCount = WATCHLIST.filter(c => c.status === 'affected').length;
  const monitoringCount = WATCHLIST.filter(c => c.status === 'monitoring').length;

  return (
    <PanelStack>
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap
              $bg="color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)"
              $color="var(--accent-primary, #60C0F0)"
            >
              <Eye size={18} />
            </IconWrap>
            <div>
              <CardTitle>CVE Watch List</CardTitle>
              <CardSubtitle>
                Tracking {WATCHLIST.length} CVEs - {affectedCount} affected, {monitoringCount} monitoring
              </CardSubtitle>
            </div>
          </HeaderLeft>
          <InlineActionButton $variant="secondary">
            <Plus size={14} />
            Add CVE
          </InlineActionButton>
        </CardHeader>

        <PillTabs>
          {STATUS_FILTERS.map(s => (
            <PillTab key={s} $active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === 'all'
                ? `All (${WATCHLIST.length})`
                : `${s.charAt(0).toUpperCase() + s.slice(1)} (${WATCHLIST.filter(c => c.status === s).length})`}
            </PillTab>
          ))}
        </PillTabs>

        {filtered.length === 0 ? (
          <EmptyState>
            <Eye size={32} />
            No CVEs are being watched yet. Add entries after the CVE data source is connected.
          </EmptyState>
        ) : (
          <TableScroll>
            <DataTable>
              <thead>
                <tr>
                  <th>CVE ID</th>
                  <th>Title</th>
                  <th>Tech</th>
                  <th>CVSS</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(cve => (
                  <React.Fragment key={cve.id}>
                    <ClickableRow onClick={() => setExpandedId(expandedId === cve.id ? null : cve.id)}>
                      <CveIdCell>{cve.cveId}</CveIdCell>
                      <CveTitleCell>{cve.title}</CveTitleCell>
                      <SmallCell>{cve.affectedTech}</SmallCell>
                      <td><CvssValue $score={cve.cvssScore}>{cve.cvssScore.toFixed(1)}</CvssValue></td>
                      <td><SeverityBadge $severity={cve.severity}>{cve.severity}</SeverityBadge></td>
                      <td><CVEStatusChip $status={cve.status}>{cve.status}</CVEStatusChip></td>
                    </ClickableRow>
                    {expandedId === cve.id && (
                      <tr>
                        <ExpandedCell colSpan={6}>
                          <ExpandedDescription>{cve.description}</ExpandedDescription>
                          <ExpandedMeta>
                            <span>Published: {cve.publishedDate}</span>
                            {cve.references.length > 0 && (
                              <ReferenceMeta>
                                <ExternalLink size={11} />
                                {cve.references.length} reference{cve.references.length > 1 ? 's' : ''}
                              </ReferenceMeta>
                            )}
                          </ExpandedMeta>
                        </ExpandedCell>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </DataTable>
          </TableScroll>
        )}
      </SecurityCard>
    </PanelStack>
  );
};

export default CVEWatchList;
