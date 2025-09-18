const { query } = require('./config/supabase');

async function populateInterns() {
  try {
    console.log('🚀 Starting to populate interns table...');
    
    // First, check current state
    console.log('\n📊 Checking current state...');
    
    // Check existing interns
    const internsResult = await query('interns', 'select');
    console.log(`👥 Current interns count: ${internsResult.data?.length || 0}`);
    
    // Check students
    const studentsResult = await query('students', 'select');
    console.log(`🎓 Students count: ${studentsResult.data?.length || 0}`);
    
    // Check coordinators
    const coordinatorsResult = await query('coordinators', 'select');
    console.log(`👨‍🏫 Coordinators count: ${coordinatorsResult.data?.length || 0}`);
    
    if (studentsResult.data?.length === 0) {
      console.log('❌ No students found. Please add students first.');
      return;
    }
    
    if (coordinatorsResult.data?.length === 0) {
      console.log('❌ No coordinators found. Please add coordinators first.');
      return;
    }
    
    // Get students without coordinator assignments
    const studentsWithoutCoordinators = studentsResult.data.filter(student => {
      return !internsResult.data?.some(intern => intern.student_id === student.id);
    });
    
    console.log(`📋 Students without coordinator assignments: ${studentsWithoutCoordinators.length}`);
    
    if (studentsWithoutCoordinators.length === 0) {
      console.log('✅ All students are already assigned to coordinators.');
      return;
    }
    
    // Assign students to coordinators
    console.log('\n🔄 Assigning students to coordinators...');
    
    const assignments = [];
    const coordinators = coordinatorsResult.data;
    
    // Simple assignment: distribute students evenly among coordinators
    studentsWithoutCoordinators.forEach((student, index) => {
      const coordinator = coordinators[index % coordinators.length];
      assignments.push({
        student_id: student.id,
        school_year: '2024-2025',
        coordinator_id: coordinator.user_id, // This should be the user_id from coordinators table
        status: 'active'
      });
    });
    
    console.log(`📝 Creating ${assignments.length} intern assignments...`);
    
    // Insert assignments in batches
    const batchSize = 10;
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      
      try {
        const result = await query('interns', 'insert', batch);
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Created ${batch.length} assignments`);
      } catch (error) {
        console.error(`❌ Error creating batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
    
    // Verify results
    console.log('\n📊 Verifying results...');
    const finalInternsResult = await query('interns', 'select');
    console.log(`👥 Final interns count: ${finalInternsResult.data?.length || 0}`);
    
    // Show some sample assignments
    if (finalInternsResult.data?.length > 0) {
      console.log('\n📋 Sample assignments:');
      const sampleAssignments = finalInternsResult.data.slice(0, 5);
      
      for (const assignment of sampleAssignments) {
        // Get student details
        const studentResult = await query('students', 'select', null, { id: assignment.student_id });
        const student = studentResult.data?.[0];
        
        // Get coordinator details
        const coordinatorResult = await query('coordinators', 'select', null, { user_id: assignment.coordinator_id });
        const coordinator = coordinatorResult.data?.[0];
        
        if (student && coordinator) {
          console.log(`  • ${student.first_name} ${student.last_name} → ${coordinator.first_name} ${coordinator.last_name}`);
        }
      }
    }
    
    console.log('\n🎉 Interns population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating interns:', error);
  }
}

// Run the population
populateInterns();
