import { getClientSessionSignal } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';

export interface TrainerClientReportAssignment {
  assignedAt?: string;
  isActive?: boolean;
  client: {
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: string;
    membershipLevel?: string;
    clientSource?: 'swanstudios' | 'move_fitness' | 'external';
    availableSessions?: number;
    totalSessionsCompleted?: number;
    lastSessionDate?: string;
    nextSessionDate?: string;
  };
}

const HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Status',
  'Membership',
  'Session Policy',
  'Billing Note',
  'Completed Sessions',
  'Last Session',
  'Next Session',
  'Assigned At',
  'Assignment Active',
];

const csvCell = (value: unknown): string => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const buildTrainerClientReportCsv = (
  assignments: TrainerClientReportAssignment[],
): string => {
  const rows = assignments.map(({ assignedAt, isActive, client }) => {
    const sessionSignal = getClientSessionSignal(client);

    return [
      client.firstName,
      client.lastName,
      client.email,
      client.status,
      client.membershipLevel,
      sessionSignal.label,
      sessionSignal.note,
      client.totalSessionsCompleted ?? 0,
      client.lastSessionDate,
      client.nextSessionDate,
      assignedAt,
      isActive ? 'yes' : 'no',
    ];
  });

  return [
    HEADERS.join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n');
};

export const downloadTrainerClientReport = (
  assignments: TrainerClientReportAssignment[],
  now = new Date(),
): void => {
  const csv = buildTrainerClientReportCsv(assignments);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `swanstudios-trainer-clients-${now.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
