const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  ssl: false
};

const pool = new Pool(dbConfig);

async function runMigration() {
  try {
    const migrationFile = process.argv[2] || 'migrate-partnership-status.sql';
    console.log('🔄 Starting migration:', migrationFile);
    
    const migrationPath = path.join(__dirname, 'database', migrationFile);
    console.log('📁 Migration file path:', migrationPath);
    
    // Check if file exists
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL loaded, length:', migrationSQL.length);
    
    // Execute the migration (it's a single DO block)
    console.log('⚡ Executing migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  } finally {
    await pool.end();
  }
}

runMigration();
