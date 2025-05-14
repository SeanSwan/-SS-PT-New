const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'backend', 'migrations');

// Get all .mjs files in the migrations directory
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.mjs') && !file.endsWith('.backup'));

console.log(`Found ${files.length} MJS migration files to convert`);

// Convert each file
files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  const newFilePath = filePath.replace('.mjs', '.cjs');
  
  // If .cjs file already exists, skip this file
  if (fs.existsSync(newFilePath)) {
    console.log(`Skipping ${file} as the CJS version already exists`);
    return;
  }
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace ESM syntax with CommonJS
  content = "'use strict';\n\n" + content;
  content = content.replace(/export default/, 'module.exports =');
  
  // Write the modified content to the new file
  fs.writeFileSync(newFilePath, content);
  
  // Rename the mjs file to .backup
  fs.renameSync(filePath, filePath + '.backup');
  
  console.log(`Converted ${file} to CJS format`);
});

console.log('All migration files converted successfully');
