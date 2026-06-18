'use strict';

const BOOTCAMP_TABLE = 'bootcamp_exercises';
const EXERCISES_TABLE = 'Exercises';
const EXERCISE_LIBRARY_COLUMN = 'exerciseLibraryId';
const BOOTCAMP_EXERCISE_FK = 'fk_bootcamp_exercises_exercise_uuid';
const UUID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function describeTableSafe(queryInterface, tableName) {
  try {
    return await queryInterface.describeTable(tableName);
  } catch {
    return null;
  }
}

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  const columns = await describeTableSafe(queryInterface, tableName);
  if (!columns || columns[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition(Sequelize));
}

async function dropExerciseLibraryForeignKeys(queryInterface) {
  const [constraints] = await queryInterface.sequelize.query(`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = ANY(con.conkey)
    WHERE nsp.nspname = current_schema()
      AND rel.relname = :tableName
      AND attr.attname = :columnName
      AND con.contype = 'f'
  `, {
    replacements: { tableName: BOOTCAMP_TABLE, columnName: EXERCISE_LIBRARY_COLUMN },
  });

  for (const constraint of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)} DROP CONSTRAINT IF EXISTS ${quoteIdent(constraint.conname)}`
    );
  }
}

async function getColumnMetadata(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT data_type AS "dataType", udt_name AS "udtName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = :tableName
      AND column_name = :columnName
    LIMIT 1
  `, {
    replacements: { tableName, columnName },
  });

  return rows[0] ?? null;
}

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = :tableName
    LIMIT 1
  `, {
    replacements: { tableName },
  });

  return rows.length > 0;
}

async function hasNamedConstraint(queryInterface, constraintName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = :constraintName
    LIMIT 1
  `, {
    replacements: { constraintName },
  });

  return rows.length > 0;
}

async function ensureExerciseLibraryUuidColumn(queryInterface, Sequelize) {
  const columns = await describeTableSafe(queryInterface, BOOTCAMP_TABLE);
  if (!columns) return;

  if (!columns[EXERCISE_LIBRARY_COLUMN]) {
    await queryInterface.addColumn(BOOTCAMP_TABLE, EXERCISE_LIBRARY_COLUMN, {
      type: Sequelize.UUID,
      allowNull: true,
    });
    return;
  }

  await dropExerciseLibraryForeignKeys(queryInterface);

  const metadata = await getColumnMetadata(queryInterface, BOOTCAMP_TABLE, EXERCISE_LIBRARY_COLUMN);
  if (metadata?.udtName === 'uuid') return;

  await queryInterface.sequelize.query(`
    ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)}
    ALTER COLUMN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)} DROP DEFAULT
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)}
    ALTER COLUMN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)} TYPE UUID
    USING CASE
      WHEN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)}::text ~* '${UUID_PATTERN}'
        THEN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)}::text::uuid
      ELSE NULL
    END
  `);
}

async function ensureExerciseForeignKey(queryInterface) {
  if (!(await tableExists(queryInterface, EXERCISES_TABLE))) return;
  if (await hasNamedConstraint(queryInterface, BOOTCAMP_EXERCISE_FK)) return;

  await queryInterface.sequelize.query(`
    UPDATE ${quoteIdent(BOOTCAMP_TABLE)} be
    SET ${quoteIdent(EXERCISE_LIBRARY_COLUMN)} = NULL
    WHERE be.${quoteIdent(EXERCISE_LIBRARY_COLUMN)} IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM ${quoteIdent(EXERCISES_TABLE)} e
        WHERE e.id = be.${quoteIdent(EXERCISE_LIBRARY_COLUMN)}
      )
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)}
    ADD CONSTRAINT ${quoteIdent(BOOTCAMP_EXERCISE_FK)}
    FOREIGN KEY (${quoteIdent(EXERCISE_LIBRARY_COLUMN)})
    REFERENCES ${quoteIdent(EXERCISES_TABLE)}(id)
    ON DELETE SET NULL
  `);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, Sequelize, EXERCISES_TABLE, 'previewVideoUrl', (S) => ({
      type: S.STRING(500),
      allowNull: true,
    }));

    await addColumnIfMissing(queryInterface, Sequelize, BOOTCAMP_TABLE, 'previewVideoUrl', (S) => ({
      type: S.STRING(500),
      allowNull: true,
    }));

    await addColumnIfMissing(queryInterface, Sequelize, BOOTCAMP_TABLE, 'description', (S) => ({
      type: S.TEXT,
      allowNull: true,
    }));

    await addColumnIfMissing(queryInterface, Sequelize, BOOTCAMP_TABLE, 'instructions', (S) => ({
      type: S.TEXT,
      allowNull: true,
    }));

    await ensureExerciseLibraryUuidColumn(queryInterface, Sequelize);
    await ensureExerciseForeignKey(queryInterface);
  },

  async down(queryInterface) {
    await dropExerciseLibraryForeignKeys(queryInterface);

    const bootcampColumns = await describeTableSafe(queryInterface, BOOTCAMP_TABLE);
    if (bootcampColumns?.[EXERCISE_LIBRARY_COLUMN]) {
      await queryInterface.sequelize.query(`
        ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)}
        ALTER COLUMN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)} DROP DEFAULT
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE ${quoteIdent(BOOTCAMP_TABLE)}
        ALTER COLUMN ${quoteIdent(EXERCISE_LIBRARY_COLUMN)} TYPE INTEGER
        USING NULL::integer
      `);
    }

    for (const column of ['instructions', 'description', 'previewVideoUrl']) {
      const columns = await describeTableSafe(queryInterface, BOOTCAMP_TABLE);
      if (columns?.[column]) {
        await queryInterface.removeColumn(BOOTCAMP_TABLE, column);
      }
    }

    const exerciseColumns = await describeTableSafe(queryInterface, EXERCISES_TABLE);
    if (exerciseColumns?.previewVideoUrl) {
      await queryInterface.removeColumn(EXERCISES_TABLE, 'previewVideoUrl');
    }
  },
};
