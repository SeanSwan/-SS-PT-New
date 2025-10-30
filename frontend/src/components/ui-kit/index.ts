/**
 * UI Kit - Centralized Component Library
 * =======================================
 * MUI-free component library for consistent, reusable UI patterns
 * 
 * Usage:
 * import { Button, Card, Table, Badge } from '@/components/ui-kit';
 * 
 * Or specific imports:
 * import { PrimaryButton } from '@/components/ui-kit/Button';
 * import Table from '@/components/ui-kit/Table';
 */

// ==========================================
// CORE COMPONENTS
// ==========================================

// Typography
export {
  PageTitle,
  SectionTitle,
  Subtitle,
  BodyText,
  SmallText,
  Caption,
  Label,
  Link,
  Code
} from './Typography';

// Buttons
export {
  PrimaryButton,
  SecondaryButton,
  OutlinedButton,
  DangerButton,
  GhostButton,
  IconButton
} from './Button';

// Inputs
export {
  StyledInput,
  StyledTextArea,
  StyledSelect,
  FormField,
  FormGroup,
  FormLabel,
  ErrorText,
  HelperText
} from './Input';

// Cards
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  StatsCard,
  ActionCard,
  GridContainer,
  FlexBox,
  Box
} from './Card';

// ==========================================
// COMPOUND COMPONENTS
// ==========================================

// Table (Compound Component Pattern)
export { default as Table } from './Table';

// Pagination (Compound Component Pattern)
export { default as Pagination } from './Pagination';

// ==========================================
// UTILITY COMPONENTS
// ==========================================

// Badge
export { default as Badge, getStatusVariant } from './Badge';
export type { BadgeVariant, BadgeSize, BadgeProps } from './Badge';

// Empty State
export { default as EmptyState, LoadingState } from './EmptyState';
export type { EmptyStateProps, LoadingStateProps } from './EmptyState';

// ==========================================
// LAYOUT CONTAINERS
// ==========================================

export {
  PageContainer,
  ContentContainer,
  Section,
  FlexContainer,
  GridContainer as LayoutGrid,
  StatsGridContainer,
  FilterContainer,
  FooterActionsContainer,
  IconButtonContainer,
  executiveTheme
} from './Container';

// ==========================================
// ANIMATIONS
// ==========================================

export {
  shimmer,
  float,
  pulseAnimation,
  glowAnimation,
  textGlow,
  spin,
  fadeIn,
  slideUp,
  bounce,
  containerVariants,
  itemVariants,
  staggeredItemVariants,
  fadeVariants,
  scaleVariants,
  slideVariants
} from './Animations';

// ==========================================
// DEFAULT EXPORT
// ==========================================

export default {
  // Core
  PageTitle,
  SectionTitle,
  BodyText,
  PrimaryButton,
  SecondaryButton,
  StyledInput,
  Card,
  
  // Compound
  Table,
  Pagination,
  
  // Utility
  Badge,
  EmptyState,
  LoadingState,
  
  // Layout
  PageContainer,
  ContentContainer,
  
  // Theme
  executiveTheme
};
