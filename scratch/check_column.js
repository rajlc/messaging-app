const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function checkColumn() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase
    .from('orders')
    .select('package_description')
    .limit(1);

  if (error) {
    console.error('Column check failed:', error.message);
    if (error.message.includes('column "package_description" does not exist')) {
        console.log('MISSING COLUMN detected.');
    }
  } else {
    console.log('Column "package_description" exists.');
    console.log('Sample data:', data);
  }
}

checkColumn();
