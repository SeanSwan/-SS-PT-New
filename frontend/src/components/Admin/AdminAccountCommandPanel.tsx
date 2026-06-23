import React, { useMemo, useState } from 'react';
import { Ban, LogOut, RotateCcw, ShieldAlert } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  CommandButton,
  CommandGrid,
  CommandHeader,
  CommandShell,
  CommandStatus,
  ReasonField,
  StatusBadge,
} from './AdminAccountCommandPanel.styles';

export interface AdminCommandTarget {
  id: string | number;
  displayName: string;
  isActive?: boolean;
  isLocked?: boolean;
  accountStatus?: string | null;
  canImpersonate?: boolean;
}

type AccountCommand = 'force-logout' | 'block' | 'deactivate' | 'reactivate';

interface CommandConfig {
  command: AccountCommand;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  isAvailable: (target: AdminCommandTarget) => boolean;
}

const commands: CommandConfig[] = [
  { command: 'force-logout', label: 'Force logout', icon: <LogOut size={16} aria-hidden="true" />, isAvailable: () => true },
  { command: 'block', label: 'Block', icon: <Ban size={16} aria-hidden="true" />, danger: true, isAvailable: (target) => target.isLocked !== true },
  { command: 'deactivate', label: 'Deactivate', icon: <ShieldAlert size={16} aria-hidden="true" />, danger: true, isAvailable: (target) => target.isActive !== false },
  { command: 'reactivate', label: 'Reactivate', icon: <RotateCcw size={16} aria-hidden="true" />, isAvailable: (target) => target.isActive === false || target.isLocked === true },
];

const statusFor = (target: AdminCommandTarget | null) => {
  if (!target) return { label: 'No account selected', tone: 'blocked' as const };
  if (target.isActive === false) return { label: 'Inactive', tone: 'blocked' as const };
  if (target.isLocked) return { label: 'Locked', tone: 'blocked' as const };
  return { label: 'Command ready', tone: 'ready' as const };
};

interface Props {
  target: AdminCommandTarget | null;
  disabled?: boolean;
  onCommandComplete: () => void;
}

const AdminAccountCommandPanel: React.FC<Props> = ({ target, disabled = false, onCommandComplete }) => {
  const [reason, setReason] = useState('');
  const [busyCommand, setBusyCommand] = useState<AccountCommand | null>(null);
  const [message, setMessage] = useState('Reason required. Commands are owner-gated and audit logged.');
  const [error, setError] = useState(false);
  const targetStatus = useMemo(() => statusFor(target), [target]);
  const reasonReady = reason.trim().length >= 3;

  const runCommand = async (command: AccountCommand, label: string) => {
    if (!target || disabled || !reasonReady || busyCommand) return;
    setBusyCommand(command);
    setError(false);
    setMessage(`${label} command running...`);
    try {
      await apiService.post(`/api/auth/admin/accounts/${target.id}/${command}`, { reason: reason.trim() });
      setReason('');
      setMessage(`${label} applied to ${target.displayName}.`);
      onCommandComplete();
    } catch (err: any) {
      setError(true);
      setMessage(err?.response?.data?.message || err?.message || `Unable to run ${label.toLowerCase()}.`);
    } finally {
      setBusyCommand(null);
    }
  };

  return (
    <CommandShell aria-label="Owner account controls">
      <CommandHeader>
        <div>
          <strong>Owner account controls</strong>
          <span>Use only for support, security response, or account lifecycle work.</span>
        </div>
        <StatusBadge $tone={targetStatus.tone}>{targetStatus.label}</StatusBadge>
      </CommandHeader>

      <ReasonField htmlFor="admin-account-command-reason">
        Reason
        <textarea
          id="admin-account-command-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Required audit reason"
          disabled={disabled || !target || Boolean(busyCommand)}
        />
      </ReasonField>

      <CommandGrid>
        {commands.map((item) => {
          const available = target ? item.isAvailable(target) : false;
          const inactive = disabled || !target || !reasonReady || !available || Boolean(busyCommand);
          return (
            <CommandButton
              key={item.command}
              type="button"
              $danger={item.danger}
              disabled={inactive}
              onClick={() => runCommand(item.command, item.label)}
              aria-label={target ? `${item.label} ${target.displayName}` : item.label}
            >
              {item.icon}
              {busyCommand === item.command ? 'Running...' : item.label}
            </CommandButton>
          );
        })}
      </CommandGrid>

      <CommandStatus $error={error} role={error ? 'alert' : 'status'} aria-live="polite">
        {message}
      </CommandStatus>
    </CommandShell>
  );
};

export default AdminAccountCommandPanel;