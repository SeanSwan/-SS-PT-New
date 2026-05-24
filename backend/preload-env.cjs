const path = require('node:path');
const { existsSync } = require('node:fs');
const dotenv = require('dotenv');

const candidates = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '.env'),
];

for (const envPath of candidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
