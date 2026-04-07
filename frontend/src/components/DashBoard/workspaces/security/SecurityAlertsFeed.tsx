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

// --- Live data (empty until real monitoring APIs are connected) ----------
const LIVE_ALERTS: SecurityAlert[] = [];

type FilterSeverity = 'all' | Severity;

// --- Component -----------------------------------------------------------
const SecurityAlertsFeed: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [showResolved, setShowResolved] = useState(true);

  const filtered = LIVE_ALERTS
    .filter(a => severityFilter === 'all' || a.severity === severityFilter)
    .filter(a => showResolved || !a.resolved);

  const unresolvedCount = LIVE_ALERTS.filter(a => !a.resolved).length;
  const criticalCount = LIVE_ALERTS.filter(a => a.severity === 'critical').length;
  const highCount = LIVE_ALERTS.filter(a => a.severity === 'high').length;

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
            <MetricValue>{LIVE_ALERTS.length}</MetricValue>
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
              <CheckCircle size={32} style={{ opacity: 0.6 }} />
              {LIVE_ALERTS.length === 0
                ? 'No security alerts yet. Real-time monitoring will display events here once connected.'
                : 'No alerts matching current filters'}
            </EmptyState>
          ) : (
            filtered.map(alert => (
              <AlertCard key={alert.id} $severity={alert.severity}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary, rgba(224,236,244,0.85))' }}>
                      {ALERT_TYPE_CONFIG[alert.type].icon}
                    </span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E0ECF4)' }}>
                      {alert.title}
                    </span>
                    {alert.resolved && (
                      <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'var(--text-secondary, rgba(224,236,244,0.85))', margin: '0 0 6px' }}>
                    {alert.description}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'rgba(224,236,244,0.75)' }}>
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
