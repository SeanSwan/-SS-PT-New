/**
 * ┌─── PANEL: SEO Audit ────────────────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Site health score, meta tag analysis, keyword       │
 * │          density, page speed insights, crawl issues.         │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import {
  VictoryPie, VictoryAnimation, VictoryLabel,
} from 'victory';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, DataTable,
} from './marketing.styles';
import type { SEOAuditResult, SEOIssueType } from './marketing.types';

// ─── Demo Data ─────────────────────────────────────────────────
const DEMO_AUDIT: SEOAuditResult = {
  healthScore: 73,
  categories: {
    metaTags: { score: 68, issues: 4 },
    pageSpeed: { score: 82, issues: 2 },
    mobileFriendly: { score: 91, issues: 1 },
    contentQuality: { score: 65, issues: 5 },
  },
  issues: [
    { type: 'error', message: 'Missing meta description on /pricing page', page: '/pricing' },
    { type: 'error', message: 'Title tag exceeds 60 chars on /about', page: '/about' },
    { type: 'error', message: 'Missing alt text on 3 hero images', page: '/home' },
    { type: 'error', message: 'No structured data (LocalBusiness schema)', page: '/home' },
    { type: 'warning', message: 'H1 tag missing on /services', page: '/services' },
    { type: 'warning', message: 'Low keyword density for "personal trainer"', page: '/home' },
    { type: 'warning', message: 'Large image files (>500KB) slowing page speed', page: '/gallery' },
    { type: 'warning', message: 'No sitemap.xml detected', page: '/' },
    { type: 'info', message: 'Consider adding FAQ schema for service pages', page: '/services' },
    { type: 'info', message: 'Internal linking could be strengthened', page: '/' },
    { type: 'info', message: 'Add Google Business Profile consistency check', page: '/' },
    { type: 'info', message: 'Consider location-specific landing pages for golf clients', page: '/' },
  ],
  lastAuditDate: '2026-04-05T10:30:00Z',
};

// ─── Styled Components ─────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ScoreCard = styled(MarketingCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
`;

const ScoreLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  text-align: center;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const CategoryCard = styled(MarketingCard)`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

const CatScore = styled.span<{ $score: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $score }) =>
    $score >= 80 ? '#10B981' : $score >= 50 ? '#F59E0B' : '#EF4444'};
`;

const IssueIcon: Record<SEOIssueType, React.ReactNode> = {
  error: <AlertCircle size={14} color="#EF4444" />,
  warning: <AlertTriangle size={14} color="#F59E0B" />,
  info: <Info size={14} color="#60C0F0" />,
};

const IssueBadge = styled.span<{ $type: SEOIssueType }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  background: ${({ $type }) =>
    $type === 'error' ? 'rgba(239, 68, 68, 0.12)' :
    $type === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
    'rgba(96, 192, 240, 0.12)'};
  color: ${({ $type }) =>
    $type === 'error' ? '#EF4444' : $type === 'warning' ? '#F59E0B' : '#60C0F0'};
`;

const PageCell = styled.td`
  && { font-size: 12px; opacity: 0.6; }
`;

const LastAudit = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  margin-top: 4px;
`;

// ─── Score Gauge (Victory donut) ───────────────────────────────
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <VictoryPie
        standalone={false}
        width={160}
        height={160}
        innerRadius={58}
        cornerRadius={6}
        data={[{ x: 'score', y: score }, { x: 'rest', y: 100 - score }]}
        colorScale={[color, hexAlpha(color, 0.1)]}
        labels={() => ''}
        animate={{ duration: 800 }}
        padding={10}
      />
      <VictoryLabel
        textAnchor="middle"
        verticalAnchor="middle"
        x={80}
        y={75}
        text={String(score)}
        style={{ fontSize: 36, fontWeight: 700, fill: color, fontFamily: 'Fira Code' }}
      />
      <VictoryLabel
        textAnchor="middle"
        verticalAnchor="middle"
        x={80}
        y={100}
        text="/ 100"
        style={{ fontSize: 12, fill: 'rgba(224,236,244,0.5)', fontFamily: 'Fira Code' }}
      />
    </svg>
  );
};

// ─── Component ─────────────────────────────────────────────────
const SEOAuditPanel: React.FC = () => {
  const [data, setData] = useState<SEOAuditResult>(DEMO_AUDIT);
  const [loading, setLoading] = useState(false);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      // API stub — uncomment when backend is ready:
      // const res = await authAxios.post('/api/admin/marketing/seo-audit');
      // if (res.data?.data) setData(res.data.data);
      await new Promise(r => setTimeout(r, 1200));
      setData({ ...DEMO_AUDIT, healthScore: 73 + Math.floor(Math.random() * 10 - 5) });
    } catch {
      setData(DEMO_AUDIT);
    } finally {
      setLoading(false);
    }
  }, []);

  const errors = data.issues.filter(i => i.type === 'error').length;
  const warnings = data.issues.filter(i => i.type === 'warning').length;

  return (
    <>
      <Grid>
        <ScoreCard>
          <ScoreGauge score={data.healthScore} />
          <ScoreLabel>
            Site Health Score
            <br />
            <span style={{ color: '#EF4444' }}>{errors} errors</span>
            {' · '}
            <span style={{ color: '#F59E0B' }}>{warnings} warnings</span>
          </ScoreLabel>
          <ActionButton onClick={runAudit} disabled={loading} style={{ width: '100%' }}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Scanning...' : 'Run SEO Audit'}
          </ActionButton>
          <LastAudit>Last: {new Date(data.lastAuditDate).toLocaleDateString()}</LastAudit>
        </ScoreCard>

        <div>
          <CategoryGrid>
            {Object.entries(data.categories).map(([key, cat]) => (
              <CategoryCard key={key}>
                <CatLabel>{key === 'metaTags' ? 'Meta Tags' : key === 'pageSpeed' ? 'Page Speed' : key === 'mobileFriendly' ? 'Mobile Friendly' : 'Content Quality'}</CatLabel>
                <CatScore $score={cat.score}>
                  {cat.score}/100
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, opacity: 0.6 }}>
                    ({cat.issues} {cat.issues === 1 ? 'issue' : 'issues'})
                  </span>
                </CatScore>
              </CategoryCard>
            ))}
          </CategoryGrid>

          <MarketingCard>
            <CardHeader>
              <HeaderLeft>
                <IconWrap $bg="rgba(239, 68, 68, 0.12)" $color="#EF4444">
                  <AlertCircle size={18} />
                </IconWrap>
                <div>
                  <CardTitle>Issues ({data.issues.length})</CardTitle>
                  <CardSubtitle>sswanstudios.com</CardSubtitle>
                </div>
              </HeaderLeft>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <DataTable>
                <thead>
                  <tr><th>Type</th><th>Issue</th><th>Page</th></tr>
                </thead>
                <tbody>
                  {data.issues.map((issue, i) => (
                    <tr key={i}>
                      <td><IssueBadge $type={issue.type}>{IssueIcon[issue.type]} {issue.type}</IssueBadge></td>
                      <td style={{ fontFamily: "'Sora', sans-serif" }}>{issue.message}</td>
                      <PageCell>{issue.page}</PageCell>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </MarketingCard>
        </div>
      </Grid>
    </>
  );
};

export default SEOAuditPanel;
