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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
async function runMigration() {
    const migrationPath = path.join(__dirname, '../../migrations/025_add_conversation_product_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running remote migration 025...');
    try {
        const { Client } = require('pg');
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!supabaseUrl) {
            console.error('SUPABASE_URL is missing');
            return;
        }
        const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.(?:co|net)/);
        if (!match) {
            console.error('Could not parse project ID from SUPABASE_URL:', supabaseUrl);
            return;
        }
        const projectId = match[1];
        const dbHost = `db.${projectId}.supabase.co`;
        const dbUser = process.env.DB_USER || 'postgres';
        const dbPassword = process.env.DB_PASSWORD;
        console.log(`Connecting to remote database host: ${dbHost}`);
        const client = new Client({
            host: dbHost,
            port: 5432,
            user: dbUser,
            password: dbPassword,
            database: 'postgres',
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(sql);
        console.log('Remote migration 025 completed successfully.');
        await client.end();
    }
    catch (e) {
        console.error('Failed to run remote migration 025:', e);
    }
}
runMigration();
//# sourceMappingURL=run-remote-migration-025.js.map