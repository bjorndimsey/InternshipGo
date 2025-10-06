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
  TextInput,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface CompanyInfo {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  description: string;
  website: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  moaStatus: 'active' | 'expired' | 'pending' | 'draft';
  moaExpiryDate?: string;
  moaDocument?: string;
  availableSlots: number;
  totalSlots: number;
  currentInterns: number;
  partnershipDate: string;
  isFavorite: boolean;
  rating: number;
  reviews: number;
}

interface CompanyStats {
  totalSlots: number;
  availableSlots: number;
  currentInterns: number;
  completedInterns: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageRating: number;
  totalReviews: number;
}

export default function DashboardHome() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [stats, setStats] = useState<CompanyStats>({
    totalSlots: 0,
    availableSlots: 0,
    currentInterns: 0,
    completedInterns: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [animatedStats, setAnimatedStats] = useState<CompanyStats>({
    totalSlots: 0,
    availableSlots: 0,
    currentInterns: 0,
    completedInterns: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchAnimation] = useState(new Animated.Value(0));
  const [statsAnimation] = useState(new Animated.Value(0));
  const [pageAnimation] = useState(new Animated.Value(0));
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      // Start page animation
      Animated.timing(pageAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockCompanyInfo: CompanyInfo = {
        id: '1',
        name: 'TechCorp Solutions',
        industry: 'Technology',
        location: 'San Francisco, CA',
        description: 'Leading technology company specializing in software development and AI solutions. We provide cutting-edge internship opportunities for students to work on real-world projects.',
        website: 'www.techcorp.com',
        contactPerson: 'John Smith',
        contactEmail: 'john.smith@techcorp.com',
        contactPhone: '+1 (555) 123-4567',
        moaStatus: 'active',
        moaExpiryDate: '2024-12-31',
        moaDocument: 'techcorp-moa-2024.pdf',
        availableSlots: 5,
        totalSlots: 10,
        currentInterns: 5,
        partnershipDate: '2023-01-15',
        isFavorite: true,
        rating: 4.8,
        reviews: 24,
      };

      const mockStats: CompanyStats = {
        totalSlots: 10,
        availableSlots: 5,
        currentInterns: 5,
        completedInterns: 12,
        pendingApplications: 8,
        approvedApplications: 15,
        rejectedApplications: 3,
        averageRating: 4.8,
        totalReviews: 24,
      };
      
      setCompanyInfo(mockCompanyInfo);
      setStats(mockStats);
      
      // Start stats animation after data is loaded
      setTimeout(() => {
        animateStats(mockStats);
        setShowSkeleton(false);
      }, 500);
      
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateStats = (targetStats: CompanyStats) => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const animateStep = () => {
      if (currentStep <= steps) {
        const progress = currentStep / steps;
        
        setAnimatedStats({
          totalSlots: Math.floor(targetStats.totalSlots * progress),
          availableSlots: Math.floor(targetStats.availableSlots * progress),
          currentInterns: Math.floor(targetStats.currentInterns * progress),
          completedInterns: Math.floor(targetStats.completedInterns * progress),
          pendingApplications: Math.floor(targetStats.pendingApplications * progress),
          approvedApplications: Math.floor(targetStats.approvedApplications * progress),
          rejectedApplications: Math.floor(targetStats.rejectedApplications * progress),
          averageRating: Math.round((targetStats.averageRating * progress) * 10) / 10,
          totalReviews: Math.floor(targetStats.totalReviews * progress),
        });
        
        currentStep++;
        setTimeout(animateStep, stepDuration);
      }
    };
    
    animateStep();
  };

  const handleViewDetails = () => {
    if (!companyInfo) return;
    
    Alert.alert(
      'Company Details',
      `Name: ${companyInfo.name}\nIndustry: ${companyInfo.industry}\nLocation: ${companyInfo.location}\nDescription: ${companyInfo.description}\nWebsite: ${companyInfo.website}\nContact Person: ${companyInfo.contactPerson}\nContact Email: ${companyInfo.contactEmail}\nContact Phone: ${companyInfo.contactPhone}\nMOA Status: ${companyInfo.moaStatus}\nPartnership Date: ${companyInfo.partnershipDate}\nRating: ${companyInfo.rating}/5 (${companyInfo.reviews} reviews)`,
      [{ text: 'OK' }]
    );
  };

  const handleViewLocation = () => {
    Alert.alert(
      'View Location',
      'Opening location in maps...',
      [{ text: 'OK' }]
    );
  };

  const handleToggleFavorite = () => {
    if (!companyInfo) return;
    
    setCompanyInfo({
      ...companyInfo,
      isFavorite: !companyInfo.isFavorite
    });
    
    Alert.alert(
      'Success',
      companyInfo.isFavorite ? 'Removed from favorites' : 'Added to favorites'
    );
  };

  const handleApply = () => {
    Alert.alert(
      'Apply for Partnership',
      'This will send a partnership application to the university. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: () => Alert.alert('Success', 'Application submitted successfully') }
      ]
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'expired': return '#ea4335';
      case 'pending': return '#fbbc04';
      case 'draft': return '#666';
      default: return '#666';
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      case 'draft': return 'Draft';
      default: return 'Unknown';
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    } else {
      Animated.timing(searchAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setSearchQuery('');
    }
  };

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonRating} />
        </View>
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
    </View>
  );

  const SkeletonStatCard = () => (
    <View style={styles.skeletonStatCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonNumber} />
      <View style={styles.skeletonLabel} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading company dashboard...</Text>
      </View>
    );
  }

  if (!companyInfo) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#E8A598" />
        <Text style={styles.errorTitle}>Error loading company data</Text>
        <Text style={styles.errorText}>Please try again later</Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: pageAnimation,
          transform: [
            {
              translateY: pageAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeTitle}>Welcome to your Company Portal!</Text>
              <Text style={styles.welcomeSubtitle}>
                Manage your internship program, view applications, and track progress.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <MaterialIcons name="search" size={24} color="#1E3A5F" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <Animated.View
            style={[
              styles.searchContainer,
              {
                opacity: searchAnimation,
                height: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50],
                }),
                marginTop: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16],
                }),
              },
            ]}
          >
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search applications, interns, or activities..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <TouchableOpacity 
              style={styles.searchCloseButton}
              onPress={toggleSearch}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </Animated.View>
        </View>

      {/* Company Info Card */}
      <View style={styles.companyCard}>
        <View style={styles.companyHeader}>
          <View style={styles.profileContainer}>
            {companyInfo.profilePicture ? (
              <Image source={{ uri: companyInfo.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileText}>{companyInfo.name.charAt(0)}</Text>
              </View>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyIndustry}>{companyInfo.industry}</Text>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={16} color="#fbbc04" />
              <Text style={styles.ratingText}>{companyInfo.rating}</Text>
              <Text style={styles.reviewsText}>({companyInfo.reviews} reviews)</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <MaterialIcons 
              name={companyInfo.isFavorite ? "favorite" : "favorite-border"} 
              size={24} 
              color={companyInfo.isFavorite ? "#ea4335" : "#666"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.companyDetails}>
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.locationText}>{companyInfo.location}</Text>
          </View>
          
          <Text style={styles.description} numberOfLines={3}>
            {companyInfo.description}
          </Text>

          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <MaterialIcons name="email" size={16} color="#666" />
              <Text style={styles.contactText}>{companyInfo.contactEmail}</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="phone" size={16} color="#666" />
              <Text style={styles.contactText}>{companyInfo.contactPhone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]} 
            onPress={handleViewDetails}
          >
            <MaterialIcons name="visibility" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.locationButton]} 
            onPress={handleViewLocation}
          >
            <MaterialIcons name="location-on" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.favoriteActionButton]} 
            onPress={handleToggleFavorite}
          >
            <MaterialIcons 
              name={companyInfo.isFavorite ? "favorite" : "favorite-border"} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.actionButtonText}>
              {companyInfo.isFavorite ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.applyButton]} 
            onPress={handleApply}
          >
            <MaterialIcons name="send" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          {showSkeleton ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <MaterialIcons name="business-center" size={32} color="#1E3A5F" />
                <Text style={styles.statNumber}>{animatedStats.totalSlots}</Text>
                <Text style={styles.statLabel}>Total Slots</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="person-add" size={32} color="#2D5A3D" />
                <Text style={styles.statNumber}>{animatedStats.availableSlots}</Text>
                <Text style={styles.statLabel}>Available Slots</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="school" size={32} color="#F4D03F" />
                <Text style={styles.statNumber}>{animatedStats.currentInterns}</Text>
                <Text style={styles.statLabel}>Current Interns</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="assignment" size={32} color="#E8A598" />
                <Text style={styles.statNumber}>{animatedStats.pendingApplications}</Text>
                <Text style={styles.statLabel}>Pending Applications</Text>
              </View>
            </>
          )}
        </View>

      {/* MOA Status Section */}
      <View style={styles.moaSection}>
        <Text style={styles.sectionTitle}>MOA Status</Text>
        <View style={styles.moaCard}>
          <View style={styles.moaHeader}>
            <View style={styles.moaInfo}>
              <Text style={styles.moaTitle}>Memorandum of Agreement</Text>
              <Text style={styles.moaSubtitle}>Partnership Agreement with University</Text>
            </View>
            <View style={[styles.moaStatusBadge, { backgroundColor: getMOAStatusColor(companyInfo.moaStatus) }]}>
              <Text style={styles.moaStatusText}>{getMOAStatusText(companyInfo.moaStatus)}</Text>
            </View>
          </View>
          
          <View style={styles.moaDetails}>
            <View style={styles.moaDetailItem}>
              <Text style={styles.moaDetailLabel}>Partnership Date:</Text>
              <Text style={styles.moaDetailValue}>{companyInfo.partnershipDate}</Text>
            </View>
            {companyInfo.moaExpiryDate && (
              <View style={styles.moaDetailItem}>
                <Text style={styles.moaDetailLabel}>Expiry Date:</Text>
                <Text style={styles.moaDetailValue}>{companyInfo.moaExpiryDate}</Text>
              </View>
            )}
            <View style={styles.moaDetailItem}>
              <Text style={styles.moaDetailLabel}>Document:</Text>
              <TouchableOpacity style={styles.downloadButton}>
                <MaterialIcons name="download" size={16} color="#4285f4" />
                <Text style={styles.downloadText}>Download MOA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <MaterialIcons name="person-add" size={20} color="#34a853" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New Application Received</Text>
              <Text style={styles.activityDescription}>John Doe applied for Software Developer position</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <MaterialIcons name="check-circle" size={20} color="#4285f4" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Application Approved</Text>
              <Text style={styles.activityDescription}>Jane Smith's application was approved</Text>
              <Text style={styles.activityTime}>1 day ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <MaterialIcons name="event" size={20} color="#fbbc04" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Internship Started</Text>
              <Text style={styles.activityDescription}>Mike Johnson started his internship</Text>
              <Text style={styles.activityTime}>3 days ago</Text>
            </View>
          </View>
        </View>
      </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
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
    color: '#1E3A5F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8A598',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#1E3A5F',
    textAlign: 'center',
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#1E3A5F', // Deep navy blue
    marginBottom: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#F4D03F', // Bright yellow
    lineHeight: 22,
  },
  searchButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 12,
  },
  searchCloseButton: {
    padding: 8,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  favoriteButton: {
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
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  locationButton: {
    backgroundColor: '#34a853',
  },
  favoriteActionButton: {
    backgroundColor: '#ea4335',
  },
  applyButton: {
    backgroundColor: '#fbbc04',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  moaSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  moaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  moaInfo: {
    flex: 1,
  },
  moaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  moaSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  moaStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moaStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDetails: {
    gap: 12,
  },
  moaDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moaDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  moaDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 14,
    color: '#4285f4',
    marginLeft: 4,
    fontWeight: '500',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  // Skeleton Loading Styles
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    marginRight: 15,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '50%',
  },
  skeletonRating: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '40%',
  },
  skeletonContent: {
    marginTop: 10,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonLineShort: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '60%',
  },
  skeletonStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    marginBottom: 12,
  },
  skeletonNumber: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: 40,
  },
  skeletonLabel: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: 60,
  },
});
