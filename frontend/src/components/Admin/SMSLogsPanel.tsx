/**
 * SMSLogsPanel
 * ============
 * Galaxy-Swan themed admin UI for viewing SMS delivery logs.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Download, RefreshCw, Send } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  ErrorText,
  HelperText,
  Label,
  FormField,
  StyledInput,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  CustomSelect
} from '../UniversalMasterSchedule/ui';
import { useSMSLogs, SmsLog } from '../../hooks/useSMSLogs';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  color: #e2e8f0;

  th, td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-align: left;
    vertical-align: top;
  }

  th {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => {
    switch (props.status) {
      case 'sent':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  }};
  background: ${props => {
    switch (props.status) {
      case 'sent':
        return 'rgba(16, 185, 129, 0.2)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.2)';
      case 'pending':
        return 'rgba(245, 158, 11, 0.2)';
      default:
        return 'rgba(148, 163, 184, 0.2)';
    }
  }};
  border: 1px solid currentColor;
`;

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const SMSLogsPanel: React.FC = () => {
  const [status, setStatus] = useState('all');
  const [userId, setUserId] = useState('');
  const [limit, setLimit] = useState('100');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedUserId = useMemo(() => {
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [userId]);

  const { data: logs, isLoading, error, refetch } = useSMSLogs({
    status: status === 'all' ? undefined : status,
    userId: parsedUserId,
    limit: Number(limit) || 100
  });

  const handleExport = () => {
    if (!logs.length) {
      setActionError('No logs available to export.');
      return;
    }

    const headers = ['id', 'status', 'recipient', 'templateName', 'message', 'scheduledFor', 'sentAt'];
    const rows = logs.map((log) => [
      log.id,
      log.status,
      log.recipient || '',
      log.templateName || '',
      (log.message || '').replace(/\\s+/g, ' ').trim(),
      log.scheduledFor || '',
      log.sentAt || ''
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `sms-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleResend = async (log: SmsLog) => {
    if (!log.recipient) {
      setActionError('Cannot resend: missing recipient.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = log.templateName ? '/api/sms/send-template' : '/api/sms/send';
      const payload = log.templateName
        ? {
          to: log.recipient,
          templateName: log.templateName,
          variables: log.payloadJson?.variables || {}
        }
        : {
          to: log.recipient,
          body: log.message || ''
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setActionError(result?.message || 'Failed to resend SMS.');
        return;
      }

      setActionMessage('SMS resent successfully.');
      await refetch();
    } catch (err) {
      console.error('Error resending SMS:', err);
      setActionError('Network error resending SMS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <FlexBox justify="space-between" align="center" wrap>
          <PageTitle>SMS Logs</PageTitle>
          <FlexBox gap="0.5rem" wrap>
            <SecondaryButton onClick={() => refetch()} disabled={isSubmitting}>
              <RefreshCw size={16} /> Refresh
            </SecondaryButton>
            <OutlinedButton onClick={handleExport} disabled={isSubmitting}>
              <Download size={16} /> Export CSV
            </OutlinedButton>
          </FlexBox>
        </FlexBox>
      </CardHeader>
      <CardBody>
        <BodyText secondary>Monitor outbound SMS delivery across automation sequences.</BodyText>

        {actionError && <ErrorText>{actionError}</ErrorText>}
        {actionMessage && <HelperText>{actionMessage}</HelperText>}
        {error && <ErrorText>{error}</ErrorText>}

        <GridContainer columns={3} gap="1rem">
          <FormField>
            <Label>Status</Label>
            <CustomSelect
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          </FormField>
          <FormField>
            <Label>User ID</Label>
            <StyledInput
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Optional client ID"
            />
          </FormField>
          <FormField>
            <Label>Limit</Label>
            <StyledInput
              type="number"
              min="10"
              max="500"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </FormField>
        </GridContainer>

        <SectionTitle>Recent Messages</SectionTitle>
        {isLoading && <SmallText secondary>Loading logs...</SmallText>}
        {!isLoading && logs.length === 0 && <SmallText secondary>No SMS logs available.</SmallText>}

        {!isLoading && logs.length > 0 && (
          <Table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Recipient</th>
                <th>Template</th>
                <th>Message</th>
                <th>Scheduled</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><StatusBadge status={log.status}>{log.status}</StatusBadge></td>
                  <td>{log.recipient || '-'}</td>
                  <td>{log.templateName || 'Manual'}</td>
                  <td>{log.message || '-'}</td>
                  <td>{formatDate(log.scheduledFor || log.createdAt)}</td>
                  <td>{formatDate(log.sentAt)}</td>
                  <td>
                    {log.status === 'failed' && (
                      <PrimaryButton onClick={() => handleResend(log)} disabled={isSubmitting}>
                        <Send size={14} /> Resend
                      </PrimaryButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};

export default SMSLogsPanel;
