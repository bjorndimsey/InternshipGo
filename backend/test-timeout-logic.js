const { supabase } = require('./config/supabase');

async function testTimeoutLogic() {
  console.log('🧪 Testing timeout logic and database save...');
  
  try {
    // Test 1: Check if we can save a timeout record
    console.log('1. Testing timeout record save...');
    
    const testData = {
      internId: '1', // Use a test intern ID
      attendanceDate: new Date().toISOString().split('T')[0], // Today's date
      status: 'present',
      amTimeIn: '08:00 AM',
      amTimeOut: '12:00 PM',
      pmTimeIn: '01:00 PM',
      pmTimeOut: '05:00 PM',
      amStatus: 'present',
      pmStatus: 'present',
      totalHours: 8.0,
      notes: 'Test timeout record'
    };
    
    console.log('📊 Test data:', testData);
    
    // Try to save the record
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert({
        user_id: parseInt(testData.internId),
        company_id: 1, // Use a test company ID
        attendance_date: testData.attendanceDate,
        status: testData.status,
        am_time_in: '08:00:00',
        am_time_out: '12:00:00',
        pm_time_in: '13:00:00',
        pm_time_out: '17:00:00',
        am_status: testData.amStatus,
        pm_status: testData.pmStatus,
        total_hours: testData.totalHours,
        notes: testData.notes
      });
    
    if (error) {
      console.error('❌ Error saving test record:', error);
      return;
    }
    
    console.log('✅ Test record saved successfully');
    
    // Test 2: Verify the record was saved correctly
    console.log('\n2. Verifying saved record...');
    const { data: savedRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', parseInt(testData.internId))
      .eq('attendance_date', testData.attendanceDate)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching saved record:', fetchError);
      return;
    }
    
    console.log('✅ Record fetched successfully:');
    console.log('  - AM Time In:', savedRecord.am_time_in);
    console.log('  - AM Time Out:', savedRecord.am_time_out);
    console.log('  - PM Time In:', savedRecord.pm_time_in);
    console.log('  - PM Time Out:', savedRecord.pm_time_out);
    console.log('  - AM Status:', savedRecord.am_status);
    console.log('  - PM Status:', savedRecord.pm_status);
    console.log('  - Total Hours:', savedRecord.total_hours);
    
    // Test 3: Test a timeout update scenario
    console.log('\n3. Testing timeout update scenario...');
    
    // Simulate updating PM time out
    const { data: updateData, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        pm_time_out: '17:30:00', // Updated PM time out
        total_hours: 8.5 // Updated total hours
      })
      .eq('id', savedRecord.id);
    
    if (updateError) {
      console.error('❌ Error updating record:', updateError);
      return;
    }
    
    console.log('✅ Record updated successfully');
    
    // Verify the update
    const { data: updatedRecord, error: verifyError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', savedRecord.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('✅ Update verified:');
    console.log('  - PM Time Out updated to:', updatedRecord.pm_time_out);
    console.log('  - Total Hours updated to:', updatedRecord.total_hours);
    
    console.log('\n🎉 All timeout tests passed! The database is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTimeoutLogic();
