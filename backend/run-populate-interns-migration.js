const fs = require('fs');
const path = require('path');
const { query } = require('./config/supabase');

async function runPopulateInternsMigration() {
  try {
    console.log('🚀 Starting populate interns migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'migrate-populate-interns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Remove comments and split by semicolon
    const cleanSql = sqlContent
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();
    
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Debug: Show all statements
    statements.forEach((stmt, index) => {
      console.log(`Statement ${index + 1}:`, stmt.substring(0, 50) + '...');
    });
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n🔄 Executing statement ${i + 1}:`);
        console.log(statement.substring(0, 100) + '...');
        
        try {
          const result = await query('', 'raw', statement);
          console.log('✅ Statement executed successfully');
          
          // If it's a SELECT statement, show results
          if (statement.toLowerCase().includes('select')) {
            console.log('📊 Results:', result);
          }
        } catch (error) {
          console.error('❌ Error executing statement:', error.message);
          // Continue with next statement
        }
      }
    }
    
    console.log('\n🎉 Populate interns migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runPopulateInternsMigration();
