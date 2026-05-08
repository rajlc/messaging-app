const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function runMigration() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_description TEXT;' 
  });

  if (error) {
    console.error('Migration failed:', error.message);
    // If exec_sql doesn't exist, we might need another way
  } else {
    console.log('Migration successful or already applied.');
  }
}

runMigration();
