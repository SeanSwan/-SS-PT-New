import React, { Children, cloneElement, forwardRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import { alpha, BREAKPOINT_VALUES, useSwanTheme } from '../../../styles/mui-replacements';
import { getSystemStyles, mergeStyle, toSpace, type Space, type StyleSystemProps } from './style-system';

type TextAlign = 'inherit' | 'left' | 'center' | 'right' | 'justify';
type DividerOrientation = 'horizontal' | 'vertical';
type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline';
type GridSize = number | 'auto' | boolean;
type PrimitiveStyleProps = { $style?: React.CSSProperties };
type PaletteSlot = { main?: string };
type PopperModifier = { name: string; options?: Record<string, unknown> };
type TabChildProps = {
  value?: string | number;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  $selected?: boolean;
  $indicatorColor?: string;
};

const unitlessCssProperties = new Set([
  'animationIterationCount',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
]);

const toCssName = (property: string) =>
  property.startsWith('--')
    ? property
    : property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const toCssValue = (property: string, value: string | number) =>
  typeof value === 'number' && value !== 0 && !unitlessCssProperties.has(property)
    ? `${value}px`
    : String(value);

const applyPrimitiveStyle = ({ $style }: PrimitiveStyleProps) => {
  if (!$style) return '';

  return css`
    ${Object.entries($style)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== null)
      .map(([property, value]) => `${toCssName(property)}: ${toCssValue(property, value)};`)
      .join('\n')}
  `;
};
const isPaletteSlot = (value: unknown): value is PaletteSlot => typeof value === 'object' && value !== null;

const PrimitiveDiv = styled.div<PrimitiveStyleProps>(applyPrimitiveStyle);
const PrimitiveSpan = styled.span<PrimitiveStyleProps>(applyPrimitiveStyle);
const PrimitiveHr = styled.hr<PrimitiveStyleProps>(applyPrimitiveStyle);
const PrimitiveUl = styled.ul<PrimitiveStyleProps>(applyPrimitiveStyle);
const PrimitiveLabel = styled.label<PrimitiveStyleProps>(applyPrimitiveStyle);

const InlineFlexSpan = styled.span`
  display: inline-flex;
`;

const AlertIconSlot = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const AlertMessageSlot = styled.div`
  flex: 1;
`;

const IconSlot = styled.span`
  display: inline-flex;
  font-size: 1.1em;
`;

const ChipDeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
`;

const CloseButton = styled.button`
  min-width: 32px;
  min-height: 32px;
  padding: 4px;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
`;

const TooltipShell = styled.span`
  position: relative;
  display: inline-flex;
`;

const SecondaryActionSlot = styled.span`
  margin-left: auto;
  flex-shrink: 0;
`;

const ListPrimaryText = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #FFFFFF;
`;

const ListSecondaryText = styled.div`
  margin-top: 2px;
  font-size: 0.75rem;
  color: ${alpha('#FFFFFF', 0.6)};
`;

const SnackbarMessage = styled.div`
  padding: 12px 24px;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
`;

const InputAdornmentRoot = styled.div<{ $position: 'start' | 'end' } & PrimitiveStyleProps>`
  display: flex;
  align-items: center;
  color: ${alpha('#FFFFFF', 0.5)};
  ${({ $position }) => ($position === 'start' ? 'margin-right: 8px;' : 'margin-left: 8px;')}
  ${applyPrimitiveStyle}
`;

const TextAreaInput = styled.textarea`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #FFFFFF;
  outline: none;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
`;

const TextFieldRoot = styled.div<PrimitiveStyleProps>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${applyPrimitiveStyle}
`;

const TextFieldLabel = styled.label<{ $error: boolean }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $error }) => ($error ? '#ef4444' : alpha('#FFFFFF', 0.7))};
`;

const HelperText = styled.span<{ $error: boolean }>`
  font-size: 0.75rem;
  color: ${({ $error }) => ($error ? '#ef4444' : alpha('#FFFFFF', 0.5))};
`;

const FormControlLabelText = styled.span`
  font-size: 0.875rem;
  color: #FFFFFF;
`;

const RadioGroupRoot = styled.div<{ $row: boolean } & PrimitiveStyleProps>`
  display: flex;
  flex-direction: ${({ $row }) => ($row ? 'row' : 'column')};
  gap: 8px;
  ${applyPrimitiveStyle}
`;

const RadioRoot = styled.span<PrimitiveStyleProps & { $disabled?: boolean }>`
  display: inline-flex;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  ${applyPrimitiveStyle}
`;

const VisuallyHiddenInput = styled.input`
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
`;

const ModalBackdropButton = styled.button<{ $open?: boolean }>`
  position: fixed;
  inset: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
  ${({ $open }) =>
    $open !== undefined &&
    css`
      opacity: ${$open ? 1 : 0};
      visibility: ${$open ? 'visible' : 'hidden'};
    `}
`;

export interface BoxProps extends React.HTMLAttributes<HTMLElement>, StyleSystemProps {
  component?: keyof JSX.IntrinsicElements;
}

export const Box = forwardRef<HTMLElement, BoxProps>((props, ref) => {
  const { component = 'div', sx, style, children, ...rest } = props;
  const system = getSystemStyles(props);
  return React.createElement(component, { ref, style: mergeStyle(style, sx, system), ...rest }, children);
});
Box.displayName = 'Box';

const variantStyles: Record<TypographyVariant, React.CSSProperties> = {
  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.45 },
  body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.55 },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  overline: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '0.08em', textTransform: 'uppercase' },
};

const variantTag: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
};

export interface TypographyProps extends React.HTMLAttributes<HTMLElement>, StyleSystemProps {
  variant?: TypographyVariant;
  component?: keyof JSX.IntrinsicElements;
  align?: TextAlign;
  color?: string;
  noWrap?: boolean;
  gutterBottom?: boolean;
  paragraph?: boolean;
}

export const Typography = forwardRef<HTMLElement, TypographyProps>((props, ref) => {
  const theme = useSwanTheme();
  const {
    variant = 'body1',
    component,
    align,
    color,
    noWrap = false,
    gutterBottom = false,
    paragraph = false,
    sx,
    style,
    children,
    ...rest
  } = props;

  const tag = component ?? variantTag[variant];
  const system = getSystemStyles(props);
  const textColor = color ?? String(theme?.text?.primary ?? '#FFFFFF');

  const computedStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...system,
    textAlign: align,
    color: textColor,
    marginBottom: gutterBottom ? '0.35em' : paragraph ? '1em' : system.marginBottom,
    whiteSpace: noWrap ? 'nowrap' : undefined,
    overflow: noWrap ? 'hidden' : undefined,
    textOverflow: noWrap ? 'ellipsis' : undefined,
  };

  return React.createElement(tag, { ref, style: mergeStyle(style, sx, computedStyle), ...rest }, children);
});
Typography.displayName = 'Typography';

const spanFor = (size: GridSize | undefined): string => {
  if (size === undefined || size === false) return 'span 12';
  if (size === true) return 'span 12';
  if (size === 'auto') return 'auto';
  const clamped = Math.min(12, Math.max(1, size));
  return `span ${clamped}`;
};

const GridRoot = styled.div<{
  $container: boolean;
  $columns: number;
  $spacing?: Space;
  $rowSpacing?: Space;
  $columnSpacing?: Space;
  $xs?: GridSize;
  $sm?: GridSize;
  $md?: GridSize;
  $lg?: GridSize;
  $xl?: GridSize;
} & PrimitiveStyleProps>`
  box-sizing: border-box;
  min-width: 0;
  ${({ $container, $columns, $spacing, $rowSpacing, $columnSpacing }) =>
    $container &&
    css`
      display: grid;
      grid-template-columns: repeat(${$columns}, minmax(0, 1fr));
      column-gap: ${toSpace($columnSpacing ?? $spacing) ?? '0px'};
      row-gap: ${toSpace($rowSpacing ?? $spacing) ?? '0px'};
    `};
  ${({ $xs }) => $xs !== undefined && css`grid-column: ${spanFor($xs)};`}
  ${({ $sm }) => $sm !== undefined && css`@media (min-width:${BREAKPOINT_VALUES.sm}px){grid-column:${spanFor($sm)};}`}
  ${({ $md }) => $md !== undefined && css`@media (min-width:${BREAKPOINT_VALUES.md}px){grid-column:${spanFor($md)};}`}
  ${({ $lg }) => $lg !== undefined && css`@media (min-width:${BREAKPOINT_VALUES.lg}px){grid-column:${spanFor($lg)};}`}
  ${({ $xl }) => $xl !== undefined && css`@media (min-width:${BREAKPOINT_VALUES.xl}px){grid-column:${spanFor($xl)};}`}
  ${applyPrimitiveStyle}
`;

export interface GridProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  container?: boolean;
  item?: boolean;
  columns?: number;
  spacing?: Space;
  rowSpacing?: Space;
  columnSpacing?: Space;
  xs?: GridSize;
  sm?: GridSize;
  md?: GridSize;
  lg?: GridSize;
  xl?: GridSize;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>((props, ref) => {
  const { container = false, item = false, columns = 12, spacing, rowSpacing, columnSpacing, sx, style, children, ...rest } = props;
  const system = getSystemStyles(props);

  return (
    <GridRoot
      ref={ref}
      $style={mergeStyle(style, sx, system)}
      $container={container}
      $columns={columns}
      $spacing={spacing}
      $rowSpacing={rowSpacing}
      $columnSpacing={columnSpacing}
      $xs={item ? props.xs ?? 12 : props.xs}
      $sm={props.sm}
      $md={props.md}
      $lg={props.lg}
      $xl={props.xl}
      {...rest}
    >
      {children}
    </GridRoot>
  );
});
Grid.displayName = 'Grid';

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  elevation?: number;
  variant?: 'elevation' | 'outlined';
}

export const Paper = forwardRef<HTMLDivElement, PaperProps>(({ elevation = 1, variant = 'elevation', sx, style, ...rest }, ref) => {
  const theme = useSwanTheme();
  const system = getSystemStyles({ ...rest, sx });
  const primaryColor =
    isPaletteSlot((theme as Record<string, unknown>)?.primary)
      ? String(((theme as Record<string, PaletteSlot>).primary?.main ?? '#8B5CF6'))
      : '#8B5CF6';
  const background = String(theme?.background?.surface ?? alpha('#002060', 0.65));
  const border = variant === 'outlined' ? `1px solid ${alpha(primaryColor, 0.35)}` : '1px solid transparent';
  const shadow = variant === 'elevation' ? `0 ${Math.max(1, elevation) * 4}px ${Math.max(1, elevation) * 12}px rgba(0,0,0,0.24)` : 'none';

  return <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, { ...system, background, border, boxShadow: shadow, borderRadius: '12px' })} {...rest} />;
});
Paper.displayName = 'Paper';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  direction?: React.CSSProperties['flexDirection'];
  spacing?: Space;
  divider?: React.ReactElement;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(({ direction = 'column', spacing = 0, divider, children, sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx, display: 'flex', flexDirection: direction, gap: spacing });
  const childArray = Children.toArray(children);
  const withDividers = divider
    ? childArray.flatMap((child, index) =>
        index < childArray.length - 1 ? [child, cloneElement(divider, { key: `divider-${index}` })] : [child]
      )
    : childArray;

  return <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, system)} {...rest}>{withDividers}</PrimitiveDiv>;
});
Stack.displayName = 'Stack';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement>, Omit<StyleSystemProps, 'maxWidth'> {
  maxWidth?: keyof typeof BREAKPOINT_VALUES | false | number;
  disableGutters?: boolean;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(({ maxWidth = 'xl', disableGutters = false, sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  const resolvedMaxWidth =
    maxWidth === false ? 'none' : typeof maxWidth === 'number' ? `${maxWidth}px` : `${BREAKPOINT_VALUES[maxWidth]}px`;

  return (
    <PrimitiveDiv
      ref={ref}
      $style={mergeStyle(style, sx, {
        ...system,
        width: '100%',
        maxWidth: resolvedMaxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: disableGutters ? undefined : '16px',
        paddingRight: disableGutters ? undefined : '16px',
      })}
      {...rest}
    />
  );
});
Container.displayName = 'Container';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement>, StyleSystemProps {
  orientation?: DividerOrientation;
  light?: boolean;
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(({ orientation = 'horizontal', light = false, sx, style, ...rest }, ref) => (
  <PrimitiveHr
    ref={ref}
    $style={mergeStyle(style, sx, {
      border: 0,
      margin: 0,
      alignSelf: 'stretch',
      width: orientation === 'horizontal' ? '100%' : '1px',
      height: orientation === 'horizontal' ? '1px' : 'auto',
      background: light ? alpha('#FFFFFF', 0.18) : alpha('#8B5CF6', 0.24),
    })}
    {...rest}
  />
));
Divider.displayName = 'Divider';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.span<{ $size: number; $thickness: number; $color: string }>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  border: ${({ $thickness }) => `${$thickness}px solid ${alpha('#FFFFFF', 0.24)}`};
  border-top-color: ${({ $color }) => $color};
  animation: ${spin} 0.85s linear infinite;
  display: inline-block;
`;

export interface CircularProgressProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  thickness?: number;
  color?: string;
}

export const CircularProgress = forwardRef<HTMLSpanElement, CircularProgressProps>(
  ({ size = 20, thickness = 2, color = '#8B5CF6', ...rest }, ref) => <Spinner ref={ref} $size={size} $thickness={thickness} $color={color} role="progressbar" {...rest} />
);
CircularProgress.displayName = 'CircularProgress';

/* ─── Button ────────────────────────────────────────────────────────────────── */

type ButtonVariant = 'contained' | 'outlined' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  small: { padding: '6px 12px', fontSize: '0.8125rem', minHeight: '36px' },
  medium: { padding: '8px 20px', fontSize: '0.875rem', minHeight: '44px' },
  large: { padding: '10px 28px', fontSize: '1rem', minHeight: '48px' },
};

const StyledButton = styled.button<{ $variant: ButtonVariant; $btnColor: string; $fullWidth: boolean; $disabled: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 600;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  ${({ $variant, $btnColor }) =>
    $variant === 'contained' &&
    css`
      background: ${$btnColor};
      color: #002060;
      border: none;
      &:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 12px ${alpha($btnColor, 0.4)}; }
    `}
  ${({ $variant, $btnColor }) =>
    $variant === 'outlined' &&
    css`
      background: transparent;
      color: ${$btnColor};
      border: 1px solid ${alpha($btnColor, 0.5)};
      &:hover:not(:disabled) { background: ${alpha($btnColor, 0.08)}; border-color: ${$btnColor}; }
    `}
  ${({ $variant, $btnColor }) =>
    $variant === 'text' &&
    css`
      background: transparent;
      color: ${$btnColor};
      border: none;
      &:hover:not(:disabled) { background: ${alpha($btnColor, 0.08)}; }
    `}
  ${applyPrimitiveStyle}
`;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  href?: string;
  component?: keyof JSX.IntrinsicElements;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'contained', size = 'medium', color = '#8B5CF6', fullWidth = false, startIcon, endIcon, sx, style, children, disabled = false, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <StyledButton
        ref={ref}
        $variant={variant}
        $btnColor={color}
        $fullWidth={fullWidth}
        $disabled={disabled}
        disabled={disabled}
        $style={mergeStyle(style, sx, { ...system, ...sizeStyles[size] })}
        {...rest}
      >
        {startIcon && <InlineFlexSpan>{startIcon}</InlineFlexSpan>}
        {children}
        {endIcon && <InlineFlexSpan>{endIcon}</InlineFlexSpan>}
      </StyledButton>
    );
  }
);
Button.displayName = 'Button';

/* ─── IconButton ────────────────────────────────────────────────────────────── */

const StyledIconButton = styled.button<{ $size: number; $iconColor: string; $disabled: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ $iconColor }) => $iconColor};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background 0.2s;
  padding: 0;
  &:hover:not(:disabled) { background: ${({ $iconColor }) => alpha($iconColor, 0.08)}; }
  ${applyPrimitiveStyle}
`;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const iconButtonSizes = { small: 34, medium: 44, large: 52 };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'medium', color = '#FFFFFF', sx, style, disabled = false, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <StyledIconButton ref={ref} $size={iconButtonSizes[size]} $iconColor={color} $disabled={disabled} disabled={disabled} $style={mergeStyle(style, sx, system)} {...rest} />
    );
  }
);
IconButton.displayName = 'IconButton';

/* ─── Avatar ────────────────────────────────────────────────────────────────── */

const AvatarRoot = styled.div<{ $size: number; $bgColor: string } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  overflow: hidden;
  background: ${({ $bgColor }) => $bgColor};
  color: #002060;
  font-weight: 600;
  font-size: ${({ $size }) => `${$size * 0.4}px`};
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
  ${applyPrimitiveStyle}
`;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  src?: string;
  alt?: string;
  size?: number;
  bgColor?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = '', size = 40, bgColor = '#8B5CF6', sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <AvatarRoot ref={ref} $size={size} $bgColor={bgColor} $style={mergeStyle(style, sx, system)} {...rest}>
        {src ? <img src={src} alt={alt} /> : children}
      </AvatarRoot>
    );
  }
);
Avatar.displayName = 'Avatar';

/* ─── Chip ──────────────────────────────────────────────────────────────────── */

const ChipRoot = styled.span<{ $chipColor: string; $chipVariant: 'filled' | 'outlined'; $chipSize: 'small' | 'medium'; $clickable: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 16px;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  height: ${({ $chipSize }) => ($chipSize === 'small' ? '24px' : '32px')};
  padding: ${({ $chipSize }) => ($chipSize === 'small' ? '0 8px' : '0 12px')};
  font-size: ${({ $chipSize }) => ($chipSize === 'small' ? '0.75rem' : '0.8125rem')};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: all 0.2s;

  ${({ $chipVariant, $chipColor }) =>
    $chipVariant === 'filled'
      ? css`background: ${alpha($chipColor, 0.2)}; color: ${$chipColor}; border: none;`
      : css`background: transparent; color: ${$chipColor}; border: 1px solid ${alpha($chipColor, 0.5)};`}

  ${({ $clickable, $chipColor }) =>
    $clickable &&
    css`&:hover { background: ${alpha($chipColor, 0.3)}; }`}
  ${applyPrimitiveStyle}
`;

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, StyleSystemProps {
  label?: React.ReactNode;
  color?: string;
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  icon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  onDelete?: () => void;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ label, color = '#8B5CF6', variant = 'filled', size = 'medium', icon, deleteIcon, onDelete, sx, style, children, onClick, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <ChipRoot
        ref={ref}
        {...rest}
        $chipColor={color}
        $chipVariant={variant}
        $chipSize={size}
        $clickable={!!onClick}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
          }
          rest.onKeyDown?.(e);
        }}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : rest.tabIndex}
        $style={mergeStyle(style, sx, system)}
      >
        {icon && <IconSlot>{icon}</IconSlot>}
        {label ?? children}
        {onDelete && (
          <ChipDeleteButton
            type="button"
            aria-label="Delete chip"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDelete(); }}
          >
            {deleteIcon ?? '×'}
          </ChipDeleteButton>
        )}
      </ChipRoot>
    );
  }
);
Chip.displayName = 'Chip';

/* ─── Card / CardContent / CardActions ──────────────────────────────────────── */

const CardRoot = styled.div<{ $elevation: number } & PrimitiveStyleProps>`
  background: ${alpha('#002060', 0.65)};
  border: 1px solid ${alpha('#8B5CF6', 0.15)};
  border-radius: 12px;
  box-shadow: ${({ $elevation }) => `0 ${$elevation * 4}px ${$elevation * 12}px rgba(0,0,0,0.24)`};
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  ${applyPrimitiveStyle}
`;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  elevation?: number;
  variant?: 'elevation' | 'outlined';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ elevation = 1, variant = 'elevation', sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  const border = variant === 'outlined' ? `1px solid ${alpha('#8B5CF6', 0.35)}` : undefined;
  const shadow = variant === 'outlined' ? 'none' : undefined;
  return <CardRoot ref={ref} $elevation={elevation} $style={mergeStyle(style, sx, { ...system, ...(border ? { border } : {}), ...(shadow ? { boxShadow: shadow } : {}) })} {...rest} />;
});
Card.displayName = 'Card';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, { ...system, padding: '16px' })} {...rest} />;
});
CardContent.displayName = 'CardContent';

export const CardActions = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, { ...system, display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '8px' })} {...rest} />;
});
CardActions.displayName = 'CardActions';

/* ─── Badge ─────────────────────────────────────────────────────────────────── */

const BadgeRoot = styled.span`
  position: relative;
  display: inline-flex;
`;

const BadgeDot = styled.span<{ $badgeColor: string; $invisible: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  padding: 0 6px;
  display: ${({ $invisible }) => ($invisible ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #002060;
  background: ${({ $badgeColor }) => $badgeColor};
`;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  badgeContent?: React.ReactNode;
  color?: string;
  invisible?: boolean;
  max?: number;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ badgeContent, color = '#8B5CF6', invisible = false, max = 99, children, ...rest }, ref) => {
    const display = typeof badgeContent === 'number' && badgeContent > max ? `${max}+` : badgeContent;
    const hide = invisible || badgeContent === 0 || badgeContent == null;
    return (
      <BadgeRoot ref={ref} {...rest}>
        {children}
        <BadgeDot $badgeColor={color} $invisible={hide}>{display}</BadgeDot>
      </BadgeRoot>
    );
  }
);
Badge.displayName = 'Badge';

/* ─── Alert ─────────────────────────────────────────────────────────────────── */

const alertColors: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: alpha('#22c55e', 0.12), border: alpha('#22c55e', 0.4), text: '#86efac' },
  error: { bg: alpha('#ef4444', 0.12), border: alpha('#ef4444', 0.4), text: '#fca5a5' },
  warning: { bg: alpha('#f59e0b', 0.12), border: alpha('#f59e0b', 0.4), text: '#fcd34d' },
  info: { bg: alpha('#8B5CF6', 0.08), border: alpha('#8B5CF6', 0.3), text: '#67e8f9' },
};

const AlertRoot = styled.div<{ $severity: string } & PrimitiveStyleProps>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
  background: ${({ $severity }) => alertColors[$severity]?.bg ?? alertColors.info.bg};
  border: 1px solid ${({ $severity }) => alertColors[$severity]?.border ?? alertColors.info.border};
  color: ${({ $severity }) => alertColors[$severity]?.text ?? alertColors.info.text};
  ${applyPrimitiveStyle}
`;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  severity?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ severity = 'info', onClose, icon, action, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <AlertRoot ref={ref} $severity={severity} role="alert" $style={mergeStyle(style, sx, system)} {...rest}>
        {icon && <AlertIconSlot>{icon}</AlertIconSlot>}
        <AlertMessageSlot>{children}</AlertMessageSlot>
        {action}
        {onClose && (
          <CloseButton type="button" onClick={onClose} aria-label="Close">×</CloseButton>
        )}
      </AlertRoot>
    );
  }
);
Alert.displayName = 'Alert';

/* ─── Tooltip ───────────────────────────────────────────────────────────────── */

const TooltipBubble = styled.span<PrimitiveStyleProps>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #e2e8f0;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  ${applyPrimitiveStyle}
`;

export interface TooltipProps {
  title: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom';
  arrow?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ title, children, placement = 'top' }) => {
  const [show, setShow] = React.useState(false);
  if (!title) return children;
  return (
    <TooltipShell
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <TooltipBubble $style={placement === 'bottom' ? { bottom: 'auto', top: 'calc(100% + 8px)' } : undefined}>
          {title}
        </TooltipBubble>
      )}
    </TooltipShell>
  );
};

/* ─── LinearProgress ────────────────────────────────────────────────────────── */

const ProgressTrack = styled.div<{ $trackColor: string } & PrimitiveStyleProps>`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: ${({ $trackColor }) => alpha($trackColor, 0.2)};
  overflow: hidden;
  ${applyPrimitiveStyle}
`;

const ProgressBar = styled.div<{ $barColor: string; $value: number }>`
  height: 100%;
  width: ${({ $value }) => `${Math.min(100, Math.max(0, $value))}%`};
  background: ${({ $barColor }) => $barColor};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

export interface LinearProgressProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  value?: number;
  variant?: 'determinate' | 'indeterminate';
  color?: string;
}

export const LinearProgress = forwardRef<HTMLDivElement, LinearProgressProps>(
  ({ value = 0, variant = 'determinate', color = '#8B5CF6', sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <ProgressTrack ref={ref} $trackColor={color} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} $style={mergeStyle(style, sx, system)} {...rest}>
        <ProgressBar $barColor={color} $value={variant === 'indeterminate' ? 100 : value} />
      </ProgressTrack>
    );
  }
);
LinearProgress.displayName = 'LinearProgress';

/* ─── List / ListItem / ListItemButton / ListItemIcon / ListItemText / ListItemAvatar ─── */

export const List = forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement> & StyleSystemProps & { dense?: boolean; disablePadding?: boolean }>(
  ({ dense: _dense = false, disablePadding = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return <PrimitiveUl ref={ref} $style={mergeStyle(style, sx, { ...system, listStyle: 'none', margin: 0, padding: disablePadding ? 0 : '8px 0' })} {...rest} />;
  }
);
List.displayName = 'List';

const ListItemRoot = styled.li<{ $disableGutters: boolean; $divider: boolean } & PrimitiveStyleProps>`
  display: flex;
  align-items: center;
  padding: ${({ $disableGutters }) => ($disableGutters ? '8px 0' : '8px 16px')};
  gap: 12px;
  ${({ $divider }) => $divider && css`border-bottom: 1px solid ${alpha('#FFFFFF', 0.08)};`}
  ${applyPrimitiveStyle}
`;

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement>, StyleSystemProps {
  disableGutters?: boolean;
  divider?: boolean;
  secondaryAction?: React.ReactNode;
}

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(
  ({ disableGutters = false, divider = false, secondaryAction, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <ListItemRoot ref={ref} $disableGutters={disableGutters} $divider={divider} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
        {secondaryAction && <SecondaryActionSlot>{secondaryAction}</SecondaryActionSlot>}
      </ListItemRoot>
    );
  }
);
ListItem.displayName = 'ListItem';

const ListItemButtonRoot = styled.button<{ $selected: boolean } & PrimitiveStyleProps>`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
  cursor: pointer;
  border-radius: 8px;
  border: 0;
  transition: background 0.15s;
  background: ${({ $selected }) => ($selected ? alpha('#8B5CF6', 0.1) : 'transparent')};
  color: inherit;
  font: inherit;
  width: 100%;
  text-align: left;
  &:hover { background: ${alpha('#FFFFFF', 0.06)}; }
  ${applyPrimitiveStyle}
`;

export interface ListItemButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  selected?: boolean;
}

export const ListItemButton = forwardRef<HTMLButtonElement, ListItemButtonProps>(
  ({ selected = false, sx, style, onClick, onKeyDown, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return <ListItemButtonRoot ref={ref} $selected={selected} type="button" onClick={onClick} onKeyDown={onKeyDown} $style={mergeStyle(style, sx, system)} {...rest} />;
  }
);
ListItemButton.displayName = 'ListItemButton';

export const ListItemIcon = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <PrimitiveSpan ref={ref} $style={mergeStyle(style, sx, { ...system, display: 'inline-flex', minWidth: '40px', color: alpha('#FFFFFF', 0.7) })} {...rest} />;
});
ListItemIcon.displayName = 'ListItemIcon';

export interface ListItemTextProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}

export const ListItemText = forwardRef<HTMLDivElement, ListItemTextProps>(({ primary, secondary, sx, style, children, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return (
    <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, { ...system, flex: 1, minWidth: 0 })} {...rest}>
      {primary && <ListPrimaryText>{primary}</ListPrimaryText>}
      {secondary && <ListSecondaryText>{secondary}</ListSecondaryText>}
      {children}
    </PrimitiveDiv>
  );
});
ListItemText.displayName = 'ListItemText';

export const ListItemAvatar = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <PrimitiveDiv ref={ref} $style={mergeStyle(style, sx, { ...system, display: 'flex', flexShrink: 0 })} {...rest} />;
});
ListItemAvatar.displayName = 'ListItemAvatar';

/* ─── Switch ────────────────────────────────────────────────────────────────── */

const SwitchLabel = styled.label<{ $checked: boolean; $switchColor: string; $disabled: boolean } & PrimitiveStyleProps>`
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  input { opacity: 0; width: 0; height: 0; position: absolute; }
  span {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: ${({ $checked, $switchColor }) => ($checked ? $switchColor : alpha('#FFFFFF', 0.2))};
    transition: background 0.2s;
    &::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      top: 3px;
      left: ${({ $checked }) => ($checked ? '21px' : '3px')};
      transition: left 0.2s;
    }
  }
  ${applyPrimitiveStyle}
`;

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | keyof StyleSystemProps>, StyleSystemProps {
  color?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, defaultChecked, color = '#8B5CF6', disabled = false, sx, style, onChange, ...rest }, ref) => {
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const resolvedChecked = isControlled ? checked : internalChecked;
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(e.target.checked);
      onChange?.(e);
    };

    return (
      <SwitchLabel $checked={!!resolvedChecked} $switchColor={color} $disabled={disabled} $style={mergeStyle(style, sx, system)}>
        <input ref={ref} type="checkbox" {...(isControlled ? { checked } : { defaultChecked })} disabled={disabled} onChange={handleChange} {...rest} />
        <span />
      </SwitchLabel>
    );
  }
);
Switch.displayName = 'Switch';

/* ─── Snackbar ──────────────────────────────────────────────────────────────── */

const SnackbarRoot = styled.div<{ $open: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) ${({ $open }) => ($open ? 'translateY(0)' : 'translateY(100px)')};
  z-index: 9999;
  transition: transform 0.3s ease;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
`;

export interface SnackbarProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  autoHideDuration?: number;
  onClose?: () => void;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
  message?: React.ReactNode;
}

export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  ({ open = false, autoHideDuration, onClose, message, children, ...rest }, ref) => {
    React.useEffect(() => {
      if (open && autoHideDuration && onClose) {
        const timer = setTimeout(onClose, autoHideDuration);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [open, autoHideDuration, onClose]);

    return (
      <SnackbarRoot ref={ref} $open={open} role="status" aria-live="polite" {...rest}>
        {children ?? (message && <SnackbarMessage>{message}</SnackbarMessage>)}
      </SnackbarRoot>
    );
  }
);
Snackbar.displayName = 'Snackbar';

/* ─── Collapse ─────────────────────────────────────────────────────────────── */

const CollapseRoot = styled.div<{ $in: boolean; $timeout: number } & PrimitiveStyleProps>`
  overflow: hidden;
  transition: max-height ${({ $timeout }) => $timeout}ms ease,
              opacity ${({ $timeout }) => $timeout}ms ease;
  max-height: ${({ $in }) => ($in ? '2000px' : '0')};
  opacity: ${({ $in }) => ($in ? 1 : 0)};
  ${applyPrimitiveStyle}
`;

export interface CollapseProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  in?: boolean;
  timeout?: number | 'auto';
  unmountOnExit?: boolean;
  collapsedSize?: string | number;
}

export const Collapse = forwardRef<HTMLDivElement, CollapseProps>(
  ({ in: isOpen = false, timeout = 300, unmountOnExit = false, sx, style, children, ...rest }, ref) => {
    const ms = timeout === 'auto' ? 300 : timeout;
    const [mounted, setMounted] = React.useState(isOpen);
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });

    React.useEffect(() => {
      if (isOpen) setMounted(true);
      else if (unmountOnExit) {
        const timer = setTimeout(() => setMounted(false), ms);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [isOpen, unmountOnExit, ms]);

    if (unmountOnExit && !mounted && !isOpen) return null;

    return (
      <CollapseRoot ref={ref} $in={isOpen} $timeout={ms} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </CollapseRoot>
    );
  }
);
Collapse.displayName = 'Collapse';

/* ─── ClickAwayListener ────────────────────────────────────────────────────── */

export interface ClickAwayListenerProps {
  onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
  children: React.ReactElement;
  mouseEvent?: 'onClick' | 'onMouseDown' | 'onMouseUp' | false;
  touchEvent?: 'onTouchStart' | 'onTouchEnd' | false;
}

export const ClickAwayListener: React.FC<ClickAwayListenerProps> = ({ onClickAway, children }) => {
  const nodeRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const handleClickAway = (event: MouseEvent | TouchEvent | PointerEvent) => {
      const node = nodeRef.current;
      if (node && !node.contains(event.target as Node)) {
        onClickAway(event);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('touchstart', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('touchstart', handleClickAway);
    };
  }, [onClickAway]);

  return cloneElement(children, { ref: nodeRef });
};

/* ─── InputAdornment ───────────────────────────────────────────────────────── */

export interface InputAdornmentProps extends React.HTMLAttributes<HTMLDivElement> {
  position: 'start' | 'end';
}

export const InputAdornment = forwardRef<HTMLDivElement, InputAdornmentProps>(
  ({ position, style, children, ...rest }, ref) => (
    <InputAdornmentRoot
      ref={ref}
      $position={position}
      $style={style}
      {...rest}
    >
      {children}
    </InputAdornmentRoot>
  )
);
InputAdornment.displayName = 'InputAdornment';

/* ─── OutlinedInput ────────────────────────────────────────────────────────── */

const OutlinedInputRoot = styled.div<{ $focused: boolean; $disabled: boolean } & PrimitiveStyleProps>`
  display: flex;
  align-items: center;
  background: ${alpha('#002060', 0.6)};
  border: 1px solid ${({ $focused }) => ($focused ? '#8B5CF6' : alpha('#FFFFFF', 0.2))};
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.2s;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'text')};
  &:hover:not([aria-disabled='true']) {
    border-color: ${({ $focused }) => ($focused ? '#8B5CF6' : alpha('#FFFFFF', 0.4))};
  }
  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #FFFFFF;
    font-family: inherit;
    font-size: 0.875rem;
    min-width: 0;
    &::placeholder { color: ${alpha('#FFFFFF', 0.4)}; }
    &:disabled { cursor: not-allowed; }
  }
  ${applyPrimitiveStyle}
`;

export interface OutlinedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | keyof StyleSystemProps>, StyleSystemProps {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  label?: string;
}

export const OutlinedInput = forwardRef<HTMLInputElement, OutlinedInputProps>(
  ({ startAdornment, endAdornment, fullWidth = false, multiline = false, rows, inputProps, sx, style, disabled = false, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const { className: inputClassName, ...restInputProps } = inputProps ?? {};

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };
    const setTextareaRef = (node: HTMLTextAreaElement | null) => {
      if (typeof ref === 'function') {
        ref(node as unknown as HTMLInputElement);
        return;
      }
      if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node as unknown as HTMLInputElement;
      }
    };
    const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(true);
      onFocus?.(e as unknown as React.FocusEvent<HTMLInputElement>);
    };
    const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false);
      onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>);
    };
    const textareaInputProps = restInputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
    const textareaProps = rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>;

    return (
      <OutlinedInputRoot $focused={focused} $disabled={disabled} $style={mergeStyle(style, sx, { ...system, ...(fullWidth ? { width: '100%' } : {}) })}>
        {startAdornment}
        {multiline ? (
          <TextAreaInput
            ref={setTextareaRef}
            rows={rows}
            disabled={disabled}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            className={inputClassName}
            {...textareaInputProps}
            {...textareaProps}
          />
        ) : (
          <input ref={ref} disabled={disabled} onFocus={handleFocus} onBlur={handleBlur} className={inputClassName} {...restInputProps} {...rest} />
        )}
        {endAdornment}
      </OutlinedInputRoot>
    );
  }
);
OutlinedInput.displayName = 'OutlinedInput';

/* ─── TextField ────────────────────────────────────────────────────────────── */

export interface TextFieldProps extends Omit<OutlinedInputProps, 'label'> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  variant?: 'outlined' | 'standard' | 'filled';
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, helperText, error = false, variant: _variant = 'outlined', sx, style, id, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const generatedId = React.useId();
    const inputId = id || `text-field-${generatedId.replace(/:/g, '')}`;
    return (
      <TextFieldRoot $style={mergeStyle(style, sx, system)}>
        {label && (
          <TextFieldLabel htmlFor={inputId} $error={error}>
            {label}
          </TextFieldLabel>
        )}
        <OutlinedInput ref={ref} id={inputId} {...rest} />
        {helperText && (
          <HelperText $error={error}>
            {helperText}
          </HelperText>
        )}
      </TextFieldRoot>
    );
  }
);
TextField.displayName = 'TextField';

/* ─── FormControlLabel ─────────────────────────────────────────────────────── */

export interface FormControlLabelProps extends React.HTMLAttributes<HTMLLabelElement>, StyleSystemProps {
  control: React.ReactElement;
  label: React.ReactNode;
  labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
  disabled?: boolean;
  value?: string;
}

export const FormControlLabel = forwardRef<HTMLLabelElement, FormControlLabelProps>(
  ({ control, label, labelPlacement = 'end', disabled = false, value, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const isVertical = labelPlacement === 'top' || labelPlacement === 'bottom';
    const isReversed = labelPlacement === 'start' || labelPlacement === 'top';

    return (
      <PrimitiveLabel
        ref={ref}
        $style={mergeStyle(style, sx, {
          ...system,
          display: 'inline-flex',
          alignItems: 'center',
          flexDirection: isVertical ? 'column' : isReversed ? 'row-reverse' : 'row',
          gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        })}
        {...rest}
      >
        {cloneElement(control, { disabled, ...(value !== undefined ? { value } : {}) })}
        <FormControlLabelText>{label}</FormControlLabelText>
      </PrimitiveLabel>
    );
  }
);
FormControlLabel.displayName = 'FormControlLabel';

/* ─── Radio / RadioGroup ───────────────────────────────────────────────────── */

const RadioContext = React.createContext<{ name?: string; value?: string; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void }>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  row?: boolean;
  'aria-label'?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ name, value, defaultValue, onChange, row = false, children, style, ...rest }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
    const isControlled = value !== undefined;
    const resolvedValue = isControlled ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(e.target.value);
      onChange?.(e);
    };

    return (
      <RadioContext.Provider value={{ name, value: resolvedValue, onChange: handleChange }}>
        <RadioGroupRoot ref={ref} role="radiogroup" $row={row} $style={style} {...rest}>
          {children}
        </RadioGroupRoot>
      </RadioContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

const RadioDot = styled.span<{ $checked: boolean; $radioColor: string; $radioSize: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $radioSize }) => `${$radioSize}px`};
  height: ${({ $radioSize }) => `${$radioSize}px`};
  border-radius: 50%;
  border: 2px solid ${({ $checked, $radioColor }) => ($checked ? $radioColor : alpha('#FFFFFF', 0.4))};
  transition: border-color 0.2s;
  flex-shrink: 0;
  &::after {
    content: '';
    width: ${({ $radioSize }) => `${$radioSize * 0.5}px`};
    height: ${({ $radioSize }) => `${$radioSize * 0.5}px`};
    border-radius: 50%;
    background: ${({ $checked, $radioColor }) => ($checked ? $radioColor : 'transparent')};
    transition: background 0.2s;
  }
`;

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | keyof StyleSystemProps>, StyleSystemProps {
  color?: string;
  size?: 'small' | 'medium';
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ color = '#8B5CF6', size = 'medium', value, sx, style, checked, onChange, name, disabled, ...rest }, ref) => {
    const group = React.useContext(RadioContext);
    const resolvedChecked = checked ?? (group.value !== undefined ? group.value === value : undefined);
    const resolvedName = name ?? group.name;
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const radioSize = size === 'small' ? 18 : 22;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      group.onChange?.(e);
    };

    return (
      <RadioRoot $disabled={disabled} $style={mergeStyle(style, sx, system)}>
        <VisuallyHiddenInput
          ref={ref}
          type="radio"
          value={value}
          checked={resolvedChecked}
          onChange={handleChange}
          name={resolvedName}
          disabled={disabled}
          {...rest}
        />
        <RadioDot $checked={!!resolvedChecked} $radioColor={color} $radioSize={radioSize} />
      </RadioRoot>
    );
  }
);
Radio.displayName = 'Radio';

/* ─── Fab (Floating Action Button) ─────────────────────────────────────────── */

const FabRoot = styled.button<{ $fabSize: number; $fabColor: string; $disabled: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $fabSize }) => `${$fabSize}px`};
  height: ${({ $fabSize }) => `${$fabSize}px`};
  border-radius: 50%;
  border: none;
  background: ${({ $fabColor }) => $fabColor};
  color: #002060;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  &:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }
  ${applyPrimitiveStyle}
`;

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'circular' | 'extended';
}

const fabSizes = { small: 40, medium: 48, large: 56 };

export const Fab = forwardRef<HTMLButtonElement, FabProps>(
  ({ color = '#8B5CF6', size = 'medium', variant = 'circular', sx, style, disabled = false, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const sizeVal = fabSizes[size];
    const extended = variant === 'extended';
    return (
      <FabRoot
        ref={ref}
        $fabSize={sizeVal}
        $fabColor={color}
        $disabled={disabled}
        disabled={disabled}
        $style={mergeStyle(style, sx, {
          ...system,
          ...(extended ? { width: 'auto', borderRadius: '24px', padding: '0 16px', gap: '8px' } : {}),
        })}
        {...rest}
      />
    );
  }
);
Fab.displayName = 'Fab';

/* ─── Slider ───────────────────────────────────────────────────────────────── */

const SliderRoot = styled.div<{ $disabled: boolean } & PrimitiveStyleProps>`
  position: relative;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  touch-action: none;
  ${applyPrimitiveStyle}
`;

const SliderTrack = styled.div`
  position: absolute;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: ${alpha('#FFFFFF', 0.15)};
`;

const SliderFill = styled.div<{ $percent: number; $sliderColor: string }>`
  position: absolute;
  height: 4px;
  border-radius: 2px;
  width: ${({ $percent }) => `${$percent}%`};
  background: ${({ $sliderColor }) => $sliderColor};
  transition: width 0.1s ease;
`;

const SliderThumb = styled.div<{ $percent: number; $sliderColor: string; $size: number }>`
  position: absolute;
  left: ${({ $percent }) => `${$percent}%`};
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  background: ${({ $sliderColor }) => $sliderColor};
  transform: translateX(-50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: left 0.1s ease, box-shadow 0.2s;
  &:hover { box-shadow: 0 0 0 8px ${({ $sliderColor }) => alpha($sliderColor, 0.15)}; }
`;

const SliderValueLabel = styled.div<{ $percent: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $percent }) => `${$percent}%`};
  top: -28px;
  transform: translateX(-50%);
  background: #1e293b;
  color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s;
`;

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>, StyleSystemProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (event: Event, value: number) => void;
  color?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  valueLabelDisplay?: 'on' | 'auto' | 'off';
  getAriaValueText?: (value: number) => string;
  marks?: boolean | Array<{ value: number; label?: string }>;
  'aria-labelledby'?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({ value: controlledValue, defaultValue = 0, min = 0, max = 100, step = 1, onChange, color = '#8B5CF6', size = 'medium', disabled = false, valueLabelDisplay = 'off', getAriaValueText, sx, style, ...rest }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const [dragging, setDragging] = React.useState(false);
    const [hovering, setHovering] = React.useState(false);
    const trackRef = React.useRef<HTMLDivElement>(null);
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const thumbSize = size === 'small' ? 14 : 20;

    const percent = ((currentValue - min) / (max - min)) * 100;

    const updateValue = React.useCallback((clientX: number) => {
      const track = trackRef.current;
      if (!track || disabled) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      const clamped = Math.min(max, Math.max(min, snapped));

      if (!isControlled) setInternalValue(clamped);
      if (onChange) {
        const syntheticEvent = new Event('change', { bubbles: true });
        onChange(syntheticEvent, clamped);
      }
    }, [disabled, min, max, step, isControlled, onChange]);

    React.useEffect(() => {
      if (!dragging) return undefined;
      const handleMove = (e: PointerEvent) => updateValue(e.clientX);
      const handleUp = () => setDragging(false);
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      return () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
    }, [dragging, updateValue]);

    const showLabel = valueLabelDisplay === 'on' || (valueLabelDisplay === 'auto' && (dragging || hovering));

    return (
      <SliderRoot
        ref={ref}
        $disabled={disabled}
        onPointerDown={(e) => { if (!disabled) { setDragging(true); updateValue(e.clientX); } }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={getAriaValueText?.(currentValue)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          let newVal = currentValue;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') newVal = Math.min(max, currentValue + step);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') newVal = Math.max(min, currentValue - step);
          else if (e.key === 'Home') newVal = min;
          else if (e.key === 'End') newVal = max;
          else return;
          e.preventDefault();
          if (!isControlled) setInternalValue(newVal);
          if (onChange) onChange(new Event('change'), newVal);
        }}
        $style={mergeStyle(style, sx, system)}
        {...rest}
      >
        <SliderTrack ref={trackRef} />
        <SliderFill $percent={percent} $sliderColor={color} />
        <SliderThumb $percent={percent} $sliderColor={color} $size={thumbSize} />
        <SliderValueLabel $percent={percent} $visible={showLabel}>{currentValue}</SliderValueLabel>
      </SliderRoot>
    );
  }
);
Slider.displayName = 'Slider';

/* ─── Popper ───────────────────────────────────────────────────────────────── */

export interface PopperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | keyof StyleSystemProps>, StyleSystemProps {
  open: boolean;
  anchorEl?: HTMLElement | null;
  placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end';
  disablePortal?: boolean;
  transition?: boolean;
  modifiers?: PopperModifier[];
  children?: React.ReactNode | ((props: { TransitionProps: { in: boolean } }) => React.ReactNode);
}

export const Popper = forwardRef<HTMLDivElement, PopperProps>(
  ({ open, anchorEl, placement = 'bottom', disablePortal = false, transition: _transition = false, modifiers, sx, style, children, ...rest }, ref) => {
    const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });

    const offsetMod = modifiers?.find((m) => m.name === 'offset');
    const [offsetX, offsetY] = (offsetMod?.options?.offset as [number, number]) ?? [0, 0];

    React.useEffect(() => {
      if (!open || !anchorEl) return undefined;
      const update = () => {
        const rect = anchorEl.getBoundingClientRect();
        let top = 0;
        let left = 0;

        if (placement.startsWith('bottom')) {
          top = rect.bottom + offsetY;
          left = placement.includes('start') ? rect.left + offsetX : placement.includes('end') ? rect.right + offsetX : rect.left + rect.width / 2 + offsetX;
        } else if (placement.startsWith('top')) {
          top = rect.top - offsetY;
          left = placement.includes('start') ? rect.left + offsetX : placement.includes('end') ? rect.right + offsetX : rect.left + rect.width / 2 + offsetX;
        } else if (placement.startsWith('right')) {
          left = rect.right + offsetX;
          top = placement.includes('start') ? rect.top + offsetY : placement.includes('end') ? rect.bottom + offsetY : rect.top + rect.height / 2 + offsetY;
        } else if (placement.startsWith('left')) {
          left = rect.left - offsetX;
          top = placement.includes('start') ? rect.top + offsetY : placement.includes('end') ? rect.bottom + offsetY : rect.top + rect.height / 2 + offsetY;
        }

        setPos({ top: top + window.scrollY, left: left + window.scrollX });
      };
      update();
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => {
        window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
      };
    }, [open, anchorEl, placement, offsetX, offsetY]);

    if (!open) return null;

    const transitionProps = { in: open };
    const content = typeof children === 'function' ? children({ TransitionProps: transitionProps }) : children;

    return (
      <PrimitiveDiv
        ref={ref}
        $style={mergeStyle(style, sx, {
          ...system,
          position: disablePortal ? 'absolute' : 'fixed',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          zIndex: 1300,
        })}
        {...rest}
      >
        {content}
      </PrimitiveDiv>
    );
  }
);
Popper.displayName = 'Popper';

/* ─── Drawer ───────────────────────────────────────────────────────────────── */

const DrawerBackdrop = styled(ModalBackdropButton)<{ $open: boolean }>`
  background: rgba(0, 0, 0, 0.5);
  z-index: 1199;
  transition: opacity 0.3s, visibility 0.3s;
`;

const DrawerPanel = styled.div<{
  $open: boolean;
  $anchor: 'left' | 'right' | 'top' | 'bottom';
  $width: string | number;
  $variant: 'temporary' | 'persistent' | 'permanent';
} & PrimitiveStyleProps>`
  position: ${({ $variant }) => ($variant === 'permanent' ? 'relative' : 'fixed')};
  z-index: 1200;
  background: ${alpha('#002060', 0.95)};
  color: #FFFFFF;
  overflow-y: auto;
  transition: transform 0.3s ease;

  ${({ $anchor, $width }) =>
    ($anchor === 'left' || $anchor === 'right') &&
    css`
      top: 0;
      bottom: 0;
      width: ${typeof $width === 'number' ? `${$width}px` : $width};
      ${$anchor}: 0;
    `}

  ${({ $anchor }) =>
    ($anchor === 'top' || $anchor === 'bottom') &&
    css`
      left: 0;
      right: 0;
      ${$anchor}: 0;
    `}

  ${({ $open, $anchor }) => {
    if ($open) return css`transform: translate(0, 0);`;
    switch ($anchor) {
      case 'left': return css`transform: translateX(-100%);`;
      case 'right': return css`transform: translateX(100%);`;
      case 'top': return css`transform: translateY(-100%);`;
      case 'bottom': return css`transform: translateY(100%);`;
    }
  }}
  ${applyPrimitiveStyle}
`;

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  open?: boolean;
  onClose?: () => void;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  variant?: 'temporary' | 'persistent' | 'permanent';
  PaperProps?: { sx?: React.CSSProperties; style?: React.CSSProperties; className?: string };
  ModalProps?: { keepMounted?: boolean };
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ open = false, onClose, anchor = 'left', variant = 'temporary', PaperProps, ModalProps, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const keepMounted = ModalProps?.keepMounted ?? false;
    const paperStyle = PaperProps?.sx ?? PaperProps?.style ?? {};
    const width = paperStyle.width ?? 256;

    // For permanent variant, always show without backdrop
    if (variant === 'permanent') {
      return (
        <DrawerPanel
          ref={ref}
          $open={true}
          $anchor={anchor}
          $width={width}
          $variant="permanent"
          $style={mergeStyle(style, sx, { ...system, ...paperStyle })}
          {...rest}
        >
          {children}
        </DrawerPanel>
      );
    }

    // Don't render temporary drawer when closed unless keepMounted
    if (!open && !keepMounted && variant === 'temporary') return null;

    return (
      <>
        {variant === 'temporary' && <DrawerBackdrop type="button" aria-label="Close drawer" $open={open} onClick={onClose} />}
        <DrawerPanel
          ref={ref}
          $open={open}
          $anchor={anchor}
          $width={width}
          $variant={variant}
          $style={mergeStyle(style, sx, { ...system, ...paperStyle })}
          {...rest}
        >
          {children}
        </DrawerPanel>
      </>
    );
  }
);
Drawer.displayName = 'Drawer';

/* ─── Skeleton ─────────────────────────────────────────────────────────────── */

const skeletonPulse = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.7; }
  100% { opacity: 0.4; }
`;

const SkeletonRoot = styled.span<{ $variant: string; $width?: string | number; $height?: string | number } & PrimitiveStyleProps>`
  display: block;
  background: ${alpha('#FFFFFF', 0.1)};
  animation: ${skeletonPulse} 1.5s ease-in-out infinite;
  ${({ $variant }) =>
    $variant === 'circular'
      ? css`border-radius: 50%;`
      : $variant === 'rounded'
      ? css`border-radius: 8px;`
      : css`border-radius: 2px;`}
  ${({ $width }) => $width !== undefined && css`width: ${typeof $width === 'number' ? `${$width}px` : $width};`}
  ${({ $height }) => $height !== undefined && css`height: ${typeof $height === 'number' ? `${$height}px` : $height};`}
  ${({ $variant, $height }) => $variant === 'text' && !$height && css`height: 1em;`}
  ${applyPrimitiveStyle}
`;

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement>, StyleSystemProps {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | false;
}

export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ variant = 'text', width, height, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return <SkeletonRoot ref={ref} $variant={variant} $width={width} $height={height} $style={mergeStyle(style, sx, system)} {...rest} />;
  }
);
Skeleton.displayName = 'Skeleton';

/* ─── Toolbar ──────────────────────────────────────────────────────────────── */

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  variant?: 'regular' | 'dense';
  disableGutters?: boolean;
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ variant = 'regular', disableGutters = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <PrimitiveDiv
        ref={ref}
        $style={mergeStyle(style, sx, {
          ...system,
          display: 'flex',
          alignItems: 'center',
          minHeight: variant === 'dense' ? '48px' : '64px',
          paddingLeft: disableGutters ? undefined : '16px',
          paddingRight: disableGutters ? undefined : '16px',
        })}
        {...rest}
      />
    );
  }
);
Toolbar.displayName = 'Toolbar';

/* ─── ButtonBase ───────────────────────────────────────────────────────────── */

const ButtonBaseRoot = styled.button<PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  &:disabled { cursor: not-allowed; opacity: 0.5; }
  ${applyPrimitiveStyle}
`;

export interface ButtonBaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  component?: keyof JSX.IntrinsicElements;
  disableRipple?: boolean;
}

export const ButtonBase = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ component, disableRipple, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    if (component) {
      return React.createElement(component, { ref, style: mergeStyle(style, sx, system), ...rest });
    }
    return <ButtonBaseRoot ref={ref} $style={mergeStyle(style, sx, system)} {...rest} />;
  }
);
ButtonBase.displayName = 'ButtonBase';

/* ─── Menu / MenuItem ──────────────────────────────────────────────────────── */

const MenuBackdrop = styled(ModalBackdropButton)`
  z-index: 1299;
`;

const MenuPaper = styled.div<{ $open: boolean } & PrimitiveStyleProps>`
  position: fixed;
  z-index: 1300;
  background: ${alpha('#0f172a', 0.95)};
  border: 1px solid ${alpha('#8B5CF6', 0.15)};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  padding: 4px 0;
  overflow-y: auto;
  max-height: 60vh;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: ${({ $open }) => ($open ? 'scale(1)' : 'scale(0.95)')};
  transition: opacity 0.15s, transform 0.15s;
  ${applyPrimitiveStyle}
`;

export interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  anchorEl?: HTMLElement | null;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ open, onClose, anchorEl, children, ...rest }, ref) => {
    const [pos, setPos] = React.useState({ top: 0, left: 0 });

    React.useEffect(() => {
      if (!open || !anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }, [open, anchorEl]);

    if (!open) return null;

    return (
      <>
        <MenuBackdrop type="button" aria-label="Close menu" onClick={onClose} />
        <MenuPaper ref={ref} $open={open} $style={{ top: `${pos.top}px`, left: `${pos.left}px` }} role="menu" {...rest}>
          {children}
        </MenuPaper>
      </>
    );
  }
);
Menu.displayName = 'Menu';

const MenuItemRoot = styled.div<{ $selected: boolean; $disabled: boolean } & PrimitiveStyleProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  color: ${({ $disabled }) => ($disabled ? alpha('#FFFFFF', 0.3) : '#FFFFFF')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  background: ${({ $selected }) => ($selected ? alpha('#8B5CF6', 0.1) : 'transparent')};
  transition: background 0.15s;
  &:hover:not([aria-disabled='true']) { background: ${alpha('#FFFFFF', 0.06)}; }
  ${applyPrimitiveStyle}
`;

export interface MenuItemProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  selected?: boolean;
  disabled?: boolean;
  value?: string | number;
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ selected = false, disabled = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return <MenuItemRoot ref={ref} $selected={selected} $disabled={disabled} role="menuitem" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} $style={mergeStyle(style, sx, system)} {...rest} />;
  }
);
MenuItem.displayName = 'MenuItem';

/* ═══════════════════════════════════════════════════════════════════════════
   DIALOG STACK
   ═══════════════════════════════════════════════════════════════════════════ */

const dialogFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const dialogSlideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const DialogBackdrop = styled(ModalBackdropButton)<{ $open: boolean }>`
  z-index: 1300;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  animation: ${dialogFadeIn} 0.2s ease-out;
`;

const DialogPanel = styled.div<{ $maxWidth: string; $fullWidth: boolean; $fullScreen?: boolean } & PrimitiveStyleProps>`
  position: fixed;
  z-index: 1301;
  display: flex;
  flex-direction: column;
  background: ${alpha('#0f172a', 0.97)};
  color: #FFFFFF;
  overflow: hidden;

  ${({ $fullScreen }) => $fullScreen ? `
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    border: none;
  ` : `
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid ${alpha('#FFFFFF', 0.1)};
    border-radius: 12px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    max-height: calc(100% - 64px);
    animation: ${dialogSlideUp} 0.25s ease-out;
  `}

  ${({ $fullWidth, $maxWidth, $fullScreen }) => !$fullScreen && `
    width: ${$fullWidth ? (() => {
      switch ($maxWidth) {
        case 'xs': return 'min(444px, calc(100% - 64px))';
        case 'sm': return 'min(600px, calc(100% - 64px))';
        case 'md': return 'min(900px, calc(100% - 64px))';
        case 'lg': return 'min(1200px, calc(100% - 64px))';
        case 'xl': return 'min(1536px, calc(100% - 64px))';
        default: return 'min(600px, calc(100% - 64px))';
      }
    })() : 'auto'};
    max-width: ${(() => {
      switch ($maxWidth) {
        case 'xs': return '444px';
        case 'sm': return '600px';
        case 'md': return '900px';
        case 'lg': return '1200px';
        case 'xl': return '1536px';
        default: return '600px';
      }
    })()};
  `}

  @media (max-width: 600px) {
    ${({ $fullScreen }) => !$fullScreen && `
      width: calc(100% - 32px);
      max-height: calc(100% - 32px);
    `}
  }
  ${applyPrimitiveStyle}
`;

export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | keyof StyleSystemProps>, Omit<StyleSystemProps, 'maxWidth'> {
  open: boolean;
  onClose?: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  children?: React.ReactNode;
  PaperProps?: { sx?: React.CSSProperties; style?: React.CSSProperties; className?: string };
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onClose, maxWidth = 'sm', fullWidth = false, fullScreen = false, children, PaperProps, sx, style, ...rest }, ref) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    }, [onClose]);

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          document.body.style.overflow = '';
        };
      }
    }, [open, handleKeyDown]);

    if (!open) return null;

    const paperStyle = { ...(PaperProps?.style || {}), ...(PaperProps?.sx || {}) };

    return ReactDOM.createPortal(
      <>
        <DialogBackdrop type="button" aria-label="Close dialog" $open={open} onClick={onClose} />
        <DialogPanel
          ref={ref}
          $maxWidth={maxWidth === false ? 'sm' : maxWidth}
          $fullWidth={fullWidth}
          $fullScreen={fullScreen}
          role="dialog"
          aria-modal="true"
          $style={mergeStyle(style, sx, paperStyle)}
          className={PaperProps?.className}
          {...rest}
        >
          {children}
        </DialogPanel>
      </>,
      document.body
    );
  }
);
Dialog.displayName = 'Dialog';

/* ─── DialogTitle ─────────────────────────────────────────────────────────── */

const DialogTitleRoot = styled.div<PrimitiveStyleProps>`
  padding: 16px 24px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${applyPrimitiveStyle}
`;

export interface DialogTitleProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {}

export const DialogTitle = forwardRef<HTMLDivElement, DialogTitleProps>(
  ({ sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <DialogTitleRoot ref={ref} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </DialogTitleRoot>
    );
  }
);
DialogTitle.displayName = 'DialogTitle';

/* ─── DialogContent ──────────────────────────────────────────────────────── */

const DialogContentRoot = styled.div<{ $dividers: boolean } & PrimitiveStyleProps>`
  padding: 16px 24px;
  flex: 1 1 auto;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.87);
  ${({ $dividers }) =>
    $dividers &&
    css`
      border-top: 1px solid ${alpha('#FFFFFF', 0.12)};
      border-bottom: 1px solid ${alpha('#FFFFFF', 0.12)};
    `}

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${alpha('#FFFFFF', 0.2)};
    border-radius: 3px;
  }
  ${applyPrimitiveStyle}
`;

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  dividers?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ dividers = false, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <DialogContentRoot ref={ref} $dividers={dividers} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </DialogContentRoot>
    );
  }
);
DialogContent.displayName = 'DialogContent';

/* ─── DialogActions ──────────────────────────────────────────────────────── */

const DialogActionsRoot = styled.div<PrimitiveStyleProps>`
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  ${applyPrimitiveStyle}
`;

export interface DialogActionsProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {}

export const DialogActions = forwardRef<HTMLDivElement, DialogActionsProps>(
  ({ sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <DialogActionsRoot ref={ref} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </DialogActionsRoot>
    );
  }
);
DialogActions.displayName = 'DialogActions';

/* ═══════════════════════════════════════════════════════════════════════════
   FORM CONTROLS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── FormControl ────────────────────────────────────────────────────────── */

const FormControlRoot = styled.div<{ $fullWidth: boolean; $error: boolean; $disabled: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  padding: 0;
  margin: 8px 0;
  border: 0;
  vertical-align: top;
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
  ${({ $disabled }) => $disabled && css`opacity: 0.6; pointer-events: none;`}
  ${applyPrimitiveStyle}
`;

export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  fullWidth?: boolean;
  error?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
}

export const FormControl = forwardRef<HTMLDivElement, FormControlProps>(
  ({ fullWidth = false, error = false, disabled = false, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <FormControlRoot ref={ref} $fullWidth={fullWidth} $error={error} $disabled={disabled} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </FormControlRoot>
    );
  }
);
FormControl.displayName = 'FormControl';

/* ─── InputLabel ─────────────────────────────────────────────────────────── */

const InputLabelRoot = styled.label<{ $shrink: boolean; $error: boolean } & PrimitiveStyleProps>`
  display: block;
  font-size: ${({ $shrink }) => ($shrink ? '0.75rem' : '1rem')};
  color: ${({ $error }) => ($error ? '#f44336' : 'rgba(255, 255, 255, 0.7)')};
  margin-bottom: 4px;
  transition: all 0.15s ease;
  transform-origin: top left;
  ${applyPrimitiveStyle}
`;

export interface InputLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>, StyleSystemProps {
  shrink?: boolean;
  error?: boolean;
}

export const InputLabel = forwardRef<HTMLLabelElement, InputLabelProps>(
  ({ shrink = false, error = false, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <InputLabelRoot ref={ref} $shrink={shrink} $error={error} $style={mergeStyle(style, sx, system)} {...rest}>
        {children}
      </InputLabelRoot>
    );
  }
);
InputLabel.displayName = 'InputLabel';

/* ─── Select ─────────────────────────────────────────────────────────────── */

const SelectRoot = styled.select<{ $fullWidth: boolean; $error: boolean; $size: string } & PrimitiveStyleProps>`
  appearance: none;
  background: ${alpha('#002060', 0.6)};
  border: 1px solid ${alpha('#FFFFFF', 0.23)};
  border-radius: 8px;
  color: #FFFFFF;
  font-size: ${({ $size }) => ($size === 'small' ? '0.875rem' : '1rem')};
  padding: ${({ $size }) => ($size === 'small' ? '8px 32px 8px 12px' : '12px 36px 12px 14px')};
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
  ${({ $error }) => $error && css`border-color: #f44336;`}
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:hover { border-color: ${alpha('#8B5CF6', 0.5)}; }
  &:focus { border-color: #8B5CF6; box-shadow: 0 0 0 2px ${alpha('#8B5CF6', 0.15)}; }

  option {
    background: #0f172a;
    color: #FFFFFF;
  }
  ${applyPrimitiveStyle}
`;

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | keyof StyleSystemProps>, StyleSystemProps {
  fullWidth?: boolean;
  error?: boolean;
  label?: string;
  size?: ButtonSize;
  variant?: 'outlined' | 'filled' | 'standard';
  native?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ fullWidth = false, error = false, size = 'medium', label, sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <SelectRoot ref={ref} $fullWidth={fullWidth} $error={error} $size={size} $style={mergeStyle(style, sx, system)} aria-label={label} {...rest}>
        {children}
      </SelectRoot>
    );
  }
);
Select.displayName = 'Select';

/* ═══════════════════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════════════════ */

const TabsRoot = styled.div<{ $variant: string } & PrimitiveStyleProps>`
  display: flex;
  border-bottom: 1px solid ${alpha('#FFFFFF', 0.12)};
  position: relative;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  ${({ $variant }) =>
    $variant === 'fullWidth' &&
    css`
      & > * { flex: 1; }
    `}
  ${applyPrimitiveStyle}
`;

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | keyof StyleSystemProps>, StyleSystemProps {
  value?: string | number;
  onChange?: (event: React.SyntheticEvent, newValue: string | number) => void;
  variant?: 'standard' | 'fullWidth' | 'scrollable';
  indicatorColor?: string;
  textColor?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onChange, variant = 'standard', indicatorColor = '#8B5CF6', sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    const childrenWithProps = Children.map(children, (child) => {
      if (!React.isValidElement<TabChildProps>(child)) return child;
      const childValue = child.props.value;
      return cloneElement(child, {
        $selected: childValue === value,
        $indicatorColor: indicatorColor,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(e);
          if (childValue !== undefined) {
            onChange?.(e, childValue);
          }
        },
      });
    });
    return (
      <TabsRoot ref={ref} $variant={variant} role="tablist" $style={mergeStyle(style, sx, system)} {...rest}>
        {childrenWithProps}
      </TabsRoot>
    );
  }
);
Tabs.displayName = 'Tabs';

/* ─── Tab ────────────────────────────────────────────────────────────────── */

const TabRoot = styled.button<{ $selected: boolean; $indicatorColor: string; $disabled: boolean } & PrimitiveStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: none;
  color: ${({ $selected }) => ($selected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)')};
  font-size: 0.875rem;
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  position: relative;
  white-space: nowrap;
  min-height: 48px;
  transition: color 0.2s, background 0.2s;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $selected, $indicatorColor }) => ($selected ? $indicatorColor : 'transparent')};
    transition: background 0.2s;
  }

  &:hover:not(:disabled) {
    color: #FFFFFF;
    background: ${alpha('#FFFFFF', 0.04)};
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
  }
  ${applyPrimitiveStyle}
`;

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, StyleSystemProps {
  label?: React.ReactNode;
  value?: string | number;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end' | 'top' | 'bottom';
  $selected?: boolean;
  $indicatorColor?: string;
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ label, icon, iconPosition = 'start', disabled = false, $selected = false, $indicatorColor = '#8B5CF6', sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <TabRoot
        ref={ref}
        role="tab"
        aria-selected={$selected}
        $selected={$selected}
        $indicatorColor={$indicatorColor}
        $disabled={disabled}
        disabled={disabled}
        $style={mergeStyle(style, sx, system)}
        {...rest}
      >
        {icon && iconPosition === 'start' && icon}
        {label || children}
        {icon && iconPosition === 'end' && icon}
      </TabRoot>
    );
  }
);
Tab.displayName = 'Tab';
