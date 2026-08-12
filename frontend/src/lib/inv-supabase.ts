import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Inventory Supabase project credentials (stored in environment variables only)
// Required env vars:
//   NEXT_PUBLIC_INV_SUPABASE_URL    — Inventory Supabase project URL (public, safe for browser)
//   NEXT_PUBLIC_INV_SUPABASE_ANON_KEY — Inventory anon/public key (public, requires RLS)
//   INV_SUPABASE_SERVICE_ROLE_KEY   — Inventory service-role key (SECRET — server-side only)
const INV_SUPABASE_URL = process.env.NEXT_PUBLIC_INV_SUPABASE_URL;
const INV_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_INV_SUPABASE_ANON_KEY;
const INV_SUPABASE_SERVICE_ROLE_KEY = process.env.INV_SUPABASE_SERVICE_ROLE_KEY;

if (!INV_SUPABASE_URL || !INV_SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing Inventory Supabase configuration. ' +
        'Set NEXT_PUBLIC_INV_SUPABASE_URL and NEXT_PUBLIC_INV_SUPABASE_ANON_KEY in .env.local'
    );
}

let invSupabaseInstance: SupabaseClient | null = null;
let invSupabaseAdminInstance: SupabaseClient | null = null;

export function getInvSupabaseClient(): SupabaseClient {
    if (!invSupabaseInstance) {
        invSupabaseInstance = createClient(INV_SUPABASE_URL!, INV_SUPABASE_ANON_KEY!);
    }
    return invSupabaseInstance;
}

export function getInvSupabaseAdminClient(): SupabaseClient {
    if (!invSupabaseAdminInstance) {
        if (!INV_SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error(
                'Missing INV_SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
                'This key must only be used in server-side code (Next.js Server Actions).'
            );
        }
        invSupabaseAdminInstance = createClient(INV_SUPABASE_URL!, INV_SUPABASE_SERVICE_ROLE_KEY);
    }
    return invSupabaseAdminInstance;
}
