import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'meeting' | 'workshop' | 'orientation' | 'deadline' | 'other';
  attendees: number;
  maxAttendees?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  targetAudience: 'all' | 'coordinators' | 'interns' | 'companies';
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: selectedDate,
    time: '',
    location: '',
    type: 'meeting' as Event['type'],
    maxAttendees: '',
    targetAudience: 'all' as Event['targetAudience'],
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Coordinator Training Session',
          description: 'Monthly training session for all coordinators on new policies and procedures',
          date: '2024-02-01',
          time: '09:00',
          location: 'Main Conference Room',
          type: 'workshop',
          attendees: 8,
          maxAttendees: 15,
          status: 'upcoming',
          createdBy: 'Admin Coordinator',
          createdAt: '2024-01-15',
          targetAudience: 'coordinators',
        },
        {
          id: '2',
          title: 'Internship Orientation',
          description: 'Welcome session for new interns starting this semester',
          date: '2024-02-15',
          time: '14:00',
          location: 'Main Auditorium',
          type: 'orientation',
          attendees: 25,
          maxAttendees: 50,
          status: 'upcoming',
          createdBy: 'Admin Coordinator',
          createdAt: '2024-01-20',
          targetAudience: 'interns',
        },
        {
          id: '3',
          title: 'Company Partnership Meeting',
          description: 'Quarterly meeting with all partner companies',
          date: '2024-03-15',
          time: '10:00',
          location: 'Conference Room A',
          type: 'meeting',
          attendees: 0,
          maxAttendees: 30,
          status: 'upcoming',
          createdBy: 'Admin Coordinator',
          createdAt: '2024-01-25',
          targetAudience: 'companies',
        },
        {
          id: '4',
          title: 'Application Deadline',
          description: 'Last day to submit internship applications',
          date: '2024-01-31',
          time: '23:59',
          location: 'Online',
          type: 'deadline',
          attendees: 0,
          status: 'completed',
          createdBy: 'System',
          createdAt: '2024-01-01',
          targetAudience: 'all',
        },
        {
          id: '5',
          title: 'Professional Development Workshop',
          description: 'Resume writing and interview skills workshop for all students',
          date: '2024-02-10',
          time: '13:00',
          location: 'Career Center',
          type: 'workshop',
          attendees: 18,
          maxAttendees: 25,
          status: 'upcoming',
          createdBy: 'Admin Coordinator',
          createdAt: '2024-01-28',
          targetAudience: 'all',
        },
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      type: newEvent.type,
      attendees: 0,
      maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : undefined,
      status: 'upcoming',
      createdBy: 'Admin Coordinator',
      createdAt: new Date().toISOString().split('T')[0],
      targetAudience: newEvent.targetAudience,
    };

    setEvents([event, ...events]);
    setNewEvent({
      title: '',
      description: '',
      date: selectedDate,
      time: '',
      location: '',
      type: 'meeting',
      maxAttendees: '',
      targetAudience: 'all',
    });
    setShowCreateModal(false);
    Alert.alert('Success', 'Event created successfully');
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setEvents(events.filter(e => e.id !== event.id));
            Alert.alert('Success', 'Event deleted successfully');
          }
        },
      ]
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return '#4285f4';
      case 'workshop': return '#34a853';
      case 'orientation': return '#fbbc04';
      case 'deadline': return '#ea4335';
      case 'other': return '#9c27b0';
      default: return '#666';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return 'meeting-room';
      case 'workshop': return 'work';
      case 'orientation': return 'school';
      case 'deadline': return 'schedule';
      case 'other': return 'event';
      default: return 'event';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#4285f4';
      case 'ongoing': return '#34a853';
      case 'completed': return '#666';
      case 'cancelled': return '#ea4335';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'all': return '#4285f4';
      case 'coordinators': return '#fbbc04';
      case 'interns': return '#34a853';
      case 'companies': return '#ea4335';
      default: return '#666';
    }
  };

  const getTargetAudienceText = (audience: string) => {
    switch (audience) {
      case 'all': return 'All';
      case 'coordinators': return 'Coordinators';
      case 'interns': return 'Interns';
      case 'companies': return 'Companies';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => event.date >= today && event.status !== 'completed');
  };

  const getEventsByDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const EventCard = ({ event }: { event: Event }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.eventTypeIcon, { backgroundColor: getEventTypeColor(event.type) }]}>
          <MaterialIcons 
            name={getEventTypeIcon(event.type)} 
            size={20} 
            color="#fff" 
          />
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>
            {formatDate(event.date)} at {event.time}
          </Text>
        </View>
        <View style={styles.eventStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
            <Text style={styles.statusText}>{getStatusText(event.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.eventDetails}>
        <Text style={styles.eventDescription}>{event.description}</Text>
        
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="people" size={16} color="#666" />
            <Text style={styles.metaText}>
              {event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''} attendees
            </Text>
          </View>
        </View>

        <View style={styles.audienceContainer}>
          <View style={[styles.audienceBadge, { backgroundColor: getTargetAudienceColor(event.targetAudience) }]}>
            <Text style={styles.audienceText}>{getTargetAudienceText(event.targetAudience)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => Alert.alert('Event Details', `Viewing details for ${event.title}`)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => Alert.alert('Edit Event', `Edit functionality for ${event.title}`)}
        >
          <MaterialIcons name="edit" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteEvent(event)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const CalendarView = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const renderCalendarDay = (day: number) => {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = getEventsByDate(dateString);
      const isToday = day === today.getDate();
      
      return (
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isToday && styles.today]}
          onPress={() => setSelectedDate(dateString)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
          {dayEvents.length > 0 && (
            <View style={styles.eventIndicator}>
              <Text style={styles.eventCount}>{dayEvents.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>
          {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.dayHeader}>{day}</Text>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <View key={`empty-${i}`} style={styles.calendarDay} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => renderCalendarDay(i + 1))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <MaterialIcons name="calendar-today" size={20} color="#4285f4" />
            <Text style={styles.calendarButtonText}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar View */}
      {showCalendar && (
        <View style={styles.calendarSection}>
          <CalendarView />
        </View>
      )}

      {/* Events List */}
      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Text style={styles.sectionSubtitle}>
            {getUpcomingEvents().length} events scheduled
          </Text>
        </View>

        {getUpcomingEvents().length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No upcoming events</Text>
            <Text style={styles.emptyStateText}>
              Create your first event to get started
            </Text>
          </View>
        ) : (
          getUpcomingEvents().map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Event</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCreateModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({...newEvent, title: text})}
                  placeholder="Enter event title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent({...newEvent, description: text})}
                  placeholder="Enter event description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEvent.date}
                    onChangeText={(text) => setNewEvent({...newEvent, date: text})}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEvent.time}
                    onChangeText={(text) => setNewEvent({...newEvent, time: text})}
                    placeholder="HH:MM"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEvent.location}
                  onChangeText={(text) => setNewEvent({...newEvent, location: text})}
                  placeholder="Enter event location"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type</Text>
                  <TouchableOpacity style={styles.typeSelector}>
                    <Text style={styles.typeText}>{newEvent.type}</Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Max Attendees</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEvent.maxAttendees}
                    onChangeText={(text) => setNewEvent({...newEvent, maxAttendees: text})}
                    placeholder="Optional"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Audience</Text>
                <TouchableOpacity style={styles.audienceSelector}>
                  <Text style={styles.audienceText}>{getTargetAudienceText(newEvent.targetAudience)}</Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateEvent}
              >
                <Text style={styles.saveButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  calendarButtonText: {
    color: '#4285f4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4285f4',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  calendarSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarContainer: {
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  today: {
    backgroundColor: '#4285f4',
  },
  dayText: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ea4335',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  eventsList: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  eventStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  eventDetails: {
    marginBottom: 15,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  eventMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  audienceContainer: {
    marginTop: 10,
  },
  audienceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  audienceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  editButton: {
    backgroundColor: '#34a853',
  },
  deleteButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typeText: {
    fontSize: 16,
    color: '#1a1a2e',
  },
  audienceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4285f4',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
