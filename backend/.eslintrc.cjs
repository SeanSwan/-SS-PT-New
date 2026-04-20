// SwanStudios backend ESLint config
// Created 2026-04-19 per v3 Patch 5 (Path B)
// Install deps via: docs/ai-workflow/references/ESLINT-SETUP.md
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
