/**
 * MyClientsView.actionButton.tsx
 * ------------------------------
 * Reusable labeled action button for trainer client cards.
 */

import type { ReactNode } from 'react';

import { ActionButton } from './MyClientsView.cardStyles';

interface ActionIconButtonProps {
  label: string;
  ariaLabel?: string;
  title?: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning';
  onClick: () => void;
  icon: ReactNode;
}

export const ActionIconButton = ({
  label,
  ariaLabel,
  title,
  variant,
  onClick,
  icon,
}: ActionIconButtonProps) => (
  <ActionButton
    $variant={variant}
    type="button"
    aria-label={ariaLabel ?? label}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    title={title ?? ariaLabel ?? label}
  >
    {icon}
    <span>{label}</span>
  </ActionButton>
);
