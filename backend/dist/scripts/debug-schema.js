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
dotenv.config({ path: path.join(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function checkSchema() {
    console.log('Checking pages table schema...');
    const { data, error } = await supabase
        .from('pages')
        .select('*')
        .limit(1);
    if (error) {
        console.error('Error selecting from pages:', error);
        return;
    }
    if (!data || data.length === 0) {
        console.log('No pages found. Cannot verify columns definitively via select *.');
    }
    else {
        const page = data[0];
        console.log('Found page keys:', Object.keys(page));
        if ('custom_prompt' in page) {
            console.log('✅ "custom_prompt" column EXISTS.');
        }
        else {
            console.error('❌ "custom_prompt" column MISSING from result.');
        }
        if ('is_ai_enabled' in page) {
            console.log('✅ "is_ai_enabled" column EXISTS.');
        }
        else {
            console.error('❌ "is_ai_enabled" column MISSING from result.');
        }
    }
    console.log('\nTesting update on non-existent ID...');
    const { error: updateError } = await supabase
        .from('pages')
        .update({ custom_prompt: 'test' })
        .eq('id', '00000000-0000-0000-0000-000000000000');
    if (updateError) {
        console.error('Update failed:', updateError);
        if (updateError.message.includes('Could not find the property')) {
            console.error('❌ This confirms the column is missing in the schema cache.');
        }
    }
    else {
        console.log('✅ Update query constructed successfully (no schema error).');
    }
}
checkSchema();
//# sourceMappingURL=debug-schema.js.map