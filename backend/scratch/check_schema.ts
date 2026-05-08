import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('rider_inventory').select('*').limit(1);
    if (error) {
        console.error('Error fetching data:', error.message);
    } else {
        console.log('Sample record:', JSON.stringify(data[0], null, 2));
    }
}

checkSchema();
