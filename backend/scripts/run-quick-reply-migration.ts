import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename: string) {
    const migrationPath = path.join(__dirname, '..', 'migrations', filename);

    console.log(`Running migration: ${filename}`);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error(`Error running migration ${filename}:`, error);
        throw error;
    }

    console.log(`✓ Migration ${filename} completed successfully`);
    return data;
}

async function main() {
    try {
        await runMigration('create_quick_reply_templates_table.sql');
        console.log('\n✅ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

main();
