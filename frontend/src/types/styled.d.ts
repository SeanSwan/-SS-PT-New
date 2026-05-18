import 'styled-components';

declare module 'styled-components' {
  type ThemeScale = Record<string, any>;

  export interface DefaultTheme {
    id: string;
    name: string;
    colors: ThemeScale;
    palette: ThemeScale;
    typography: ThemeScale;
    shadows: ThemeScale;
    background: ThemeScale;
    text: ThemeScale;
    fonts: ThemeScale;
    borders: ThemeScale;
    gradients: ThemeScale;
    effects: ThemeScale;
    swan: ThemeScale;
    spacing: ThemeScale;
    breakpoints: ThemeScale;
    glass: ThemeScale;
    components: ThemeScale;
    [key: string]: any;
  }
}
