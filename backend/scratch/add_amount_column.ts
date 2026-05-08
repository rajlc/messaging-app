import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Adding amount column to rider_inventory...');
    
    // Using rpc to run raw SQL if available, or just trying an update to check column existence
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE rider_inventory ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) DEFAULT 0;'
    });

    if (error) {
        console.error('Migration failed:', error.message);
        console.log('If exec_sql is not available, you might need to add the column manually in Supabase dashboard.');
    } else {
        console.log('Migration successful!');
    }
}

runMigration();
