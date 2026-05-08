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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function runMigration() {
    const migrationPath = path.join(__dirname, '../../migrations/006_add_unread_count.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running migration...');
    try {
        const { Client } = require('pg');
        let dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.log('DATABASE_URL not found, constructing from DB_* vars...');
            if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
                const dbName = process.env.DB_NAME || 'postgres';
                dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                console.log('Connecting to database: postgres');
            }
            else {
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
    }
    catch (e) {
        console.error('Failed to run migration via pg:', e);
    }
}
runMigration();
//# sourceMappingURL=run-migration.js.map