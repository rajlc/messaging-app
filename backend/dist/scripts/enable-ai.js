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
async function enableAI() {
    console.log('Enabling AI settings in the database...');
    const settingsToUpsert = [
        { key: 'is_ai_global_enabled', value: 'true', updated_at: new Date().toISOString() },
        { key: 'is_ai_marketplace_enabled', value: 'true', updated_at: new Date().toISOString() }
    ];
    for (const s of settingsToUpsert) {
        const { error } = await supabase.from('settings').upsert(s, { onConflict: 'key' });
        if (error) {
            console.error(`Error upserting setting ${s.key}:`, error);
        }
        else {
            console.log(`Setting ${s.key} set to 'true'.`);
        }
    }
    const pageIdsToUpdate = ['100091437639788', 'facebook_marketplace'];
    for (const pageId of pageIdsToUpdate) {
        const { error } = await supabase
            .from('pages')
            .update({
            is_ai_enabled: true,
            custom_prompt: 'You are a helpful Facebook Marketplace assistant. Answer customer questions politely and guide them to provide their phone number and delivery address to place an order. Keep responses short and direct.',
            updated_at: new Date().toISOString()
        })
            .eq('page_id', pageId);
        if (error) {
            console.error(`Error enabling AI for page ${pageId}:`, error);
        }
        else {
            console.log(`AI enabled for page ${pageId}.`);
        }
    }
    console.log('AI configuration updated successfully.');
}
enableAI();
//# sourceMappingURL=enable-ai.js.map