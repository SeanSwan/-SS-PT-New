'use strict';

/**
 * Launch Control (admin flag center) — ADDITIVE migration. Creates the control-plane tables only; touches
 * NOTHING existing. Flags resolve from env baseline exactly as today until an admin writes an override row,
 * so this migration is inert on its own (safe to deploy before the UI ships).
 *
 * Tables:
 *   flags           — registry: which flags appear on the board + grouping/labels/health threshold.
 *   flag_overrides   — the runtime override (force on/off, or role/%/schedule rollout). No row = env baseline.
 *   flag_audit       — append-only ledger (who flipped what, when, why).
 *   flag_health      — fail-closed events reported by each surface's ErrorBoundary (is a live surface erroring?).
 *
 * down() drops all four — fully reversible; dropping them restores pure env-var behavior.
 */
module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    await sql.query(`
      CREATE TABLE IF NOT EXISTS flags (
        flag              TEXT PRIMARY KEY,
        label             TEXT NOT NULL,
        grp               TEXT NOT NULL DEFAULT 'redesign',
        parent_flag       TEXT NULL,
        health_threshold  INTEGER NOT NULL DEFAULT 5,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS flag_overrides (
        flag        TEXT PRIMARY KEY REFERENCES flags(flag) ON DELETE CASCADE,
        value       BOOLEAN NOT NULL,
        mode        TEXT NOT NULL DEFAULT 'force',
        roles       TEXT[] NULL,
        pct         INTEGER NULL CHECK (pct BETWEEN 1 AND 99),
        starts_at   TIMESTAMPTZ NULL,
        updated_by  TEXT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS flag_audit (
        id          BIGSERIAL PRIMARY KEY,
        flag        TEXT NOT NULL,
        old_state   JSONB NULL,
        new_state   JSONB NULL,
        actor       TEXT NOT NULL,
        source      TEXT NOT NULL DEFAULT 'manual',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_flag_audit_flag_ts ON flag_audit (flag, created_at DESC);`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS flag_health (
        id          BIGSERIAL PRIMARY KEY,
        flag        TEXT NOT NULL,
        surface     TEXT NULL,
        err_msg     TEXT NULL,
        ua          TEXT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_flag_health_flag_ts ON flag_health (flag, created_at DESC);`);

    // Seed the registry with the flags that exist today (idempotent). Env-var mapping stays in
    // publicConfigRoutes; this table only drives the admin board (labels/grouping/health).
    await sql.query(`
      INSERT INTO flags (flag, label, grp, parent_flag) VALUES
        ('homeVNext',          'Home page redesign',                 'redesign', NULL),
        ('dashboardV2',        'Dashboards (admin/trainer/client)',  'redesign', NULL),
        ('dashboardV2Finance', 'Dashboard finance data',             'redesign', 'dashboardV2'),
        ('storeV4',            'Store — Crystal Case',               'redesign', NULL),
        ('aboutVNext',         'About page redesign',                'redesign', NULL),
        ('videoVNext',         'Video library redesign',             'redesign', NULL),
        ('contactVNext',       'Contact page redesign',              'redesign', NULL),
        ('galleryVNext',       'Photography gallery redesign',       'redesign', NULL),
        ('prismCapture',       'Speed-to-lead lead capture',         'feature',  NULL)
      ON CONFLICT (flag) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.query(`DROP TABLE IF EXISTS flag_health;`);
    await sql.query(`DROP TABLE IF EXISTS flag_audit;`);
    await sql.query(`DROP TABLE IF EXISTS flag_overrides;`);
    await sql.query(`DROP TABLE IF EXISTS flags;`);
  },
};
