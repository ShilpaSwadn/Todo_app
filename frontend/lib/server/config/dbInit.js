import { query } from './database.js'

const initDatabase = async () => {
  console.log('Database: Starting schema initialization...');
  try {
    // 1. Ensure core users table exists
    console.log('Database: Synchronizing users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        mobile_number VARCHAR(20) UNIQUE,
        language_preference VARCHAR(50),
        time_zone VARCHAR(100),
        account_active BOOLEAN DEFAULT false,
        profile_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns if table already exists
    const columnsToAdd = [
      { name: 'language_preference', type: 'VARCHAR(50)' },
      { name: 'time_zone', type: 'VARCHAR(100)' },
      { name: 'profile_data', type: 'JSONB DEFAULT \'{}\'' }
    ];

    for (const col of columnsToAdd) {
      await query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='${col.name}') THEN
            ALTER TABLE public.users ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

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
