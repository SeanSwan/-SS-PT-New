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
