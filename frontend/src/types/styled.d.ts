import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors?: Record<string, unknown>;
    palette?: Record<string, unknown>;
    typography?: Record<string, unknown>;
    shadows?: Record<string, unknown> | string[];
    background?: Record<string, unknown>;
    text?: Record<string, unknown>;
    swan?: Record<string, unknown>;
    spacing?: Record<string, unknown>;
    breakpoints?: Record<string, unknown>;
    glass?: Record<string, unknown>;
    gradients?: Record<string, unknown>;
    components?: Record<string, unknown>;
    [key: string]: unknown;
  }
}
