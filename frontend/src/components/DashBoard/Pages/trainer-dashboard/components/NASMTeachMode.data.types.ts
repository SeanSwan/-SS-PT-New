import type { ReactNode } from 'react';

export interface AccordionSection {
  title: string;
  icon?: ReactNode;
  content: ReactNode;
}

export interface TeachModeData {
  title: string;
  sections: AccordionSection[];
}
