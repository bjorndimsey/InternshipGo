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
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import * as XLSX from 'xlsx';

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
  coordinatorApproved?: boolean;
  companyApproved?: boolean;
  schoolYear?: string;
  isAdminAssigned?: boolean; // New field to indicate if assigned by admin coordinator
  moa_uploaded_by?: string | null; // To check if coordinator uploaded MOA
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface CompaniesPageProps {
  currentUser: UserInfo | null;
}

export default function CompaniesPage({ currentUser }: CompaniesPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [companyToApprove, setCompanyToApprove] = useState<Company | null>(null);
  const [approving, setApproving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<Company | null>(null);
  const [removing, setRemoving] = useState(false);

  // Available school years
  const schoolYears = [
    '2024-2025',
    '2025-2026',
    '2026-2027',
    '2027-2028',
    '2028-2029',
    '2029-2030',
    '2030-2031',
    '2031-2032',
    '2032-2033',
    '2033-2034',
    '2034-2035',
  ];
  
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
  }, [searchQuery, companies, selectedSchoolYear]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      console.log('Fetching approved companies...');
      
      // Fetch companies from the API - only companies where current coordinator uploaded MOA
      if (!currentUser) {
        console.error('❌ No currentUser found');
        setCompanies([]);
        setLoading(false);
        return;
      }
      
      console.log('🔍 Fetching companies for coordinator user ID:', currentUser.id);
      const response = await apiService.getCompanies(currentUser.id);
      
      if (response.success && response.companies) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        
        // Show all companies (not just approved) so coordinator can approve them
        // Filter will handle showing only relevant ones
        const allCompanies = response.companies;
        
        console.log('✅ All companies:', allCompanies.length);
        
        // Transform the data to match the Company interface
        const transformedCompanies: Company[] = allCompanies.map((company: any) => {
          // Convert approval flags to boolean, handling various formats
          const coordinatorApproved = company.coordinator_approved === true || 
                                      company.coordinator_approved === 1 || 
                                      company.coordinator_approved === 'true' ||
                                      company.coordinator_approved === '1';
          const companyApproved = company.company_approved === true || 
                                  company.company_approved === 1 || 
                                  company.company_approved === 'true' ||
                                  company.company_approved === '1';
          
          console.log('🔍 Company approval status:', {
            id: company.id,
            name: company.name,
            coordinator_approved: company.coordinator_approved,
            company_approved: company.company_approved,
            coordinatorApproved,
            companyApproved,
            partnershipStatus: company.partnershipStatus
          });
          
          // Check if company was assigned by admin coordinator (has partnership but coordinator didn't upload MOA)
          const isAdminAssigned = company.moa_uploaded_by !== currentUser.id && 
                                  (coordinatorApproved || companyApproved || company.partnershipStatus === 'approved');
          
          return {
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
            coordinatorApproved,
            companyApproved,
            schoolYear: company.schoolYear || '2024-2025',
            isAdminAssigned,
            moa_uploaded_by: company.moa_uploaded_by,
          };
        });
        
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

    // Filter by school year
    if (selectedSchoolYear) {
      filtered = filtered.filter(company => company.schoolYear === selectedSchoolYear);
    }

    // Filter by search query
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

  const handleApproveCompany = (company: Company) => {
    console.log('🔵 handleApproveCompany called for company:', company.id, company.name);
    console.log('🔵 currentUser:', currentUser);
    
    if (!currentUser) {
      console.error('❌ No currentUser found');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('🔵 Showing approval modal...');
    setCompanyToApprove(company);
    setShowApproveModal(true);
  };

  const confirmApproveCompany = async () => {
    if (!currentUser || !companyToApprove) {
      Alert.alert('Error', 'User not authenticated or company not selected');
      return;
    }

    console.log('🔵 User confirmed approval, calling API...');
    setApproving(true);
    
    try {
      console.log('🔵 API call parameters:', {
        companyId: companyToApprove.id,
        status: 'approved',
        approvedBy: currentUser.id
      });
      
      const response = await apiService.updatePartnershipStatus(
        companyToApprove.id,
        'approved',
        currentUser.id
      );

      console.log('🔵 API response:', response);

      if (response.success) {
        console.log('✅ Approval successful, refreshing companies list...');
        // Refresh companies list
        await fetchCompanies();
        setShowApproveModal(false);
        setCompanyToApprove(null);
        Alert.alert('Success', response.message || 'Your approval has been recorded. Waiting for company approval.');
      } else {
        console.error('❌ Approval failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to approve partnership');
      }
    } catch (error) {
      console.error('❌ Error approving partnership:', error);
      Alert.alert('Error', `Failed to approve partnership: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setApproving(false);
    }
  };

  const cancelApproveCompany = () => {
    console.log('🔵 User cancelled approval');
    setShowApproveModal(false);
    setCompanyToApprove(null);
  };

  const handleRemoveCompany = (company: Company) => {
    console.log('🗑️ Remove company clicked for:', company.id, company.name);
    setCompanyToRemove(company);
    setShowRemoveModal(true);
  };

  const confirmRemoveCompany = async () => {
    if (!companyToRemove || !currentUser) {
      return;
    }

    console.log('🗑️ Confirming removal of partnership/MOA for company:', companyToRemove.id, companyToRemove.name);
    console.log('🗑️ Current coordinator user ID:', currentUser.id);
    setRemoving(true);

    try {
      const response = await apiService.removePartnership(companyToRemove.id, currentUser.id);
      
      console.log('🗑️ Remove partnership API response:', response);

      if (response.success) {
        console.log('✅ Partnership/MOA removed successfully, refreshing list...');
        // Refresh the companies list to reflect the changes
        await fetchCompanies();
        setShowRemoveModal(false);
        setCompanyToRemove(null);
        Alert.alert('Success', `Partnership and MOA for ${companyToRemove.name} have been removed. The company remains in the system.`);
      } else {
        console.error('❌ Failed to remove partnership:', response.message);
        Alert.alert('Error', response.message || 'Failed to remove partnership');
      }
    } catch (error) {
      console.error('❌ Error removing partnership:', error);
      Alert.alert('Error', `Failed to remove partnership: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setRemoving(false);
    }
  };

  const cancelRemoveCompany = () => {
    console.log('🗑️ User cancelled company removal');
    setShowRemoveModal(false);
    setCompanyToRemove(null);
  };

  const getPartnershipStatusText = (company: Company) => {
    // Convert to boolean to handle various formats
    const coordinatorApprovedValue = company.coordinatorApproved;
    const coordinatorApproved = coordinatorApprovedValue === true || 
                                (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) ||
                                (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === 'true') ||
                                (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === '1');
    const companyApprovedValue = company.companyApproved;
    const companyApproved = companyApprovedValue === true || 
                            (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) ||
                            (typeof companyApprovedValue === 'string' && companyApprovedValue === 'true') ||
                            (typeof companyApprovedValue === 'string' && companyApprovedValue === '1');
    
    console.log('🔍 getPartnershipStatusText for company:', {
      id: company.id,
      name: company.name,
      coordinatorApproved: company.coordinatorApproved,
      companyApproved: company.companyApproved,
      coordinatorApprovedBool: coordinatorApproved,
      companyApprovedBool: companyApproved
    });
    
    // Both approved = active partnership
    if (coordinatorApproved && companyApproved) {
      console.log('✅ Both approved - showing Partner');
      return 'Partner';
    }
    // Company approved first, waiting for coordinator to approve
    if (!coordinatorApproved && companyApproved) {
      console.log('⏳ Company approved, waiting for coordinator - showing Waiting You');
      return 'Waiting You';
    }
    // Coordinator approved first, waiting for company to accept
    if (coordinatorApproved && !companyApproved) {
      console.log('⏳ Coordinator approved, waiting for company - showing Waiting Company');
      return 'Waiting Company';
    }
    // Neither approved - MOA sent but not accepted yet
    console.log('⏸️ Neither approved - showing Pending (MOA sent, waiting for company to accept)');
    return 'Pending';
  };

  const getPartnershipStatusColor = (company: Company) => {
    // Convert to boolean to handle various formats
    const coordinatorApprovedValue = company.coordinatorApproved;
    const coordinatorApproved = coordinatorApprovedValue === true || 
                                (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) ||
                                (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === 'true') ||
                                (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === '1');
    const companyApprovedValue = company.companyApproved;
    const companyApproved = companyApprovedValue === true || 
                            (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) ||
                            (typeof companyApprovedValue === 'string' && companyApprovedValue === 'true') ||
                            (typeof companyApprovedValue === 'string' && companyApprovedValue === '1');
    
    if (coordinatorApproved && companyApproved) {
      return '#34a853'; // Green - fully approved
    }
    if (coordinatorApproved || companyApproved) {
      return '#fbbc04'; // Yellow - waiting for other side
    }
    return '#878787'; // Gray - pending (MOA sent, waiting for company to accept)
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

  const handleYearSelect = (year: string) => {
    setSelectedSchoolYear(year);
    setShowYearSelector(false);
  };

  const closeYearSelector = () => {
    setShowYearSelector(false);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      return dateString;
    }
  };

  const downloadCompaniesExcel = async () => {
    try {
      // Show loading alert
      Alert.alert('Processing', 'Preparing Excel file...');
      
      // Prepare data for Excel
      const excelData = filteredCompanies.map((company, index) => {
        // Determine partnership status text
        const coordinatorApprovedValue = company.coordinatorApproved;
        const coordinatorApproved = coordinatorApprovedValue === true || 
                                    (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) ||
                                    (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === 'true') ||
                                    (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === '1');
        const companyApprovedValue = company.companyApproved;
        const companyApproved = companyApprovedValue === true || 
                                (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) ||
                                (typeof companyApprovedValue === 'string' && companyApprovedValue === 'true') ||
                                (typeof companyApprovedValue === 'string' && companyApprovedValue === '1');
        
        let partnershipStatus = 'Pending';
        if (coordinatorApproved && companyApproved) {
          partnershipStatus = 'Partner';
        } else if (!coordinatorApproved && companyApproved) {
          partnershipStatus = 'Waiting You';
        } else if (coordinatorApproved && !companyApproved) {
          partnershipStatus = 'Waiting Company';
        }
        
        return {
          'No.': index + 1,
          'Company Name': company.name,
          'Industry': company.industry,
          'Location': company.location,
          'Contact Person': company.contactPerson,
          'Contact Email': company.contactEmail,
          'Contact Phone': company.contactPhone,
          'Available Slots': `${company.availableSlots}/${company.totalSlots}`,
          'MOA Status': getMOAStatusText(company.moaStatus),
          'Partnership Status': partnershipStatus,
          'Partnership Date': formatDate(company.partnershipDate),
          'School Year': company.schoolYear || selectedSchoolYear,
          'Website': company.website,
        };
      });

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });

      // Create blob and download
      if (Platform.OS === 'web') {
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Companies_List_${selectedSchoolYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Excel file downloaded successfully!');
      } else {
        // For mobile, show info message
        Alert.alert(
          'Info', 
          'Excel download is available on web platform. Please use the web version to download the file.'
        );
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      Alert.alert('Error', 'Failed to download Excel file. Please try again.');
    }
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
              <View style={styles.slotsContainerHeader}>
                <Text style={styles.slotLabelHeader}>Available Slots: </Text>
                <Text style={styles.slotValueHeader}>{company.availableSlots}/{company.totalSlots}</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.partnershipBadge, { backgroundColor: getPartnershipStatusColor(company) }]}>
                <Text style={styles.partnershipText}>{getPartnershipStatusText(company)}</Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F56E0F" 
                style={styles.expandIcon}
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
              <Text style={styles.moaStatusText}>
                MOA Status: <Text style={styles.moaValue}>{getMOAStatusText(company.moaStatus)}</Text>
              </Text>
              {company.moaExpiryDate && (
                <Text style={styles.moaDate}>Expires: {company.moaExpiryDate}</Text>
              )}
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {company.description}
            </Text>

            <Text style={styles.partnershipDate}>
              Partnership since: {formatDate(company.partnershipDate)}
            </Text>

            <View style={styles.expandedActionButtons} pointerEvents="box-none">
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => {
                  console.log('🔵 View button clicked');
                  handleViewDetails(company);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="visibility" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              
              {(() => {
                // Convert to boolean
                const coordinatorApprovedValue = company.coordinatorApproved;
                const coordinatorApproved = coordinatorApprovedValue === true || 
                                            (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) ||
                                            (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === 'true') ||
                                            (typeof coordinatorApprovedValue === 'string' && coordinatorApprovedValue === '1');
                const companyApprovedValue = company.companyApproved;
                const companyApproved = companyApprovedValue === true || 
                                        (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) ||
                                        (typeof companyApprovedValue === 'string' && companyApprovedValue === 'true') ||
                                        (typeof companyApprovedValue === 'string' && companyApprovedValue === '1');
                
                // Show Approve button only if:
                // 1. Coordinator hasn't approved yet, AND
                // 2. Company has already accepted the MOA (companyApproved = true)
                // This ensures coordinator can only approve after company accepts
                if (!coordinatorApproved && companyApproved) {
                  return (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]} 
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        console.log('🔵 Approve button clicked for company:', company.id, company.name);
                        console.log('🔵 Company has accepted MOA, coordinator can now approve');
                        handleApproveCompany(company);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="check" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.removeButton]} 
                onPress={() => {
                  console.log('🔵 Remove button clicked');
                  handleRemoveCompany(company);
                }}
                activeOpacity={0.7}
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
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>School Year: </Text>
            <TouchableOpacity 
              style={styles.yearSelector}
              onPress={() => setShowYearSelector(true)}
            >
              <Text style={styles.yearText}>{selectedSchoolYear}</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#F56E0F" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={downloadCompaniesExcel}
          >
            <MaterialIcons name="download" size={16} color="#fff" />
            <Text style={styles.downloadButtonText}>Download Excel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCompanies.filter(c => c.coordinatorApproved && c.companyApproved).length}
          </Text>
          <Text style={styles.statLabel}>Active Partners</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredCompanies.filter(c => (c.coordinatorApproved && !c.companyApproved) || (!c.coordinatorApproved && c.companyApproved)).length}
          </Text>
          <Text style={styles.statLabel}>Waiting Approval</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#878787' }]}>
            {filteredCompanies.filter(c => !c.coordinatorApproved && !c.companyApproved).length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
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
            <Text style={styles.emptyStateTitle}>No Partner Companies</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No partner companies available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </Animated.ScrollView>

      {/* Approve Partnership Confirmation Modal */}
      <Modal
        visible={showApproveModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelApproveCompany}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve Partnership</Text>
            <Text style={styles.modalMessage}>
              Approve partnership with {companyToApprove?.name}? This will record your approval. The partnership will be active once both sides have approved.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={cancelApproveCompany}
                disabled={approving}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]} 
                onPress={confirmApproveCompany}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Company Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelRemoveCompany}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="warning" size={48} color="#ea4335" style={styles.modalWarningIcon} />
            <Text style={styles.modalTitle}>Remove Partnership</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove the partnership and MOA for {companyToRemove?.name}? This will remove the partnership relationship, but the company will remain in the system. You can establish a new partnership later if needed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={cancelRemoveCompany}
                disabled={removing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]} 
                onPress={confirmRemoveCompany}
                disabled={removing}
              >
                {removing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Year Selector Modal */}
      <Modal
        visible={showYearSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={closeYearSelector}
      >
        <TouchableOpacity 
          style={styles.yearModalOverlay}
          activeOpacity={1}
          onPress={closeYearSelector}
        >
          <TouchableOpacity 
            style={styles.yearModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.yearModalHeader}>
              <Text style={styles.yearModalTitle}>Select School Year</Text>
              <TouchableOpacity onPress={closeYearSelector}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yearModalBody} showsVerticalScrollIndicator={false}>
              {schoolYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    selectedSchoolYear === year && styles.yearOptionSelected
                  ]}
                  onPress={() => handleYearSelect(year)}
                >
                  <Text style={[
                    styles.yearOptionText,
                    selectedSchoolYear === year && styles.yearOptionTextSelected
                  ]}>
                    {year}
                  </Text>
                  {selectedSchoolYear === year && (
                    <MaterialIcons name="check" size={20} color="#F56E0F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    flexWrap: 'wrap',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
    marginRight: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34a853',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  yearText: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    marginRight: 4,
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
  partnershipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  partnershipText: {
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
  slotsContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  slotLabelHeader: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  slotValueHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F56E0F', // Primary orange
  },
  slotLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.9,
    fontWeight: '500',
    marginBottom: 8,
  },
  moaContainer: {
    marginBottom: 10,
  },
  moaStatusText: {
    fontSize: 15,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
  },
  moaValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F56E0F', // Primary orange
  },
  moaDate: {
    fontSize: 13,
    color: '#FBFBFB', // Light text
    opacity: 0.8,
    marginTop: 4,
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
  approveButton: {
    backgroundColor: '#34a853', // Green
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
  // Year Selector Modal Styles
  yearModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  yearModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  yearModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yearModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#02050a',
  },
  yearModalBody: {
    maxHeight: 300,
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#02050a',
  },
  yearOptionTextSelected: {
    color: '#F56E0F',
    fontWeight: '600',
  },
  // Approve Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#FBFBFB',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.9,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#878787',
  },
  modalConfirmButton: {
    backgroundColor: '#34a853',
  },
  modalButtonText: {
    color: '#FBFBFB',
    fontSize: 14,
    fontWeight: '600',
  },
  modalWarningIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalDeleteButton: {
    backgroundColor: '#ea4335',
  },
});
