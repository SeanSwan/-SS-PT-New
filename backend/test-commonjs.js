console.log('=== COMMONJS TEST START ===');\nconsole.log('Node.js version:', process.version);\nconsole.log('Current directory:', process.cwd());\n\ntry {\n  console.log('Testing CommonJS...');\n  const path = require('path');\n  console.log('✅ path require works');\n  \n  const fs = require('fs');\n  console.log('✅ fs require works');\n  \n  // Check if .env file exists\n  const envPath = path.resolve(__dirname, '..', '.env');\n  console.log('Env path:', envPath);\n  console.log('Env exists:', fs.existsSync(envPath));\n  \n  console.log('=== COMMONJS TEST END ===');\n  \n} catch (error) {\n  console.log('💥 Error in CommonJS test:', error.message);\n  console.log('Stack:', error.stack);\n}