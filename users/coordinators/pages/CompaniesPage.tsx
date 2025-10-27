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
import { apiService } from '../../../lib/api';

const { width } = Dimensions.get('window');

interface Company {
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
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  partnershipDate: string;
  partnershipStatus: 'pending' | 'approved' | 'rejected';
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCompanies();
    
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

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      console.log('Fetching approved companies...');
      
      // Fetch companies from the API
      const response = await apiService.getCompanies();
      
      if (response.success && response.companies) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        
        // Filter to only show approved companies
        const approvedCompanies = response.companies.filter((company: any) => 
          company.partnershipStatus === 'approved'
        );
        
        console.log('✅ Approved companies:', approvedCompanies.length);
        
        // Transform the data to match the Company interface
        const transformedCompanies: Company[] = approvedCompanies.map((company: any) => ({
          id: company.id,
          name: company.name,
          profilePicture: company.profilePicture,
          industry: company.industry,
          location: company.address,
          moaStatus: company.moaStatus || 'pending',
          moaExpiryDate: company.moaExpiryDate,
          availableSlots: company.availableSlots || 0,
          totalSlots: company.totalSlots || 0,
          description: company.description || 'No description available',
          website: company.website || 'No website',
          contactPerson: company.contactPerson || 'Contact Person',
          contactEmail: company.email,
          contactPhone: company.contactPhone || 'No phone',
          partnershipDate: company.joinDate || new Date().toISOString().split('T')[0],
          partnershipStatus: company.partnershipStatus || 'pending',
        }));
        
        setCompanies(transformedCompanies);
      } else {
        console.log('No companies found or error:', response.message);
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nIndustry: ${company.industry}\nLocation: ${company.location}\nMOA Status: ${company.moaStatus}\nAvailable Slots: ${company.availableSlots}/${company.totalSlots}\nDescription: ${company.description}\nWebsite: ${company.website}\nContact Person: ${company.contactPerson}\nContact Email: ${company.contactEmail}\nContact Phone: ${company.contactPhone}\nPartnership Date: ${company.partnershipDate}`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveCompany = (company: Company) => {
    Alert.alert(
      'Remove Company',
      `Are you sure you want to remove ${company.name} from the partnership program?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setCompanies(companies.filter(c => c.id !== company.id));
            Alert.alert('Success', `${company.name} removed from partnership program`);
          }
        },
      ]
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'expired': return '#ea4335';
      case 'pending': return '#fbbc04';
      default: return '#666';
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

  const toggleCardExpansion = (companyId: string) => {
    setExpandedCard(expandedCard === companyId ? null : companyId);
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
  const SkeletonCompanyCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonCompanyCard}>
        <View style={styles.skeletonCompanyHeader}>
          <View style={styles.skeletonProfileContainer}>
            <Animated.View style={[styles.skeletonProfileImage, { opacity: shimmerOpacity }]} />
          </View>
          <View style={styles.skeletonCompanyInfo}>
            <Animated.View style={[styles.skeletonTextLine, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '70%', opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '60%', opacity: shimmerOpacity }]} />
          </View>
          <Animated.View style={[styles.skeletonStatusBadge, { opacity: shimmerOpacity }]} />
        </View>
        
        <View style={styles.skeletonCompanyDetails}>
          <Animated.View style={[styles.skeletonTextLine, { width: '80%', opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonTextLine, { width: '60%', opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonTextLine, { width: '90%', opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  const CompanyCard = ({ company }: { company: Company }) => {
    const isExpanded = expandedCard === company.id;
    const slotsProgress = company.totalSlots > 0 ? (company.availableSlots / company.totalSlots) * 100 : 0;
    
    return (
      <View style={[
        styles.companyCard,
        isExpanded && styles.expandedCompanyCard
      ]}>
        <TouchableOpacity 
          onPress={() => toggleCardExpansion(company.id)}
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
              <Text style={styles.contactPerson}>Contact: {company.contactPerson}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
                <Text style={styles.moaText}>{getMOAStatusText(company.moaStatus)}</Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F56E0F" 
                style={styles.expandIcon}
              />
            </View>
          </View>

          <View style={styles.companyDetails}>
            <View style={styles.slotsContainer}>
              <Text style={styles.slotLabel}>Available Slots</Text>
              <ProgressBar 
                progress={slotsProgress} 
                color={company.availableSlots > 0 ? '#F56E0F' : '#878787'} 
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.locationContainer}>
              <MaterialIcons name="location-on" size={16} color="#F56E0F" />
              <Text style={styles.locationText}>{company.location}</Text>
            </View>
            
            <View style={styles.contactContainer}>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={16} color="#F56E0F" />
                <Text style={styles.contactText}>{company.contactEmail}</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color="#F56E0F" />
                <Text style={styles.contactText}>{company.contactPhone}</Text>
              </View>
            </View>

            <View style={styles.moaContainer}>
              <Text style={styles.moaLabel}>MOA Status:</Text>
              <Text style={styles.moaDate}>
                {company.moaExpiryDate ? `Expires: ${company.moaExpiryDate}` : 'No expiry date'}
              </Text>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {company.description}
            </Text>

            <Text style={styles.partnershipDate}>
              Partnership since: {company.partnershipDate}
            </Text>

            <View style={styles.expandedActionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(company)}
              >
                <MaterialIcons name="visibility" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.removeButton]} 
                onPress={() => handleRemoveCompany(company)}
              >
                <MaterialIcons name="remove" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Search Section */}
      <Animated.View style={[styles.searchSection, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search approved companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#878787"
          />
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredCompanies.length}</Text>
          <Text style={styles.statLabel}>Approved Companies</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F56E0F' }]}>
            {filteredCompanies.filter(c => c.moaStatus === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active MOA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#878787' }]}>
            {filteredCompanies.filter(c => c.moaStatus === 'expired').length}
          </Text>
          <Text style={styles.statLabel}>Expired MOA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F56E0F' }]}>
            {filteredCompanies.reduce((sum, company) => sum + company.availableSlots, 0)}
          </Text>
          <Text style={styles.statLabel}>Available Slots</Text>
        </View>
      </Animated.View>

      {/* Companies List */}
      <Animated.ScrollView 
        style={[styles.companiesList, { transform: [{ scale: scaleAnim }] }]} 
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
          </>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#F56E0F" />
            <Text style={styles.emptyStateTitle}>No approved companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No approved companies available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Dark background
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
  searchSection: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    fontWeight: '600',
  },
  companiesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  companyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    overflow: 'hidden',
  },
  expandedCompanyCard: {
    elevation: 8,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cardTouchable: {
    padding: 20,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#F56E0F', // Primary orange
    marginBottom: 4,
    fontWeight: '500',
  },
  contactPerson: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#FBFBFB', // Light text
    marginLeft: 4,
    opacity: 0.9,
  },
  contactContainer: {
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    marginLeft: 8,
    opacity: 0.9,
  },
  slotsContainer: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  slotLabel: {
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
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moaLabel: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    marginRight: 8,
    opacity: 0.9,
  },
  moaDate: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.9,
  },
  partnershipDate: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    fontStyle: 'italic',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  removeButton: {
    backgroundColor: '#878787', // Muted gray
  },
  actionButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  skeletonCompanyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    overflow: 'hidden',
    opacity: 0.7,
    padding: 20,
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
    borderRadius: 30,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
  },
  skeletonCompanyInfo: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonStatusBadge: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
  },
  skeletonCompanyDetails: {
    marginBottom: 15,
  },
});
