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
        currency VARCHAR(10) DEFAULT 'USD',
        account_active BOOLEAN DEFAULT false,
        profile_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Ensure groups table exists
    console.log('Database: Synchronizing groups table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.groups (
        group_id UUID PRIMARY KEY DEFAULT public.uuid_v7(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        group_name VARCHAR(255),
        group_description TEXT,
        group_members UUID[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3a. Add missing columns to groups table (idempotent migrations)
    await query(`ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;`);

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
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Ensure group_payments junction table exists for many-to-many relationship
    console.log('Database: Synchronizing group_payments junction table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.group_payments (
        group_id UUID NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
        payment_details_id UUID NOT NULL REFERENCES public.payment_info(payment_details_id) ON DELETE CASCADE,
        PRIMARY KEY (group_id, payment_details_id)
      );
    `);

    // 6. Ensure user_roles table exists
    console.log('Database: Synchronizing user_roles table...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
        user_roles VARCHAR(50)[] DEFAULT '{GROUP_MEMBER}',
        PRIMARY KEY (user_id, group_id)
      );
    `);

    // 7. Ensure addresses and group_addresses junction tables exist for many-to-many relationship
    console.log('Database: Synchronizing addresses and group_addresses junction tables...');
    await query(`
      CREATE TABLE IF NOT EXISTS public.addresses (
        address_id UUID PRIMARY KEY DEFAULT public.uuid_v7(),
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state_province VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.group_addresses (
        group_id UUID NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
        address_id UUID NOT NULL REFERENCES public.addresses(address_id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT false,
        PRIMARY KEY (group_id, address_id)
      );
    `);

    // 7a. Add missing is_default column to group_addresses (idempotent migration)
    await query(`ALTER TABLE public.group_addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;`);

    console.log('Database: Schema initialization completed successfully.');
  } catch (error) {
    console.error('Database: Schema initialization FAILED:', error.message);
    throw error;
  }
}

export default initDatabase
