// backend/scripts/fix-sessions-table.mjs
// Create this file in your backend/scripts directory

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database config from environment
const dbName = process.env.DB_NAME || 'swanstudios';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbHost = process.env.DB_HOST || 'localhost';

// Create a direct connection to the database
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: 'postgres',
  logging: console.log
});

async function fixSessionsTable() {
  try {
    console.log('Starting sessions table fix...');
    
    // Create a transaction to ensure all commands succeed or fail together
    const transaction = await sequelize.transaction();
    
    try {
      // Drop the sessions table if it exists
      await sequelize.query('DROP TABLE IF EXISTS sessions CASCADE;', { transaction });
      console.log('Sessions table dropped (if it existed)');
      
      // Create enum type if it doesn't exist
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sessions_status') THEN
            CREATE TYPE enum_sessions_status AS ENUM(
              'available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled'
            );
          END IF;
        END
        $$;
      `, { transaction });
      console.log('Enum type created or verified');
      
      // Create the sessions table with all fields
      await sequelize.query(`
        CREATE TABLE sessions (
          id SERIAL PRIMARY KEY,
          "sessionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
          duration INTEGER NOT NULL DEFAULT 60,
          "userId" INTEGER REFERENCES users(id),
          "trainerId" INTEGER REFERENCES users(id),
          location VARCHAR(255),
          notes TEXT,
          status enum_sessions_status NOT NULL DEFAULT 'available',
          "cancellationReason" TEXT,
          "cancelledBy" INTEGER REFERENCES users(id),
          "sessionDeducted" BOOLEAN NOT NULL DEFAULT false,
          "deductionDate" TIMESTAMP WITH TIME ZONE,
          confirmed BOOLEAN NOT NULL DEFAULT false,
          "reminderSent" BOOLEAN NOT NULL DEFAULT false,
          "reminderSentDate" TIMESTAMP WITH TIME ZONE,
          "feedbackProvided" BOOLEAN NOT NULL DEFAULT false,
          rating INTEGER,
          feedback TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "deletedAt" TIMESTAMP WITH TIME ZONE
        );
      `, { transaction });
      console.log('Sessions table created with all fields');
      
      // Add comments to columns
      await sequelize.query(`
        COMMENT ON COLUMN sessions."sessionDate" IS 'Start date and time of the session';
        COMMENT ON COLUMN sessions.duration IS 'Duration in minutes';
        COMMENT ON COLUMN sessions."userId" IS 'Client who booked the session';
        COMMENT ON COLUMN sessions."trainerId" IS 'Trainer assigned to the session';
        COMMENT ON COLUMN sessions.location IS 'Physical location for the session';
        COMMENT ON COLUMN sessions.notes IS 'Additional notes for the session';
        COMMENT ON COLUMN sessions.status IS 'Current status of the session';
        COMMENT ON COLUMN sessions."cancellationReason" IS 'Reason for cancellation if applicable';
        COMMENT ON COLUMN sessions."cancelledBy" IS 'User who cancelled the session';
        COMMENT ON COLUMN sessions."sessionDeducted" IS 'Whether a session was deducted from client package';
        COMMENT ON COLUMN sessions."deductionDate" IS 'When the session was deducted';
        COMMENT ON COLUMN sessions.confirmed IS 'Whether the session is confirmed';
        COMMENT ON COLUMN sessions."reminderSent" IS 'Whether reminder notification was sent';
        COMMENT ON COLUMN sessions."reminderSentDate" IS 'When the reminder was sent';
        COMMENT ON COLUMN sessions."feedbackProvided" IS 'Whether client provided feedback';
        COMMENT ON COLUMN sessions.rating IS 'Client rating (1-5)';
        COMMENT ON COLUMN sessions.feedback IS 'Client feedback text';
      `, { transaction });
      console.log('Column comments added');
      
      // Commit the transaction
      await transaction.commit();
      console.log('✅ Sessions table fixed successfully!');
      
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback();
      console.error('Error during transaction:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Failed to fix sessions table:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the fix
fixSessionsTable();