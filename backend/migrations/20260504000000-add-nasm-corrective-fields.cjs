/**
 * Migration: Add NASM Corrective Exercise fields to "Exercises"
 * ==============================================================
 *
 * V3b.3.1 (2026-05-03) — Codex pre-impl review fixes applied:
 *   - sourceCitation NOT source (Codex HIGH F.A — `source` already
 *     exists with origin semantics, would collide).
 *   - cesProtocolStep as STRING + app-side validation NOT DB enum
 *     (Codex F.A) so future values can land without a migration.
 *   - nasmCorrectiveCategory as JSON nullable (no default, additive,
 *     Rule-58-safe).
 *
 * WHAT
 *   - nasmCorrectiveCategory  JSON      nullable
 *   - cesProtocolStep         STRING(32) nullable
 *   - sourceCitation          STRING(500) nullable
 *
 * WHY
 *   V3b.3 corrective seeder needs to tag each new corrective exercise
 *   with which postural distortion patterns it addresses (UCS / LCS /
 *   PDS / OHSA-specific) and which step of the NASM CES 4-step protocol
 *   it serves. Citation is required for every seeded row per
 *   docs/ai-workflow/references/NASM-CES-TAXONOMY.md §4.3.
 *
 * SAFETY
 *   - Idempotent column-add via information_schema check.
 *   - Targets the canonical "Exercises" PascalCase quoted table.
 *   - Strictly additive: no removals, no type changes, no data
 *     migration. Existing queries are unaffected because all 3 fields
 *     are nullable with no default.
 *   - Wrapped in transaction. Failed adds roll back.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const checkColumn = async (name) => {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'Exercises' AND column_name = '${name}';`,
          { transaction }
        );
        return rows.length > 0;
      };

      // 1) nasmCorrectiveCategory — JSON array of compensation tags
      if (!(await checkColumn('nasmCorrectiveCategory'))) {
        console.log('Adding nasmCorrectiveCategory column...');
        await queryInterface.addColumn(
          'Exercises',
          'nasmCorrectiveCategory',
          {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'V3b.3 (2026-05-03): array of NASM CES compensation tags this exercise addresses. Values: upper_crossed_syndrome, lower_crossed_syndrome, pronation_distortion_syndrome, knees_cave, knees_bow, low_back_arch, forward_head, arms_fall_forward, heels_rise, asymmetric_shift, excessive_forward_lean.',
          },
          { transaction }
        );
        console.log('✅ nasmCorrectiveCategory column added');
      } else {
        console.log('⏭️  nasmCorrectiveCategory column already exists');
      }

      // 2) cesProtocolStep — which step of the 4-step CES protocol
      if (!(await checkColumn('cesProtocolStep'))) {
        console.log('Adding cesProtocolStep column...');
        await queryInterface.addColumn(
          'Exercises',
          'cesProtocolStep',
          {
            type: Sequelize.STRING(32),
            allowNull: true,
            comment: 'V3b.3 (2026-05-03): NASM CES 4-step protocol position. Values: inhibit | lengthen | activate | integrate. STRING (not enum) so future values land without migration.',
          },
          { transaction }
        );
        console.log('✅ cesProtocolStep column added');
      } else {
        console.log('⏭️  cesProtocolStep column already exists');
      }

      // 3) sourceCitation — required citation for V3b.3 corrective rows
      if (!(await checkColumn('sourceCitation'))) {
        console.log('Adding sourceCitation column...');
        await queryInterface.addColumn(
          'Exercises',
          'sourceCitation',
          {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'V3b.3 (2026-05-03): authoritative citation for corrective exercises (NASM-CPT 7th ed. p. X / NASM-CES Ch. Y / Cleveland Clinic URL / AAOS guideline). Distinct from existing `source` column which records exercise ORIGIN (nasm/free-exercise-db/wrkout/etc). See docs/ai-workflow/references/NASM-CES-TAXONOMY.md §6.',
          },
          { transaction }
        );
        console.log('✅ sourceCitation column added');
      } else {
        console.log('⏭️  sourceCitation column already exists');
      }

      await transaction.commit();
      console.log('✅ V3b.3.1 migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ V3b.3.1 migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const checkColumn = async (name) => {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'Exercises' AND column_name = '${name}';`,
          { transaction }
        );
        return rows.length > 0;
      };

      for (const col of ['sourceCitation', 'cesProtocolStep', 'nasmCorrectiveCategory']) {
        if (await checkColumn(col)) {
          await queryInterface.removeColumn('Exercises', col, { transaction });
          console.log(`✅ ${col} column removed`);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ V3b.3.1 rollback failed:', error.message);
      throw error;
    }
  },
};
