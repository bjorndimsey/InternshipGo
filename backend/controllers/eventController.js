const { query } = require('../config/supabase');

class EventController {
  // Get all events for a coordinator
  static async getEvents(req, res) {
    try {
      const { coordinatorId } = req.params;
      
      if (!coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator ID is required'
        });
      }

      console.log('🔍 Getting events for coordinator:', coordinatorId);

      const eventsResult = await query('events', 'select', null, { created_by: parseInt(coordinatorId) });
      
      if (eventsResult.error) {
        console.error('❌ Error fetching events:', eventsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch events',
          error: eventsResult.error.message
        });
      }

      const events = eventsResult.data || [];
      console.log('📅 Events found:', events.length);

      // Get coordinator details for the createdBy field
      let coordinatorName = 'Unknown Coordinator';
      try {
        const coordinatorResult = await query('coordinators', 'select', null, { user_id: parseInt(coordinatorId) });
        if (coordinatorResult.data && coordinatorResult.data.length > 0) {
          const coordinator = coordinatorResult.data[0];
          coordinatorName = `${coordinator.first_name} ${coordinator.last_name}`;
        }
      } catch (error) {
        console.error('Error fetching coordinator details:', error);
      }

      // Transform events for frontend
      const transformedEvents = events.map(event => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description || '',
        date: event.event_date,
        time: event.event_time,
        location: event.location || '',
        type: event.event_type,
        attendees: event.attendees || 0,
        maxAttendees: event.max_attendees || undefined,
        status: event.status,
        createdBy: coordinatorName,
        createdAt: event.created_at
      }));

      res.json({
        success: true,
        message: 'Events fetched successfully',
        events: transformedEvents
      });

    } catch (error) {
      console.error('❌ Error in getEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get events for a student (based on coordinator assignment and application approval)
  static async getStudentEvents(req, res) {
    try {
      const { studentId } = req.params;
      
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      console.log('🔍 Getting events for student (user ID):', studentId);

      // First, find the student record in the students table using user_id
      const studentResult = await query('students', 'select', null, { user_id: parseInt(studentId) });
      
      if (studentResult.error) {
        console.error('❌ Error finding student record:', studentResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to find student record',
          error: studentResult.error.message
        });
      }

      const studentData = studentResult.data || [];
      console.log('🔍 Student query result for user_id', studentId, ':', studentData);
      
      if (studentData.length === 0) {
        // Let's also check if there's a student record with a different user_id
        const allStudentsResult = await query('students', 'select');
        console.log('🔍 All students in database:', allStudentsResult.data);
        
        return res.json({
          success: true,
          message: 'Student record not found for user_id ' + studentId,
          events: []
        });
      }

      const actualStudentId = studentData[0].id;
      console.log('📋 Found student record with ID:', actualStudentId);

      // Check if student is assigned to a coordinator
      const internResult = await query('interns', 'select', null, { student_id: actualStudentId });
      
      if (internResult.error) {
        console.error('❌ Error checking intern assignment:', internResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to check intern assignment',
          error: internResult.error.message
        });
      }

      const internData = internResult.data || [];
      if (internData.length === 0) {
        return res.json({
          success: true,
          message: 'Student not assigned to any coordinator',
          events: []
        });
      }

      // Get the coordinator ID
      const coordinatorId = internData[0].coordinator_id;
      console.log('📋 Student assigned to coordinator:', coordinatorId);

      // Check if student has approved applications (using user_id for applications table)
      const applicationsResult = await query('applications', 'select', null, { 
        student_id: parseInt(studentId),
        status: 'approved'
      });
      
      if (applicationsResult.error) {
        console.error('❌ Error checking applications:', applicationsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to check applications',
          error: applicationsResult.error.message
        });
      }

      const approvedApplications = applicationsResult.data || [];
      console.log('✅ Student applications status:', approvedApplications.length > 0 ? 'Has approved applications' : 'No approved applications');

      // Get events created by the coordinator
      const coordinatorEventsResult = await query('events', 'select', null, { created_by: coordinatorId });
      
      if (coordinatorEventsResult.error) {
        console.error('❌ Error fetching coordinator events:', coordinatorEventsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch coordinator events',
          error: coordinatorEventsResult.error.message
        });
      }

      const coordinatorEvents = coordinatorEventsResult.data || [];
      console.log('📅 Coordinator events found:', coordinatorEvents.length);

      // Get events from companies that approved the student's application (only if student has approved applications)
      let companyEvents = [];
      if (approvedApplications.length > 0) {
        const companyIds = approvedApplications.map(app => app.company_id);
        console.log('🏢 Companies with approved applications:', companyIds);
        // Get company user IDs from company IDs
        const companiesResult = await query('companies', 'select', ['user_id'], { id: companyIds });
        console.log('🏢 Companies query result:', companiesResult);
        
        if (companiesResult.error) {
          console.error('❌ Error fetching company user IDs:', companiesResult.error);
        } else {
          const companyUserIds = companiesResult.data?.map(company => company.user_id) || [];
          console.log('👥 Company user IDs:', companyUserIds);

          if (companyUserIds.length > 0) {
            // Get events created by companies (query each company user ID separately)
            const allCompanyEvents = [];
            for (const companyUserId of companyUserIds) {
              const companyEventsResult = await query('events', 'select', null, { created_by: companyUserId });
              console.log(`📅 Company events query result for user ${companyUserId}:`, companyEventsResult);
              
              if (companyEventsResult.error) {
                console.error(`❌ Error fetching company events for user ${companyUserId}:`, companyEventsResult.error);
              } else {
                const events = companyEventsResult.data || [];
                allCompanyEvents.push(...events);
                console.log(`📅 Company events found for user ${companyUserId}:`, events.length);
              }
            }
            companyEvents = allCompanyEvents;
            console.log('📅 Total company events found:', companyEvents.length);
          }
        }
      } else {
        console.log('📅 No approved applications, skipping company events');
      }

      // Combine coordinator and company events
      const allEvents = [...coordinatorEvents, ...companyEvents];
      console.log('📅 Total events found for student:', allEvents.length);

      // Get creator details for all events
      const transformedEvents = await Promise.all(allEvents.map(async (event) => {
        // Determine if this event was created by a coordinator or company
        const isCoordinatorEvent = coordinatorEvents.some(coordEvent => coordEvent.id === event.id);
        
        let creatorInfo = {
          type: isCoordinatorEvent ? 'Coordinator' : 'Company',
          name: 'Unknown',
          email: 'Unknown'
        };

        try {
          if (isCoordinatorEvent) {
            // Get coordinator details
            const coordinatorResult = await query('coordinators', 'select', null, { user_id: event.created_by });
            
            if (coordinatorResult.data && coordinatorResult.data.length > 0) {
              const coordinator = coordinatorResult.data[0];
              const userResult = await query('users', 'select', ['email'], { id: event.created_by });
              const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
              
              creatorInfo = {
                type: 'Coordinator',
                name: `${coordinator.first_name} ${coordinator.last_name}`,
                email: user ? user.email : 'Unknown'
              };
            }
          } else {
            // Get company details
            const companyResult = await query('companies', 'select', null, { user_id: event.created_by });
            
            if (companyResult.data && companyResult.data.length > 0) {
              const company = companyResult.data[0];
              const userResult = await query('users', 'select', ['email'], { id: event.created_by });
              const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
              
              creatorInfo = {
                type: 'Company',
                name: company.company_name,
                email: user ? user.email : 'Unknown'
              };
            }
          }
        } catch (error) {
          console.error('Error fetching creator details for event', event.id, ':', error);
        }
        
        return {
          id: event.id.toString(),
          title: event.title,
          description: event.description || '',
          date: event.event_date,
          time: event.event_time,
          location: event.location || '',
          type: event.event_type,
          attendees: event.attendees || 0,
          maxAttendees: event.max_attendees || undefined,
          status: event.status,
          createdBy: creatorInfo.type,
          createdByName: creatorInfo.name,
          createdByEmail: creatorInfo.email,
          createdAt: event.created_at
        };
      }));

      res.json({
        success: true,
        message: 'Events fetched successfully',
        events: transformedEvents
      });
    } catch (error) {
      console.error('❌ Error in getStudentEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Create a new event
  static async createEvent(req, res) {
    try {
      const { 
        title, 
        description, 
        date, 
        time, 
        location, 
        type, 
        maxAttendees,
        coordinatorId 
      } = req.body;

      // Validate required fields
      if (!title || !date || !time || !type || !coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Title, date, time, type, and coordinator ID are required'
        });
      }

      console.log('📝 Creating event:', { title, date, time, type, coordinatorId });

      const eventData = {
        title,
        description: description || '',
        event_date: date,
        event_time: time,
        location: location || '',
        event_type: type,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        created_by: parseInt(coordinatorId),
        status: 'upcoming'
      };

      const result = await query('events', 'insert', eventData);
      
      if (result.error) {
        console.error('❌ Error creating event:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create event',
          error: result.error.message
        });
      }

      console.log('✅ Event created successfully:', result.data);

      res.json({
        success: true,
        message: 'Event created successfully',
        event: {
          id: result.data[0].id.toString(),
          title: result.data[0].title,
          description: result.data[0].description,
          date: result.data[0].event_date,
          time: result.data[0].event_time,
          location: result.data[0].location,
          type: result.data[0].event_type,
          attendees: result.data[0].attendees,
          maxAttendees: result.data[0].max_attendees,
          status: result.data[0].status,
          createdBy: 'Dr. Sarah Johnson',
          createdAt: result.data[0].created_at
        }
      });

    } catch (error) {
      console.error('❌ Error in createEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update an event
  static async updateEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { 
        title, 
        description, 
        date, 
        time, 
        location, 
        type, 
        maxAttendees,
        status 
      } = req.body;

      console.log('📝 Updating event:', eventId, { title, date, time, type, status });

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (date) updateData.event_date = date;
      if (time) updateData.event_time = time;
      if (location !== undefined) updateData.location = location;
      if (type) updateData.event_type = type;
      if (maxAttendees !== undefined) updateData.max_attendees = maxAttendees ? parseInt(maxAttendees) : null;
      if (status) updateData.status = status;

      const result = await query('events', 'update', updateData, { id: parseInt(eventId) });
      
      if (result.error) {
        console.error('❌ Error updating event:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update event',
          error: result.error.message
        });
      }

      if (!result.data || result.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      console.log('✅ Event updated successfully');

      res.json({
        success: true,
        message: 'Event updated successfully',
        event: {
          id: result.data[0].id.toString(),
          title: result.data[0].title,
          description: result.data[0].description,
          date: result.data[0].event_date,
          time: result.data[0].event_time,
          location: result.data[0].location,
          type: result.data[0].event_type,
          attendees: result.data[0].attendees,
          maxAttendees: result.data[0].max_attendees,
          status: result.data[0].status,
          createdBy: 'Dr. Sarah Johnson',
          createdAt: result.data[0].created_at
        }
      });

    } catch (error) {
      console.error('❌ Error in updateEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete an event
  static async deleteEvent(req, res) {
    try {
      const { eventId } = req.params;

      console.log('🗑️ Deleting event:', eventId);

      const result = await query('events', 'delete', null, { id: parseInt(eventId) });
      
      if (result.error) {
        console.error('❌ Error deleting event:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete event',
          error: result.error.message
        });
      }

      if (!result.data || result.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      console.log('✅ Event deleted successfully');

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error in deleteEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get events by date range
  static async getEventsByDateRange(req, res) {
    try {
      const { coordinatorId, startDate, endDate } = req.query;
      
      if (!coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator ID is required'
        });
      }

      console.log('🔍 Getting events by date range:', { coordinatorId, startDate, endDate });

      let whereClause = { created_by: parseInt(coordinatorId) };
      
      if (startDate && endDate) {
        whereClause.event_date = `gte.${startDate},lte.${endDate}`;
      }

      const eventsResult = await query('events', 'select', null, whereClause);
      
      if (eventsResult.error) {
        console.error('❌ Error fetching events by date range:', eventsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch events',
          error: eventsResult.error.message
        });
      }

      const events = eventsResult.data || [];
      console.log('📅 Events found in date range:', events.length);

      // Transform events for frontend
      const transformedEvents = events.map(event => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description || '',
        date: event.event_date,
        time: event.event_time,
        location: event.location || '',
        type: event.event_type,
        attendees: event.attendees || 0,
        maxAttendees: event.max_attendees || undefined,
        status: event.status,
        createdBy: 'Dr. Sarah Johnson',
        createdAt: event.created_at
      }));

      res.json({
        success: true,
        message: 'Events fetched successfully',
        events: transformedEvents
      });

    } catch (error) {
      console.error('❌ Error in getEventsByDateRange:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = EventController;
