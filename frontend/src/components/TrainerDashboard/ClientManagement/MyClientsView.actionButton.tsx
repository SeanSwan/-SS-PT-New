/**
 * MyClientsView.actionButton.tsx
 * ------------------------------
 * Reusable icon-only action button for trainer client cards.
 */

import type { ReactNode } from 'react';

import { ActionButton } from './MyClientsView.cardStyles';

interface ActionIconButtonProps {
  title: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning';
  onClick: () => void;
  icon: ReactNode;
}

export const ActionIconButton = ({
  title,
  variant,
  onClick,
  icon,
}: ActionIconButtonProps) => (
  <ActionButton
    $variant={variant}
    type="button"
    aria-label={title}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    title={title}
  >
    {icon}
  </ActionButton>
);
