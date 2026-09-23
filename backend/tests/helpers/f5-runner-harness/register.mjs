import { register } from 'node:module';

// Must run before the driver is evaluated, so the driver's own import of
// safe-migrate.mjs already sees the stubbed boundaries.
register('./hooks.mjs', import.meta.url);
