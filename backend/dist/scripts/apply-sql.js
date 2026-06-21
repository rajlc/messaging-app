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
        const client = new pg_1.Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(sql);
        console.log(`✅ Successfully applied SQL from ${path.basename(file)}`);
        await client.end();
    }
    catch (e) {
        console.error('❌ Failed with primary connection:', e.message);
        try {
            if (process.env.DB_HOST) {
                const fallbackUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;
                const client = new pg_1.Client({
                    connectionString: fallbackUrl,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
                await client.query(sql);
                console.log(`✅ Successfully applied SQL via fallback to postgres DB`);
                await client.end();
            }
            else {
                throw e;
            }
        }
        catch (fallbackError) {
            console.error('❌ Failed to run migration via fallback:', fallbackError.message || fallbackError);
            process.exit(1);
        }
    }
}
run();
//# sourceMappingURL=apply-sql.js.map