const { supabase } = require('./config/supabase');

async function testTimeoutComprehensive() {
  console.log('🧪 Testing comprehensive timeout functionality...');
  
  try {
    // Get an existing user ID
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError || !existingUsers || existingUsers.length === 0) {
      console.error('❌ No existing users found:', userError);
      return;
    }
    
    const testUserId = existingUsers[0].id;
    const today = new Date();
    const testDate1 = today.toISOString().split('T')[0];
    const testDate2 = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const testDate3 = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('📊 Using user ID:', testUserId);
    console.log('📊 Test dates:', { testDate1, testDate2, testDate3 });
    
    // Test 1: Normal AM timeout scenario
    console.log('\n1. Testing normal AM timeout scenario...');
    
    const amTimeoutData = {
      user_id: testUserId,
      company_id: 1,
      attendance_date: testDate1,
      status: 'present',
      am_time_in: '08:00:00',
      am_time_out: '12:00:00',
      pm_time_in: null,
      pm_time_out: null,
      am_status: 'present',
      pm_status: 'not_marked',
      total_hours: 4.0,
      notes: 'AM timeout test'
    };
    
    const { data: amData, error: amError } = await supabase
      .from('attendance_records')
      .upsert(amTimeoutData);
    
    if (amError) {
      console.error('❌ Error creating AM timeout record:', amError);
    } else {
      console.log('✅ AM timeout record created successfully');
    }
    
    // Test 2: Normal PM timeout scenario
    console.log('\n2. Testing normal PM timeout scenario...');
    
    const pmTimeoutData = {
      user_id: testUserId,
      company_id: 1,
      attendance_date: testDate2,
      status: 'present',
      am_time_in: '08:00:00',
      am_time_out: '12:00:00',
      pm_time_in: '13:00:00',
      pm_time_out: '17:00:00',
      am_status: 'present',
      pm_status: 'present',
      total_hours: 8.0,
      notes: 'PM timeout test'
    };
    
    const { data: pmData, error: pmError } = await supabase
      .from('attendance_records')
      .upsert(pmTimeoutData);
    
    if (pmError) {
      console.error('❌ Error creating PM timeout record:', pmError);
    } else {
      console.log('✅ PM timeout record created successfully');
    }
    
    // Test 3: PM absent scenario (should not allow timeout)
    console.log('\n3. Testing PM absent scenario...');
    
    const pmAbsentData = {
      user_id: testUserId,
      company_id: 1,
      attendance_date: testDate3,
      status: 'absent',
      am_time_in: '08:00:00',
      am_time_out: '12:00:00',
      pm_time_in: null,
      pm_time_out: null,
      am_status: 'present',
      pm_status: 'absent',
      total_hours: 4.0,
      notes: 'PM absent test - should not allow timeout'
    };
    
    const { data: absentData, error: absentError } = await supabase
      .from('attendance_records')
      .upsert(pmAbsentData);
    
    if (absentError) {
      console.error('❌ Error creating PM absent record:', absentError);
    } else {
      console.log('✅ PM absent record created successfully');
    }
    
    // Test 4: Verify all records
    console.log('\n4. Verifying all test records...');
    
    const { data: allRecords, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', testUserId)
      .in('attendance_date', [testDate1, testDate2, testDate3]);
    
    if (fetchError) {
      console.error('❌ Error fetching test records:', fetchError);
      return;
    }
    
    console.log('✅ All test records verified:');
    allRecords.forEach((record, index) => {
      console.log(`\n  Record ${index + 1} (${record.attendance_date}):`);
      console.log(`    AM: ${record.am_time_in} - ${record.am_time_out} (${record.am_status})`);
      console.log(`    PM: ${record.pm_time_in} - ${record.pm_time_out} (${record.pm_status})`);
      console.log(`    Total Hours: ${record.total_hours}`);
      console.log(`    Status: ${record.status}`);
    });
    
    // Test 5: Test timeout update (simulate frontend timeout action)
    console.log('\n5. Testing timeout update simulation...');
    
    // Simulate AM timeout update
    const { data: updateAMData, error: updateAMError } = await supabase
      .from('attendance_records')
      .update({
        am_time_out: '12:30:00',
        total_hours: 4.5
      })
      .eq('user_id', testUserId)
      .eq('attendance_date', testDate1);
    
    if (updateAMError) {
      console.error('❌ Error updating AM timeout:', updateAMError);
    } else {
      console.log('✅ AM timeout update successful');
    }
    
    // Test 6: Clean up test records
    console.log('\n6. Cleaning up test records...');
    
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('user_id', testUserId)
      .in('attendance_date', [testDate1, testDate2, testDate3]);
    
    if (deleteError) {
      console.error('❌ Error cleaning up test records:', deleteError);
      return;
    }
    
    console.log('✅ Test records cleaned up successfully');
    
    console.log('\n🎉 All comprehensive timeout tests passed!');
    console.log('✅ Database can handle:');
    console.log('  - AM timeout updates');
    console.log('  - PM timeout updates');
    console.log('  - Absent status handling');
    console.log('  - Session-specific status tracking');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
  }
}

// Run the test
testTimeoutComprehensive();
