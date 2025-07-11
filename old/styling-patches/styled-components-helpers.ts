/**
 * Styled Components Helpers
 * 
 * Utility functions to help with styled-components and prevent warnings
 */

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
 * Commonly used props to filter from styled components
 */
export const commonStyledProps = [
  'variants',
  'variant',
  'active',
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
 * shouldForwardProp function for styled-components
 * 
 * Use this with styled-components to prevent props from being
 * passed to the DOM element
 * 
 * Example:
 * const StyledButton = styled('button').withConfig({
 *   shouldForwardProp: shouldForwardStyledProp
 * })`
 *   ...styles
 * `;
 * 
 * @param prop The prop name
 * @returns Boolean indicating if the prop should be forwarded
 */
export const shouldForwardStyledProp = (prop: string) => {
  return !commonStyledProps.includes(prop);
};

export default {
  filterStyledProps,
  shouldForwardStyledProp,
  commonStyledProps
};
