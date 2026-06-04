import styled from 'styled-components';
import { permissionTheme } from './TrainerPermissionsManager.styles';

export const SearchBarWrap = styled.div`
  margin-bottom: ${permissionTheme.spacing.xl};
  display: flex;
  gap: ${permissionTheme.spacing.md};
  align-items: center;

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  padding: ${permissionTheme.spacing.md};
  background: ${permissionTheme.colors.inputBg};
  border: 1px solid ${permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  color: ${permissionTheme.colors.text};
  font-size: 0.9rem;
  min-height: 44px;

  &:focus-visible {
    outline: 2px solid ${permissionTheme.colors.primary};
    outline-offset: 2px;
  }

  &::placeholder {
    color: ${permissionTheme.colors.textSecondary};
  }
`;

export const SearchActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;
