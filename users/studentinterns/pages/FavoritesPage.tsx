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
  Alert,
  Modal,
  Animated,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import ResumeUploadModal from '../../../components/ResumeUploadModal';

const { width } = Dimensions.get('window');

interface FavoriteCompany {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  rating: number;
  addedDate: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface FavoritesPageProps {
  currentUser: UserInfo;
}

export default function FavoritesPage({ currentUser }: FavoritesPageProps) {
  const [favoriteCompanies, setFavoriteCompanies] = useState<FavoriteCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<FavoriteCompany | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedCompanyForApplication, setSelectedCompanyForApplication] = useState<FavoriteCompany | null>(null);
  const [animatingHearts, setAnimatingHearts] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentUser) {
      fetchFavoriteCompanies();
      
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
    }
  }, [currentUser]);

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

  const fetchFavoriteCompanies = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      if (!currentUser) {
        setFavoriteCompanies([]);
        return;
      }

      // Get the student ID from the current user
      const studentResponse = await apiService.getProfile(currentUser.id);
      if (!studentResponse.success || !studentResponse.user) {
        console.error('Failed to get student information');
        setFavoriteCompanies([]);
        return;
      }

      const studentId = studentResponse.user.student_id || studentResponse.user.id;

      // Fetch favorites from API
      const response = await apiService.getStudentFavorites(studentId);
      
      if (response.success && response.favorites) {
        // Transform the API response to match our interface
        const transformedFavorites: FavoriteCompany[] = response.favorites.map((favorite: any) => ({
          id: favorite.company_id.toString(),
          name: favorite.name,
          profilePicture: favorite.profile_picture,
          industry: favorite.industry,
          location: favorite.location,
          moaStatus: favorite.moa_status,
          moaExpiryDate: favorite.moa_expiry_date,
          availableSlots: favorite.available_slots || 0,
          totalSlots: favorite.total_slots || 0,
          description: favorite.description || '',
          website: favorite.website || '',
          rating: favorite.rating || 0,
          addedDate: new Date(favorite.favorited_at).toISOString().split('T')[0],
        }));
        
        setFavoriteCompanies(transformedFavorites);
      } else {
        setFavoriteCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching favorite companies:', error);
      setFavoriteCompanies([]);
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleViewDetails = (company: FavoriteCompany) => {
    setSelectedCompany(company);
  };

  const handleRemoveFavorite = (companyId: string) => {
    console.log('🔥🔥🔥 UNFAVORITE BUTTON CLICKED 🔥🔥🔥');
    console.log('🔥 Company ID:', companyId);
    console.log('🔥 Current user:', currentUser);
    console.log('🔥 Current favorites count:', favoriteCompanies.length);
    
    console.log('🔥 Showing custom confirmation modal...');
    setCompanyToRemove(companyId);
    setShowConfirmModal(true);
  };

  const confirmRemoveFavorite = async () => {
    if (!companyToRemove) return;
    
    const companyId = companyToRemove;
    console.log('🔥🔥🔥 USER CONFIRMED REMOVAL 🔥🔥🔥');
    console.log('🔥 Confirmed removal for company:', companyId);
    
    setShowConfirmModal(false);
    setCompanyToRemove(null);
    
    try {
      console.log('🔥 Starting removal process...');
      
      if (!currentUser) {
        console.log('❌ No current user found');
        Alert.alert('Error', 'User not found');
        return;
      }

      console.log('✅ Current user found:', currentUser.id);

      // Start animation and haptic feedback
      console.log('🔥 Starting animation and haptic feedback...');
      setAnimatingHearts(prev => new Set(prev).add(companyId));
      Vibration.vibrate(50);

      // Get the student ID from the current user
      console.log('🔥 Getting student profile...');
      const studentResponse = await apiService.getProfile(currentUser.id);
      console.log('📡 Student profile response:', studentResponse);
      
      if (!studentResponse.success || !studentResponse.user) {
        console.log('❌ Failed to get student profile');
        Alert.alert('Error', 'Failed to get student information');
        setAnimatingHearts(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
        return;
      }

      const studentId = studentResponse.user.student_id || studentResponse.user.id;
      console.log('✅ Student ID obtained:', studentId);

      // Remove from favorites using API
      console.log('🔄 Calling removeFromFavorites API...');
      const response = await apiService.removeFromFavorites(studentId, companyId);
      console.log('📡 API Response:', response);
      
      if (response.success) {
        console.log('✅✅✅ API CALL SUCCESSFUL ✅✅✅');
        console.log('✅ Updating UI...');
        // Update local state
        setFavoriteCompanies(prev => {
          const updated = prev.filter(company => company.id !== companyId);
          console.log('🔄 Updated favorites list length:', updated.length);
          console.log('🔄 Updated favorites list:', updated);
          return updated;
        });
        console.log('✅ Showing success alert...');
        Alert.alert('Success', 'Company removed from favorites');
        console.log('✅✅✅ REMOVAL COMPLETED SUCCESSFULLY ✅✅✅');
      } else {
        console.log('❌❌❌ API CALL FAILED ❌❌❌');
        console.log('❌ Error message:', response.message);
        Alert.alert('Error', response.message || 'Failed to remove from favorites');
      }
    } catch (error) {
      console.log('❌❌❌ EXCEPTION CAUGHT ❌❌❌');
      console.error('❌ Error removing from favorites:', error);
      Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
    } finally {
      console.log('🔥 Cleaning up animation...');
      // Stop animation after a delay
      setTimeout(() => {
        setAnimatingHearts(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          console.log('🔥 Animation cleanup completed');
          return newSet;
        });
      }, 1000);
    }
  };

  const cancelRemoveFavorite = () => {
    console.log('❌ User cancelled removal');
    setShowConfirmModal(false);
    setCompanyToRemove(null);
  };

  const handleApply = (company: FavoriteCompany) => {
    setSelectedCompanyForApplication(company);
    setShowResumeModal(true);
  };

  const handleApplicationSubmitted = () => {
    // Refresh companies or show success message
    Alert.alert('Success', 'Your application has been submitted successfully!');
  };

  const closeResumeModal = () => {
    setShowResumeModal(false);
    setSelectedCompanyForApplication(null);
  };

  // Animated Heart Component
  const AnimatedHeart = ({ companyId, isFavorite }: { companyId: string; isFavorite: boolean }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const isAnimating = animatingHearts.has(companyId);

    useEffect(() => {
      if (isAnimating) {
        // Scale animation with bounce effect
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();

        // Rotation animation
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          rotateAnim.setValue(0);
        });

        // Pulse animation for added effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 }
        ).start();
      }
    }, [isAnimating]);

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { rotate: rotate },
          ],
          shadowColor: isFavorite ? '#ea4335' : '#666',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isAnimating ? 0.8 : 0.3,
          shadowRadius: isAnimating ? 8 : 4,
          elevation: isAnimating ? 8 : 4,
        }}
      >
        <MaterialIcons 
          name={isFavorite ? "favorite" : "favorite-border"} 
          size={24} 
          color={isFavorite ? "#ea4335" : "#666"} 
        />
      </Animated.View>
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2D5A3D'; // Forest green
      case 'expired': return '#E8A598'; // Soft coral
      case 'pending': return '#F56E0F'; // Primary orange
      default: return '#1E3A5F'; // Deep navy blue
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  // Enhanced Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'active': return { color: '#2D5A3D', text: 'Active', icon: 'check-circle' };
        case 'expired': return { color: '#E8A598', text: 'Expired', icon: 'cancel' };
        case 'pending': return { color: '#F56E0F', text: 'Pending', icon: 'schedule' };
        default: return { color: '#1E3A3D', text: 'Unknown', icon: 'help' };
      }
    };
    
    const config = getStatusConfig();
    
    return (
      <View style={[styles.enhancedStatusBadge, { backgroundColor: config.color }]}>
        <MaterialIcons name={config.icon as any} size={14} color="#fff" />
        <Text style={styles.enhancedStatusText}>{config.text}</Text>
      </View>
    );
  };

  // Skeleton Components
  const SkeletonFavoriteCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonFavoriteCard}>
        <View style={styles.skeletonCompanyHeader}>
          <Animated.View style={[styles.skeletonProfileContainer, { opacity: shimmerOpacity }]}>
            <Animated.View style={[styles.skeletonProfileImage, { opacity: shimmerOpacity }]} />
          </Animated.View>
          <View style={styles.skeletonCompanyInfo}>
            <Animated.View style={[styles.skeletonCompanyName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonCompanyIndustry, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonRating, { opacity: shimmerOpacity }]} />
          </View>
          <View style={styles.skeletonHeaderActions}>
            <Animated.View style={[styles.skeletonFavoriteButton, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonExpandIcon, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
    );
  };

  const FavoriteCompanyCard = ({ company }: { company: FavoriteCompany }) => {
    const isExpanded = expandedCompany === company.id;
    
    return (
      <Animated.View 
        style={[
          styles.enhancedCompanyCard,
          { 
            transform: [{ scale: isExpanded ? 1.02 : 1 }],
            elevation: isExpanded ? 12 : 6,
          }
        ]}
      >
        <TouchableOpacity 
          onPress={() => toggleCompanyExpansion(company.id)}
          style={styles.cardTouchable}
        >
          <View style={styles.companyHeader}>
            <View style={styles.profileContainer}>
              {company.profilePicture ? (
                <Image source={{ uri: company.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>{company.name.charAt(0)}</Text>
                </View>
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyIndustry}>{company.industry}</Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={18} color="#F56E0F" />
                <Text style={styles.ratingText}>{company.rating}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.favoriteIndicator}>
                <AnimatedHeart 
                  companyId={company.id}
                  isFavorite={true}
                />
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F56E0F" 
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.companyDetails}>
              <View style={styles.locationContainer}>
                <MaterialIcons name="location-on" size={18} color="#F56E0F" />
                <Text style={styles.locationText}>{company.location}</Text>
              </View>
              
              <View style={styles.slotsContainer}>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotLabel}>Available Slots</Text>
                  <Text style={styles.slotValue}>{company.availableSlots}/{company.totalSlots}</Text>
                </View>
                <View style={styles.slotBar}>
                  <View 
                    style={[
                      styles.slotFill, 
                      { 
                        width: `${(company.availableSlots / company.totalSlots) * 100}%`,
                        backgroundColor: company.availableSlots > 0 ? '#2D5A3D' : '#E8A598'
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>MOA Status:</Text>
                  <StatusBadge status={company.moaStatus} />
                </View>
                {company.moaExpiryDate && (
                  <Text style={styles.statusDate}>Expires: {company.moaExpiryDate}</Text>
                )}
              </View>

              <Text style={styles.description} numberOfLines={3}>
                {company.description}
              </Text>

              <Text style={styles.addedDate}>
                Added to favorites: {company.addedDate}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(company)}
              >
                <MaterialIcons name="visibility" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.unfavoriteButton]} 
                onPress={() => handleRemoveFavorite(company.id)}
              >
                <MaterialIcons name="favorite-border" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Unfavorite</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.applyButton,
                  company.availableSlots === 0 && styles.disabledButton
                ]} 
                onPress={() => handleApply(company)}
                disabled={company.availableSlots === 0}
              >
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {company.availableSlots === 0 ? 'Full' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.ScrollView 
        style={[styles.scrollView, { transform: [{ scale: scaleAnim }] }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerGradient}>
            <Text style={styles.headerTitle}>My Favorites</Text>
            <Text style={styles.headerSubtitle}>
              Your saved companies and internship opportunities
            </Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="favorite" size={32} color="#E8A598" />
            <Text style={styles.statNumber}>{favoriteCompanies.length}</Text>
            <Text style={styles.statLabel}>Favorite Companies</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="work" size={32} color="#2D5A3D" />
            <Text style={styles.statNumber}>
              {favoriteCompanies.reduce((sum, company) => sum + company.availableSlots, 0)}
            </Text>
            <Text style={styles.statLabel}>Available Slots</Text>
          </View>
        </View>

        {/* Favorites List */}
        <View style={styles.favoritesSection}>
          {showSkeleton ? (
            <>
              <SkeletonFavoriteCard />
              <SkeletonFavoriteCard />
              <SkeletonFavoriteCard />
            </>
          ) : favoriteCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="favorite-border" size={64} color="#02050a" />
              <Text style={styles.emptyStateTitle}>No favorites yet</Text>
              <Text style={styles.emptyStateText}>
                Start adding companies to your favorites to see them here
              </Text>
            </View>
          ) : (
            favoriteCompanies.map((company) => (
              <FavoriteCompanyCard key={company.id} company={company} />
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Company Details Modal */}
      {selectedCompany && (
        <Modal
          visible={!!selectedCompany}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedCompany(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalProfileContainer}>
                  {selectedCompany.profilePicture ? (
                    <Image source={{ uri: selectedCompany.profilePicture }} style={styles.modalProfileImage} />
                  ) : (
                    <View style={styles.modalProfilePlaceholder}>
                      <Text style={styles.modalProfileText}>{selectedCompany.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.modalProfileInfo}>
                    <Text style={styles.modalTitle}>{selectedCompany.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedCompany.industry}</Text>
                  </View>
                </View>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity 
                    style={styles.modalFavoriteButton}
                    onPress={() => handleRemoveFavorite(selectedCompany.id)}
                  >
                    <AnimatedHeart 
                      companyId={selectedCompany.id}
                      isFavorite={true}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setSelectedCompany(null)}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="business" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Company Name:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.name}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="category" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Industry:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.industry}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="location-on" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Location:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.location}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="email" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Website:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.website}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="check-circle" size={20} color={selectedCompany.moaStatus === 'active' ? '#34a853' : '#ea4335'} />
                    <Text style={styles.modalInfoLabel}>MOA Status:</Text>
                    <Text style={[styles.modalInfoValue, { color: selectedCompany.moaStatus === 'active' ? '#34a853' : '#ea4335' }]}>
                      {selectedCompany.moaStatus.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="work" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Available Slots:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.availableSlots}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="group" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Total Slots:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.totalSlots}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="percent" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Fill Rate:</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedCompany.totalSlots > 0 ? Math.round((selectedCompany.availableSlots / selectedCompany.totalSlots) * 100) : 0}%
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Description:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.description}</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="star" size={20} color="#fbbc04" />
                    <Text style={styles.modalInfoLabel}>Rating:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.rating}/5</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="favorite" size={20} color="#ea4335" />
                    <Text style={styles.modalInfoLabel}>Added to Favorites:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.addedDate}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.unfavoriteModalButton]}
                  onPress={() => handleRemoveFavorite(selectedCompany.id)}
                >
                  <MaterialIcons name="favorite-border" size={16} color="#fff" />
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Remove from Favorites</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.applyModalButton,
                    selectedCompany.availableSlots === 0 && styles.disabledButton
                  ]}
                  onPress={() => handleApply(selectedCompany)}
                  disabled={selectedCompany.availableSlots === 0}
                >
                  <MaterialIcons name="send" size={16} color="#fff" />
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    {selectedCompany.availableSlots === 0 ? 'Full' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Resume Upload Modal */}
      {selectedCompanyForApplication && (
        <ResumeUploadModal
          visible={showResumeModal}
          onClose={closeResumeModal}
          onApplicationSubmitted={handleApplicationSubmitted}
          companyName={selectedCompanyForApplication.name}
          companyId={selectedCompanyForApplication.id}
          studentId={currentUser.id}
          position="Intern"
        />
      )}

      {/* Custom Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelRemoveFavorite}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <MaterialIcons name="warning" size={24} color="#ff6b6b" />
              <Text style={styles.confirmModalTitle}>Remove from Favorites</Text>
            </View>
            
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to remove this company from your favorites? This action cannot be undone.
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={cancelRemoveFavorite}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.removeButton]}
                onPress={confirmRemoveFavorite}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#02050a',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#2A2A2E', // Dark secondary
    padding: 24,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerGradient: {
    position: 'relative',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  favoritesSection: {
    padding: 20,
  },
  companyCard: {
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
  enhancedCompanyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  cardTouchable: {
    padding: 24,
  },
  expandedContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enhancedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enhancedStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statusDate: {
    fontSize: 12,
    color: '#F56E0F',
    marginTop: 4,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'System',
  },
  companyIndustry: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    marginBottom: 6,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  favoriteIndicator: {
    padding: 8,
  },
  companyDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '500',
  },
  slotsContainer: {
    marginBottom: 10,
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  slotLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  slotBar: {
    height: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moaLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  moaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 12,
    opacity: 0.9,
    fontWeight: '400',
  },
  addedDate: {
    fontSize: 13,
    color: '#F56E0F',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  actionButtons: {
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
    backgroundColor: '#2D5A3D', // Forest green
  },
  unfavoriteButton: {
    backgroundColor: '#E8A598', // Soft coral
  },
  applyButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#02050a',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  // Modal styles
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalFavoriteButton: {
    padding: 8,
  },
  modalProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalProfileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  modalProfileInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalInfo: {
    gap: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  unfavoriteModalButton: {
    backgroundColor: '#ea4335',
  },
  applyModalButton: {
    backgroundColor: '#34a853',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Confirmation Modal styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeButton: {
    backgroundColor: '#ff6b6b',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Skeleton Loading Styles
  skeletonFavoriteCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
    opacity: 0.7,
    padding: 24,
  },
  skeletonCompanyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonProfileContainer: {
    marginRight: 15,
  },
  skeletonProfileImage: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 30,
  },
  skeletonCompanyInfo: {
    flex: 1,
  },
  skeletonCompanyName: {
    width: '70%',
    height: 22,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 6,
  },
  skeletonCompanyIndustry: {
    width: '50%',
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonRating: {
    width: 60,
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 6,
  },
  skeletonHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonFavoriteButton: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 12,
  },
  skeletonExpandIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 12,
  },
});
