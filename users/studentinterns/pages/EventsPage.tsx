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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

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
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
  user_type: string;
}

interface EventsPageProps {
  currentUser: UserInfo | null;
}

export default function EventsPage({ currentUser }: EventsPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setEvents([]);
        return;
      }

      console.log('📅 Fetching events for student:', currentUser.id);
      const response = await apiService.getStudentEvents(currentUser.id);
      
      if (response.success && response.events) {
        console.log('✅ Events fetched successfully:', response.events.length);
        setEvents(response.events);
      } else {
        console.log('❌ Failed to fetch events:', response.message);
        setEvents([]);
        Alert.alert('Info', response.message || 'No events available. You may not be assigned to a coordinator or have approved applications.');
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      setEvents([]);
      Alert.alert('Error', 'Failed to fetch events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
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
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={[
              styles.eventCreatorBadge, 
              { backgroundColor: event.createdBy === 'Coordinator' ? '#4285f4' : '#34a853' }
            ]}>
              <MaterialIcons 
                name={event.createdBy === 'Coordinator' ? 'school' : 'business'} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.eventCreatorText}>{event.createdByName}</Text>
            </View>
          </View>
          <Text style={styles.eventDate}>
            {formatDate(event.date)} at {event.time}
          </Text>
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
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewEvent(event)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const CalendarView = () => {
    const today = new Date();
    const currentMonthIndex = currentMonth.getMonth();
    const currentYear = currentMonth.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonthIndex, 1).getDay();

    const renderCalendarDay = (day: number) => {
      const dateString = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = getEventsByDate(dateString);
      const isToday = day === today.getDate() && currentMonthIndex === today.getMonth() && currentYear === today.getFullYear();
      const isSelected = dateString === selectedDate;
      
      return (
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay, 
            isToday && styles.today,
            isSelected && styles.selectedDay
          ]}
          onPress={() => setSelectedDate(dateString)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
          {dayEvents.length > 0 && (
            <View style={styles.eventIndicator}>
              <View style={styles.eventDot} />
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={24} color="#4285f4" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={24} color="#4285f4" />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.dayHeader}>{day}</Text>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <View key={`empty-${i}`} style={styles.calendarDay} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => renderCalendarDay(i + 1))}
        </View>
        
        {/* Selected Date Events */}
        {getEventsByDate(selectedDate).length > 0 && (
          <View style={styles.selectedDateEvents}>
            <Text style={styles.selectedDateTitle}>
              Events on {formatDate(selectedDate)}
            </Text>
            <ScrollView 
              style={styles.selectedDateEventsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {getEventsByDate(selectedDate).map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.selectedDateEventItem}
                  onPress={() => handleViewEvent(event)}
                >
                  <View style={[styles.eventTypeDot, { backgroundColor: getEventTypeColor(event.type) }]} />
                  <View style={styles.selectedDateEventInfo}>
                    <View style={styles.selectedDateEventTitleRow}>
                      <Text style={styles.selectedDateEventTitle}>{event.title}</Text>
                      <View style={[
                        styles.selectedDateEventCreatorBadge, 
                        { backgroundColor: event.createdBy === 'Coordinator' ? '#4285f4' : '#34a853' }
                      ]}>
                        <MaterialIcons 
                          name={event.createdBy === 'Coordinator' ? 'school' : 'business'} 
                          size={10} 
                          color="#fff" 
                        />
                        <Text style={styles.selectedDateEventCreatorText}>{event.createdByName}</Text>
                      </View>
                    </View>
                    <Text style={styles.selectedDateEventTime}>{event.time}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#4285f4" />
              <Text style={styles.calendarButtonText}>Calendar</Text>
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
        <View style={styles.eventsList}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.sectionSubtitle}>
              {getUpcomingEvents().length} {getUpcomingEvents().length === 1 ? 'event' : 'events'} scheduled
            </Text>
          </View>

          {getUpcomingEvents().length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No upcoming events</Text>
              <Text style={styles.emptyStateText}>
                Events will appear here when your coordinator creates them
              </Text>
            </View>
          ) : (
            getUpcomingEvents().map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </View>
      </View>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          visible={showEventDetails}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEventDetails(false)}
        >
          <View style={styles.eventDetailsContainer}>
            <View style={styles.eventDetailsHeader}>
              <Text style={styles.eventDetailsTitle}>Event Details</Text>
              <TouchableOpacity
                style={styles.closeEventDetailsButton}
                onPress={() => setShowEventDetails(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.eventDetailsContent} showsVerticalScrollIndicator={false}>
              <View style={styles.eventDetailsSection}>
                <View style={styles.eventDetailsHeaderInfo}>
                  <View style={[styles.eventTypeIcon, { backgroundColor: getEventTypeColor(selectedEvent.type) }]}>
                    <MaterialIcons 
                      name={getEventTypeIcon(selectedEvent.type)} 
                      size={24} 
                      color="#fff" 
                    />
                  </View>
                  <View style={styles.eventDetailsTitleInfo}>
                    <View style={styles.eventDetailsTitleRow}>
                      <Text style={styles.eventDetailsEventTitle}>{selectedEvent.title}</Text>
                      <View style={[
                        styles.eventDetailsCreatorBadge, 
                        { backgroundColor: selectedEvent.createdBy === 'Coordinator' ? '#4285f4' : '#34a853' }
                      ]}>
                        <MaterialIcons 
                          name={selectedEvent.createdBy === 'Coordinator' ? 'school' : 'business'} 
                          size={14} 
                          color="#fff" 
                        />
                        <Text style={styles.eventDetailsCreatorText}>{selectedEvent.createdByName}</Text>
                      </View>
                    </View>
                    <Text style={styles.eventDetailsEventDate}>
                      {formatDate(selectedEvent.date)} at {selectedEvent.time}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.eventDetailsSection}>
                <Text style={styles.eventDetailsSectionTitle}>Description</Text>
                <Text style={styles.eventDetailsDescription}>{selectedEvent.description}</Text>
              </View>

              <View style={styles.eventDetailsSection}>
                <Text style={styles.eventDetailsSectionTitle}>Event Information</Text>
                <View style={styles.eventDetailsInfo}>
                  <View style={styles.eventDetailsInfoRow}>
                    <MaterialIcons name="location-on" size={20} color="#666" />
                    <Text style={styles.eventDetailsInfoLabel}>Location:</Text>
                    <Text style={styles.eventDetailsInfoValue}>{selectedEvent.location}</Text>
                  </View>
                  <View style={styles.eventDetailsInfoRow}>
                    <MaterialIcons name="people" size={20} color="#666" />
                    <Text style={styles.eventDetailsInfoLabel}>Attendees:</Text>
                    <Text style={styles.eventDetailsInfoValue}>
                      {selectedEvent.attendees}{selectedEvent.maxAttendees ? `/${selectedEvent.maxAttendees}` : ''}
                    </Text>
                  </View>
                  <View style={styles.eventDetailsInfoRow}>
                    <MaterialIcons name="category" size={20} color="#666" />
                    <Text style={styles.eventDetailsInfoLabel}>Type:</Text>
                    <Text style={styles.eventDetailsInfoValue}>{selectedEvent.type}</Text>
                  </View>
                  <View style={styles.eventDetailsInfoRow}>
                    <MaterialIcons name="person" size={20} color="#666" />
                    <Text style={styles.eventDetailsInfoLabel}>Created by:</Text>
                    <Text style={styles.eventDetailsInfoValue}>{selectedEvent.createdByName}</Text>
                  </View>
                  <View style={styles.eventDetailsInfoRow}>
                    <MaterialIcons name="email" size={20} color="#666" />
                    <Text style={styles.eventDetailsInfoLabel}>Email:</Text>
                    <Text style={styles.eventDetailsInfoValue}>{selectedEvent.createdByEmail}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.eventDetailsSection}>
                <Text style={styles.eventDetailsSectionTitle}>Status</Text>
                <View style={styles.eventDetailsStatusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedEvent.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedEvent.status)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
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
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4285f4',
    backgroundColor: '#f8f9fa',
    shadowColor: '#4285f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarButtonText: {
    color: '#4285f4',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  calendarSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  calendarContainer: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  calendarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 700,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    letterSpacing: 0.5,
  },
  calendarDay: {
    width: '14.28%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: '#f0f0f0',
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    position: 'relative',
  },
  today: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    margin: 2,
  },
  selectedDay: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4285f4',
    borderWidth: 2,
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#4285f4',
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea4335',
    shadowColor: '#ea4335',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  selectedDateEvents: {
    marginTop: 20,
    width: '100%',
    maxHeight: 180,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  selectedDateEventsList: {
    maxHeight: 150,
  },
  selectedDateEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  eventTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  selectedDateEventInfo: {
    flex: 1,
  },
  selectedDateEventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  selectedDateEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  selectedDateEventCreatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  selectedDateEventCreatorText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  selectedDateEventTime: {
    fontSize: 12,
    color: '#666',
  },
  eventsList: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 12,
  },
  eventCreatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  eventCreatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  eventDate: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
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
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
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
  // Event Details Modal Styles
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  eventDetailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  closeEventDetailsButton: {
    padding: 8,
  },
  eventDetailsContent: {
    flex: 1,
    padding: 24,
  },
  eventDetailsSection: {
    marginBottom: 28,
  },
  eventDetailsHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventDetailsTitleInfo: {
    flex: 1,
    marginLeft: 16,
  },
  eventDetailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventDetailsEventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 16,
  },
  eventDetailsCreatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  eventDetailsCreatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  eventDetailsEventDate: {
    fontSize: 17,
    color: '#666',
    fontWeight: '500',
  },
  eventDetailsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  eventDetailsDescription: {
    fontSize: 17,
    color: '#666',
    lineHeight: 26,
    fontWeight: '400',
  },
  eventDetailsInfo: {
    gap: 12,
  },
  eventDetailsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventDetailsInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    minWidth: 80,
  },
  eventDetailsInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
    marginLeft: 8,
  },
  eventDetailsStatusContainer: {
    alignItems: 'flex-start',
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
});
