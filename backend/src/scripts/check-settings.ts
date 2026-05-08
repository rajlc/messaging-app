
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    console.log('Checking settings table...');

    const { data: settings, error } = await supabase
        .from('settings')
        .select('*');

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Current Settings:', settings);

    const provider = settings.find(s => s.key === 'ai_provider');
    console.log('ai_provider:', provider ? provider.value : 'NOT FOUND');

    const openaiKey = settings.find(s => s.key === 'openai_api_key');
    console.log('openai_api_key:', openaiKey ? (openaiKey.value ? 'SET (Hidden)' : 'EMPTY') : 'NOT FOUND');

    const geminiKey = settings.find(s => s.key === 'gemini_api_key');
    console.log('gemini_api_key:', geminiKey ? (geminiKey.value ? 'SET (Hidden)' : 'EMPTY') : 'NOT FOUND');
}

checkSettings();
