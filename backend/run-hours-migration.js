const { query } = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function runHoursOfInternshipMigration() {
  try {
    console.log('🚀 Starting hours_of_internship migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'hours-of-internship-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('🔧 Executing migration...');
    
    // Execute the migration
    const result = await query('', 'raw', migrationSQL);
    
    if (result.error) {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 hours_of_internship column added to applications table');
    console.log('🔍 Index created for better performance');
    
    // Verify the column was added
    const verifyResult = await query('applications', 'select', 'id, hours_of_internship', { id: 1 });
    if (verifyResult.data) {
      console.log('✅ Column verification successful - hours_of_internship field is available');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runHoursOfInternshipMigration();
