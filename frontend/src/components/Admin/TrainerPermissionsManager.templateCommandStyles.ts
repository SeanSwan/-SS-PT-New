import styled from 'styled-components';
import { permissionTheme } from './TrainerPermissionsManager.styles';

export const TemplateConfirmCard = styled.div`
  flex-basis: 100%;
  display: grid;
  gap: ${permissionTheme.spacing.sm};
  padding: ${permissionTheme.spacing.md};
  border: 1px solid ${permissionTheme.colors.warning};
  border-radius: ${permissionTheme.borderRadius.md};
  background:
    linear-gradient(135deg, ${permissionTheme.colors.warningWash}, color-mix(in srgb, ${permissionTheme.colors.text} 6%, transparent));
  color: ${permissionTheme.colors.text};

  p {
    margin: 0;
    color: ${permissionTheme.colors.textSecondary};
    line-height: 1.45;
  }
`;

export const TemplateConfirmTitle = styled.strong`
  display: inline-flex;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
  color: ${permissionTheme.colors.text};
`;

export const TemplateConfirmMeta = styled.span`
  color: ${permissionTheme.colors.warning};
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const TemplateConfirmActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${permissionTheme.spacing.sm};
`;
