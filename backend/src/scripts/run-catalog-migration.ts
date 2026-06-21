import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
    const migrationPath = path.join(__dirname, '../../migrations/026_create_marketplace_products.sql');
    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found at: ${migrationPath}`);
        return;
    }
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running marketplace catalog migration...');

    let dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.log('DATABASE_URL not found, constructing from DB_* variables...');
        if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
            const dbName = process.env.DB_NAME || 'postgres';
            dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${dbName}`;
        } else {
            console.error('Missing DB configuration variables (DB_HOST, DB_USER, DB_PASSWORD)');
            return;
        }
    }

    // Try DB Name first, fallback to 'postgres'
    try {
        console.log(`Connecting to database...`);
        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(sql);
        console.log('✅ Migration completed successfully.');
        await client.end();
    } catch (e: any) {
        console.warn('Failed with primary DB connection, trying fallback dbName=postgres...');
        try {
            if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
                const fallbackUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                const client = new Client({
                    connectionString: fallbackUrl,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
                await client.query(sql);
                console.log('✅ Migration completed successfully (via fallback dbName=postgres).');
                await client.end();
            } else {
                throw e;
            }
        } catch (fallbackError: any) {
            console.error('❌ Failed to run migration:', fallbackError.message || fallbackError);
        }
    }
}

runMigration();
