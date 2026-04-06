/**
 * +--- PANEL: Security Alerts Feed ------------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: Real-time feed of security events — failed logins,        |
 * |          suspicious API calls, rate limits, auth failures.         |
 * |          Filterable by severity and type.                          |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import {
  Bell, ShieldX, KeyRound, Wifi, AlertTriangle, UserX,
  Settings, Smartphone, CheckCircle,
} from 'lucide-react';
import type { SecurityAlert, AlertType, Severity } from './security.types';
import {
  SecurityCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  MetricRow, MetricBox, MetricValue, MetricLabel,
  SeverityBadge, AlertCard, PillTabs, PillTab, ActionButton, EmptyState,
} from './security.styles';

// --- Alert type config ---------------------------------------------------
const ALERT_TYPE_CONFIG: Record<AlertType, { icon: React.ReactNode; label: string }> = {
  failed_login: { icon: <KeyRound size={14} />, label: 'Failed Login' },
  suspicious_api: { icon: <Wifi size={14} />, label: 'Suspicious API' },
  rate_limit: { icon: <AlertTriangle size={14} />, label: 'Rate Limit' },
  auth_failure: { icon: <ShieldX size={14} />, label: 'Auth Failure' },
  permission_escalation: { icon: <UserX size={14} />, label: 'Priv Escalation' },
  config_change: { icon: <Settings size={14} />, label: 'Config Change' },
  new_device: { icon: <Smartphone size={14} />, label: 'New Device' },
};

// --- Demo data -----------------------------------------------------------
const DEMO_ALERTS: SecurityAlert[] = [
  { id: '1', type: 'failed_login', severity: 'medium', title: 'Multiple failed login attempts', description: 'IP 192.168.1.45 attempted 5 failed logins for user admin@sswanstudios.com in 2 minutes.', timestamp: '2 minutes ago', sourceIp: '192.168.1.45', userId: 'admin', resolved: false },
  { id: '2', type: 'suspicious_api', severity: 'high', title: 'SQL injection attempt blocked', description: 'Malicious payload detected in /api/users query parameter. Request rejected by WAF.', timestamp: '15 minutes ago', sourceIp: '10.0.0.23', resolved: true },
  { id: '3', type: 'rate_limit', severity: 'low', title: 'Rate limit triggered on /api/auth/login', description: 'Client exceeded 100 requests/minute threshold. Temporary 429 response issued.', timestamp: '32 minutes ago', sourceIp: '203.0.113.50', resolved: true },
  { id: '4', type: 'auth_failure', severity: 'high', title: 'JWT token forgery attempt', description: 'Invalid signature detected on authentication token. Token payload tampered with modified role claim.', timestamp: '1 hour ago', sourceIp: '198.51.100.12', resolved: true },
  { id: '5', type: 'config_change', severity: 'medium', title: 'Environment variable modified', description: 'DATABASE_URL was updated via Render dashboard. Change logged for audit trail.', timestamp: '2 hours ago', userId: 'admin', resolved: true },
  { id: '6', type: 'new_device', severity: 'low', title: 'New device login detected', description: 'Admin account accessed from new browser (Brave/Windows 11) in Los Angeles, CA.', timestamp: '3 hours ago', userId: 'admin', resolved: true },
  { id: '7', type: 'failed_login', severity: 'medium', title: 'Brute force attempt detected', description: 'IP 172.16.0.99 attempted 12 failed logins across 3 different accounts.', timestamp: '4 hours ago', sourceIp: '172.16.0.99', resolved: false },
  { id: '8', type: 'permission_escalation', severity: 'critical', title: 'Privilege escalation attempt', description: 'Client-tier user attempted to access /api/admin/users endpoint. Request denied.', timestamp: '5 hours ago', sourceIp: '192.0.2.100', userId: 'client_42', resolved: true },
];

type FilterSeverity = 'all' | Severity;

// --- Component -----------------------------------------------------------
const SecurityAlertsFeed: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [showResolved, setShowResolved] = useState(true);

  const filtered = DEMO_ALERTS
    .filter(a => severityFilter === 'all' || a.severity === severityFilter)
    .filter(a => showResolved || !a.resolved);

  const unresolvedCount = DEMO_ALERTS.filter(a => !a.resolved).length;
  const criticalCount = DEMO_ALERTS.filter(a => a.severity === 'critical').length;
  const highCount = DEMO_ALERTS.filter(a => a.severity === 'high').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary metrics */}
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg="rgba(245, 158, 11, 0.12)" $color="#F59E0B">
              <Bell size={18} />
            </IconWrap>
            <div>
              <CardTitle>Security Alerts</CardTitle>
              <CardSubtitle>Real-time security event monitoring</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <MetricRow>
          <MetricBox>
            <MetricValue $color="#EF4444">{unresolvedCount}</MetricValue>
            <MetricLabel>Unresolved</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="#EF4444">{criticalCount}</MetricValue>
            <MetricLabel>Critical</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="#F59E0B">{highCount}</MetricValue>
            <MetricLabel>High</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue>{DEMO_ALERTS.length}</MetricValue>
            <MetricLabel>Total (24h)</MetricLabel>
          </MetricBox>
        </MetricRow>
      </SecurityCard>

      {/* Filters + Feed */}
      <SecurityCard>
        <CardHeader>
          <CardTitle>Event Feed ({filtered.length})</CardTitle>
          <ActionButton
            $variant="secondary"
            onClick={() => setShowResolved(!showResolved)}
            style={{ fontSize: 12, padding: '6px 14px', minHeight: 36 }}
          >
            {showResolved ? 'Hide Resolved' : 'Show All'}
          </ActionButton>
        </CardHeader>

        <PillTabs>
          {(['all', 'critical', 'high', 'medium', 'low'] as FilterSeverity[]).map(s => (
            <PillTab key={s} $active={severityFilter === s} onClick={() => setSeverityFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </PillTab>
          ))}
        </PillTabs>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <EmptyState>
              <CheckCircle size={32} style={{ opacity: 0.4 }} />
              No alerts matching current filters
            </EmptyState>
          ) : (
            filtered.map(alert => (
              <AlertCard key={alert.id} $severity={alert.severity}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary, rgba(224,236,244,0.5))' }}>
                      {ALERT_TYPE_CONFIG[alert.type].icon}
                    </span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E0ECF4)' }}>
                      {alert.title}
                    </span>
                    {alert.resolved && (
                      <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'var(--text-secondary, rgba(224,236,244,0.6))', margin: '0 0 6px' }}>
                    {alert.description}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'rgba(224,236,244,0.4)' }}>
                    <span>{alert.timestamp}</span>
                    {alert.sourceIp && <span>IP: {alert.sourceIp}</span>}
                    {alert.userId && <span>User: {alert.userId}</span>}
                  </div>
                </div>
                <SeverityBadge $severity={alert.severity}>{alert.severity}</SeverityBadge>
              </AlertCard>
            ))
          )}
        </div>
      </SecurityCard>
    </div>
  );
};

export default SecurityAlertsFeed;
