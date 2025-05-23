/**
 * styled-component-helpers.ts
 * Utility functions to help with styled-components prop forwarding
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
  '$customVariant'
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