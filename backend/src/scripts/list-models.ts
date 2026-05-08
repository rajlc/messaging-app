
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listModels() {
    console.log('Fetching Gemini API Key from settings...');
    const { data: setting, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'gemini_api_key')
        .single();

    if (error || !setting?.value) {
        console.error('Could not find gemini_api_key in settings.');
        return;
    }

    const apiKey = setting.value;
    console.log('API Key found (masked):', apiKey.substring(0, 5) + '...');

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get(url);

        console.log('\nAvailable Models:');
        response.data.models.forEach((model: any) => {
            if (model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${model.name} (${model.displayName})`);
            }
        });

    } catch (error: any) {
        console.error('Error listing models:', error.response?.data || error.message);
    }
}

listModels();
