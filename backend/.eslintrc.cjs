// SwanStudios backend ESLint config
// Created 2026-04-19 per v3 Patch 5 (Path B)
// Install deps via: docs/ai-workflow/references/ESLINT-SETUP.md
// Credential-literal bans, defined ONCE and spread into every no-restricted-syntax
// site. They lived as two verbatim copies (the main rule + the utils/stripeClient.mjs
// override that lifts only the Stripe ban) — which is exactly how one copy of a
// security rule quietly drifts out of sync with the other. SWA-225 EX-1 amendment B.
const CREDENTIAL_SYNTAX = [
  {
    selector:
      "Literal[value=/^(postgresql:\\/\\/|postgres:\\/\\/|mongodb(\\+srv)?:\\/\\/).*:[^@]+@/]",
    message:
      'Hardcoded database URL with credentials detected. Use process.env.DATABASE_URL.',
  },
  {
    selector:
      "Literal[value=/^(AIza[A-Za-z0-9_-]{35}|sk-ant-api|sk-proj-|ghp_)/]",
    message:
      'Hardcoded API key detected. Use process.env.*_API_KEY.',
  },
];

module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'migrations', // Sequelize migrations use their own conventions
    'seeders',
    '.eslintrc.cjs',
    'uploads',
    'flask_server/venv',
    'flask_server',
  ],
  rules: {
    // ============================================
    // Credential hygiene (even in code reviews, obvious leaks should fail lint)
    // ============================================
    'no-restricted-syntax': [
      'error',
      ...CREDENTIAL_SYNTAX,
      // ============================================
      // One Stripe construction point (SWA-225 EX-1)
      // 19 scattered `new Stripe(...)` drifted into TWO api versions because
      // construction was copy-pasteable. Site #20 fails lint instead.
      // ============================================
      {
        selector: "NewExpression[callee.name='Stripe']",
        message:
          'Construct Stripe only in utils/stripeClient.mjs (getStripeClient / getLegacyDefaultStripeClient). SWA-225 EX-1: scattered construction is how the two-version split happened.',
      },
    ],

    // ============================================
    // Correctness
    // ============================================
    eqeqeq: ['error', 'smart'],
    'no-cond-assign': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'no-console': 'off', // backend often uses console.log/error intentionally
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-process-exit': 'warn', // catch accidental process.exit() in non-CLI code
  },
  overrides: [
    // The ONE file allowed to construct Stripe (SWA-225 EX-1). The credential
    // selectors above still apply here — only the construction ban lifts, and
    // only by re-stating the rule WITHOUT the Stripe selector.
    {
      files: ['utils/stripeClient.mjs'],
      rules: {
        // Credentials only: the Stripe construction ban lifts here, nothing else.
        'no-restricted-syntax': ['error', ...CREDENTIAL_SYNTAX],
      },
    },
    // Test files — looser rules
    {
      files: [
        '**/*.test.mjs',
        '**/*.test.js',
        '**/*.spec.mjs',
        '**/*.spec.js',
        'tests/**',
        '__tests__/**',
      ],
      rules: {
        'no-console': 'off',
      },
    },
    // Scripts — allow process.exit, more flexible
    {
      files: ['scripts/**'],
      rules: {
        'no-process-exit': 'off',
      },
    },
  ],
};
