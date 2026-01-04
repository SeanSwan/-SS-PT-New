import bcrypt from 'bcryptjs';

const saltRounds = 10;
const password = 'admin123';
const hash = await bcrypt.hash(password, saltRounds);
console.log('Generated hash for admin123:', hash);

const verify = await bcrypt.compare(password, hash);
console.log('Verification:', verify);