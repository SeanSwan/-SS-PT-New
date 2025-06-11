const fs = require('fs');
const path = require('path');

console.log('🔍 FINDING YOUR DATABASE CONNECTION INFO');
console.log('========================================');
console.log('');

// Try to read the config file
const configPath = path.join(__dirname, 'backend', 'config', 'config.cjs');

if (fs.existsSync(configPath)) {
    console.log('✅ Found config file:', configPath);
    console.log('');
    
    try {
        // Read the config file content
        const configContent = fs.readFileSync(configPath, 'utf8');
        console.log('📋 Your database configuration:');
        console.log('------------------------------');
        
        // Extract the development section
        const lines = configContent.split('\n');
        let inDevelopment = false;
        let developmentConfig = [];
        
        for (const line of lines) {
            if (line.includes('development:') || line.includes('development :{')) {
                inDevelopment = true;
                developmentConfig.push(line);
                continue;
            }
            
            if (inDevelopment) {
                developmentConfig.push(line);
                
                // End of development section
                if (line.includes('},') && !line.trim().startsWith('//')) {
                    break;
                }
            }
        }
        
        if (developmentConfig.length > 0) {
            developmentConfig.forEach(line => console.log(line));
        } else {
            console.log('Could not extract development configuration.');
            console.log('Please check the config file manually.');
        }
        
        console.log('');
        console.log('🔑 POSTGRESQL CONNECTION COMMANDS:');
        console.log('----------------------------------');
        console.log('');
        console.log('Option 1 - Command line (replace with your actual values):');
        console.log('  psql -U your_username -d your_database_name -h your_host -p your_port');
        console.log('');
        console.log('Option 2 - If using local PostgreSQL:');
        console.log('  psql -U postgres -d your_database_name');
        console.log('');
        console.log('Option 3 - With password prompt:');
        console.log('  psql -U your_username -d your_database_name -W');
        console.log('');
        
    } catch (error) {
        console.log('❌ Error reading config file:', error.message);
        console.log('');
        console.log('💡 You can manually check the file at:');
        console.log('   backend/config/config.cjs');
    }
} else {
    console.log('❌ Config file not found at:', configPath);
    console.log('');
    console.log('💡 Look for database configuration in:');
    console.log('   - backend/config/config.js');
    console.log('   - backend/config/config.json');
    console.log('   - .env files');
    console.log('   - environment variables');
}

console.log('');
console.log('📋 AFTER CONNECTING TO POSTGRESQL:');
console.log('----------------------------------');
console.log('1. Copy and paste the contents of MANUAL-COMPLETE-FIX.sql');
console.log('2. Press Enter to execute all commands');
console.log('3. Look for "MANUAL FIX COMPLETED SUCCESSFULLY!"');
console.log('4. Exit PostgreSQL');
console.log('5. Run: ./MANUAL-DATABASE-FIX.bat');
console.log('');
console.log('🎯 This will fix the foreign key constraint error and deploy');
console.log('   the Enhanced Social Media Platform!');
