import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: convs, error } = await supabase
        .from('conversations')
        .select('id, customer_name, customer_id')
        .in('id', ['455b0a76-bb0f-436e-b3c3-ed202ade95c7', 'eba0df96-3f75-4007-b668-c662293ae7d3']);
        
    console.log(JSON.stringify(convs, null, 2));
}

run();
