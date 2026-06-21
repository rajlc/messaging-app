"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
        }
        else {
            console.error('Missing DB configuration variables (DB_HOST, DB_USER, DB_PASSWORD)');
            return;
        }
    }
    try {
        console.log(`Connecting to database...`);
        const client = new pg_1.Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(sql);
        console.log('✅ Migration completed successfully.');
        await client.end();
    }
    catch (e) {
        console.warn('Failed with primary DB connection, trying fallback dbName=postgres...');
        try {
            if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
                const fallbackUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                const client = new pg_1.Client({
                    connectionString: fallbackUrl,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
                await client.query(sql);
                console.log('✅ Migration completed successfully (via fallback dbName=postgres).');
                await client.end();
            }
            else {
                throw e;
            }
        }
        catch (fallbackError) {
            console.error('❌ Failed to run migration:', fallbackError.message || fallbackError);
        }
    }
}
runMigration();
//# sourceMappingURL=run-catalog-migration.js.map