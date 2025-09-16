const { Pool } = require('pg');
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

// Create database connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
  initializeDatabase();
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  console.log('💡 Make sure PostgreSQL is running and accessible');
  console.log('💡 Check your database credentials in the .env file');
  // Don't exit immediately, let the app try to handle the error
});

// Test database connection
async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Initialize database with schema
async function initializeDatabase() {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.log('⚠️  Skipping schema initialization due to connection issues');
      return;
    }

    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }
      
      console.log('✅ Database schema initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
  }
}

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a single row
const getOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0];
};

// Helper function to get all rows
const getAll = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};

// Helper function to run a query without returning results
const run = async (text, params) => {
  const result = await query(text, params);
  return { lastID: result.rows[0]?.id, changes: result.rowCount };
};

module.exports = {
  pool,
  query,
  getOne,
  getAll,
  run
};
