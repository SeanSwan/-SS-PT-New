'use strict';

/**
 * Remove design controls from Launch Control.
 *
 * Deleting the seven registry rows is the single override-clearing mechanism: the existing
 * flag_overrides.flag foreign key cascades those rows. flag_audit has no registry foreign key and is
 * deliberately untouched. Down restores registry metadata only; historical overrides are not resurrected.
 */
module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.transaction(async (transaction) => {
      await sql.query(`
        DELETE FROM flags
         WHERE flag IN (
           'homeVNext',
           'dashboardV2',
           'storeV4',
           'aboutVNext',
           'videoVNext',
           'contactVNext',
           'galleryVNext'
         );
      `, { transaction });
      await sql.query(`
        UPDATE flags
           SET grp = 'feature', parent_flag = NULL
         WHERE flag = 'dashboardV2Finance';
      `, { transaction });
    });
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.transaction(async (transaction) => {
      await sql.query(`
        INSERT INTO flags (flag, label, grp, parent_flag) VALUES
          ('homeVNext',          'Home page redesign',                 'redesign', NULL),
          ('dashboardV2',        'Dashboards (admin/trainer/client)',  'redesign', NULL),
          ('storeV4',            'Store — Crystal Case',               'redesign', NULL),
          ('aboutVNext',         'About page redesign',                'redesign', NULL),
          ('videoVNext',         'Video library redesign',             'redesign', NULL),
          ('contactVNext',       'Contact page redesign',              'redesign', NULL),
          ('galleryVNext',       'Photography gallery redesign',       'redesign', NULL)
        ON CONFLICT (flag) DO UPDATE SET
          label = EXCLUDED.label,
          grp = EXCLUDED.grp,
          parent_flag = EXCLUDED.parent_flag;
      `, { transaction });
      await sql.query(`
        UPDATE flags
           SET grp = 'redesign', parent_flag = 'dashboardV2'
         WHERE flag = 'dashboardV2Finance';
      `, { transaction });
    });
  },
};
