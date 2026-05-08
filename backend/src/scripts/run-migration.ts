
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationPath = path.join(__dirname, '../../migrations/006_add_unread_count.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');

    try {
        const { Client } = require('pg');
        // We need connection string.
        let dbUrl = process.env.DATABASE_URL;

        if (!dbUrl) {
            console.log('DATABASE_URL not found, constructing from DB_* vars...');
            if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
                // Default to 'postgres' if DB_NAME is not set or likely wrong
                const dbName = process.env.DB_NAME || 'postgres';
                // Use 'postgres' DB for simple connection if actual DB name is unknown/wrongly configured as 'messaging_app' in .env
                // Or we can try to connect to 'postgres' db first.
                // Let's force 'postgres' for now if env db name failed.
                // Actually the error 3D000 was "database does not exist". 
                // Let's try 'postgres' as the database name.

                dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                console.log('Connecting to database: postgres');
            } else {
                console.error('Missing DB configuration (DB_HOST, DB_USER, etc.)');
                return;
            }
        }

        const client = new Client({
            connectionString: dbUrl,
            ssl: false
        });

        await client.connect();
        await client.query(sql);
        console.log('Migration completed successfully.');
        await client.end();
    } catch (e) {
        console.error('Failed to run migration via pg:', e);
    }
}

runMigration();
