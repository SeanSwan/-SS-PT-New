import bcrypt from 'bcryptjs';

const hash = '$2a$10$H0Eg1JZucKegF7oKDM1C2e4iOrIpObkcwr8RIJaZRmNMxUIuJPF0C';
const testPasswords = ['admin123', 'password', 'test', '123456', 'admin', 'password123', 'test123', 'swanstudios', 'client'];

for (const pwd of testPasswords) {
  const result = await bcrypt.compare(pwd, hash);
  if (result) {
    console.log(`Password is '${pwd}'`);
    break;
  }
}
console.log('No matching password found');