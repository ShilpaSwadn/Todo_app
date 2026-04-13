import { query } from './database.js'

const initDatabase = async () => {
  console.log('Database: Starting schema initialization...');
  try {
    // 1. Create UUID v7 generator function if it doesn't exist
    console.log('Database: Ensuring UUID v7 generator exists...');
    await query(`
      CREATE OR REPLACE FUNCTION public.uuid_v7()
      RETURNS uuid
      AS $$
      DECLARE
        v_time timestamp with time zone:= clock_timestamp();
        v_secs bigint := floor(extract(epoch from v_time));
        v_msecs bigint := floor(extract(milliseconds from v_time)) - (v_secs * 1000);
        v_cur_ms bigint := (v_secs * 1000) + v_msecs;
        v_res text;
      BEGIN
        -- 48-bit timestamp (milliseconds since epoch)
        v_res := lpad(to_hex(v_cur_ms), 12, '0');
        -- Version 7 and 12-bit random sequence
        v_res := v_res || '7' || lpad(to_hex(floor(random() * 4096)::int), 3, '0');
        -- Variant (8, 9, a, or b) and 62-bit random sequence
        v_res := v_res || to_hex(floor(random() * 4)::int + 8) || lpad(to_hex(floor(random() * 1152921504606846976)::bigint), 15, '0');
        RETURN v_res::uuid;
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);

    // 2. Ensure core users table exists
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

    // Add missing columns if table already exists (for schema evolution)
    const columnsToAdd = [
      { name: 'language_preference', type: 'VARCHAR(50)' },
      { name: 'time_zone', type: 'VARCHAR(100)' },
      { name: 'currency', type: 'VARCHAR(10) DEFAULT \'USD\'' },
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

    // 3. Ensure groups table exists
    console.log('Database: Synchronizing groups table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.groups (
        group_id UUID PRIMARY KEY DEFAULT public.uuid_v7(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Ensure payment_info table exists
    console.log('Database: Synchronizing payment_info table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.payment_info (
        payment_details_id UUID PRIMARY KEY DEFAULT public.uuid_v7(),
        group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        cardholder_name VARCHAR(100),
        card_number VARCHAR(4),
        expiry_date VARCHAR(5),
        provider VARCHAR(50),
        card_brand VARCHAR(50),
        funding_type VARCHAR(20),
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add missing columns if table already exists (for schema evolution)
    const paymentColumnsToAdd = [
      { name: 'cardholder_name', type: 'VARCHAR(100)' },
      { name: 'card_number', type: 'VARCHAR(4)' },
      { name: 'expiry_date', type: 'VARCHAR(5)' },
      { name: 'provider', type: 'VARCHAR(50)' },
      { name: 'card_brand', type: 'VARCHAR(50)' },
      { name: 'funding_type', type: 'VARCHAR(20)' },
      { name: 'is_verified', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const col of paymentColumnsToAdd) {
      console.log(`Database: Ensuring column ${col.name} exists in payment_info...`);
      await query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_info' AND column_name='${col.name}') THEN
            ALTER TABLE public.payment_info ADD COLUMN ${col.name} ${col.type};
            RAISE NOTICE 'Added column % to payment_info', '${col.name}';
            
            -- Special migration for card_number if last_four exists
            IF '${col.name}' = 'card_number' AND EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema='public' AND table_name='payment_info' AND column_name='last_four'
            ) THEN
              UPDATE public.payment_info SET card_number = last_four WHERE card_number IS NULL;
              RAISE NOTICE 'Migrated data from last_four to card_number';
            END IF;
          ELSE
            RAISE NOTICE 'Column % already exists in payment_info', '${col.name}';
          END IF;
        END $$;
      `);
    }

    // 5. Create trigger to automatically create a group record for new users
    console.log('Database: Synchronizing user registration triggers...');
    await query(`
      CREATE OR REPLACE FUNCTION public.on_user_created_create_group()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.groups (user_id)
        VALUES (NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_create_group_on_user_insert') THEN
          CREATE TRIGGER trg_create_group_on_user_insert
          AFTER INSERT ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.on_user_created_create_group();
        END IF;
      END $$;
    `);

    // 6. Cleanup: If legacy temp_tables exist, drop them
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
