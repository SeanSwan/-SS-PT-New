import bcrypt from 'bcryptjs';

const hash = '$2a$10$H0Eg1JZucKegF7oKDM1C2e4iOrIpObkcwr8RIJaZRmNMxUIuJPF0C';
const testPasswords = ['admin123', 'password', 'test', '123456', 'admin'];

for (const pwd of testPasswords) {
  const result = await bcrypt.compare(pwd, hash);
  console.log(`'${pwd}': ${result}`);
}