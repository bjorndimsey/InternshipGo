const { supabase } = require('./config/supabase');

async function verifyMigration() {
  console.log('🔍 Verifying session status migration...');
  
  try {
    // Check if the new columns exist by trying to query them
    console.log('1. Checking if new columns exist...');
    
    // Try to select the new columns to see if they exist
    const { data: testData, error: testError } = await supabase
      .from('attendance_records')
      .select('am_status, pm_status')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('am_status') || testError.message.includes('pm_status')) {
        console.log('❌ Migration not completed - columns not found');
        console.log('Please run the migration SQL in your Supabase SQL Editor');
        console.log('Error details:', testError.message);
        return;
      } else {
        console.error('❌ Error checking columns:', testError);
        return;
      }
    }
    
    console.log('✅ New columns found and accessible');
    console.log('  - am_status: Available');
    console.log('  - pm_status: Available');
    
    // Check sample data
    console.log('\n2. Checking sample data...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('attendance_records')
      .select('user_id, attendance_date, am_time_in, am_time_out, pm_time_in, pm_time_out, am_status, pm_status, status')
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
      return;
    }
    
    console.log('✅ Sample data:');
    sampleData.forEach(record => {
      console.log(`  User ${record.user_id} on ${record.attendance_date}:`);
      console.log(`    AM: ${record.am_time_in} - ${record.am_time_out} (${record.am_status})`);
      console.log(`    PM: ${record.pm_time_in} - ${record.pm_time_out} (${record.pm_status})`);
      console.log(`    Overall: ${record.status}`);
    });
    
    // Check total records
    console.log('\n3. Checking total records...');
    const { count, error: countError } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting records:', countError);
      return;
    }
    
    console.log(`✅ Total attendance records: ${count}`);
    
    console.log('\n🎉 Migration verification completed successfully!');
    console.log('The database is ready to handle AM/PM session statuses.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyMigration();
