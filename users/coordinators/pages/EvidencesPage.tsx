import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

const { width } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = width >= 768;
const isDesktop = width >= 1024;
const cardsPerRow = isDesktop ? 3 : isTablet ? 2 : 1;

interface Evidence {
  id: string;
  user_id: string;
  company_id: string;
  task_title: string;
  task_notes: string;
  image_url?: string;
  image_public_id?: string;
  submitted_at: string;
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  companies?: {
    id: string;
    company_name: string;
    industry: string;
  };
}

interface Intern {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  id_number: string;
  school_year: string;
  status: string;
  // Computed properties
  student_name?: string;
  student_email?: string;
}

interface EvidencesPageProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
}

export default function EvidencesPage({ currentUser }: EvidencesPageProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [filteredEvidences, setFilteredEvidences] = useState<Evidence[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [currentCardsPerRow, setCurrentCardsPerRow] = useState(cardsPerRow);

  // Calculate responsive values based on current screen data
  const getResponsiveValues = () => {
    const { width } = screenData;
    const isTablet = width >= 768;
    const isDesktop = width >= 1024;
    const cardsPerRow = isDesktop ? 3 : isTablet ? 2 : 1;
    
    return {
      width,
      isTablet,
      isDesktop,
      cardsPerRow
    };
  };

  const responsiveValues = getResponsiveValues();
  const styles = createStyles(responsiveValues);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchInterns();
    
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
    ]).start();
  }, []);

  // Update cards per row when screen size changes
  useEffect(() => {
    setCurrentCardsPerRow(responsiveValues.cardsPerRow);
  }, [responsiveValues.cardsPerRow]);

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (selectedIntern) {
      fetchInternEvidences(selectedIntern.user_id);
    }
  }, [selectedIntern, selectedDate]);

  useEffect(() => {
    filterEvidences();
  }, [searchQuery, evidences]);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching interns for coordinator...');
      
      const response = await apiService.getCoordinatorInterns(currentUser.id);
      
      if (response.success && response.interns) {
        console.log('✅ Interns fetched successfully:', response.interns.length);
        
        // Map the backend data to our expected format
        const mappedInterns = response.interns.map((intern: any) => ({
          ...intern,
          student_name: `${intern.first_name} ${intern.last_name}`,
          student_email: intern.email,
        }));
        
        console.log('📋 Mapped interns:', mappedInterns);
        setInterns(mappedInterns);
        
        // Select first intern by default
        if (mappedInterns.length > 0) {
          setSelectedIntern(mappedInterns[0]);
        }
      } else {
        console.log('❌ Failed to fetch interns:', response.message);
        setInterns([]);
      }
    } catch (error) {
      console.error('❌ Error fetching interns:', error);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInternEvidences = async (internId: string, skipDateFilter: boolean = false) => {
    if (!internId) {
      console.log('⚠️ No intern ID provided');
      setEvidences([]);
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Fetching evidences for intern:', internId);
      console.log('📅 Selected date:', selectedDate);
      console.log('📅 Month:', selectedDate.getMonth() + 1, 'Year:', selectedDate.getFullYear());
      
      // Build filters - optionally skip date filter to show all evidences
      const filters: any = { limit: 100 };
      if (!skipDateFilter) {
        filters.month = selectedDate.getMonth() + 1;
        filters.year = selectedDate.getFullYear();
      }
      
      const response = await apiService.getInternEvidences(internId, currentUser.id, filters);
      
      console.log('📋 API Response:', response);
      
      if (response.success) {
        const evidencesData = response.data || [];
        console.log('✅ Evidences fetched successfully:', evidencesData.length);
        setEvidences(evidencesData);
        
        if (evidencesData.length === 0) {
          console.log('ℹ️ No evidences found for the selected month/year');
          // If no evidences found for selected month, try fetching all evidences
          if (!skipDateFilter) {
            console.log('🔄 Trying to fetch all evidences...');
            return fetchInternEvidences(internId, true);
          }
        }
      } else {
        console.log('❌ Failed to fetch evidences:', response.message);
        setEvidences([]);
      }
    } catch (error) {
      console.error('❌ Error fetching evidences:', error);
      setEvidences([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEvidences = () => {
    let filtered = evidences;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(evidence =>
        evidence.task_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evidence.task_notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evidence.companies?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvidences(filtered);
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleReviewEvidence = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setReviewNotes(evidence.review_notes || '');
    setReviewStatus(evidence.status === 'rejected' ? 'rejected' : 'approved');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedEvidence) return;

    setIsSubmittingReview(true);
    
    try {
      console.log('📝 Submitting evidence review...');
      
      const response = await apiService.updateEvidenceStatus(selectedEvidence.id, {
        status: reviewStatus,
        reviewNotes: reviewNotes,
        reviewedBy: currentUser.id
      }, currentUser.id);
      
      if (response.success) {
        console.log('✅ Evidence review submitted successfully');
        
        // Update local state
        setEvidences(prev => prev.map(evidence => 
          evidence.id === selectedEvidence.id 
            ? { 
                ...evidence, 
                status: reviewStatus, 
                review_notes: reviewNotes,
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
              }
            : evidence
        ));
        
        setShowReviewModal(false);
        setSelectedEvidence(null);
        setReviewNotes('');
        
        Alert.alert('Success', 'Evidence review submitted successfully!');
      } else {
        console.error('❌ Failed to submit review:', response.message);
        Alert.alert('Error', response.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#F4D03F';
      case 'reviewed': return '#1E3A5F';
      case 'approved': return '#2D5A3D';
      case 'rejected': return '#E8A598';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'reviewed': return 'Reviewed';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return 'schedule';
      case 'reviewed': return 'visibility';
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      default: return 'help';
    }
  };

  const renderEvidenceCard = ({ item: evidence }: { item: Evidence }) => {
    // Find the intern who submitted this evidence
    const intern = interns.find(i => i.user_id === evidence.user_id);
    
    return (
      <View style={styles.evidenceCard}>
        {/* Intern Information */}
        <View style={styles.evidenceInternInfo}>
          <View style={styles.internAvatar}>
            {intern && intern.profile_picture ? (
              <Image 
                source={{ uri: intern.profile_picture }} 
                style={styles.internAvatarImage}
                defaultSource={require('../../../assets/icon.png')}
              />
            ) : (
              <Text style={styles.internAvatarText}>
                {intern && intern.student_name ? intern.student_name.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.internDetails}>
            <Text style={styles.internName} numberOfLines={1}>
              {intern && intern.student_name ? intern.student_name : 'Unknown Intern'}
            </Text>
            <Text style={styles.internEmail} numberOfLines={1}>
              {intern && intern.student_email ? intern.student_email : 'No email'}
            </Text>
            <Text style={styles.internId} numberOfLines={1}>
              ID: {intern && intern.id_number ? intern.id_number : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.evidenceHeader}>
          <View style={styles.evidenceTitleContainer}>
            <Text style={styles.evidenceTitle} numberOfLines={2}>
              {evidence.task_title}
            </Text>
            <Text style={styles.evidenceCompany}>
              {evidence.companies?.company_name || 'Unknown Company'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(evidence.status) }]}>
            <MaterialIcons 
              name={getStatusIcon(evidence.status) as any} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.statusText}>{getStatusText(evidence.status)}</Text>
          </View>
        </View>

      <Text style={styles.evidenceNotes} numberOfLines={2}>
        {evidence.task_notes}
      </Text>

      {evidence.image_url && (
        <TouchableOpacity 
          style={styles.evidenceImageContainer}
          onPress={() => handleImagePress(evidence.image_url!)}
        >
          <Image source={{ uri: evidence.image_url }} style={styles.evidenceImage} />
          <View style={styles.imageOverlay}>
            <MaterialIcons name="zoom-in" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.evidenceFooter}>
        <View style={styles.evidenceDateContainer}>
          <MaterialIcons name="schedule" size={12} color="#666" />
          <Text style={styles.evidenceDate}>
            {formatDate(evidence.submitted_at)}
          </Text>
        </View>
        
        {evidence.status === 'submitted' && (
          <TouchableOpacity 
            style={styles.reviewButton}
            onPress={() => handleReviewEvidence(evidence)}
          >
            <MaterialIcons name="rate-review" size={14} color="#fff" />
            <Text style={styles.reviewButtonText}>Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  const renderCalendarView = () => {
    // Group evidences by date
    const evidencesByDate = filteredEvidences.reduce((acc, evidence) => {
      const date = new Date(evidence.submitted_at).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(evidence);
      return acc;
    }, {} as { [key: string]: Evidence[] });

    const calendarDays: (null | { day: number; date: Date; evidences: Evidence[] })[] = [];
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = date.toDateString();
      const dayEvidences = evidencesByDate[dateString] || [];
      
      calendarDays.push({
        day,
        date,
        evidences: dayEvidences
      });
    }

    // Don't add extra days - let the last week be incomplete if needed

    return (
      <View style={styles.calendarContainer}>
         <View style={styles.calendarHeader}>
           <TouchableOpacity 
             style={styles.calendarNavButton}
             onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
           >
             <MaterialIcons name="chevron-left" size={responsiveValues.isDesktop ? 24 : 20} color="#1E3A5F" />
           </TouchableOpacity>
           
           <Text style={styles.calendarTitle}>
             {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
           </Text>
           
           <TouchableOpacity 
             style={styles.calendarNavButton}
             onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
           >
             <MaterialIcons name="chevron-right" size={responsiveValues.isDesktop ? 24 : 20} color="#1E3A5F" />
           </TouchableOpacity>
         </View>

        <View style={styles.calendarGrid}>
          {/* Day headers */}
          <View style={styles.calendarRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.calendarDayHeader}>
                <Text style={styles.calendarDayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar days in rows */}
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
            <View key={weekIndex} style={styles.calendarRow}>
              {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayData, dayIndex) => (
                <View key={dayIndex} style={styles.calendarDay}>
                   {dayData ? (
                     <TouchableOpacity 
                       style={[
                         styles.calendarDayButton,
                         dayData.evidences.length > 0 && styles.calendarDayWithEvidence
                       ]}
                       onPress={() => {
                         if (dayData.evidences.length > 0) {
                           // Filter evidences for this specific day
                           const dayEvidences = evidencesByDate[dayData.date.toDateString()] || [];
                           setFilteredEvidences(dayEvidences);
                           setViewMode('list');
                         }
                       }}
                       activeOpacity={dayData.evidences.length > 0 ? 0.7 : 1}
                     >
                       <Text style={[
                         styles.calendarDayText,
                         dayData.evidences.length > 0 && styles.calendarDayTextWithEvidence
                       ]}>
                         {dayData.day || '?'}
                       </Text>
                       
                       {dayData.evidences.length > 0 && (
                         <>
                           <View style={styles.calendarEvidenceIndicator}>
                             <Text style={styles.calendarEvidenceCount}>{dayData.evidences.length}</Text>
                           </View>
                           <View style={styles.calendarInternIndicator}>
                             <Text style={styles.calendarInternText}>
                               {(() => {
                                 const intern = interns.find(i => i.user_id === dayData.evidences[0]?.user_id);
                                 return intern && intern.student_name ? intern.student_name.charAt(0) : '?';
                               })()}
                             </Text>
                           </View>
                         </>
                       )}
                     </TouchableOpacity>
                   ) : (
                     <View style={styles.calendarEmptyDay} />
                   )}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.calendarLegend}>
          <View style={styles.calendarLegendItem}>
            <View style={[styles.calendarLegendDot, styles.calendarLegendDotWithEvidence]} />
            <Text style={styles.calendarLegendText}>Has evidence submissions</Text>
          </View>
          <View style={styles.calendarLegendItem}>
            <View style={styles.calendarLegendBadge}>
              <Text style={styles.calendarLegendBadgeText}>#</Text>
            </View>
            <Text style={styles.calendarLegendText}>Number of submissions</Text>
          </View>
          <View style={styles.calendarLegendItem}>
            <View style={[styles.calendarLegendBadge, styles.calendarLegendInternBadge]}>
              <Text style={styles.calendarLegendBadgeText}>A</Text>
            </View>
            <Text style={styles.calendarLegendText}>Intern initial</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && evidences.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading evidences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
          <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
           {/* Main Header Row with Title, Controls, and Search */}
           <View style={styles.headerMainRow}>
             {/* Left Side - Title */}
             <View style={styles.headerTitleSection}>
               <Text style={styles.headerTitle}>Evidence Submissions</Text>
               <Text style={styles.headerSubtitle}>
                 Manage daily task submissions from your interns
               </Text>
             </View>

             {/* Right Side - Controls and Search */}
             <View style={styles.headerControlsSection}>
               {/* View Mode Toggle */}
               <View style={styles.headerViewModeInline}>
                 <TouchableOpacity
                   style={[styles.headerViewModeButton, viewMode === 'list' && styles.headerViewModeButtonActive]}
                   onPress={() => setViewMode('list')}
                 >
                   <MaterialIcons name="list" size={20} color={viewMode === 'list' ? '#1a1a2e' : '#fff'} />
                   <Text style={[styles.headerViewModeText, viewMode === 'list' && styles.headerViewModeTextActive]}>
                     List
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.headerViewModeButton, viewMode === 'calendar' && styles.headerViewModeButtonActive]}
                   onPress={() => setViewMode('calendar')}
                 >
                   <MaterialIcons name="calendar-today" size={20} color={viewMode === 'calendar' ? '#1a1a2e' : '#fff'} />
                   <Text style={[styles.headerViewModeText, viewMode === 'calendar' && styles.headerViewModeTextActive]}>
                     Calendar
                   </Text>
                 </TouchableOpacity>
               </View>

               {/* Search Icon */}
               <TouchableOpacity
                 style={styles.headerSearchIcon}
                 onPress={() => setShowSearchBar(!showSearchBar)}
               >
                 <MaterialIcons 
                   name={showSearchBar ? "close" : "search"} 
                   size={24} 
                   color="#fff" 
                 />
               </TouchableOpacity>
             </View>
           </View>

        {/* Search Bar - Toggleable */}
        {showSearchBar && (
          <Animated.View style={styles.headerSearchContainer}>
            <View style={styles.headerSearchInputContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.headerSearchInput}
                placeholder="Search evidences..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Intern Selection */}
        <View style={styles.internSelector}>
          <Text style={styles.selectorLabel}>Select Intern:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {interns.map((intern) => (
              <TouchableOpacity
                key={intern.id}
                style={[
                  styles.internChip,
                  selectedIntern?.id === intern.id && styles.selectedInternChip
                ]}
                onPress={() => setSelectedIntern(intern)}
              >
                <Text style={[
                  styles.internChipText,
                  selectedIntern?.id === intern.id && styles.selectedInternChipText
                ]}>
                  {intern.student_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selected Intern Info */}
        {selectedIntern && selectedIntern.student_name && (
          <View style={styles.selectedInternInfo}>
            <View style={styles.selectedInternAvatar}>
              {selectedIntern.profile_picture ? (
                <Image 
                  source={{ uri: selectedIntern.profile_picture }} 
                  style={styles.selectedInternAvatarImage}
                  defaultSource={require('../../../assets/icon.png')}
                />
              ) : (
                <Text style={styles.selectedInternAvatarText}>
                  {selectedIntern.student_name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.selectedInternDetails}>
              <Text style={styles.selectedInternName}>{selectedIntern.student_name || 'Unknown'}</Text>
              <Text style={styles.selectedInternEmail}>{selectedIntern.student_email || 'No email'}</Text>
              <Text style={styles.selectedInternId}>ID: {selectedIntern.id_number || 'N/A'}</Text>
              <Text style={styles.selectedInternStatus}>Status: {selectedIntern.status || 'Unknown'}</Text>
            </View>
            <View style={styles.selectedInternStats}>
              <Text style={styles.selectedInternStatsText}>
                {filteredEvidences.length} evidence{filteredEvidences.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {viewMode === 'list' ? (
          filteredEvidences.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No evidences found</Text>
              <Text style={styles.emptyStateText}>
                {selectedIntern && selectedIntern.student_name
                  ? `${selectedIntern.student_name} hasn't submitted any evidences yet.`
                  : 'Select an intern to view their evidence submissions.'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              key={`evidences-${currentCardsPerRow}`}
              data={filteredEvidences}
              renderItem={renderEvidenceCard}
              keyExtractor={(item) => item.id}
              numColumns={currentCardsPerRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.evidencesGrid}
              columnWrapperStyle={currentCardsPerRow > 1 ? styles.evidencesRow : undefined}
            />
          )
        ) : (
          renderCalendarView()
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity 
            style={styles.imageModalCloseArea}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.imageModalContent}>
              <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
              <TouchableOpacity 
                style={styles.imageModalCloseButton}
                onPress={() => setShowImageModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Review Evidence</Text>
              <TouchableOpacity
                style={styles.reviewModalCloseButton}
                onPress={() => setShowReviewModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviewModalBody}>
              {selectedEvidence && (
                <>
                  <Text style={styles.reviewEvidenceTitle}>{selectedEvidence.task_title}</Text>
                  <Text style={styles.reviewEvidenceNotes}>{selectedEvidence.task_notes}</Text>
                  
                  <View style={styles.reviewStatusContainer}>
                    <Text style={styles.reviewStatusLabel}>Status:</Text>
                    <View style={styles.reviewStatusButtons}>
                      <TouchableOpacity
                        style={[
                          styles.reviewStatusButton,
                          reviewStatus === 'approved' && styles.approvedButton
                        ]}
                        onPress={() => setReviewStatus('approved')}
                      >
                        <MaterialIcons 
                          name="check-circle" 
                          size={20} 
                          color={reviewStatus === 'approved' ? '#fff' : '#2D5A3D'} 
                        />
                        <Text style={[
                          styles.reviewStatusButtonText,
                          reviewStatus === 'approved' && styles.approvedButtonText
                        ]}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.reviewStatusButton,
                          reviewStatus === 'rejected' && styles.rejectedButton
                        ]}
                        onPress={() => setReviewStatus('rejected')}
                      >
                        <MaterialIcons 
                          name="cancel" 
                          size={20} 
                          color={reviewStatus === 'rejected' ? '#fff' : '#E8A598'} 
                        />
                        <Text style={[
                          styles.reviewStatusButtonText,
                          reviewStatus === 'rejected' && styles.rejectedButtonText
                        ]}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.reviewNotesInputContainer}>
                    <Text style={styles.reviewNotesInputLabel}>Review Notes:</Text>
                    <TextInput
                      style={styles.reviewNotesInput}
                      placeholder="Add your review notes..."
                      value={reviewNotes}
                      onChangeText={setReviewNotes}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={styles.reviewCancelButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.reviewCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewSubmitButton, isSubmittingReview && styles.reviewSubmitButtonDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#fff" />
                    <Text style={styles.reviewSubmitButtonText}>Submit Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
         </View>
       </Modal>
     </Animated.View>
   </ScrollView>
 );
}

const createStyles = (responsiveValues: any) => StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  container: {
    flex: 1,
    backgroundColor: '#2A2A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2A2A2E',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  headerControlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerFiltersInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerViewModeInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 200,
  },
  headerTitle: {
    fontSize: responsiveValues.isDesktop ? 28 : 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: responsiveValues.isDesktop ? 16 : 14,
    color: '#F56E0F',
    fontWeight: '500',
  },
  headerFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: responsiveValues.isDesktop ? 300 : 200,
  },
  headerFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  headerFilterScroll: {
    flex: 1,
    marginLeft: 8,
  },
  headerFilterScrollInline: {
    maxWidth: 180,
    marginLeft: 8,
  },
  headerFilterChip: {
    paddingHorizontal: responsiveValues.isDesktop ? 12 : 5,
    paddingVertical: responsiveValues.isDesktop ? 6 : 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: responsiveValues.isDesktop ? 8 : 3,
  },
  headerFilterChipSelected: {
    backgroundColor: '#F56E0F',
  },
  headerFilterChipText: {
    fontSize: responsiveValues.isDesktop ? 12 : 8,
    color: '#fff',
    fontWeight: '500',
  },
  headerFilterChipTextSelected: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  headerViewMode: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: responsiveValues.isDesktop ? 4 : 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerViewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveValues.isDesktop ? 8 : 5,
    paddingHorizontal: responsiveValues.isDesktop ? 12 : 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: responsiveValues.isDesktop ? 80 : 60,
  },
  headerViewModeButtonActive: {
    backgroundColor: '#F56E0F',
  },
  headerViewModeText: {
    fontSize: responsiveValues.isDesktop ? 14 : 11,
    color: '#fff',
    fontWeight: '500',
    marginLeft: responsiveValues.isDesktop ? 6 : 3,
  },
  headerViewModeTextActive: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  headerSearchIcon: {
    padding: responsiveValues.isDesktop ? 8 : 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: responsiveValues.isDesktop ? 12 : 8,
  },
  headerSearchContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  headerSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 10,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  internSelector: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  internChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  selectedInternChip: {
    backgroundColor: '#878787',
  },
  internChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedInternChipText: {
    color: '#151419',
  },
  selectedInternInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: responsiveValues.isDesktop ? 8 : 6,
    borderRadius: 6,
    marginTop: responsiveValues.isDesktop ? 8 : 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1E3A5F',
  },
  selectedInternAvatar: {
    width: responsiveValues.isDesktop ? 32 : 28,
    height: responsiveValues.isDesktop ? 32 : 28,
    borderRadius: responsiveValues.isDesktop ? 16 : 14,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveValues.isDesktop ? 8 : 6,
  },
  selectedInternAvatarText: {
    color: '#fff',
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    fontWeight: 'bold',
  },
  selectedInternAvatarImage: {
    width: responsiveValues.isDesktop ? 32 : 28,
    height: responsiveValues.isDesktop ? 32 : 28,
    borderRadius: responsiveValues.isDesktop ? 16 : 14,
  },
  selectedInternDetails: {
    flex: 1,
  },
  selectedInternName: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 1,
  },
  selectedInternEmail: {
    fontSize: responsiveValues.isDesktop ? 11 : 9,
    color: '#666',
    marginBottom: 1,
  },
  selectedInternId: {
    fontSize: responsiveValues.isDesktop ? 10 : 8,
    color: '#999',
    marginBottom: 1,
    fontWeight: '500',
  },
  selectedInternStatus: {
    fontSize: responsiveValues.isDesktop ? 10 : 8,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  selectedInternStats: {
    alignItems: 'center',
  },
  selectedInternStatsText: {
    fontSize: responsiveValues.isDesktop ? 12 : 10,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  contentContainer: {
    padding: 20,
    minHeight: 400,
  },
  evidencesList: {
    paddingBottom: 20,
  },
  evidencesGrid: {
    paddingBottom: 20,
  },
  evidencesRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  evidenceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: responsiveValues.isDesktop ? 16 : 12,
    marginBottom: 0,
    marginHorizontal: responsiveValues.isDesktop ? 4 : 2,
    flex: 1,
    maxWidth: responsiveValues.isDesktop ? (responsiveValues.width - 80) / 3 : responsiveValues.isTablet ? (responsiveValues.width - 60) / 2 : responsiveValues.width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  evidenceInternInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  internAvatar: {
    width: responsiveValues.isDesktop ? 40 : 32,
    height: responsiveValues.isDesktop ? 40 : 32,
    borderRadius: responsiveValues.isDesktop ? 20 : 16,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  internAvatarText: {
    color: '#fff',
    fontSize: responsiveValues.isDesktop ? 16 : 14,
    fontWeight: 'bold',
  },
  internAvatarImage: {
    width: responsiveValues.isDesktop ? 40 : 32,
    height: responsiveValues.isDesktop ? 40 : 32,
    borderRadius: responsiveValues.isDesktop ? 20 : 16,
  },
  internDetails: {
    flex: 1,
  },
  internName: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  internEmail: {
    fontSize: responsiveValues.isDesktop ? 12 : 10,
    color: '#666',
  },
  internId: {
    fontSize: responsiveValues.isDesktop ? 11 : 9,
    color: '#999',
    fontWeight: '500',
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  evidenceTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  evidenceTitle: {
    fontSize: responsiveValues.isDesktop ? 16 : 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  evidenceCompany: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  evidenceNotes: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    color: '#666',
    lineHeight: responsiveValues.isDesktop ? 20 : 16,
    marginBottom: 8,
  },
  evidenceImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  evidenceImage: {
    width: '100%',
    height: responsiveValues.isDesktop ? 160 : responsiveValues.isTablet ? 140 : 120,
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  evidenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evidenceDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  evidenceDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewNotesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reviewNotesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  reviewNotes: {
    fontSize: 14,
    color: '#1a1a2e',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
    lineHeight: 24,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: responsiveValues.isDesktop ? 20 : 16,
    padding: responsiveValues.isDesktop ? 24 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    height: responsiveValues.isDesktop ? 700 : 550,

  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveValues.isDesktop ? 24 : 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  calendarNavButton: {
    padding: responsiveValues.isDesktop ? 12 : 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: responsiveValues.isDesktop ? 24 : 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  calendarGrid: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 400,
    flexDirection: 'column',
  },
  calendarRow: {
    flexDirection: 'row',
    height: responsiveValues.isDesktop ? 80 : 70,
    justifyContent: 'flex-start',
  },
  calendarDayHeader: {
    width: '14.28%', // 100% / 7 days = 14.28% per day
    paddingVertical: responsiveValues.isDesktop ? 16 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  calendarDayHeaderText: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days = 14.28% per day
    height: responsiveValues.isDesktop ? 80 : 70,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    position: 'relative',
  },
  calendarDayButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 4,
    backgroundColor: '#fff',
    position: 'relative',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarDayWithEvidence: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1E3A5F',
    borderWidth: 2,
    borderRadius: 6,
  },
  calendarDayText: {
    fontSize: responsiveValues.isDesktop ? 20 : 18,
    color: '#1a1a2e',
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  calendarDayTextWithEvidence: {
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
  calendarEvidenceIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 3,
  },
  calendarEvidenceCount: {
    color: '#fff',
    fontSize: responsiveValues.isDesktop ? 12 : 10,
    fontWeight: 'bold',
  },
  calendarInternIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: '#F56E0F',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 3,
  },
  calendarInternText: {
    color: '#1a1a2e',
    fontSize: responsiveValues.isDesktop ? 10 : 9,
    fontWeight: 'bold',
  },
  calendarEmptyDay: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  calendarLegend: {
    marginTop: responsiveValues.isDesktop ? 24 : 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    flexDirection: responsiveValues.isDesktop ? 'row' : 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveValues.isDesktop ? 0 : 8,
  },
  calendarLegendDot: {
    width: responsiveValues.isDesktop ? 16 : 14,
    height: responsiveValues.isDesktop ? 16 : 14,
    borderRadius: responsiveValues.isDesktop ? 8 : 7,
    marginRight: 8,
  },
  calendarLegendDotWithEvidence: {
    backgroundColor: '#1E3A5F',
  },
  calendarLegendText: {
    fontSize: responsiveValues.isDesktop ? 14 : 12,
    color: '#666',
    fontWeight: '500',
  },
  calendarLegendBadge: {
    width: responsiveValues.isDesktop ? 24 : 20,
    height: responsiveValues.isDesktop ? 24 : 20,
    borderRadius: responsiveValues.isDesktop ? 12 : 10,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  calendarLegendBadgeText: {
    color: '#fff',
    fontSize: responsiveValues.isDesktop ? 12 : 10,
    fontWeight: 'bold',
  },
  calendarLegendInternBadge: {
    backgroundColor: '#F56E0F',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    position: 'relative',
    width: '90%',
    height: '80%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reviewModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  reviewModalCloseButton: {
    padding: 4,
  },
  reviewModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  reviewEvidenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  reviewEvidenceNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  reviewStatusContainer: {
    marginBottom: 20,
  },
  reviewStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  reviewStatusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewStatusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  approvedButton: {
    backgroundColor: '#2D5A3D',
    borderColor: '#2D5A3D',
  },
  rejectedButton: {
    backgroundColor: '#E8A598',
    borderColor: '#E8A598',
  },
  reviewStatusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  approvedButtonText: {
    color: '#fff',
  },
  rejectedButtonText: {
    color: '#fff',
  },
  reviewNotesInputContainer: {
    marginBottom: 20,
  },
  reviewNotesInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  reviewNotesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a2e',
    backgroundColor: '#f8f9fa',
    minHeight: 100,
  },
  reviewModalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  reviewCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  reviewCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  reviewSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E3A5F',
  },
  reviewSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reviewSubmitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
});

