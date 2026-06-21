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

async function checkRules() {
    console.log('=== Pages Table ===');
    const { data: pages, error: errPages } = await supabase.from('pages').select('*');
    if (errPages) console.error(errPages);
    else console.log(pages);

    console.log('\n=== Auto Reply Rules Table ===');
    const { data: rules, error: errRules } = await supabase.from('auto_reply_rules').select('*');
    if (errRules) console.error(errRules);
    else console.log(rules);
}

checkRules();
