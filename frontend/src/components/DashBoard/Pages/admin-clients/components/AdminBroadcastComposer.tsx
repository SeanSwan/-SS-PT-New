/** Admin CommunicationCenter broadcast composer backed by /api/admin/notifications/broadcast. */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Megaphone, Send } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ButtonRow,
  ConfirmLabel,
  Field,
  FieldGrid,
  Form,
  Header,
  InlineStatus,
  InputBase,
  Panel,
  SelectBase,
  SendButton,
  Subtitle,
  TextArea,
  Title,
  TitleBlock,
} from './AdminBroadcastComposer.styles';

type BroadcastAudience = 'all' | 'clients' | 'trainers' | 'admins';
type BroadcastPriority = 'system' | 'alert';

interface AdminBroadcastComposerProps {
  onBroadcastComplete?: () => void;
}

const audienceOptions: Array<{ value: BroadcastAudience; label: string }> = [
  { value: 'all', label: 'All active users' },
  { value: 'clients', label: 'Clients' },
  { value: 'trainers', label: 'Trainers' },
  { value: 'admins', label: 'Admins' },
];

const priorityOptions: Array<{ value: BroadcastPriority; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'alert', label: 'High priority alert' },
];

const isSafeInternalPath = (value: string) => !value || (value.startsWith('/') && !value.startsWith('//'));

const deliverySummary = (created: unknown, failed: unknown, audienceCount: unknown) => {
  const deliveredCount = Number.isFinite(Number(created)) ? Number(created) : 0;
  const failedCount = Number.isFinite(Number(failed)) ? Number(failed) : 0;
  const audience = Number.isFinite(Number(audienceCount)) ? Number(audienceCount) : deliveredCount + failedCount;
  return `${deliveredCount} delivered, ${failedCount} failed across ${audience} recipients.`;
};

const AdminBroadcastComposer: React.FC<AdminBroadcastComposerProps> = ({ onBroadcastComplete }) => {
  const { authAxios } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('all');
  const [priority, setPriority] = useState<BroadcastPriority>('system');
  const [link, setLink] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const canSend = useMemo(() => (
    title.trim().length > 0 && content.trim().length > 0 && confirmed && !isSending
  ), [title, content, confirmed, isSending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;

    setSuccessMessage('');
    setErrorMessage('');

    const trimmedLink = link.trim();
    if (!isSafeInternalPath(trimmedLink)) {
      setErrorMessage('Use an internal SwanStudios path that starts with /.');
      return;
    }

    setIsSending(true);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      audience,
      type: priority,
      channels: ['in-app'],
      ...(trimmedLink ? { link: trimmedLink } : {}),
    };

    try {
      const response = await authAxios.post('/api/admin/notifications/broadcast', payload);
      if (response.data?.success !== true) {
        throw new Error(response.data?.message || 'Broadcast could not be sent.');
      }
      setSuccessMessage(deliverySummary(
        response.data.notificationsCreated,
        response.data.notificationsFailed,
        response.data.audienceCount,
      ));
      onBroadcastComplete?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Broadcast could not be sent.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Panel aria-label="Admin broadcast composer">
      <Header>
        <Megaphone size={24} aria-hidden="true" />
        <TitleBlock>
          <Title>Broadcast Center</Title>
          <Subtitle>Send in-app admin broadcasts through the canonical notification orchestrator.</Subtitle>
        </TitleBlock>
      </Header>

      {successMessage && (
        <InlineStatus $tone="success" role="status">
          <CheckCircle size={18} aria-hidden="true" />
          {successMessage}
        </InlineStatus>
      )}
      {errorMessage && (
        <InlineStatus $tone="error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          {errorMessage}
        </InlineStatus>
      )}

      <Form onSubmit={handleSubmit}>
        <Field>
          Broadcast title
          <InputBase value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field>
          Broadcast message
          <TextArea value={content} onChange={(event) => setContent(event.target.value)} />
        </Field>
        <FieldGrid>
          <Field>
            Audience
            <SelectBase value={audience} onChange={(event) => setAudience(event.target.value as BroadcastAudience)}>
              {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectBase>
          </Field>
          <Field>
            Priority
            <SelectBase value={priority} onChange={(event) => setPriority(event.target.value as BroadcastPriority)}>
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectBase>
          </Field>
        </FieldGrid>
        <Field>
          Link
          <InputBase value={link} onChange={(event) => setLink(event.target.value)} placeholder="/dashboard/client/schedule" />
        </Field>
        <ConfirmLabel>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Send this live broadcast to the selected audience.
        </ConfirmLabel>
        <ButtonRow>
          <SendButton type="submit" disabled={!canSend}>
            <Send size={18} aria-hidden="true" />
            {isSending ? 'Sending...' : 'Send broadcast'}
          </SendButton>
        </ButtonRow>
      </Form>
    </Panel>
  );
};

export default AdminBroadcastComposer;