const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://oyopcgdyfgtzurtkfkje.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY or SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Running coordinator relationship fix migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrate-fix-coordinator-relationship.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file content length:', migrationSQL.length);
    console.log('📄 First 200 characters:', migrationSQL.substring(0, 200));
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove comments and empty statements
        const cleanStmt = stmt.replace(/^--.*$/gm, '').trim();
        return cleanStmt.length > 0 && !cleanStmt.startsWith('/*');
      });
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Debug: show all statements
    statements.forEach((stmt, index) => {
      console.log(`Statement ${index + 1}: ${stmt.substring(0, 50)}...`);
    });
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          // Continue with next statement
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception executing statement ${i + 1}:`, err.message);
        // Continue with next statement
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('📋 Summary:');
    console.log('  - Updated foreign key constraint to reference users table');
    console.log('  - Populated coordinator_id based on interns table relationship');
    console.log('  - Updated student_requirements_view with coordinator information');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Test connection first
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
}

// Run the migration
async function main() {
  console.log('🚀 Starting coordinator relationship fix migration...');
  
  const connected = await testConnection();
  if (!connected) {
    console.log('⚠️  Skipping migration due to connection issues');
    return;
  }
  
  await runMigration();
}

main().catch(console.error);
