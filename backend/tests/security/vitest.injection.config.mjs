/**
 * Vitest configuration for the email-security lane only.
 *
 * Run with: npm run test:security
 *
 * WHY THIS EXISTS (Astra S1, round-1 verification notes §3)
 * ---------------------------------------------------------
 * The email guard imports production helpers and walks the repository. Run under
 * the default config it shares a process with application test setup — which today
 * initialises the backend test environment. That is not a problem yet, but it is
 * the wrong foundation: a security guard whose verdict depends on unrelated
 * application startup can be invalidated by a change to that startup, and the
 * failure would look like a guard failure rather than a lane problem.
 *
 * Deliberately separate from vitest.config.mjs for the same reason
 * vitest.mutation.config.mjs is separate:
 *   - it includes ONLY the security/contract tests, so application setup that the
 *     guard does not need cannot run before it;
 *   - retry is 0. A guard that passes on the second attempt has told you nothing —
 *     the whole question is whether the SAME input produces the SAME verdict;
 *   - fileParallelism is off, because the guard walks the real tree and must not
 *     race a sibling test that writes into a throwaway copy of it.
 *
 * NOT a replacement for `npm test`. This lane is the evidence lane for the
 * injection boundary; the full suite still runs under vitest.config.mjs.
 *
 * SCOPE NOTE: this config does not, on its own, prove that no application startup
 * ran. `setupFiles` is not declared here, but vitest may still resolve a project
 * default. The absence of application side effects is asserted by the contract
 * test `tests/unit/securityLaneIsolation.test.mjs`, which fails loudly if backend
 * startup ever becomes reachable from this lane — rather than being assumed from
 * the shape of this file.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/emailHtmlInjectionGuard.test.mjs',
      'tests/unit/emailUrlPolicy.test.mjs',
      'tests/unit/templateBindings.test.mjs',
      'tests/unit/htmlEscapeContract.test.mjs',
      'tests/unit/securityLaneIsolation.test.mjs',
    ],
    fileParallelism: false,
    retry: 0,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    reporters: ['default'],
  },
});
