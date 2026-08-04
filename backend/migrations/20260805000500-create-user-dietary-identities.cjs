'use strict';

/**
 * SWA-71 P0 (ships first, alone): user-scoped dietary identity, killing the
 * allergies fail-open. Previously allergies lived ONLY on client_nutrition_plans
 * JSONB default [] — "no allergies" was indistinguishable from "never asked".
 *
 * Backfill: the most recent plan per user with a NON-EMPTY allergies array
 * becomes a declared identity (captureSource 'migration', normalized to
 * taxonomy slugs via the inline synonym map — migrations cannot import the ESM
 * taxonomy module). Users with only-empty or no plans get NO ROW = never asked
 * (the honest state; an empty legacy [] was never a real declaration).
 * Legacy plan rows are plaintext at migration time: S0.3 encryption starts
 * with the SAME deploy, and migrations run before the app boots.
 */

const SYNONYMS = {
  peanut: ['peanut', 'groundnut', 'arachis'],
  tree_nut: ['tree nut', 'treenut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'nuts'],
  milk: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'cheese'],
  egg: ['egg', 'albumin'],
  wheat_gluten: ['wheat', 'gluten', 'celiac', 'coeliac', 'barley', 'rye'],
  soy: ['soy', 'soya', 'edamame', 'tofu'],
  fish: ['fish', 'salmon', 'tuna', 'cod'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crustacean', 'clam', 'mussel', 'oyster', 'scallop'],
  sesame: ['sesame', 'tahini'],
  corn: ['corn', 'maize'],
  sulfites: ['sulfite', 'sulphite'],
  mustard: ['mustard'],
  celery: ['celery', 'celeriac'],
  lupin: ['lupin'],
};

function normalize(raw) {
  const lowered = String(raw || '').trim().toLowerCase();
  if (!lowered) return null;
  for (const [slug, words] of Object.entries(SYNONYMS)) {
    if (words.some((w) => lowered.includes(w))) return { allergen: slug, rawText: null };
  }
  return { allergen: 'other', rawText: String(raw).slice(0, 120) };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('user_dietary_identities')) {
      await queryInterface.createTable('user_dietary_identities', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        allergiesDeclared: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        allergies: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        dietaryRestrictions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        captureSource: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'client_settings' },
        capturedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
        },
        confirmedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    // Backfill from the most recent plan per user with non-empty allergies.
    if (tables.includes('client_nutrition_plans')) {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT DISTINCT ON ("userId") "userId", allergies, "dietaryRestrictions", "createdAt"
        FROM client_nutrition_plans
        WHERE allergies IS NOT NULL AND jsonb_array_length(allergies) > 0
        ORDER BY "userId", "createdAt" DESC
      `);
      for (const row of rows) {
        const allergies = (Array.isArray(row.allergies) ? row.allergies : [])
          .map(normalize)
          .filter(Boolean);
        const restrictions = Array.isArray(row.dietaryRestrictions) ? row.dietaryRestrictions : [];
        await queryInterface.sequelize.query(`
          INSERT INTO user_dietary_identities
            ("userId", "allergiesDeclared", allergies, "dietaryRestrictions", "captureSource", "createdAt", "updatedAt")
          VALUES (:userId, true, :allergies, :restrictions, 'migration', NOW(), NOW())
          ON CONFLICT ("userId") DO NOTHING
        `, {
          replacements: {
            userId: row.userId,
            allergies: JSON.stringify(allergies),
            restrictions: JSON.stringify(restrictions),
          },
        });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_dietary_identities');
  },
};
