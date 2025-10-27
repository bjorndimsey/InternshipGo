const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://oyopcgdyfgtzurtkfkje.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY or SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testConnection() {
  try {
    const { data, error, count } = await supabase.from('users').select('*', { count: 'exact', head: true });
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

// Initialize database schema
async function initializeDatabase() {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.log('⚠️  Skipping schema initialization due to connection issues');
      return;
    }

    console.log('✅ Supabase database connected successfully');
    console.log('💡 Make sure to run the schema.sql in your Supabase SQL editor');
  } catch (error) {
    console.error('❌ Error initializing Supabase database:', error.message);
  }
}

// Helper functions for database operations
const query = async (table, operation, data = null, filters = {}) => {
  try {
    let result;
    
    switch (operation) {
      case 'select':
        result = await supabase.from(table).select('*').match(filters);
        break;
      case 'insert':
        result = await supabase.from(table).insert(data).select();
        break;
      case 'update':
        result = await supabase.from(table).update(data).match(filters).select();
        break;
      case 'delete':
        result = await supabase.from(table).delete().match(filters);
        break;
      case 'count':
        result = await supabase.from(table).select('*', { count: 'exact', head: true }).match(filters);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    if (result.error) {
      throw result.error;
    }

    return result;
  } catch (error) {
    console.error(`Database operation failed (${table}.${operation}):`, error);
    throw error;
  }
};

// Initialize on startup
initializeDatabase();

module.exports = {
  supabase,
  query,
  testConnection,
  initializeDatabase
};
