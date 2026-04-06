/**
 * +--- PANEL: CVE Watch List ------------------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: Track specific CVEs relevant to the SwanStudios tech      |
 * |          stack (Node.js, Express, React, PostgreSQL, Sequelize).   |
 * |          Auto-matches against project dependencies.                |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import { Eye, Plus, ExternalLink } from 'lucide-react';
import type { CVEWatch, CVEStatus } from './security.types';
import {
  SecurityCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  CVEStatusChip, SeverityBadge, ActionButton, DataTable, PillTabs, PillTab,
} from './security.styles';

// --- Demo data -----------------------------------------------------------
const DEMO_CVE_WATCHLIST: CVEWatch[] = [
  {
    id: '1', cveId: 'CVE-2026-0892', title: 'Sequelize SQL injection in raw queries',
    severity: 'critical', status: 'affected', affectedTech: 'Sequelize',
    publishedDate: '2026-03-15', description: 'SQL injection through unparameterized replacements in raw queries. Upgrade to 6.37.5.',
    cvssScore: 9.1, references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-0892'],
  },
  {
    id: '2', cveId: 'CVE-2026-1234', title: 'Express prototype pollution in body-parser',
    severity: 'high', status: 'monitoring', affectedTech: 'Express',
    publishedDate: '2026-03-28', description: 'Prototype pollution via crafted JSON payloads.',
    cvssScore: 7.5, references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-1234'],
  },
  {
    id: '3', cveId: 'CVE-2026-3100', title: 'pg connection string password leak in logs',
    severity: 'high', status: 'affected', affectedTech: 'PostgreSQL (pg)',
    publishedDate: '2026-03-30', description: 'Connection strings with embedded passwords logged in debug mode.',
    cvssScore: 7.2, references: ['https://github.com/advisories/GHSA-xxxx-xxxx-xxxx'],
  },
  {
    id: '4', cveId: 'CVE-2026-2301', title: 'React DOM XSS in dangerouslySetInnerHTML',
    severity: 'medium', status: 'monitoring', affectedTech: 'React',
    publishedDate: '2026-04-01', description: 'Reflected XSS when unsanitized HTML is passed to dangerouslySetInnerHTML.',
    cvssScore: 5.4, references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-2301'],
  },
  {
    id: '5', cveId: 'CVE-2025-48223', title: 'Node.js HTTP request smuggling',
    severity: 'high', status: 'patched', affectedTech: 'Node.js',
    publishedDate: '2025-12-10', description: 'HTTP request smuggling via malformed Transfer-Encoding headers. Fixed in Node 20.11.0.',
    cvssScore: 7.5, references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-48223'],
  },
  {
    id: '6', cveId: 'CVE-2026-0456', title: 'jsonwebtoken timing side-channel',
    severity: 'low', status: 'mitigated', affectedTech: 'jsonwebtoken',
    publishedDate: '2026-02-20', description: 'Timing side-channel in HMAC verification. Mitigated by rate limiting.',
    cvssScore: 3.7, references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-0456'],
  },
];

type StatusFilter = 'all' | CVEStatus;

// --- Component -----------------------------------------------------------
const CVEWatchList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = statusFilter === 'all'
    ? DEMO_CVE_WATCHLIST
    : DEMO_CVE_WATCHLIST.filter(c => c.status === statusFilter);

  const affectedCount = DEMO_CVE_WATCHLIST.filter(c => c.status === 'affected').length;
  const monitoringCount = DEMO_CVE_WATCHLIST.filter(c => c.status === 'monitoring').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg="rgba(96, 192, 240, 0.12)" $color="#60C0F0">
              <Eye size={18} />
            </IconWrap>
            <div>
              <CardTitle>CVE Watch List</CardTitle>
              <CardSubtitle>
                Tracking {DEMO_CVE_WATCHLIST.length} CVEs — {affectedCount} affected, {monitoringCount} monitoring
              </CardSubtitle>
            </div>
          </HeaderLeft>
          <ActionButton $variant="secondary">
            <Plus size={14} style={{ marginRight: 6 }} />
            Add CVE
          </ActionButton>
        </CardHeader>

        <PillTabs>
          {(['all', 'affected', 'monitoring', 'mitigated', 'patched'] as StatusFilter[]).map(s => (
            <PillTab key={s} $active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? `All (${DEMO_CVE_WATCHLIST.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${DEMO_CVE_WATCHLIST.filter(c => c.status === s).length})`}
            </PillTab>
          ))}
        </PillTabs>

        <div style={{ overflowX: 'auto' }}>
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
                  <tr
                    onClick={() => setExpandedId(expandedId === cve.id ? null : cve.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontSize: 12, color: '#60C0F0' }}>{cve.cveId}</td>
                    <td style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 500 }}>{cve.title}</td>
                    <td style={{ fontSize: 12 }}>{cve.affectedTech}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: cve.cvssScore >= 9 ? '#EF4444' : cve.cvssScore >= 7 ? '#F59E0B' : cve.cvssScore >= 4 ? '#60C0F0' : '#10B981',
                      }}>
                        {cve.cvssScore.toFixed(1)}
                      </span>
                    </td>
                    <td><SeverityBadge $severity={cve.severity}>{cve.severity}</SeverityBadge></td>
                    <td><CVEStatusChip $status={cve.status}>{cve.status}</CVEStatusChip></td>
                  </tr>
                  {expandedId === cve.id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--bg-base, #0A0A0F)', padding: 16 }}>
                        <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'var(--text-secondary, rgba(224,236,244,0.7))', margin: '0 0 8px' }}>
                          {cve.description}
                        </p>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'rgba(224,236,244,0.4)' }}>
                          <span>Published: {cve.publishedDate}</span>
                          {cve.references.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#60C0F0' }}>
                              <ExternalLink size={11} /> {cve.references.length} reference{cve.references.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </DataTable>
        </div>
      </SecurityCard>
    </div>
  );
};

export default CVEWatchList;
