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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function testOpenAI() {
    console.log('Retrieving openai_api_key setting from database...');
    try {
        const { data: setting, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'openai_api_key')
            .single();
        if (error) {
            console.error('Error fetching settings key from Supabase:', error.message);
            return;
        }
        const apiKey = setting?.value;
        if (!apiKey) {
            console.error('No OpenAI API key found in settings table.');
            return;
        }
        const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`OpenAI API key found: ${maskedKey}`);
        console.log('Testing connection to GPT-4o mini with a simple prompt...');
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: 'Hello! Verify that you are working by replying with exactly "All systems normal."' }
            ],
            max_tokens: 20
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('\n--- OpenAI Response ---');
        console.log('Status:', response.status);
        console.log('Reply:', response.data.choices[0]?.message?.content?.trim());
        console.log('-----------------------');
        console.log('✅ OpenAI GPT-4o mini test succeeded and is working perfectly!');
    }
    catch (err) {
        console.error('\n❌ OpenAI API Test Failed!');
        if (err.response) {
            console.error('API Error Response:', JSON.stringify(err.response.data, null, 2));
        }
        else {
            console.error('Error details:', err.message);
        }
    }
}
testOpenAI();
//# sourceMappingURL=test-openai.js.map