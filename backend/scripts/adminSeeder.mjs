// backend/scripts/adminSeeder.mjs
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to the database
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'ogpswan';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Sean';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Swan';
    const adminEmail = process.env.ADMIN_EMAIL || 'ogpswan@yahoo.com';

    // Validate required env vars
    if (!adminPassword) {
      console.error('❌ Error: ADMIN_PASSWORD environment variable is required.');
      console.error('Please set it in your .env file or Render environment variables.');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { username: adminUsername }
    });

    if (existingAdmin) {
      console.log(`✅ Admin user '${adminUsername}' already exists. Skipping creation.`);
      process.exit(0);
    }

    // Create a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin user
    const admin = await User.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      username: adminUsername,
      password: hashedPassword, // This will bypass the model hook
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Admin user '${admin.username}' created successfully!`);
    console.log(`   First Name: ${admin.firstName}`);
    console.log(`   Last Name: ${admin.lastName}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
};

// Run the seeder
seedAdmin();