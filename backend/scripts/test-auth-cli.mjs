// backend/scripts/test-auth-cli.mjs
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Op } from 'sequelize'; // Import Op for OR queries
import sequelize from '../database.mjs'; // Adjust path if needed
import User from '../models/User.mjs';   // Adjust path if needed
import logger from '../utils/logger.mjs'; // Use your existing logger

// --- Configuration ---
const BCRYPT_SALT_ROUNDS = 10; // Match the salt rounds used in your authController

// --- Helper Functions ---

const connectDB = async () => {
    logger.info('Attempting database connection...');
    await sequelize.authenticate();
    logger.info('✅ Database connection successful.');
};

const disconnectDB = async () => {
    logger.info('Closing database connection...');
    await sequelize.close();
    logger.info('Database connection closed.');
};

const findUserByUsername = async (username) => {
    logger.info(`Looking up user by username: ${username}`);
    const user = await User.findOne({ where: { username: username } });
    if (user) {
        logger.info(`✅ User found with username: ${username} (ID: ${user.id})`);
    } else {
        logger.warn(`⚠️ User not found with username: ${username}`);
    }
    return user;
};

const findUserByEmail = async (email) => {
    logger.info(`Looking up user by email: ${email}`);
    const user = await User.findOne({ where: { email: email } });
    if (user) {
        logger.info(`✅ User found with email: ${email} (ID: ${user.id})`);
    } else {
        logger.warn(`⚠️ User not found with email: ${email}`);
    }
    return user;
};

const verifyPassword = async (plainPassword, hashedPassword) => {
    logger.info('Comparing provided password with stored hash...');
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    if (isMatch) {
        logger.info('✅ Password verification successful!');
    } else {
        logger.error('❌ Password verification failed.');
    }
    return isMatch;
};

const hashPassword = async (plainPassword) => {
    logger.info('Hashing new password...');
    try {
        const hash = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
        logger.info('✅ Password hashing successful.');
        return hash;
    } catch (hashError) {
        logger.error('❌ Password hashing failed:', hashError);
        throw hashError; // Re-throw to be caught by main handler
    }
};

const createUser = async (userData) => {
    logger.info('Attempting to create new user in database...');
    try {
        const newUser = await User.create(userData);
        logger.info(`✅ User successfully created with ID: ${newUser.id}, Username: ${newUser.username}`);
        return newUser;
    } catch (dbError) {
        // Log common Sequelize validation errors more clearly
        if (dbError.name === 'SequelizeUniqueConstraintError') {
            logger.error(`❌ Database Error: Unique constraint violation. Field: ${dbError.errors[0]?.path}, Value: ${dbError.errors[0]?.value}`);
        } else if (dbError.name === 'SequelizeValidationError') {
            logger.error('❌ Database Error: Validation failed.');
            dbError.errors.forEach(err => logger.error(`  - Field: ${err.path}, Message: ${err.message}, Value: ${err.value}`));
        } else {
            logger.error('❌ Database Error during user creation:', dbError);
        }
        throw dbError; // Re-throw
    }
};

// --- Command Handlers ---

const handleLogin = async (username, password) => {
    logger.info(`--- Testing LOGIN for username: ${username} ---`);
    if (!username || !password) throw new Error('Username and password arguments are required for login.');

    const user = await findUserByUsername(username);
    if (!user) {
        logger.error('Login Failed: User not found.');
        logger.info('Suggestions:');
        logger.info('  - Double-check the username spelling.');
        logger.info('  - Ensure this user exists in the PRODUCTION database.');
        return false; // Indicate failure
    }

    // Ensure user.password points to the correct field in your model
    const passwordField = user.password || user.passwordHash; // Adjust if needed
    if (!passwordField) {
         logger.error(`Login Failed: User object found but password field ('password' or 'passwordHash') is missing or empty.`);
         return false;
    }

    const passwordMatch = await verifyPassword(password, passwordField);
    if (!passwordMatch) {
        logger.error('Login Failed: Password mismatch.');
        logger.info('Suggestions:');
        logger.info('  - Double-check the password (case-sensitive).');
        logger.info('  - Ensure you are using the PRODUCTION password, not a local/test one.');
        logger.info('  - Consider if the password hash algorithm or salt rounds differ from registration.');
        return false; // Indicate failure
    }

    logger.info('✅✅✅ Login Test Successful: Credentials verified!');
    return true; // Indicate success
};

const handleRegister = async (username, email, password, firstName, lastName) => {
    logger.info(`--- Testing REGISTRATION for username: ${username}, email: ${email} ---`);
    if (!username || !email || !password || !firstName || !lastName) {
        throw new Error('Username, email, password, firstName, and lastName arguments are required for registration.');
    }

    // 1. Check if username or email already exists
    logger.info('Checking for existing username or email...');
    const existingUser = await User.findOne({
        where: {
            [Op.or]: [{ username: username }, { email: email }]
        }
    });

    if (existingUser) {
        if (existingUser.username === username) {
            logger.error(`Registration Failed: Username '${username}' already exists.`);
            logger.info('Suggestions: Try a different username.');
        } else {
            logger.error(`Registration Failed: Email '${email}' already exists.`);
            logger.info('Suggestions: Try a different email or use the login/password reset flow.');
        }
        return false; // Indicate failure
    }
    logger.info('✅ Username and Email appear to be available.');

    // 2. Hash password
    const hashedPassword = await hashPassword(password);

    // 3. Create user
    const userData = {
        username,
        email,
        password: hashedPassword, // Ensure this matches your User model field name
        firstName,
        lastName,
        role: 'client', // Default role, adjust if needed
        isActive: true, // Default activation status, adjust if needed
        // Add any other required fields from your User model with defaults
    };
    await createUser(userData);

    logger.info('✅✅✅ Registration Test Successful: User created!');
    return true; // Indicate success
};

const handleCheckUser = async (identifier) => {
    logger.info(`--- Checking USER EXISTENCE for: ${identifier} ---`);
    if (!identifier) throw new Error('Username or email argument is required for check-user.');

    const isEmail = identifier.includes('@');
    let user;
    if (isEmail) {
        user = await findUserByEmail(identifier);
    } else {
        user = await findUserByUsername(identifier);
    }

    if (user) {
        logger.info(`✅✅✅ User Check: User FOUND. ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    } else {
        logger.info(`✅✅✅ User Check: User NOT FOUND with ${isEmail ? 'email' : 'username'} '${identifier}'.`);
    }
    return !!user; // Return true if found, false otherwise
};


// --- Main Execution ---
const main = async () => {
    logger.info('===========================================');
    logger.info('Starting Backend Authentication Test Script');
    logger.info('===========================================');

    const command = process.argv[2]?.toLowerCase();
    const args = process.argv.slice(3);
    let success = false;

    try {
        await connectDB();

        switch (command) {
            case 'login':
                success = await handleLogin(args[0], args[1]);
                break;
            case 'register':
                success = await handleRegister(args[0], args[1], args[2], args[3], args[4]);
                break;
            case 'check-user':
                 success = await handleCheckUser(args[0]);
                 break;
            default:
                logger.error('Invalid command.');
                logger.info('Usage:');
                logger.info('  node test-auth-cli.mjs login <username> <password>');
                logger.info('  node test-auth-cli.mjs register <username> <email> <password> <firstName> <lastName>');
                logger.info('  node test-auth-cli.mjs check-user <username_or_email>');
                break;
        }
    } catch (error) {
        logger.error('❌ An error occurred during script execution:', {
            message: error.message,
            stack: error.stack?.split('\n')[1]?.trim() // Log first line of stack
           });
        success = false; // Ensure failure state on error
    } finally {
        try {
            await disconnectDB();
        } catch (disconnectError) {
            logger.error('Error disconnecting from DB:', disconnectError);
        }
        logger.info(`Script finished. Overall result: ${success ? 'SUCCESS' : 'FAILURE'}`);
        process.exit(success ? 0 : 1); // Exit with appropriate code
    }
};

// --- Pre-run Checks ---
try {
    require.resolve('bcryptjs');
} catch(e) {
    console.error("\nERROR: 'bcryptjs' package not found.");
    console.error("Please install it in your backend directory: npm install bcryptjs\n");
    process.exit(1);
}
try {
    require.resolve('sequelize');
} catch(e) {
    console.error("\nERROR: 'sequelize' package not found.");
    console.error("Please ensure it's installed in your backend directory.\n");
    process.exit(1);
}
// Add checks for other essential packages if needed

// --- Load .env and Run ---
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Correct path relative to script

// Verify DATABASE_URL is set (crucial for Render)
if (!process.env.DATABASE_URL) {
     logger.error('CRITICAL: DATABASE_URL environment variable is not set!');
     logger.error('Ensure it is configured in your Render Environment Variables.');
     process.exit(1);
}

main();