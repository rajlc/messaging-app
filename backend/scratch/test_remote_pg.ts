import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || 'Bagmati@123';
const host = 'db.jrcluodakvudjkwlrrxi.supabase.co';
const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@${host}:5432/postgres`;

async function testConnection() {
    console.log('Testing connection to:', host);
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connection successful!');
        
        // Let's run a test query to get the tables
        const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        console.log('Tables in public schema:', res.rows.map(r => r.tablename));
        
        await client.end();
    } catch (e: any) {
        console.error('❌ Connection failed:', e.message || e);
    }
}

testConnection();
