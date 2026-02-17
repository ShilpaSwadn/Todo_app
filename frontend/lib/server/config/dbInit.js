import { query } from './database.js'

const initDatabase = async () => {
  console.log('Database: Starting schema initialization...');
  try {
    // 1. Ensure core users table exists
    console.log('Database: Synchronizing users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        mobile_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Alter table to remove constraints and adjust columns
      DO $$ 
      BEGIN 
        -- Drop unique constraint on mobile_number if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name = 'users_mobile_number_key') THEN
          ALTER TABLE public.users DROP CONSTRAINT users_mobile_number_key;
        END IF;

        -- Drop NOT NULL from email if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO') THEN
          ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
        END IF;
      END $$;
    `);


    // 3. Cleanup: If temp_users exists, we can drop it as it's no longer used
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
