
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

async function checkSchema() {
    console.log('Checking pages table schema...');

    // 1. Try to select one page with all columns
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
        // Try to insert a dummy page with the column
    } else {
        const page = data[0];
        console.log('Found page keys:', Object.keys(page));

        if ('custom_prompt' in page) {
            console.log('✅ "custom_prompt" column EXISTS.');
        } else {
            console.error('❌ "custom_prompt" column MISSING from result.');
        }

        if ('is_ai_enabled' in page) {
            console.log('✅ "is_ai_enabled" column EXISTS.');
        } else {
            console.error('❌ "is_ai_enabled" column MISSING from result.');
        }
    }

    // 2. Try to update a dummy ID to see if it complains about the column
    console.log('\nTesting update on non-existent ID...');
    const { error: updateError } = await supabase
        .from('pages')
        .update({ custom_prompt: 'test' })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // Dummy UUID

    if (updateError) {
        console.error('Update failed:', updateError);
        if (updateError.message.includes('Could not find the property')) {
            console.error('❌ This confirms the column is missing in the schema cache.');
        }
    } else {
        console.log('✅ Update query constructed successfully (no schema error).');
    }
}

checkSchema();
