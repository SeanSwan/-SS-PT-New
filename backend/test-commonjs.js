import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

console.log('=== MODULE TEST START ===');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Env path:', envPath);
console.log('Env exists:', existsSync(envPath));
console.log('=== MODULE TEST END ===');
