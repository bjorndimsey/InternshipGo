const { query } = require('./config/supabase');

async function checkMiddleNameColumn() {
  try {
    console.log('🔍 Checking if middle_name column exists in students table...');
    
    // Try to select middle_name from students table
    const studentsResult = await query('students', 'select', 'middle_name');
    console.log('✅ Students table has middle_name column');
    console.log('Sample data:', studentsResult.data);
    
  } catch (error) {
    if (error.message.includes('middle_name') || error.message.includes('column')) {
      console.log('❌ middle_name column does NOT exist in students table');
      console.log('📝 You need to run the Supabase migration first!');
      console.log('📄 Run the SQL in: backend/database/supabase-middle-name-migration.sql');
    } else {
      console.error('❌ Error checking students table:', error.message);
    }
  }
  
  try {
    console.log('\n🔍 Checking if middle_name column exists in coordinators table...');
    
    // Try to select middle_name from coordinators table
    const coordinatorsResult = await query('coordinators', 'select', 'middle_name');
    console.log('✅ Coordinators table has middle_name column');
    console.log('Sample data:', coordinatorsResult.data);
    
  } catch (error) {
    if (error.message.includes('middle_name') || error.message.includes('column')) {
      console.log('❌ middle_name column does NOT exist in coordinators table');
      console.log('📝 You need to run the Supabase migration first!');
      console.log('📄 Run the SQL in: backend/database/supabase-middle-name-migration.sql');
    } else {
      console.error('❌ Error checking coordinators table:', error.message);
    }
  }
}

checkMiddleNameColumn();
