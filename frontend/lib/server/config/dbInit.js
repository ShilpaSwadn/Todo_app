import { query } from './database.js'

const initDatabase = async () => {
  try {
    // Combine all initialization queries into a single call to reduce roundtrips
    await query(`
      -- Users Table
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
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);

      -- Temp Users Table
      CREATE TABLE IF NOT EXISTS public.temp_users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        mobile_number TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- OTP Table
      CREATE TABLE IF NOT EXISTS public.otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_otps_email ON public.otps(email);
      CREATE INDEX IF NOT EXISTS idx_otps_expires ON public.otps(expires_at);

      -- Migrations (Safe ADD COLUMN)
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS uid TEXT UNIQUE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
    `)
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

export default initDatabase
