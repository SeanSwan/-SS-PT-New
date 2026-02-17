import React, { Children, cloneElement, forwardRef } from 'react';
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
}>`
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
      style={mergeStyle(style, sx, system)}
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
    typeof (theme as Record<string, unknown>)?.primary === 'object'
      ? String(((theme as Record<string, any>).primary?.main ?? '#00FFFF'))
      : '#00FFFF';
  const background = String(theme?.background?.surface ?? alpha('#0a0a1a', 0.65));
  const border = variant === 'outlined' ? `1px solid ${alpha(primaryColor, 0.35)}` : '1px solid transparent';
  const shadow = variant === 'elevation' ? `0 ${Math.max(1, elevation) * 4}px ${Math.max(1, elevation) * 12}px rgba(0,0,0,0.24)` : 'none';

  return <div ref={ref} style={mergeStyle(style, sx, { ...system, background, border, boxShadow: shadow, borderRadius: '12px' })} {...rest} />;
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

  return <div ref={ref} style={mergeStyle(style, sx, system)} {...rest}>{withDividers}</div>;
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
    <div
      ref={ref}
      style={mergeStyle(style, sx, {
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
  <hr
    ref={ref}
    style={mergeStyle(style, sx, {
      border: 0,
      margin: 0,
      alignSelf: 'stretch',
      width: orientation === 'horizontal' ? '100%' : '1px',
      height: orientation === 'horizontal' ? '1px' : 'auto',
      background: light ? alpha('#FFFFFF', 0.18) : alpha('#00FFFF', 0.24),
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
  ({ size = 20, thickness = 2, color = '#00FFFF', ...rest }, ref) => <Spinner ref={ref} $size={size} $thickness={thickness} $color={color} role="progressbar" {...rest} />
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

const StyledButton = styled.button<{ $variant: ButtonVariant; $btnColor: string; $fullWidth: boolean; $disabled: boolean }>`
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
      color: #0a0a1a;
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
  ({ variant = 'contained', size = 'medium', color = '#00FFFF', fullWidth = false, startIcon, endIcon, sx, style, children, disabled = false, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <StyledButton
        ref={ref}
        $variant={variant}
        $btnColor={color}
        $fullWidth={fullWidth}
        $disabled={disabled}
        disabled={disabled}
        style={mergeStyle(style, sx, { ...system, ...sizeStyles[size] })}
        {...rest}
      >
        {startIcon && <span style={{ display: 'inline-flex' }}>{startIcon}</span>}
        {children}
        {endIcon && <span style={{ display: 'inline-flex' }}>{endIcon}</span>}
      </StyledButton>
    );
  }
);
Button.displayName = 'Button';

/* ─── IconButton ────────────────────────────────────────────────────────────── */

const StyledIconButton = styled.button<{ $size: number; $iconColor: string; $disabled: boolean }>`
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
      <StyledIconButton ref={ref} $size={iconButtonSizes[size]} $iconColor={color} $disabled={disabled} disabled={disabled} style={mergeStyle(style, sx, system)} {...rest} />
    );
  }
);
IconButton.displayName = 'IconButton';

/* ─── Avatar ────────────────────────────────────────────────────────────────── */

const AvatarRoot = styled.div<{ $size: number; $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  overflow: hidden;
  background: ${({ $bgColor }) => $bgColor};
  color: #0a0a1a;
  font-weight: 600;
  font-size: ${({ $size }) => `${$size * 0.4}px`};
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  src?: string;
  alt?: string;
  size?: number;
  bgColor?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = '', size = 40, bgColor = '#7851A9', sx, style, children, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <AvatarRoot ref={ref} $size={size} $bgColor={bgColor} style={mergeStyle(style, sx, system)} {...rest}>
        {src ? <img src={src} alt={alt} /> : children}
      </AvatarRoot>
    );
  }
);
Avatar.displayName = 'Avatar';

/* ─── Chip ──────────────────────────────────────────────────────────────────── */

const ChipRoot = styled.span<{ $chipColor: string; $chipVariant: 'filled' | 'outlined'; $chipSize: 'small' | 'medium'; $clickable: boolean }>`
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
  ({ label, color = '#00FFFF', variant = 'filled', size = 'medium', icon, deleteIcon, onDelete, sx, style, children, onClick, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <ChipRoot ref={ref} $chipColor={color} $chipVariant={variant} $chipSize={size} $clickable={!!onClick} onClick={onClick} style={mergeStyle(style, sx, system)} {...rest}>
        {icon && <span style={{ display: 'inline-flex', fontSize: '1.1em' }}>{icon}</span>}
        {label ?? children}
        {onDelete && (
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onDelete(); }} onKeyDown={(e) => { if (e.key === 'Enter') onDelete(); }}
            style={{ display: 'inline-flex', cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}>
            {deleteIcon ?? '×'}
          </span>
        )}
      </ChipRoot>
    );
  }
);
Chip.displayName = 'Chip';

/* ─── Card / CardContent / CardActions ──────────────────────────────────────── */

const CardRoot = styled.div<{ $elevation: number }>`
  background: ${alpha('#0a0a1a', 0.65)};
  border: 1px solid ${alpha('#00FFFF', 0.15)};
  border-radius: 12px;
  box-shadow: ${({ $elevation }) => `0 ${$elevation * 4}px ${$elevation * 12}px rgba(0,0,0,0.24)`};
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
`;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  elevation?: number;
  variant?: 'elevation' | 'outlined';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ elevation = 1, variant = 'elevation', sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  const border = variant === 'outlined' ? `1px solid ${alpha('#00FFFF', 0.35)}` : undefined;
  const shadow = variant === 'outlined' ? 'none' : undefined;
  return <CardRoot ref={ref} $elevation={elevation} style={mergeStyle(style, sx, { ...system, ...(border ? { border } : {}), ...(shadow ? { boxShadow: shadow } : {}) })} {...rest} />;
});
Card.displayName = 'Card';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <div ref={ref} style={mergeStyle(style, sx, { ...system, padding: '16px' })} {...rest} />;
});
CardContent.displayName = 'CardContent';

export const CardActions = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <div ref={ref} style={mergeStyle(style, sx, { ...system, display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '8px' })} {...rest} />;
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
  color: #0a0a1a;
  background: ${({ $badgeColor }) => $badgeColor};
`;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  badgeContent?: React.ReactNode;
  color?: string;
  invisible?: boolean;
  max?: number;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ badgeContent, color = '#00FFFF', invisible = false, max = 99, children, ...rest }, ref) => {
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
  info: { bg: alpha('#00FFFF', 0.08), border: alpha('#00FFFF', 0.3), text: '#67e8f9' },
};

const AlertRoot = styled.div<{ $severity: string }>`
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
      <AlertRoot ref={ref} $severity={severity} role="alert" style={mergeStyle(style, sx, system)} {...rest}>
        {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1 }}>{children}</div>
        {action}
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4, opacity: 0.7 }}>×</button>
        )}
      </AlertRoot>
    );
  }
);
Alert.displayName = 'Alert';

/* ─── Tooltip ───────────────────────────────────────────────────────────────── */

const TooltipBubble = styled.span`
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
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <TooltipBubble style={placement === 'bottom' ? { bottom: 'auto', top: 'calc(100% + 8px)' } : undefined}>
          {title}
        </TooltipBubble>
      )}
    </span>
  );
};

/* ─── LinearProgress ────────────────────────────────────────────────────────── */

const ProgressTrack = styled.div<{ $trackColor: string }>`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: ${({ $trackColor }) => alpha($trackColor, 0.2)};
  overflow: hidden;
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
  ({ value = 0, variant = 'determinate', color = '#00FFFF', sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return (
      <ProgressTrack ref={ref} $trackColor={color} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} style={mergeStyle(style, sx, system)} {...rest}>
        <ProgressBar $barColor={color} $value={variant === 'indeterminate' ? 100 : value} />
      </ProgressTrack>
    );
  }
);
LinearProgress.displayName = 'LinearProgress';

/* ─── List / ListItem / ListItemButton / ListItemIcon / ListItemText / ListItemAvatar ─── */

export const List = forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement> & StyleSystemProps & { dense?: boolean; disablePadding?: boolean }>(
  ({ dense = false, disablePadding = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return <ul ref={ref} role="list" style={mergeStyle(style, sx, { ...system, listStyle: 'none', margin: 0, padding: disablePadding ? 0 : '8px 0' })} {...rest} />;
  }
);
List.displayName = 'List';

const ListItemRoot = styled.li<{ $disableGutters: boolean; $divider: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ $disableGutters }) => ($disableGutters ? '8px 0' : '8px 16px')};
  gap: 12px;
  ${({ $divider }) => $divider && css`border-bottom: 1px solid ${alpha('#FFFFFF', 0.08)};`}
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
      <ListItemRoot ref={ref} $disableGutters={disableGutters} $divider={divider} style={mergeStyle(style, sx, system)} {...rest}>
        {children}
        {secondaryAction && <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{secondaryAction}</span>}
      </ListItemRoot>
    );
  }
);
ListItem.displayName = 'ListItem';

const ListItemButtonRoot = styled.li<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
  background: ${({ $selected }) => ($selected ? alpha('#00FFFF', 0.1) : 'transparent')};
  &:hover { background: ${alpha('#FFFFFF', 0.06)}; }
`;

export interface ListItemButtonProps extends React.LiHTMLAttributes<HTMLLIElement>, StyleSystemProps {
  selected?: boolean;
}

export const ListItemButton = forwardRef<HTMLLIElement, ListItemButtonProps>(
  ({ selected = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest, sx });
    return <ListItemButtonRoot ref={ref} $selected={selected} role="button" tabIndex={0} style={mergeStyle(style, sx, system)} {...rest} />;
  }
);
ListItemButton.displayName = 'ListItemButton';

export const ListItemIcon = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <span ref={ref} style={mergeStyle(style, sx, { ...system, display: 'inline-flex', minWidth: '40px', color: alpha('#FFFFFF', 0.7) })} {...rest} />;
});
ListItemIcon.displayName = 'ListItemIcon';

export interface ListItemTextProps extends React.HTMLAttributes<HTMLDivElement>, StyleSystemProps {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}

export const ListItemText = forwardRef<HTMLDivElement, ListItemTextProps>(({ primary, secondary, sx, style, children, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return (
    <div ref={ref} style={mergeStyle(style, sx, { ...system, flex: 1, minWidth: 0 })} {...rest}>
      {primary && <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF' }}>{primary}</div>}
      {secondary && <div style={{ fontSize: '0.75rem', color: alpha('#FFFFFF', 0.6), marginTop: 2 }}>{secondary}</div>}
      {children}
    </div>
  );
});
ListItemText.displayName = 'ListItemText';

export const ListItemAvatar = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & StyleSystemProps>(({ sx, style, ...rest }, ref) => {
  const system = getSystemStyles({ ...rest, sx });
  return <div ref={ref} style={mergeStyle(style, sx, { ...system, display: 'flex', flexShrink: 0 })} {...rest} />;
});
ListItemAvatar.displayName = 'ListItemAvatar';

/* ─── Switch ────────────────────────────────────────────────────────────────── */

const SwitchLabel = styled.label<{ $checked: boolean; $switchColor: string; $disabled: boolean }>`
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
`;

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, StyleSystemProps {
  color?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked = false, color = '#00FFFF', disabled = false, sx, style, ...rest }, ref) => {
    const system = getSystemStyles({ ...rest as StyleSystemProps, sx });
    return (
      <SwitchLabel $checked={!!checked} $switchColor={color} $disabled={disabled} style={mergeStyle(style, sx, system)}>
        <input ref={ref} type="checkbox" checked={checked} disabled={disabled} {...rest} />
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
        {children ?? (message && <div style={{ background: '#1e293b', color: '#e2e8f0', padding: '12px 24px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>{message}</div>)}
      </SnackbarRoot>
    );
  }
);
Snackbar.displayName = 'Snackbar';
