import type React from 'react';

export type OpenDirection = 'down' | 'up';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  hasError?: boolean;
  renderOptionTrailing?: (option: SelectOption) => React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}
