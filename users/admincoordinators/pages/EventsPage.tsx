import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Animated,
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: selectedDate,
    time: '',
    location: '',
    type: 'meeting' as Event['type'],
    maxAttendees: '',
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchEvents();
    
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shimmer animation for skeleton loading
  useEffect(() => {
    if (showSkeleton) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [showSkeleton]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setEvents([]);
        return;
      }

      console.log('📅 Fetching events for coordinator:', currentUser.id);
      const response = await apiService.getEvents(currentUser.id);
      
      if (response.success && response.events) {
        console.log('✅ Events fetched successfully:', response.events.length);
        setEvents(response.events);
      } else {
        console.log('❌ Failed to fetch events:', response.message);
        setEvents([]);
        Alert.alert('Error', response.message || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      setEvents([]);
      Alert.alert('Error', 'Failed to fetch events. Please try again.');
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Date, Time)');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newEvent.date)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format (e.g., 2025-09-20)');
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newEvent.time)) {
      Alert.alert('Error', 'Please enter time in HH:MM format (e.g., 14:30)');
      return;
    }

    // Validate date is not in the past
    const eventDate = new Date(newEvent.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      Alert.alert('Error', 'Event date cannot be in the past');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      console.log('📝 Creating event:', newEvent);
      const response = await apiService.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        time: newEvent.time,
        location: newEvent.location,
        type: newEvent.type,
        maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : undefined,
        coordinatorId: currentUser.id,
      });

      if (response.success && response.event) {
        console.log('✅ Event created successfully');
        setEvents([response.event, ...events]);
        setNewEvent({
          title: '',
          description: '',
          date: selectedDate,
          time: '',
          location: '',
          type: 'meeting',
          maxAttendees: '',
        });
        setShowCreateModal(false);
        Alert.alert('Success', 'Event created successfully');
      } else {
        console.log('❌ Failed to create event:', response.message);
        Alert.alert('Error', response.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('❌ Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleDateChange = (dateString: string) => {
    setNewEvent({...newEvent, date: dateString});
  };

  const handleTimeChange = (timeString: string) => {
    setNewEvent({...newEvent, time: timeString});
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

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting event:', event.id);
              const response = await apiService.deleteEvent(event.id);
              
              if (response.success) {
                console.log('✅ Event deleted successfully');
                setEvents(events.filter(e => e.id !== event.id));
                Alert.alert('Success', 'Event deleted successfully');
              } else {
                console.log('❌ Failed to delete event:', response.message);
                Alert.alert('Error', response.message || 'Failed to delete event');
              }
            } catch (error) {
              console.error('❌ Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
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

  const toggleCardExpansion = (eventId: string) => {
    setExpandedCard(expandedCard === eventId ? null : eventId);
  };

  // Enhanced Progress Bar Component
  const ProgressBar = ({ progress, color = '#F4D03F' }: { progress: number; color?: string }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [progress]);
    
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill, 
              { 
                backgroundColor: color,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    );
  };

  // Skeleton Components
  const SkeletonEventCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonEventCard}>
        <View style={styles.skeletonEventHeader}>
          <Animated.View style={[styles.skeletonEventTypeIcon, { opacity: shimmerOpacity }]} />
          <View style={styles.skeletonEventInfo}>
            <Animated.View style={[styles.skeletonTextLine, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '70%', opacity: shimmerOpacity }]} />
          </View>
        </View>
        
        <View style={styles.skeletonEventDetails}>
          <Animated.View style={[styles.skeletonTextLine, { width: '90%', opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonTextLine, { width: '60%', opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonTextLine, { width: '80%', opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  const EventCard = ({ event }: { event: Event }) => {
    const isExpanded = expandedCard === event.id;
    const attendanceProgress = event.maxAttendees ? (event.attendees / event.maxAttendees) * 100 : 0;
    
    return (
      <View style={[
        styles.eventCard,
        isExpanded && styles.expandedEventCard
      ]}>
        <TouchableOpacity 
          onPress={() => toggleCardExpansion(event.id)}
          style={styles.cardTouchable}
        >
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
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color="#F56E0F" 
              style={styles.expandIcon}
            />
          </View>

          <View style={styles.eventDetails}>
            <Text style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Text>
            
            {event.maxAttendees && (
              <View style={styles.attendanceContainer}>
                <Text style={styles.attendanceLabel}>Attendance Progress</Text>
                <ProgressBar 
                  progress={attendanceProgress} 
                  color={attendanceProgress >= 80 ? '#F56E0F' : attendanceProgress >= 50 ? '#F56E0F' : '#878787'} 
                />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <MaterialIcons name="location-on" size={16} color="#F56E0F" />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="people" size={16} color="#F56E0F" />
                <Text style={styles.metaText}>
                  {event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''} attendees
                </Text>
              </View>
            </View>

            <View style={styles.expandedActionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewEvent(event)}
              >
                <MaterialIcons name="visibility" size={16} color="#FBFBFB" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]} 
                onPress={() => Alert.alert('Edit Event', `Edit functionality for ${event.title}`)}
              >
                <MaterialIcons name="edit" size={16} color="#FBFBFB" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => handleDeleteEvent(event)}
              >
                <MaterialIcons name="delete" size={16} color="#FBFBFB" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

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
            <MaterialIcons name="chevron-left" size={24} color="#F56E0F" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={24} color="#F56E0F" />
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
                    <Text style={styles.selectedDateEventTitle}>{event.title}</Text>
                    <Text style={styles.selectedDateEventTime}>{event.time}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#F56E0F" />
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
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, { opacity: fadeAnim }]} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentWrapper}>
        {/* Header */}
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.headerTitle}>Events Management</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#F56E0F" />
              <Text style={styles.calendarButtonText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#FBFBFB" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Calendar View */}
        {showCalendar && (
          <View style={styles.calendarSection}>
            <CalendarView />
          </View>
        )}

        {/* Events List */}
        <Animated.View style={[styles.eventsList, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.sectionSubtitle}>
              {getUpcomingEvents().length} event{getUpcomingEvents().length !== 1 ? 's' : ''} scheduled
            </Text>
          </View>

          {showSkeleton ? (
            <>
              <SkeletonEventCard />
              <SkeletonEventCard />
              <SkeletonEventCard />
            </>
          ) : getUpcomingEvents().length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event" size={64} color="#F56E0F" />
              <Text style={styles.emptyStateTitle}>No upcoming events</Text>
              <Text style={styles.emptyStateText}>
                Create your first event to get started with event management.
              </Text>
            </View>
          ) : (
            getUpcomingEvents().map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </Animated.View>

      </View>

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
                <MaterialIcons name="close" size={24} color="#F56E0F" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({...newEvent, title: text})}
                  placeholder="e.g., Team Meeting, Workshop, Orientation"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent({...newEvent, description: text})}
                  placeholder="Describe the event details, agenda, or important information"
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
                    onChangeText={handleDateChange}
                    placeholder="2025-09-20"
                    keyboardType="default"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEvent.time}
                    onChangeText={handleTimeChange}
                    placeholder="14:30"
                    keyboardType="default"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEvent.location}
                  onChangeText={(text) => setNewEvent({...newEvent, location: text})}
                  placeholder="e.g., Conference Room A, Online Meeting, Main Campus"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type</Text>
                  <TouchableOpacity 
                    style={styles.typeSelector}
                    onPress={() => setShowTypeSelector(!showTypeSelector)}
                  >
                    <Text style={styles.typeText}>{newEvent.type}</Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#F56E0F" />
                  </TouchableOpacity>
                  {showTypeSelector && (
                    <View style={styles.typeDropdown}>
                      {['meeting', 'workshop', 'orientation', 'deadline', 'other'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.typeOption}
                          onPress={() => {
                            setNewEvent({...newEvent, type: type as Event['type']});
                            setShowTypeSelector(false);
                          }}
                        >
                          <Text style={styles.typeOptionText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
                <MaterialIcons name="close" size={24} color="#F56E0F" />
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
                    <Text style={styles.eventDetailsEventTitle}>{selectedEvent.title}</Text>
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
                    <Text style={styles.eventDetailsInfoValue}>{selectedEvent.createdBy}</Text>
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

            <View style={styles.eventDetailsActions}>
              <TouchableOpacity
                style={[styles.eventDetailsActionButton, styles.editActionButton]}
                onPress={() => {
                  setShowEventDetails(false);
                  Alert.alert('Edit Event', `Edit functionality for ${selectedEvent.title}`);
                }}
              >
                <MaterialIcons name="edit" size={20} color="#FBFBFB" />
                <Text style={styles.eventDetailsActionButtonText}>Edit Event</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.eventDetailsActionButton, styles.deleteActionButton]}
                onPress={() => {
                  setShowEventDetails(false);
                  handleDeleteEvent(selectedEvent);
                }}
              >
                <MaterialIcons name="delete" size={20} color="#FBFBFB" />
                <Text style={styles.eventDetailsActionButtonText}>Remove Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Dark background
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
    backgroundColor: '#151419', // Dark background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#151419', // Dark background
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
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
    borderColor: '#F56E0F', // Primary orange
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarButtonText: {
    color: '#F56E0F', // Primary orange
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F56E0F', // Primary orange
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  createButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  calendarSection: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    margin: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  calendarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    letterSpacing: -0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 700,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2E', // Dark input background
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    paddingVertical: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(245, 110, 15, 0.2)',
    letterSpacing: 0.5,
  },
  calendarDay: {
    width: '14.28%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: 'rgba(245, 110, 15, 0.1)',
    borderBottomColor: 'rgba(245, 110, 15, 0.1)',
    backgroundColor: '#2A2A2E', // Dark input background
    position: 'relative',
  },
  today: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 8,
    margin: 2,
  },
  selectedDay: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderColor: '#F56E0F',
    borderWidth: 2,
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: 15,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  todayText: {
    color: '#FBFBFB', // Light text
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#F56E0F', // Primary orange
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
    backgroundColor: '#F56E0F', // Primary orange
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  selectedDateEvents: {
    marginTop: 20,
    width: '100%',
    maxHeight: 180,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  selectedDateEventsList: {
    maxHeight: 150,
  },
  selectedDateEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    shadowColor: '#F56E0F',
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
  selectedDateEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 2,
  },
  selectedDateEventTime: {
    fontSize: 12,
    color: '#878787', // Muted gray
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
    color: '#151419', // Light text
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#878787', // Muted gray
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    overflow: 'hidden',
  },
  expandedEventCard: {
    elevation: 8,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cardTouchable: {
    padding: 24,
  },
  expandedContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandedActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
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
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  eventDate: {
    fontSize: 15,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
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
    color: '#FBFBFB', // Light text
    lineHeight: 20,
    marginBottom: 10,
    opacity: 0.9,
  },
  attendanceContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.9,
    fontWeight: '500',
    marginBottom: 8,
  },
  // Animated Progress Bar Styles
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold',
    marginLeft: 12,
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
    color: '#FBFBFB', // Light text
    marginLeft: 8,
    opacity: 0.9,
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
    backgroundColor: '#F56E0F', // Primary orange
  },
  editButton: {
    backgroundColor: '#878787', // Muted gray
  },
  deleteButton: {
    backgroundColor: '#ea4335', // Red for delete
  },
  actionButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#151419', // Dark background
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  // Skeleton Loading Styles
  skeletonEventCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    overflow: 'hidden',
    opacity: 0.7,
    padding: 24,
  },
  skeletonEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonEventTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    marginRight: 16,
  },
  skeletonEventInfo: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonEventDetails: {
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    letterSpacing: -0.3,
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
    maxHeight: 450,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  textInput: {
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    backgroundColor: '#2A2A2E', // Dark input background
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    backgroundColor: '#2A2A2E', // Dark input background
  },
  typeText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  typeDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2A2A2E', // Dark input background
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.1)',
  },
  typeOptionText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    textTransform: 'capitalize',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2A2A2E', // Dark input background
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#878787', // Muted gray
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F56E0F', // Primary orange
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Event Details Modal Styles
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#151419', // Dark background
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  eventDetailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
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
  eventDetailsEventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  eventDetailsEventDate: {
    fontSize: 17,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  eventDetailsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  eventDetailsDescription: {
    fontSize: 17,
    color: '#878787', // Muted gray
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
    color: '#878787', // Muted gray
    marginLeft: 8,
    minWidth: 80,
  },
  eventDetailsInfoValue: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    flex: 1,
    marginLeft: 8,
  },
  eventDetailsStatusContainer: {
    alignItems: 'flex-start',
  },
  eventDetailsActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  eventDetailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editActionButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  deleteActionButton: {
    backgroundColor: '#ea4335', // Red for delete
  },
  eventDetailsActionButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
});
