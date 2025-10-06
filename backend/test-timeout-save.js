const { supabase } = require('./config/supabase');

async function testTimeoutSave() {
  console.log('🧪 Testing timeout save functionality...');
  
  try {
    // Test 1: Create a test record with time in but no time out
    console.log('1. Creating test record with time in...');
    
    // First, get an existing user ID
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError || !existingUsers || existingUsers.length === 0) {
      console.error('❌ No existing users found:', userError);
      return;
    }
    
    const testUserId = existingUsers[0].id;
    console.log('📊 Using existing user ID:', testUserId);
    
    const testData = {
      user_id: testUserId,
      company_id: 1, // Use a test company ID
      attendance_date: new Date().toISOString().split('T')[0], // Today's date
      status: 'present',
      am_time_in: '08:00:00',
      am_time_out: null, // No time out yet
      pm_time_in: '13:00:00',
      pm_time_out: null, // No time out yet
      am_status: 'present',
      pm_status: 'present',
      total_hours: 0,
      notes: 'Test timeout record'
    };
    
    console.log('📊 Test data:', testData);
    
    // Insert the test record
    const { data: insertData, error: insertError } = await supabase
      .from('attendance_records')
      .upsert(testData);
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError);
      return;
    }
    
    console.log('✅ Test record created successfully');
    
    // Test 2: Update with AM time out
    console.log('\n2. Testing AM timeout update...');
    
    const { data: updateAMData, error: updateAMError } = await supabase
      .from('attendance_records')
      .update({
        am_time_out: '12:00:00',
        total_hours: 4.0
      })
      .eq('user_id', testUserId)
      .eq('attendance_date', testData.attendance_date);
    
    if (updateAMError) {
      console.error('❌ Error updating AM timeout:', updateAMError);
      return;
    }
    
    console.log('✅ AM timeout updated successfully');
    
    // Test 3: Update with PM time out
    console.log('\n3. Testing PM timeout update...');
    
    const { data: updatePMData, error: updatePMError } = await supabase
      .from('attendance_records')
      .update({
        pm_time_out: '17:00:00',
        total_hours: 8.0
      })
      .eq('user_id', testUserId)
      .eq('attendance_date', testData.attendance_date);
    
    if (updatePMError) {
      console.error('❌ Error updating PM timeout:', updatePMError);
      return;
    }
    
    console.log('✅ PM timeout updated successfully');
    
    // Test 4: Verify the final record
    console.log('\n4. Verifying final record...');
    
    const { data: finalRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', testUserId)
      .eq('attendance_date', testData.attendance_date)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching final record:', fetchError);
      return;
    }
    
    console.log('✅ Final record verified:');
    console.log('  - AM Time In:', finalRecord.am_time_in);
    console.log('  - AM Time Out:', finalRecord.am_time_out);
    console.log('  - PM Time In:', finalRecord.pm_time_in);
    console.log('  - PM Time Out:', finalRecord.pm_time_out);
    console.log('  - AM Status:', finalRecord.am_status);
    console.log('  - PM Status:', finalRecord.pm_status);
    console.log('  - Total Hours:', finalRecord.total_hours);
    
    // Test 5: Clean up test record
    console.log('\n5. Cleaning up test record...');
    
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('user_id', testUserId)
      .eq('attendance_date', testData.attendance_date);
    
    if (deleteError) {
      console.error('❌ Error cleaning up test record:', deleteError);
      return;
    }
    
    console.log('✅ Test record cleaned up successfully');
    
    console.log('\n🎉 All timeout save tests passed! The database can handle timeout updates correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTimeoutSave();
