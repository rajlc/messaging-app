import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Fetch a single order to inspect its keys
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching order:', error);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log('Columns in orders table:', Object.keys(data[0]));
        if ('invoice_printed' in data[0]) {
            console.log('✅ invoice_printed column exists!');
        } else {
            console.log('❌ invoice_printed column does NOT exist!');
        }
    } else {
        console.log('No orders found to inspect. Testing update query...');
        const { error: updateError } = await supabase
            .from('orders')
            .update({ invoice_printed: false })
            .eq('id', '00000000-0000-0000-0000-000000000000');

        if (updateError) {
            console.error('Update failed:', updateError.message);
            if (updateError.message.includes('Could not find the property')) {
                console.log('❌ invoice_printed column does NOT exist!');
            } else {
                console.log('Column check update error:', updateError);
            }
        } else {
            console.log('✅ invoice_printed column exists!');
        }
    }
}

run();
