import React from 'react';
import { AdminSpecial, Package } from './adminSpecials.types';
import {
  Table,
  Th,
  Td,
  StatusBadge,
  ActionButton,
  EmptyState
} from './adminSpecials.styles';

interface AdminSpecialsTableProps {
  specials: AdminSpecial[];
  packages: Package[];
  onEdit: (special: AdminSpecial) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

const AdminSpecialsTable: React.FC<AdminSpecialsTableProps> = ({
  specials,
  packages,
  onEdit,
  onToggle,
  onDelete
}) => {
  if (specials.length === 0) {
    return (
      <EmptyState>
        <p>No specials created yet.</p>
        <p>Click "Add Special" to create your first bonus promotion!</p>
      </EmptyState>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Bonus</Th>
          <Th>Packages</Th>
          <Th>Period</Th>
          <Th>Status</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {specials.map((special) => (
          <tr key={special.id}>
            <Td>{special.name}</Td>
            <Td>+{special.bonusSessions} sessions</Td>
            <Td>
              {special.applicablePackageIds?.length
                ? packages
                    .filter((p) => special.applicablePackageIds.includes(p.id))
                    .map((p) => p.name)
                    .join(', ') || 'Selected packages'
                : 'All packages'}
            </Td>
            <Td>
              {formatDate(special.startDate)} - {formatDate(special.endDate)}
            </Td>
            <Td>
              <StatusBadge $active={special.isActive}>
                {special.isActive ? 'Active' : 'Inactive'}
              </StatusBadge>
            </Td>
            <Td>
              <ActionButton onClick={() => onEdit(special)}>Edit</ActionButton>
              <ActionButton $variant="toggle" onClick={() => onToggle(special.id)}>
                {special.isActive ? 'Disable' : 'Enable'}
              </ActionButton>
              <ActionButton $variant="delete" onClick={() => onDelete(special.id)}>
                Delete
              </ActionButton>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default AdminSpecialsTable;
