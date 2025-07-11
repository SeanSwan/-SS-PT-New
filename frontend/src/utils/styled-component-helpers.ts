/**
 * styled-component-helpers.ts
 * Comprehensive utility functions for styled-components prop management
 * 
 * CONSOLIDATED from styled-component-helpers.ts + styled-components-helpers.ts
 */

/**
 * Function to filter out props that shouldn't be forwarded to DOM elements
 * This helps prevent warnings about props being sent to the DOM
 * 
 * @param props List of prop names to filter out
 * @returns A function that can be used with shouldForwardProp
 */
export const shouldForwardProp = (props: string[]) => {
  return (prop: string) => !props.includes(prop);
};

/**
 * filterStyledProps
 * 
 * Filters out props that shouldn't be passed to DOM elements
 * from a styled component's props
 * 
 * @param props The props to filter
 * @param propNames Array of prop names to filter out
 * @returns Filtered props object
 */
export const filterStyledProps = (props: any, propNames: string[]) => {
  const filteredProps = { ...props };
  
  propNames.forEach(propName => {
    if (propName in filteredProps) {
      delete filteredProps[propName];
    }
  });
  
  return filteredProps;
};

/**
 * Common animation props that should not be forwarded to DOM elements
 * Used with framer-motion or animation libraries
 */
export const commonAnimationProps = [
  'variants',
  'initial',
  'animate',
  'exit',
  'transition',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'onAnimationComplete',
  'onAnimationStart',
  'onDragStart',
  'onDragEnd',
  'custom'
];

/**
 * Props that are commonly used for styling but shouldn't be forwarded to DOM elements
 */
export const commonStyleProps = [
  '$active',
  '$variant',
  '$size',
  '$expanded',
  '$color',
  '$isOpen',
  '$disabled',
  '$customColor',
  '$customSize',
  '$customVariant',
  'active',
  'variant',
  'expanded',
  'isOpen',
  'hovered',
  'selected',
  'size',
  'color',
  'theme',
  'as',
  'forwardedAs'
];

/**
 * All props that should not be forwarded to DOM elements by default
 */
export const allNonForwardedProps = [
  ...commonAnimationProps,
  ...commonStyleProps
];

/**
 * Ready-to-use shouldForwardProp function with common props
 * 
 * Usage example:
 * ```
 * import { styled } from 'styled-components';
 * import { defaultShouldForwardProp } from '../utils/styled-component-helpers';
 * 
 * const StyledButton = styled.button.withConfig({
 *   shouldForwardProp: defaultShouldForwardProp
 * })`
 *   // styles here
 * `;
 * ```
 */
export const defaultShouldForwardProp = (prop: string) => !allNonForwardedProps.includes(prop);

/**
 * Legacy alias for compatibility
 * @deprecated Use defaultShouldForwardProp instead
 */
export const shouldForwardStyledProp = defaultShouldForwardProp;

/**
 * Legacy commonStyledProps for compatibility
 * @deprecated Use commonStyleProps instead
 */
export const commonStyledProps = commonStyleProps;

// Default export for backward compatibility
export default {
  filterStyledProps,
  shouldForwardStyledProp: defaultShouldForwardProp,
  defaultShouldForwardProp,
  commonStyledProps: commonStyleProps,
  commonStyleProps,
  commonAnimationProps,
  allNonForwardedProps
};
