// Add this route to backend/routes/adminRoutes.mjs for debugging

// TEMPORARY DIAGNOSTIC ROUTE - Add this to adminRoutes.mjs
router.get('/contacts/debug', async (req, res) => {
  try {
    console.log('🔍 DIAGNOSTIC: Starting contacts debug...');
    
    // Step 1: Check if we can import models
    let models;
    try {
      const getModels = await import('../models/associations.mjs').then(m => m.default);
      models = await getModels();
      console.log('✅ Models imported successfully');
      console.log('Available models:', Object.keys(models));
    } catch (importError) {
      console.log('❌ Model import error:', importError.message);
      return res.status(500).json({
        error: 'Model import failed',
        message: importError.message,
        step: 'import'
      });
    }
    
    // Step 2: Check if Contact model exists
    if (!models.Contact) {
      console.log('❌ Contact model missing from models object');
      return res.status(500).json({
        error: 'Contact model missing',
        availableModels: Object.keys(models),
        step: 'contact_check'
      });
    }
    console.log('✅ Contact model found');
    
    // Step 3: Test database connection
    try {
      const { default: sequelize } = await import('../database.mjs');
      await sequelize.authenticate();
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.log('❌ Database connection error:', dbError.message);
      return res.status(500).json({
        error: 'Database connection failed',
        message: dbError.message,
        step: 'database'
      });
    }
    
    // Step 4: Check if contacts table exists
    try {
      const { default: sequelize } = await import('../database.mjs');
      const tables = await sequelize.getQueryInterface().showAllTables();
      const contactsTableExists = tables.includes('contacts');
      
      console.log('Available tables:', tables);
      console.log('Contacts table exists:', contactsTableExists);
      
      if (!contactsTableExists) {
        return res.status(500).json({
          error: 'Contacts table does not exist',
          availableTables: tables,
          step: 'table_check'
        });
      }
    } catch (tableError) {
      console.log('❌ Table check error:', tableError.message);
      return res.status(500).json({
        error: 'Table check failed',
        message: tableError.message,
        step: 'table_check'
      });
    }
    
    // Step 5: Test actual Contact query
    try {
      const contacts = await models.Contact.findAll({ limit: 5 });
      console.log(`✅ Contact query successful: ${contacts.length} contacts found`);
      
      return res.json({
        success: true,
        message: 'All diagnostics passed',
        contactCount: contacts.length,
        availableModels: Object.keys(models),
        step: 'complete'
      });
      
    } catch (queryError) {
      console.log('❌ Contact query error:', queryError.message);
      return res.status(500).json({
        error: 'Contact query failed',
        message: queryError.message,
        stack: queryError.stack,
        step: 'query'
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnostic route error:', error);
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack,
      step: 'unknown'
    });
  }
});
