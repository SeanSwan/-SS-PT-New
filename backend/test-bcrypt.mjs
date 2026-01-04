import bcrypt from 'bcryptjs';

const hash = '$2a$10$H0Eg1JZucKegF7oKDM1C2e4iOrIpObkcwr8RIJaZRmNMxUIuJPF0C';
const result = await bcrypt.compare('admin123', hash);
console.log('bcrypt compare result:', result);