const { supabase } = require('./config/supabase');

async function createRequirementsTable() {
  try {
    console.log('🔄 Creating global_requirements table...');
    
    // Create the global_requirements table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS global_requirements (
        id SERIAL PRIMARY KEY,
        requirement_id VARCHAR(50) UNIQUE NOT NULL,
        requirement_name VARCHAR(255) NOT NULL,
        requirement_description TEXT,
        is_required BOOLEAN DEFAULT true,
        file_url TEXT,
        file_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      return;
    }
    
    console.log('✅ global_requirements table created successfully!');
    
    // Insert some default requirements
    const defaultRequirements = [
      {
        requirement_id: '1',
        requirement_name: 'Resume',
        requirement_description: 'Updated resume with current information',
        is_required: true
      },
      {
        requirement_id: '2',
        requirement_name: 'Official Transcript',
        requirement_description: 'Official academic transcript',
        is_required: true
      },
      {
        requirement_id: '3',
        requirement_name: 'Recommendation Letter',
        requirement_description: 'Letter of recommendation from academic advisor',
        is_required: true
      },
      {
        requirement_id: '4',
        requirement_name: 'Medical Clearance',
        requirement_description: 'Medical clearance certificate',
        is_required: true
      },
      {
        requirement_id: '5',
        requirement_name: 'Insurance Documentation',
        requirement_description: 'Health insurance documentation',
        is_required: true
      }
    ];
    
    console.log('🔄 Inserting default requirements...');
    
    for (const req of defaultRequirements) {
      const { error: insertError } = await supabase
        .from('global_requirements')
        .insert(req);
      
      if (insertError) {
        console.log('⚠️  Requirement already exists or error:', insertError.message);
      } else {
        console.log(`✅ Inserted: ${req.requirement_name}`);
      }
    }
    
    console.log('✅ Setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createRequirementsTable();

