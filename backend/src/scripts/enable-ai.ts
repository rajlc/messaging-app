import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableAI() {
    console.log('Enabling AI settings in the database...');

    // 1. Update settings table
    const settingsToUpsert = [
        { key: 'is_ai_global_enabled', value: 'true', updated_at: new Date().toISOString() },
        { key: 'is_ai_marketplace_enabled', value: 'true', updated_at: new Date().toISOString() }
    ];

    for (const s of settingsToUpsert) {
        const { error } = await supabase.from('settings').upsert(s, { onConflict: 'key' });
        if (error) {
            console.error(`Error upserting setting ${s.key}:`, error);
        } else {
            console.log(`Setting ${s.key} set to 'true'.`);
        }
    }

    // 2. Update page settings
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
        } else {
            console.log(`AI enabled for page ${pageId}.`);
        }
    }

    console.log('AI configuration updated successfully.');
}

enableAI();
