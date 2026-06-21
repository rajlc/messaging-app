import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
    const file = process.argv[2];
    if (!file) {
        console.error('Usage: npx ts-node src/scripts/apply-sql.ts <path-to-sql>');
        process.exit(1);
    }
    const sqlPath = path.resolve(file);
    if (!fs.existsSync(sqlPath)) {
        console.error('File not found:', sqlPath);
        process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl && process.env.DB_HOST) {
        const dbName = process.env.DB_NAME || 'postgres';
        dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${dbName}`;
    }

    if (!dbUrl) {
        console.error('No database configuration found.');
        process.exit(1);
    }

    try {
        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(sql);
        console.log(`✅ Successfully applied SQL from ${path.basename(file)}`);
        await client.end();
    } catch (e: any) {
        console.error('❌ Failed with primary connection:', e.message);
        // Try fallback to postgres db
        try {
            if (process.env.DB_HOST) {
                const fallbackUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                const client = new Client({
                    connectionString: fallbackUrl,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
                await client.query(sql);
                console.log(`✅ Successfully applied SQL via fallback to postgres DB`);
                await client.end();
            } else {
                throw e;
            }
        } catch (fallbackError: any) {
            console.error('❌ Failed to run migration via fallback:', fallbackError.message || fallbackError);
            process.exit(1);
        }
    }
}
run();
