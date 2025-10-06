const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Database configuration (same as database.js)
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  ssl: false
};

async function runMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting middle name migration...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');
    
    // Read and execute migration
    const migration = fs.readFileSync('./database/middle-name-migration.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Middle name migration completed successfully');
    
    // Verify the changes
    const studentsResult = await pool.query(`
      SELECT COUNT(*) as total_records, 
             COUNT(CASE WHEN middle_name = 'N/A' THEN 1 END) as n_a_records
      FROM students
    `);
    
    const coordinatorsResult = await pool.query(`
      SELECT COUNT(*) as total_records,
             COUNT(CASE WHEN middle_name = 'N/A' THEN 1 END) as n_a_records
      FROM coordinators
    `);
    
    console.log('📊 Migration Results:');
    console.log(`Students: ${studentsResult.rows[0].total_records} total, ${studentsResult.rows[0].n_a_records} with N/A`);
    console.log(`Coordinators: ${coordinatorsResult.rows[0].total_records} total, ${coordinatorsResult.rows[0].n_a_records} with N/A`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
