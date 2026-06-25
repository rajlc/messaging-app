const { createClient } = require('@supabase/supabase-js');

async function checkColumn() {
  const supabase = createClient(
    'https://jrcluodakvudjkwlrrxi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyY2x1b2Rha3Z1ZGprd2xycnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzgsImV4cCI6MjA4NDc2MDc3OH0.XtZdrmmG1YUAj22GPCZB0E48TtY-CdPlmdIGZYECk0s'
  );
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Column check failed:', error.message);
  } else {
    console.log('Available columns in "orders":');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    } else {
      console.log('No rows found in "orders" table.');
    }
  }
}

checkColumn();


