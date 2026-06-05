/**
 * Base table styles for admin sessions and package administration tables.
 * Split from the legacy style bucket to avoid circular imports.
 */
import styled from 'styled-components';

export const StyledTableContainer = styled.div`
  margin-top: 1.5rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  border-radius: 15px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  backdrop-filter: blur(10px);
  overflow: hidden;
  overflow-x: auto;
`;

export const StyledTableHead = styled.tr`
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent), color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
`;

export const StyledTableHeadCell = styled.th`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  font-size: 0.95rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  padding: 1rem;
  letter-spacing: 0.5px;
`;

export const StyledTableCell = styled.td`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, transparent));
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
  padding: 1rem;
`;

export const StyledTableRow = styled.tr`
  transition: background 0.2s ease, backdrop-filter 0.2s ease;
  background: transparent;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
    backdrop-filter: blur(10px);
  }

  &:nth-of-type(even) {
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
  }

  &:nth-of-type(even):hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 9%, transparent);
  }
`;
