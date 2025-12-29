import sequelize from './database.mjs';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('\n=== Database Schema Audit ===\n');
    
    // 1. Get all tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    // 2. Check critical tables
    const criticalTables = [
      'users', 'client_trainer_assignments', 
      'sessions', 'client_progress'
    ];
    
    console.log('\n=== Critical Table Structures ===');
    for (const table of criticalTables) {
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${table}'
        ORDER BY ordinal_position;
      `);
      
      console.log(`\n${table} structure (${columns.length} columns):`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    }
    
    // 3. Check foreign keys
    console.log('\n=== Foreign Key Relationships ===');
    const [foreignKeys] = await sequelize.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY';
    `);
    
    console.log(`Found ${foreignKeys.length} foreign keys:`);
    foreignKeys.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // 4. Check indexes
    console.log('\n=== Index Analysis ===');
    const [indexes] = await sequelize.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
      ORDER BY
        tablename, indexname;
    `);
    
    console.log(`Found ${indexes.length} indexes:`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}: ${idx.indexname}`);
    });
    
    // 5. Check for missing indexes on foreign keys
    console.log('\n=== Missing Index Recommendations ===');
    const missingIndexes = foreignKeys.filter(fk => 
      !indexes.some(idx => 
        idx.tablename === fk.table_name && 
        idx.indexdef.includes(fk.column_name)
      )
    );
    
    if (missingIndexes.length > 0) {
      console.log('Recommended indexes to add:');
      missingIndexes.forEach(fk => {
        console.log(`  - CREATE INDEX idx_${fk.table_name}_${fk.column_name} ON ${fk.table_name}(${fk.column_name});`);
      });
    } else {
      console.log('All foreign keys have indexes - good!');
    }
    
    await sequelize.close();
    console.log('\n=== Schema Audit Complete ===');
    process.exit(0);
  } catch (err) {
    console.error('Audit Error:', err.message);
    process.exit(1);
  }
})();