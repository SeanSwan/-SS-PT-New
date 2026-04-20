// SwanStudios frontend ESLint config
// Updated 2026-04-19 per v3 Patch 5 (Path B): added TypeScript parser + SwanStudios custom rules
// Install deps via: docs/ai-workflow/references/ESLINT-SETUP.md
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:styled-components-a11y/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  ignorePatterns: [
    'dist',
    'build',
    '.eslintrc.cjs',
    'node_modules',
    'public',
    '*.config.ts',
    '*.config.js',
    'src/assets/**',
  ],
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', 'styled-components-a11y', '@typescript-eslint'],
  rules: {
    // ============================================
    // SwanStudios-specific bans (CLAUDE.md enforcement)
    // ============================================

    // CLAUDE.md Rule: No Material-UI (styled-components only)
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@mui/material',
            message:
              'Material-UI (MUI) is BANNED. Use styled-components with CSS custom properties + dark-theme fallbacks (CLAUDE.md Rule 1).',
          },
          {
            name: '@mui/icons-material',
            message:
              'Material-UI icons are BANNED. Use lucide-react or inline SVG.',
          },
          {
            name: 'recharts',
            message:
              'Recharts is BANNED for new work. Use Victory (CLAUDE.md Rule 10 — victory-native ports to mobile).',
          },
        ],
        patterns: [
          {
            group: ['@mui/*'],
            message: 'Material-UI BANNED. Use styled-components.',
          },
        ],
      },
    ],

    // CLAUDE.md Rule 6: No hardcoded colors — use var(--token, #fallback) pattern
    // Specifically ban retired Galaxy-Swan palette tokens
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "Literal[value=/#0a0a1a|#0A0A1A|#00FFFF|#00ffff|#7851A9|#7851a9/]",
        message:
          'Retired Galaxy-Swan palette token detected (#0a0a1a, #00FFFF, #7851A9). Use Crystalline Swan — Midnight Sapphire #002060, Ice Wing #60C0F0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F. See CLAUDE.md Active Palette.',
      },
      {
        selector:
          "JSXAttribute[name.name='style'][value.type='JSXExpressionContainer']",
        message:
          "Inline style={{...}} is BANNED (CLAUDE.md v3 Phase 3 design debate consensus). Use styled-components or CSS variables via var(--token, #fallback).",
      },
    ],

    // ============================================
    // TypeScript strictness
    // ============================================
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-floating-promises': 'off', // requires type-check parser, heavy; enable later
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      { 'ts-ignore': 'allow-with-description', 'ts-expect-error': 'allow-with-description' },
    ],

    // ============================================
    // React correctness
    // ============================================
    'react/jsx-no-target-blank': 'off',
    'react/prop-types': 'off', // TypeScript handles this
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ============================================
    // Styled-components best practices
    // ============================================
    'styled-components-a11y/keyframes-css-wrapper': 'error', // CLAUDE.md Rule 43
    'styled-components-a11y/rule-name': 'warn',
    'styled-components-a11y/accessible-emoji': 'warn',
    'styled-components-a11y/alt-text': 'warn',
    'styled-components-a11y/anchor-has-content': 'warn',
    'styled-components-a11y/aria-activedescendant-has-tabindex': 'warn',
    'styled-components-a11y/aria-props': 'warn',
    'styled-components-a11y/aria-proptypes': 'warn',
    'styled-components-a11y/aria-role': 'warn',
    'styled-components-a11y/aria-unsupported-elements': 'warn',
    'styled-components-a11y/click-events-have-key-events': 'warn',
    'styled-components-a11y/heading-has-content': 'warn',
    'styled-components-a11y/html-has-lang': 'warn',
    'styled-components-a11y/iframe-has-title': 'warn',
    'styled-components-a11y/interactive-supports-focus': 'warn',
    'styled-components-a11y/media-has-caption': 'warn',
    'styled-components-a11y/mouse-events-have-key-events': 'warn',
    'styled-components-a11y/no-access-key': 'warn',
    'styled-components-a11y/no-autofocus': 'warn',
    'styled-components-a11y/no-distracting-elements': 'warn',
    'styled-components-a11y/no-redundant-roles': 'warn',
    'styled-components-a11y/role-has-required-aria-props': 'warn',
    'styled-components-a11y/role-supports-aria-props': 'warn',
    'styled-components-a11y/scope': 'warn',
    'styled-components-a11y/tab-index-no-positive': 'warn',

    // ============================================
    // General correctness
    // ============================================
    eqeqeq: ['error', 'smart'],
    'no-cond-assign': 'error',
    'no-unreachable': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'prefer-const': 'warn',
  },
  overrides: [
    // Test files — looser rules
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', 'tests/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
