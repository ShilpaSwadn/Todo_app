import { query } from './database.js'

const initDatabase = async () => {
  console.log('Database: Starting schema initialization...');
  try {
    // 1. Ensure core users table exists
    console.log('Database: Synchronizing users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(255) UNIQUE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        mobile_number VARCHAR(20),
        account_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Cleanup: If legacy temp_tables exist, drop them
    console.log('Database: Cleaning up legacy tables...');
    await query(`
      DROP TABLE IF EXISTS public.temp_users CASCADE;
    `);

    console.log('Database: Schema initialization completed successfully.');
  } catch (error) {
    console.error('Database: Schema initialization FAILED:', error.message);
    throw error;
  }
}

export default initDatabase
