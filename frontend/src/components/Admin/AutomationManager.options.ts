import type { AutomationStep } from '../../hooks/useAutomationSequences';

export type TemplateOption = { value: string; label: string };

export const triggerEventOptions = [
  { value: 'client_created', label: 'Client Created' },
  { value: 'session_completed', label: 'Session Completed' },
  { value: 'package_purchased', label: 'Package Purchased' },
];

export const channelOptions: Array<{ value: AutomationStep['channel']; label: string }> = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
];
