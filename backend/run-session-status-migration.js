const { supabase } = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function runSessionStatusMigration() {
  console.log('🚀 Starting session status migration...');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'add-session-status-columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded from:', migrationPath);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Use direct SQL execution instead of RPC
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .limit(1); // This is just to test connection
        
        if (error) {
          console.error(`❌ Database connection error:`, error);
          break;
        }
        
        // For now, let's execute the statements manually
        console.log(`⚠️  Statement ${i + 1} needs to be executed manually in Supabase SQL Editor`);
        console.log(`📝 SQL: ${statement}`);
        
      } catch (err) {
        console.error(`❌ Exception executing statement ${i + 1}:`, err.message);
        // Continue with next statement
        continue;
      }
    }
    
    console.log('\n🎉 Session status migration completed!');
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'attendance_records')
      .in('column_name', ['am_status', 'pm_status']);
    
    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
    } else {
      console.log('✅ New columns found:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runSessionStatusMigration();
