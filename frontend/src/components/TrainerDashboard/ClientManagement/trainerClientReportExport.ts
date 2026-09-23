import { getClientSessionSignal } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import { escapeCsvValue } from '@/utils/csvEscape';

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
    /** null = stats unknown (fetch failed); the report exports "unknown", never a fabricated zero. */
    totalSessionsCompleted?: number | null;
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

// This report's contract is that EVERY field is quoted, and its test asserts that
// exact shape (`"Ava","Move",...`). That contract is preserved here — the shared
// escaper supplies the RFC 4180 doubling AND the formula neutralisation, and the
// wrapper only re-applies quoting when the escaper chose not to quote.
//
// The private version quoted correctly but neutralised nothing: a client named
// `=1+1` or `=cmd|'/c calc'!A0` reached the trainer's spreadsheet as a live formula.
const csvCell = (value: unknown): string => {
  const escaped = escapeCsvValue(value);
  return escaped.startsWith('"') ? escaped : `"${escaped}"`;
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
      client.totalSessionsCompleted ?? 'unknown',
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
