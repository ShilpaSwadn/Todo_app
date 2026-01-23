import { query } from './database.js'

const initDatabase = async () => {
  console.log('Database: Starting schema initialization...');
  try {
    // 1. Ensure tables exist
    console.log('Database: Synchronizing base tables...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        uid TEXT UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile_number VARCHAR(20),
        password VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.temp_users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        mobile_number TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Run migrations for existing tables
    console.log('Database: Running migrations for existing columns...');
    await query(`
      -- Add columns if missing in older versions
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS uid TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
      
      ALTER TABLE public.temp_users ADD COLUMN IF NOT EXISTS uid TEXT;

      -- Add unique constraint to uid if missing
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_uid_key') THEN
          ALTER TABLE public.users ADD CONSTRAINT users_uid_key UNIQUE (uid);
        END IF;
      END $$;
    `);

    // 3. Ensure indexes
    console.log('Database: Synchronizing indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
      CREATE INDEX IF NOT EXISTS idx_otps_email ON public.otps(email);
      CREATE INDEX IF NOT EXISTS idx_otps_expires ON public.otps(expires_at);
      CREATE INDEX IF NOT EXISTS idx_temp_users_email ON public.temp_users(email);
    `);

    console.log('Database: Schema initialization completed successfully.');
  } catch (error) {
    console.error('Database: Schema initialization FAILED:', error.message);
    throw error;
  }
}

export default initDatabase
