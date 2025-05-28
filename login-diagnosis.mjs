// Comprehensive login diagnosis - target the exact issue
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const diagnosisLogger = {
  info: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️ ${msg}`)
};

const runDiagnosis = async () => {
  console.log('🔍 SWANSTUDIOS LOGIN DIAGNOSIS');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Test basic imports
    console.log('\n📦 Step 1: Testing imports...');
    
    // Test Sequelize import
    try {
      const { Sequelize } = await import('sequelize');
      diagnosisLogger.info('Sequelize import successful');
    } catch (error) {
      diagnosisLogger.error(`Sequelize import failed: ${error.message}`)
      return;
    }
    
    // Test database connection
    try {
      const dbModule = await import('./backend/database.mjs');
      const sequelize = dbModule.default;
      const { Op } = dbModule;
      
      diagnosisLogger.info('Database module import successful');
      diagnosisLogger.info('Op import successful');
      
      // Test connection
      await sequelize.authenticate();
      diagnosisLogger.info('Database connection successful');
      
      // Step 2: Test User model import
      console.log('\n👤 Step 2: Testing User model...');
      try {
        const UserModule = await import('./backend/models/User.mjs');
        const User = UserModule.default;
        diagnosisLogger.info('User model import successful');
        
        // Test basic query
        const userCount = await User.count();
        diagnosisLogger.info(`User count query successful: ${userCount} users`);
        
        // Step 3: Test the specific problematic query
        console.log('\n🔍 Step 3: Testing problematic query...');
        
        try {
          // This is the exact query from the login function
          const user = await User.findOne({
            where: {
              [Op.or]: [
                { username: 'admin' },
                { email: 'admin' }
              ]
            }
          });
          
          if (user) {
            diagnosisLogger.info(`Query successful! Found user: ${user.username}`);
            
            // Step 4: Test password check
            console.log('\n🔐 Step 4: Testing password verification...');
            try {
              const isValid = await user.checkPassword('admin123');
              diagnosisLogger.info(`Password check successful: ${isValid ? 'VALID' : 'INVALID'}`);
            } catch (pwError) {
              diagnosisLogger.error(`Password check failed: ${pwError.message}`);
            }
            
          } else {
            diagnosisLogger.warn('Query successful but no user found');
            
            // Check what users exist
            const allUsers = await User.findAll({
              attributes: ['id', 'username', 'email', 'role'],
              limit: 5
            });
            
            console.log('\n📋 Available users:');
            allUsers.forEach(u => {
              console.log(`  - ${u.username} (${u.email}) - ${u.role}`);
            });
          }
          
        } catch (queryError) {
          diagnosisLogger.error(`Query failed: ${queryError.message}`);
          console.log('Query error details:', {
            name: queryError.name,
            message: queryError.message,
            stack: queryError.stack
          });
        }
        
      } catch (userError) {
        diagnosisLogger.error(`User model import failed: ${userError.message}`);
      }
      
      await sequelize.close();
      
    } catch (dbError) {
      diagnosisLogger.error(`Database connection failed: ${dbError.message}`);
    }
    
  } catch (error) {
    diagnosisLogger.error(`Diagnosis failed: ${error.message}`);
  }
  
  console.log('\n🏁 DIAGNOSIS COMPLETE');
};

// Run diagnosis
runDiagnosis().catch(console.error);