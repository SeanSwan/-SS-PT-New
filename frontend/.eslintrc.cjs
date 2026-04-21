// SwanStudios frontend ESLint config
// Created 2026-04-19, updated 2026-04-20 for styled-components-a11y v2
// Install deps via: docs/ai-workflow/references/ESLINT-SETUP.md
//
// Note on styled-components-a11y v2: the plugin renamed some rules between
// 0.x and 2.x. `rule-name`, `keyframes-css-wrapper`, and `tab-index-no-positive`
// no longer exist. For CLAUDE.md Rule 43 (require css`` helper for shared style
// chunks with interpolation), rely on pre-commit code review + the rule's
// documentation — there's no active ESLint rule for it in v2.
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
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

    // CLAUDE.md Rule 1: No Material-UI — styled-components only
    // CLAUDE.md Rule 10: Victory only for charts — no Recharts
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@mui/material',
            message:
              'Material-UI BANNED. Use styled-components with CSS custom properties + dark-theme fallbacks (CLAUDE.md Rule 1).',
          },
          {
            name: '@mui/icons-material',
            message: 'MUI icons BANNED. Use lucide-react or inline SVG.',
          },
          {
            name: 'recharts',
            message:
              'Recharts BANNED for new work. Use Victory — victory-native ports to mobile (CLAUDE.md Rule 10).',
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

    // CLAUDE.md Rule 6: No hardcoded retired Galaxy-Swan palette tokens
    // Phase 3 design debate consensus: inline style={{}} is BANNED
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "Literal[value=/#0a0a1a|#0A0A1A|#00FFFF|#00ffff|#7851A9|#7851a9/]",
        message:
          'Retired Galaxy-Swan palette token (#0a0a1a, #00FFFF, #7851A9). Use Crystalline Swan — Midnight Sapphire #002060, Ice Wing #60C0F0, Wing Purple #8B5CF6, Obsidian Black #0A0A0F. See CLAUDE.md Active Palette.',
      },
      {
        selector:
          "JSXAttribute[name.name='style'][value.type='JSXExpressionContainer']",
        message:
          'Inline style={{...}} BANNED (CLAUDE.md v3 Phase 3 design debate consensus). Use styled-components or CSS variables via var(--token, #fallback).',
      },
    ],

    // ============================================
    // TypeScript
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
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
      },
    ],

    // ============================================
    // React correctness
    // ============================================
    'react/jsx-no-target-blank': 'off',
    'react/prop-types': 'off',       // TypeScript handles this
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility defaults from jsx-a11y/recommended are sensible.
    // Individual styled-components-a11y rules are auto-configured by plugin:*/recommended.

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
