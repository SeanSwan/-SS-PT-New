/**
 * Table Compound Component
 * =========================
 * Professional compound component pattern for flexible, reusable tables
 * 
 * Usage:
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Name</Table.Head>
 *       <Table.Head>Status</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>John Doe</Table.Cell>
 *       <Table.Cell><Badge variant="success">Active</Badge></Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 */

import React, { createContext, useContext } from 'react';
import styled from 'styled-components';

// ==========================================
// CONTEXT FOR TABLE STATE
// ==========================================

interface TableContextValue {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

const TableContext = createContext<TableContextValue>({
  variant: 'default',
  size: 'md'
});

// ==========================================
// STYLED COMPONENTS
// ==========================================

const StyledTableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(10px);
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const StyledTableHeader = styled.thead`
  background: rgba(51, 65, 85, 0.6);
  border-bottom: 2px solid rgba(59, 130, 246, 0.3);
`;

const StyledTableBody = styled.tbody`
  tr:hover {
    background: rgba(59, 130, 246, 0.05);
    transition: background 0.2s ease;
  }

  tr:not(:last-child) {
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }
`;

const StyledTableRow = styled.tr<{ striped?: boolean; index?: number }>`
  ${props => props.striped && props.index && props.index % 2 === 0 && `
    background: rgba(51, 65, 85, 0.2);
  `}
`;

const StyledTableHead = styled.th<{ align?: 'left' | 'center' | 'right' }>`
  padding: 1rem;
  text-align: ${props => props.align || 'left'};
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  &:first-child {
    padding-left: 1.5rem;
  }

  &:last-child {
    padding-right: 1.5rem;
  }
`;

const StyledTableCell = styled.td<{ align?: 'left' | 'center' | 'right' }>`
  padding: 1rem;
  text-align: ${props => props.align || 'left'};
  color: #cbd5e1;
  font-size: 0.875rem;
  vertical-align: middle;

  &:first-child {
    padding-left: 1.5rem;
  }

  &:last-child {
    padding-right: 1.5rem;
  }
`;

// ==========================================
// COMPOUND COMPONENTS
// ==========================================

interface TableProps {
  children: React.ReactNode;
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface TableSubComponents {
  Header: typeof TableHeader;
  Body: typeof TableBody;
  Row: typeof TableRow;
  Head: typeof TableHead;
  Cell: typeof TableCell;
}

const Table: React.FC<TableProps> & TableSubComponents = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className 
}) => {
  return (
    <TableContext.Provider value={{ variant, size }}>
      <StyledTableContainer className={className}>
        <StyledTable>
          {children}
        </StyledTable>
      </StyledTableContainer>
    </TableContext.Provider>
  );
};

// Header Component
function TableHeader({ children }: { children: React.ReactNode }) {
  return <StyledTableHeader>{children}</StyledTableHeader>;
}

// Body Component
function TableBody({ children }: { children: React.ReactNode }) {
  const { variant } = useContext(TableContext);
  
  return <StyledTableBody>{children}</StyledTableBody>;
}

// Row Component
interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function TableRow({ children, onClick, className }: TableRowProps) {
  const { variant } = useContext(TableContext);
  
  return (
    <StyledTableRow 
      onClick={onClick} 
      className={className}
      striped={variant === 'striped'}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </StyledTableRow>
  );
}

// Head Component
interface TableHeadProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

function TableHead({ children, align = 'left', className }: TableHeadProps) {
  return (
    <StyledTableHead align={align} className={className}>
      {children}
    </StyledTableHead>
  );
}

// Cell Component
interface TableCellProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

function TableCell({ children, align = 'left', className }: TableCellProps) {
  return (
    <StyledTableCell align={align} className={className}>
      {children}
    </StyledTableCell>
  );
}

// Attach sub-components
Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
