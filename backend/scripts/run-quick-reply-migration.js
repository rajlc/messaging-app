const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_quick_reply_templates_table.sql');

    console.log('Running migration: create_quick_reply_templates_table.sql');

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;

        console.log(`Executing: ${trimmed.substring(0, 50)}...`);

        // For CREATE and INSERT statements, use rpc or direct SQL execution
        // Since Supabase client doesn't support raw SQL directly, we need to execute via the SQL editor
        // or use a service role key. For now, let's try with the available methods.

        // Check if it's a table creation
        if (trimmed.toLowerCase().includes('create table')) {
            console.log('✓ Please run this SQL manually in Supabase SQL Editor:');
            console.log(trimmed + ';');
        }
    }

    console.log('\n📝 Manual Step Required:');
    console.log('Please copy the SQL from migrations/create_quick_reply_templates_table.sql');
    console.log('and run it in your Supabase SQL Editor at:');
    console.log(`${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);
}

runMigration().catch(console.error);
