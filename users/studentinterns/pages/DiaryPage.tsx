import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  TextInput,
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

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface DiaryPageProps {
  currentUser: UserInfo;
  onClose: () => void;
}

export default function DiaryPage({ currentUser, onClose }: DiaryPageProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [filteredEvidences, setFilteredEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  // Initialize cardsPerRow based on current screen data, not module-level constant
  const [currentCardsPerRow, setCurrentCardsPerRow] = useState(() => {
    const { width } = Dimensions.get('window');
    return width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Animation for cards
  const cardAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

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
    fetchEvidences();
    
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
    filterEvidences();
  }, [searchQuery, evidences]);

  const fetchEvidences = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching evidences for student...');
      
      const response = await apiService.getEvidences(currentUser.id, {
        limit: 100
      });
      
      if (response.success && response.data) {
        console.log('✅ Evidences fetched successfully:', response.data.length);
        setEvidences(response.data || []);
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

  // Animate card expansion when expandedCard changes
  useEffect(() => {
    Object.keys(cardAnimations).forEach(evidenceId => {
      const isExpanded = expandedCard === evidenceId;
      Animated.spring(cardAnimations[evidenceId], {
        toValue: isExpanded ? 1 : 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    });
  }, [expandedCard]);

  const renderEvidenceCard = ({ item: evidence, index }: { item: Evidence; index: number }) => {
    const isExpanded = expandedCard === evidence.id;
    
    // Initialize animation for this card if not exists
    if (!cardAnimations[evidence.id]) {
      cardAnimations[evidence.id] = new Animated.Value(0);
    }
    
    const cardScale = cardAnimations[evidence.id].interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.02],
    });
    
    const cardElevation = cardAnimations[evidence.id].interpolate({
      inputRange: [0, 1],
      outputRange: [3, 8],
    });
    
    return (
      <Animated.View 
        style={[
          styles.evidenceCard,
          {
            transform: [{ scale: cardScale }],
            elevation: cardElevation,
            shadowOpacity: isExpanded ? 0.3 : 0.1,
          }
        ]}
      >
        {/* Card Header with Gradient Background */}
        <View style={[styles.evidenceCardHeader, { backgroundColor: getStatusColor(evidence.status) + '15' }]}>
          <View style={styles.evidenceHeader}>
            <View style={styles.evidenceTitleContainer}>
              <View style={styles.evidenceTitleRow}>
                <MaterialIcons 
                  name="assignment" 
                  size={18} 
                  color={getStatusColor(evidence.status)} 
                  style={styles.evidenceTitleIcon}
                />
                <Text style={styles.evidenceTitle} numberOfLines={isExpanded ? 0 : 2}>
                  {evidence.task_title}
                </Text>
              </View>
              <View style={styles.evidenceCompanyRow}>
                <MaterialIcons name="business" size={14} color="#666" />
                <Text style={styles.evidenceCompany}>
                  {evidence.companies?.company_name || 'Unknown Company'}
                </Text>
              </View>
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
        </View>

        {/* Card Body */}
        <View style={styles.evidenceCardBody}>
          <View style={styles.evidenceNotesContainer}>
            <MaterialIcons name="description" size={16} color="#666" style={styles.notesIcon} />
            <Text style={styles.evidenceNotes} numberOfLines={isExpanded ? 0 : 3}>
              {evidence.task_notes}
            </Text>
          </View>

          {evidence.image_url && (
            <TouchableOpacity 
              style={styles.evidenceImageContainer}
              onPress={() => handleImagePress(evidence.image_url!)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: evidence.image_url }} style={styles.evidenceImage} />
              <View style={styles.imageOverlay}>
                <View style={styles.imageOverlayContent}>
                  <View style={styles.imageOverlayIconContainer}>
                    <MaterialIcons name="zoom-in" size={28} color="#8B4513" />
                  </View>
                  <Text style={styles.imageOverlayText}>Tap to view full size</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {evidence.review_notes && (
            <View style={[styles.reviewNotesContainer, { borderLeftColor: getStatusColor(evidence.status) }]}>
              <View style={styles.reviewNotesHeader}>
                <MaterialIcons name="rate-review" size={16} color={getStatusColor(evidence.status)} />
                <Text style={styles.reviewNotesLabel}>Review Notes:</Text>
              </View>
              <Text style={styles.reviewNotes}>{evidence.review_notes}</Text>
              {evidence.reviewed_at && (
                <Text style={styles.reviewDate}>
                  Reviewed on {formatDate(evidence.reviewed_at)}
                </Text>
              )}
            </View>
          )}

          <View style={styles.evidenceFooter}>
            <View style={styles.evidenceDateContainer}>
              <View style={styles.dateIconContainer}>
                <MaterialIcons name="schedule" size={14} color="#F56E0F" />
              </View>
              <View style={styles.dateTextContainer}>
                <Text style={styles.evidenceDate}>
                  {formatDate(evidence.submitted_at)}
                </Text>
                <Text style={styles.evidenceTime}>
                  {formatTime(evidence.submitted_at)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpandedCard(isExpanded ? null : evidence.id)}
            >
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={20} 
                color="#8B4513" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };


  if (loading && evidences.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading diary...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        {/* Main Header Row with Title, Controls, and Search */}
        <View style={styles.headerMainRow}>
          {/* Left Side - Title */}
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>My Diary</Text>
            <Text style={styles.headerSubtitle}>
              View all your evidence submissions
            </Text>
          </View>

          {/* Right Side - Controls and Search */}
          <View style={styles.headerControlsSection}>
            {/* Search Icon */}
            <TouchableOpacity
              style={styles.headerSearchIcon}
              onPress={() => setShowSearchBar(!showSearchBar)}
            >
              <MaterialIcons 
                name={showSearchBar ? "close" : "search"} 
                size={24} 
                color="#F5DEB3" 
              />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.headerCloseButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color="#F5DEB3" />
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

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          {filteredEvidences.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <MaterialIcons name="book" size={80} color="#8B4513" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No evidences found' : 'Your Diary is Empty'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? `No evidences match your search for "${searchQuery}". Try different keywords.`
                  : "You haven't submitted any evidences yet. Start submitting your daily tasks to see them here."}
              </Text>
              {searchQuery && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.evidencesGrid}>
              {currentCardsPerRow > 1 ? (
                // Multi-column layout
                Array.from({ length: Math.ceil(filteredEvidences.length / currentCardsPerRow) }).map((_, rowIndex) => {
                  const startIndex = rowIndex * currentCardsPerRow;
                  const endIndex = Math.min(startIndex + currentCardsPerRow, filteredEvidences.length);
                  const rowItems = filteredEvidences.slice(startIndex, endIndex);
                  const isLastRow = endIndex === filteredEvidences.length;
                  const emptySlots = isLastRow && filteredEvidences.length % currentCardsPerRow !== 0 
                    ? currentCardsPerRow - (filteredEvidences.length % currentCardsPerRow) 
                    : 0;
                  
                  return (
                    <View key={rowIndex} style={styles.evidencesRow}>
                      {rowItems.map((evidence, colIndex) => (
                        <View key={evidence.id} style={styles.evidenceCardWrapper}>
                          {renderEvidenceCard({ item: evidence, index: startIndex + colIndex })}
                        </View>
                      ))}
                      {/* Fill empty slots in the last row for proper alignment */}
                      {Array.from({ length: emptySlots }).map((_, emptyIndex) => (
                        <View key={`empty-${emptyIndex}`} style={styles.evidenceCardWrapper} />
                      ))}
                    </View>
                  );
                })
              ) : (
                // Single column layout
                filteredEvidences.map((evidence, index) => (
                  <View key={evidence.id}>
                    {renderEvidenceCard({ item: evidence, index })}
                  </View>
                ))
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

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
                <MaterialIcons name="close" size={24} color="#F5DEB3" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (responsiveValues: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DCC6', // Vintage diary paper color
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8DCC6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#8B4513', // Brown leather-like binding
    padding: responsiveValues.isDesktop ? 24 : responsiveValues.isTablet ? 20 : 16,
    shadowColor: '#654321',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#654321',
    borderTopWidth: 2,
    borderTopColor: '#A0522D',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsiveValues.isDesktop ? 12 : 8,
    flexWrap: 'wrap',
  },
  headerTitleSection: {
    flex: 1,
    marginRight: responsiveValues.isDesktop ? 16 : 12,
  },
  headerControlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveValues.isDesktop ? 16 : 12,
  },
  headerTitle: {
    fontSize: responsiveValues.isDesktop ? 32 : responsiveValues.isTablet ? 26 : 22,
    fontWeight: 'bold',
    color: '#F5DEB3', // Wheat color for text on brown
    marginBottom: responsiveValues.isDesktop ? 6 : 4,
    fontFamily: 'System',
    textShadowColor: '#654321',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: responsiveValues.isDesktop ? 16 : responsiveValues.isTablet ? 14 : 12,
    color: '#DEB887', // Burlywood
    fontWeight: '600',
    letterSpacing: responsiveValues.isDesktop ? 1 : 0.5,
    fontStyle: 'italic',
  },
  headerSearchIcon: {
    padding: responsiveValues.isDesktop ? 10 : 8,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 69, 19, 0.3)',
    marginLeft: responsiveValues.isDesktop ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 222, 179, 0.3)',
  },
  headerCloseButton: {
    padding: responsiveValues.isDesktop ? 10 : 8,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 0, 0, 0.4)',
    marginLeft: responsiveValues.isDesktop ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(205, 92, 92, 0.5)',
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
  contentContainer: {
    padding: responsiveValues.isDesktop ? 30 : responsiveValues.isTablet ? 20 : 16,
    minHeight: 400,
    backgroundColor: '#F5F5DC', // Beige paper color
    margin: responsiveValues.isDesktop ? 20 : responsiveValues.isTablet ? 15 : 10,
    borderRadius: 8,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#D2B48C', // Tan border
  },
  evidencesGrid: {
    paddingBottom: 20,
  },
  evidencesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveValues.isDesktop ? 12 : responsiveValues.isTablet ? 10 : 8,
    gap: responsiveValues.isDesktop ? 8 : responsiveValues.isTablet ? 6 : 4,
  },
  evidenceCardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  evidenceCard: {
    backgroundColor: '#FFFEF7', // Cream paper
    borderRadius: 4,
    marginBottom: responsiveValues.isDesktop ? 20 : responsiveValues.isTablet ? 16 : 12,
    marginHorizontal: responsiveValues.isDesktop ? 4 : responsiveValues.isTablet ? 3 : 2,
    flex: 1,
    maxWidth: responsiveValues.isDesktop 
      ? (responsiveValues.width - 80) / 3 
      : responsiveValues.isTablet 
      ? (responsiveValues.width - 60) / 2 
      : responsiveValues.width - 32, // Better spacing on mobile
    shadowColor: '#8B7355',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D2B48C', // Tan border
    borderLeftWidth: responsiveValues.isDesktop ? 6 : 4,
    borderLeftColor: '#8B4513', // Brown left border like binding
    position: 'relative',
  },
  evidenceCardHeader: {
    padding: responsiveValues.isDesktop ? 16 : 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E8DCC6', // Lined paper effect
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  evidenceTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  evidenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  evidenceTitleIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  evidenceTitle: {
    fontSize: responsiveValues.isDesktop ? 18 : 16,
    fontWeight: 'bold',
    color: '#5C4033', // Dark brown like ink
    flex: 1,
    lineHeight: responsiveValues.isDesktop ? 24 : 22,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  evidenceCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  evidenceCompany: {
    fontSize: responsiveValues.isDesktop ? 13 : 11,
    color: '#8B7355', // Brownish gray
    fontWeight: '500',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  evidenceCardBody: {
    padding: responsiveValues.isDesktop ? 16 : 12,
    backgroundColor: '#FFFEF7',
    position: 'relative',
  },
  evidenceNotesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  notesIcon: {
    marginRight: 8,
    marginTop: 2,
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
    fontSize: responsiveValues.isDesktop ? 15 : 13,
    color: '#5C4033', // Dark brown ink
    lineHeight: responsiveValues.isDesktop ? 24 : 22,
    flex: 1,
    fontStyle: 'normal',
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  imageOverlayContent: {
    alignItems: 'center',
  },
  imageOverlayIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 222, 179, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  reviewNotesContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  reviewNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewNotesLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 6,
  },
  reviewNotes: {
    fontSize: 14,
    color: '#1a1a2e',
    lineHeight: 20,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  evidenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  evidenceDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8DCC6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D2B48C',
  },
  dateTextContainer: {
    flex: 1,
  },
  evidenceDate: {
    fontSize: 12,
    color: '#8B4513', // Brown
    fontWeight: '600',
    fontStyle: 'italic',
  },
  evidenceTime: {
    fontSize: 11,
    color: '#A0522D', // Sienna
    marginTop: 2,
    fontStyle: 'italic',
  },
  expandButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E8DCC6',
    borderWidth: 1,
    borderColor: '#D2B48C',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsiveValues.isDesktop ? 60 : responsiveValues.isTablet ? 40 : 30,
    backgroundColor: '#FFFEF7',
    borderRadius: 8,
    margin: responsiveValues.isDesktop ? 20 : responsiveValues.isTablet ? 15 : 10,
    borderWidth: 2,
    borderColor: '#D2B48C',
  },
  emptyStateIconContainer: {
    width: responsiveValues.isDesktop ? 120 : responsiveValues.isTablet ? 100 : 80,
    height: responsiveValues.isDesktop ? 120 : responsiveValues.isTablet ? 100 : 80,
    borderRadius: responsiveValues.isDesktop ? 60 : responsiveValues.isTablet ? 50 : 40,
    backgroundColor: '#E8DCC6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveValues.isDesktop ? 24 : 16,
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  emptyStateTitle: {
    fontSize: responsiveValues.isDesktop ? 24 : responsiveValues.isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#5C4033',
    marginBottom: responsiveValues.isDesktop ? 12 : 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyStateText: {
    fontSize: responsiveValues.isDesktop ? 16 : responsiveValues.isTablet ? 14 : 13,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: responsiveValues.isDesktop ? 24 : responsiveValues.isTablet ? 22 : 20,
    marginBottom: responsiveValues.isDesktop ? 24 : 16,
    fontStyle: 'italic',
    paddingHorizontal: responsiveValues.isDesktop ? 0 : 10,
  },
  clearSearchButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#654321',
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
    width: responsiveValues.isDesktop ? '95%' : responsiveValues.isTablet ? '90%' : '100%',
    height: responsiveValues.isDesktop ? '85%' : responsiveValues.isTablet ? '80%' : '90%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: responsiveValues.isDesktop ? 50 : responsiveValues.isTablet ? 40 : 20,
    right: responsiveValues.isDesktop ? 30 : responsiveValues.isTablet ? 20 : 15,
    backgroundColor: 'rgba(234, 67, 53, 0.9)',
    borderRadius: 25,
    width: responsiveValues.isDesktop ? 48 : 40,
    height: responsiveValues.isDesktop ? 48 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

