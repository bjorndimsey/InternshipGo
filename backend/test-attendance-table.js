const { supabase } = require('./config/supabase');

async function testAttendanceTable() {
  console.log('🧪 Testing attendance_records table...');
  
  try {
    // Test 1: Basic connection and table access
    console.log('1. Testing basic table access...');
    const { data: basicData, error: basicError } = await supabase
      .from('attendance_records')
      .select('id, user_id, attendance_date, status')
      .limit(1);
    
    if (basicError) {
      console.error('❌ Basic table access failed:', basicError);
      return;
    }
    
    console.log('✅ Basic table access successful');
    console.log(`   Found ${basicData.length} record(s)`);
    
    // Test 2: Check if new columns exist
    console.log('\n2. Testing new columns...');
    const { data: newColumnsData, error: newColumnsError } = await supabase
      .from('attendance_records')
      .select('am_status, pm_status')
      .limit(1);
    
    if (newColumnsError) {
      console.log('❌ New columns not found - migration needed');
      console.log('   Error:', newColumnsError.message);
      console.log('\n📝 Please run the migration SQL in your Supabase SQL Editor:');
      console.log('   File: backend/database/add-session-status-columns-step-by-step.sql');
      return;
    }
    
    console.log('✅ New columns found and accessible');
    
    // Test 3: Check sample data with new columns
    console.log('\n3. Checking sample data with new columns...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('attendance_records')
      .select('user_id, attendance_date, am_time_in, am_time_out, pm_time_in, pm_time_out, am_status, pm_status, status')
      .limit(3);
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
      return;
    }
    
    console.log('✅ Sample data retrieved successfully:');
    sampleData.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`     User ID: ${record.user_id}`);
      console.log(`     Date: ${record.attendance_date}`);
      console.log(`     AM: ${record.am_time_in || 'N/A'} - ${record.am_time_out || 'N/A'} (${record.am_status})`);
      console.log(`     PM: ${record.pm_time_in || 'N/A'} - ${record.pm_time_out || 'N/A'} (${record.pm_status})`);
      console.log(`     Overall Status: ${record.status}`);
    });
    
    // Test 4: Count total records
    console.log('\n4. Counting total records...');
    const { count, error: countError } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting records:', countError);
      return;
    }
    
    console.log(`✅ Total attendance records: ${count}`);
    
    console.log('\n🎉 All tests passed! The attendance table is ready for AM/PM session statuses.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAttendanceTable();








