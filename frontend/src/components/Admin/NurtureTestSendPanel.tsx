/**
 * NurtureTestSendPanel
 * ====================
 * Owner-gated operator control to fire ONE real verification SMS through the
 * guarded backend (`POST /api/automation/test-send`). This is the only nurture
 * surface that can cause an outbound send, so it is deliberately high-friction:
 *   - an explicit confirm dialog naming the (masked) recipient before anything fires,
 *   - a clear LIVE-send warning,
 *   - confirm:true is only sent after that dialog is accepted.
 *
 * The backend is the real safety boundary (adminOnly + confirm:true + valid phone
 * + known template + owner allowlist + masked audit). This UI adds friction and
 * surfaces the guard outcomes in plain language. It sends nothing on mount/render.
 *
 * Mounted inside AutomationManager (admin route /automation), below the read-only
 * NurturePreviewPanel.
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Send, ShieldAlert } from 'lucide-react';
import {
  SectionTitle,
  SmallText,
  HelperText,
  ErrorText,
  Label,
  FormField,
  StyledInput,
  CustomSelect,
  Card,
  CardHeader,
  CardBody,
  FlexBox,
} from '../UniversalMasterSchedule/ui';
import apiService from '../../services/api.service';
import AutomationConfirmDialog, { type AutomationConfirmRequest } from './AutomationConfirmDialog';

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  color: var(--danger, #c92a54);
  background: color-mix(in srgb, var(--danger, #c92a54) 16%, var(--bg-elevated, #1a1a24));
  border: 1px solid color-mix(in srgb, var(--danger, #c92a54) 46%, transparent);
  &:disabled { opacity: 0.55; cursor: default; }
  &:hover:not(:disabled) { background: color-mix(in srgb, var(--danger, #c92a54) 26%, var(--bg-elevated, #1a1a24)); }
`;

const LiveWarning = styled(HelperText)`
  color: var(--danger, #c92a54);
`;

const ResultLine = styled(SmallText)<{ $ok: boolean }>`
  color: ${({ $ok }) => ($ok ? 'var(--success, #10b981)' : 'var(--danger, #c92a54)')};
  font-weight: 600;
`;

/** Show only the last 4 digits — never echo a full number back into the UI. */
export const maskPhone = (raw: string): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : '••••';
};

/** Map the backend's guard codes to plain operator language. */
export const TEST_SEND_ERROR_COPY: Record<string, string> = {
  confirm_required: 'Confirmation flag was missing (internal).',
  invalid_phone: 'Enter a valid phone number, e.g. +15551234567.',
  unknown_template: 'That template name is not recognized.',
  test_allowlist_missing: 'No test allowlist is configured on the server — set it before test-sending.',
  not_in_test_allowlist: 'That number is not on the server test allowlist — only allowlisted numbers can receive a test.',
};

export const describeTestSendResult = (data: any): { ok: boolean; text: string } => {
  if (data?.success) return { ok: true, text: 'Test SMS sent.' };
  const code = data?.error;
  return { ok: false, text: (code && TEST_SEND_ERROR_COPY[code]) || data?.message || 'Send failed.' };
};

type TemplateOption = { value: string; label: string };

const NurtureTestSendPanel: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [to, setTo] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<AutomationConfirmRequest | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/api/sms/templates');
        if (res.data?.success) {
          const opts = (res.data.data || []).map((t: { name: string }) => ({ value: t.name, label: t.name }));
          setTemplates(opts);
          if (opts.length) setTemplateName(opts[0].value);
        }
      } catch { /* templates are best-effort; the field stays empty */ }
    })();
  }, []);

  const doSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const res = await apiService.post('/api/automation/test-send', { to: to.trim(), templateName, confirm: true });
      setResult(describeTestSendResult(res.data?.data ?? res.data));
    } catch (err: any) {
      setResult(describeTestSendResult(err?.response?.data?.data ?? err?.response?.data));
    } finally {
      setIsSending(false);
    }
  };

  const requestSend = () => {
    setResult(null);
    if (!to.trim()) { setResult({ ok: false, text: 'Enter a phone number first.' }); return; }
    if (!templateName) { setResult({ ok: false, text: 'Choose a template first.' }); return; }
    setConfirmRequest({
      title: 'Send a LIVE test SMS?',
      message: `This fires a REAL text to ${maskPhone(to)} using "${templateName}". Standard carrier rates apply, and the server will only deliver it if that number is on the test allowlist.`,
      confirmLabel: 'Send live test',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: doSend,
    });
  };

  return (
    <Card style={{ marginTop: '1.25rem' }}>
      <CardHeader>
        <FlexBox align="center" gap="0.5rem">
          <ShieldAlert size={16} color="var(--danger, #c92a54)" />
          <SectionTitle>Test send (live)</SectionTitle>
        </FlexBox>
      </CardHeader>
      <CardBody>
        <LiveWarning>
          This sends ONE real SMS through the guarded backend — only numbers on the server test allowlist
          will actually receive it. Use it to verify delivery before arming the automation cron.
        </LiveWarning>

        <FlexBox gap="1rem" wrap align="flex-end" style={{ marginTop: '0.75rem' }}>
          <FormField style={{ flex: '1 1 200px' }}>
            <Label required>Recipient phone</Label>
            <StyledInput value={to} onChange={(e) => setTo(e.target.value)} placeholder="+15551234567" inputMode="tel" />
          </FormField>
          <FormField style={{ flex: '1 1 200px' }}>
            <Label required>Template</Label>
            <CustomSelect
              value={templateName}
              onChange={(value) => setTemplateName(String(value))}
              options={templates}
              placeholder={templates.length ? 'Choose template' : 'No templates loaded'}
            />
          </FormField>
          <SendButton onClick={requestSend} disabled={isSending} aria-label="Send live test SMS">
            <Send size={16} /> {isSending ? 'Sending…' : 'Send live test'}
          </SendButton>
        </FlexBox>

        {result && <ResultLine $ok={result.ok} style={{ marginTop: '0.85rem' }}>{result.ok ? '✓ ' : '✗ '}{result.text}</ResultLine>}
        {!templates.length && <ErrorText style={{ marginTop: '0.5rem' }}>No SMS templates available — check the server.</ErrorText>}

        <AutomationConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      </CardBody>
    </Card>
  );
};

export default NurtureTestSendPanel;