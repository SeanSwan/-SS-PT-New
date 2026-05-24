/**
 * Retired HTTP migration controller.
 *
 * Database migrations must run through deployment scripts or explicit CLI
 * commands, not public Express routes.
 */

export const runMigrations = async (_req, res) => {
  return res.status(410).json({
    success: false,
    message: 'HTTP-triggered migrations are retired. Use the migration CLI or deployment scripts.'
  });
};
