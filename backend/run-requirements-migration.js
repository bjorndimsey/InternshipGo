const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  ssl: false
};

async function runRequirementsMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting requirements migration...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrate-student-requirements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded, length:', migrationSQL.length);
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Requirements migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runRequirementsMigration();

