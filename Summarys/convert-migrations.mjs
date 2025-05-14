// convert-migrations.mjs
// This script converts all migration files from CommonJS to ESM format

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'backend', 'migrations');

// Get all .cjs files in the migrations directory
const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.cjs'));

console.log(`Found ${files.length} CJS migration files to convert`);

// Convert each file
files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  const newFilePath = filePath.replace('.cjs', '.mjs');
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace CommonJS syntax with ESM
  content = content.replace(/'use strict';\s*/, '');
  content = content.replace(/module\.exports\s*=/, 'export default');
  
  // Write the modified content to the new file
  fs.writeFileSync(newFilePath, content);
  
  // Delete the old file
  fs.unlinkSync(filePath);
  
  console.log(`Converted ${file} to ESM format`);
});

console.log('All migration files converted successfully');
