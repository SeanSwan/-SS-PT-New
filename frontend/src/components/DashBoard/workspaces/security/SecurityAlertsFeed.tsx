/**
 * +--- PANEL: Security Alerts Feed ------------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: Real-time feed of failed logins, suspicious API calls,    |
 * |          rate limits, auth failures, and other security events.     |
 * +--------------------------------------------------------------------+
 */

import React, { useState } from 'react';
import {
  AlertTriangle, Bell, CheckCircle, KeyRound, Settings, ShieldX, Smartphone,
  UserX, Wifi,
} from 'lucide-react';
import type { AlertType, SecurityAlert, Severity } from './security.types';
import {
  AlertCard, CardHeader, CardSubtitle, CardTitle, EmptyState, HeaderLeft,
  IconWrap, MetricBox, MetricLabel, MetricRow, MetricValue, PillTab, PillTabs,
  SecurityCard, SeverityBadge,
} from './security.styles';
import {
  AlertBody, AlertDescription, AlertMeta, AlertTitleRow, AlertTitleText,
  AlertTypeIcon, FeedStack, InlineActionButton, MutedEmptyIcon, PanelStack,
  ResolvedIconWrap,
} from './securityPanelExtras.styles';

const ALERT_TYPE_CONFIG: Record<AlertType, { icon: React.ReactNode; label: string }> = {
  failed_login: { icon: <KeyRound size={14} />, label: 'Failed Login' },
  suspicious_api: { icon: <Wifi size={14} />, label: 'Suspicious API' },
  rate_limit: { icon: <AlertTriangle size={14} />, label: 'Rate Limit' },
  auth_failure: { icon: <ShieldX size={14} />, label: 'Auth Failure' },
  permission_escalation: { icon: <UserX size={14} />, label: 'Priv Escalation' },
  config_change: { icon: <Settings size={14} />, label: 'Config Change' },
  new_device: { icon: <Smartphone size={14} />, label: 'New Device' },
};

const LIVE_ALERTS: SecurityAlert[] = [];
type FilterSeverity = 'all' | Severity;

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
    <PanelStack>
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap
              $bg="color-mix(in srgb, var(--feedback-warning, #F59E0B) 12%, transparent)"
              $color="var(--feedback-warning, #F59E0B)"
            >
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
            <MetricValue $color="var(--feedback-danger, #EF4444)">{unresolvedCount}</MetricValue>
            <MetricLabel>Unresolved</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--feedback-danger, #EF4444)">{criticalCount}</MetricValue>
            <MetricLabel>Critical</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue $color="var(--feedback-warning, #F59E0B)">{highCount}</MetricValue>
            <MetricLabel>High</MetricLabel>
          </MetricBox>
          <MetricBox>
            <MetricValue>{LIVE_ALERTS.length}</MetricValue>
            <MetricLabel>Total (24h)</MetricLabel>
          </MetricBox>
        </MetricRow>
      </SecurityCard>

      <SecurityCard>
        <CardHeader>
          <CardTitle>Event Feed ({filtered.length})</CardTitle>
          <InlineActionButton
            $variant="secondary"
            $compact
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide Resolved' : 'Show All'}
          </InlineActionButton>
        </CardHeader>

        <PillTabs>
          {(['all', 'critical', 'high', 'medium', 'low'] as FilterSeverity[]).map(s => (
            <PillTab key={s} $active={severityFilter === s} onClick={() => setSeverityFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </PillTab>
          ))}
        </PillTabs>

        <FeedStack>
          {filtered.length === 0 ? (
            <EmptyState>
              <MutedEmptyIcon>
                <CheckCircle size={32} />
              </MutedEmptyIcon>
              {LIVE_ALERTS.length === 0
                ? 'No security alerts yet. Real-time monitoring will display events here once connected.'
                : 'No alerts matching current filters'}
            </EmptyState>
          ) : (
            filtered.map(alert => (
              <AlertCard key={alert.id} $severity={alert.severity}>
                <AlertBody>
                  <AlertTitleRow>
                    <AlertTypeIcon>{ALERT_TYPE_CONFIG[alert.type].icon}</AlertTypeIcon>
                    <AlertTitleText>{alert.title}</AlertTitleText>
                    {alert.resolved && (
                      <ResolvedIconWrap>
                        <CheckCircle size={14} />
                      </ResolvedIconWrap>
                    )}
                  </AlertTitleRow>
                  <AlertDescription>{alert.description}</AlertDescription>
                  <AlertMeta>
                    <span>{alert.timestamp}</span>
                    {alert.sourceIp && <span>IP: {alert.sourceIp}</span>}
                    {alert.userId && <span>User: {alert.userId}</span>}
                  </AlertMeta>
                </AlertBody>
                <SeverityBadge $severity={alert.severity}>{alert.severity}</SeverityBadge>
              </AlertCard>
            ))
          )}
        </FeedStack>
      </SecurityCard>
    </PanelStack>
  );
};

export default SecurityAlertsFeed;
