import { supabaseService } from '../src/supabase/supabase.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function test() {
    console.log('Starting manual autofix trigger...');
    await supabaseService.autoFixCustomerNames();
    console.log('Finished manual autofix trigger.');
}

test();
