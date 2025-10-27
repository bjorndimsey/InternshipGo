import React, { useState, useEffect } from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import FileUploadModal from '../../../components/FileUploadModal';
import CompanyLocationMap from '../../../components/CompanyLocationMap';

const { width } = Dimensions.get('window');

interface Company {
  id: string;
  userId: string;
  name: string;
  profilePicture?: string;
  industry: string;
  address: string; // Changed from location to address to match schema
  email: string;
  status: 'active' | 'inactive';
  joinDate: string;
  updatedAt: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  schoolYear: string;
  partnerStatus: 'active' | 'inactive';
  partnershipStatus: 'pending' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
  // Fields from migrate-add-company-fields.sql
  qualifications?: string;
  skillsRequired?: string;
  companyDescription?: string;
  phoneNumber?: string;
  contactPerson?: string;
  companySize?: string;
  foundedYear?: number;
  benefits?: string;
  workEnvironment?: string;
  availableInternSlots?: number;
  totalInternCapacity?: number;
  currentInternCount?: number;
  // Matching algorithm fields
  matchingScore?: number;
  matchingReasons?: string[];
  program?: string;
  major?: string;
  // Location-based matching fields
  distance?: number;
  distanceText?: string;
}

interface InternStats {
  activeInterns: number;
  activeCompanies: number;
  currentSchoolYear: string;
  totalApplications: number;
  pendingApprovals: number;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
}

interface DashboardHomeProps {
  currentUser: UserInfo | null;
}

export default function DashboardHome({ currentUser }: DashboardHomeProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<InternStats>({
    activeInterns: 0,
    activeCompanies: 0,
    currentSchoolYear: '2024-2025',
    totalApplications: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedCompanyForUpload, setSelectedCompanyForUpload] = useState<Company | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);
  const [coordinatorProfile, setCoordinatorProfile] = useState<any>(null);
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    activeInterns: 0,
    activeCompanies: 0,
    totalApplications: 0,
    pendingApprovals: 0,
  });
  const [statsAnimation] = useState(new Animated.Value(0));

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

  useEffect(() => {
    const initializeData = async () => {
      if (currentUser) {
        await fetchCoordinatorProfile();
        await fetchCurrentUserLocation();
      }
    };
    initializeData();
  }, [currentUser]);

  useEffect(() => {
    if (coordinatorProfile) {
      // If currentUserLocation is still null after fetching, set a default
      if (!currentUserLocation) {
        console.log('🔄 Setting fallback location since currentUserLocation is null');
        setCurrentUserLocation({
          latitude: 7.0731, // Davao City coordinates as default
          longitude: 125.6128,
          profilePicture: undefined
        });
      } else {
    fetchData();
      }
    }
  }, [coordinatorProfile, currentUserLocation]);

  // Additional effect to handle the case where location is set after coordinatorProfile
  useEffect(() => {
    if (coordinatorProfile && currentUserLocation) {
      console.log('📍 Both coordinatorProfile and currentUserLocation are available, fetching data');
      fetchData();
    }
  }, [coordinatorProfile, currentUserLocation]);

  const fetchCoordinatorProfile = async () => {
    try {
      console.log('🔍 fetchCoordinatorProfile called');
      console.log('👤 Current user:', currentUser);
      
      if (!currentUser) {
        console.log('❌ No current user found');
        return;
      }
      
      console.log('🔍 Fetching coordinator profile for user ID:', currentUser.id);
      const response = await apiService.getProfile(currentUser.id);
      console.log('📊 Coordinator profile response:', response);
      
      if (response.success && response.user) {
        console.log('✅ Coordinator profile fetched successfully:', response.user);
        console.log('👤 Profile data:', {
          program: response.user.program,
          skills: response.user.skills,
          workExperience: response.user.workExperience,
          yearsOfExperience: response.user.yearsOfExperience
        });
        setCoordinatorProfile(response.user);
        setMatchingEnabled(true);
        console.log('✅ Coordinator profile state set successfully');
      } else {
        console.log('❌ Failed to fetch coordinator profile:', response.message);
        // Set a fallback profile for testing
        const fallbackProfile = {
          program: 'BSIT',
          skills: 'HTML, CSS, JavaScript, TypeScript, React, Node.js',
          workExperience: '5 years in web development and software engineering',
          yearsOfExperience: 5,
          managedCompanies: 10,
          successfulPlacements: 25,
          achievements: 'Coordinator of the Year 2023'
        };
        console.log('🔄 Using fallback profile for testing:', fallbackProfile);
        setCoordinatorProfile(fallbackProfile);
        setMatchingEnabled(true);
        console.log('✅ Fallback coordinator profile state set successfully');
      }
    } catch (error) {
      console.error('❌ Error fetching coordinator profile:', error);
      // Set a fallback profile for testing
      const fallbackProfile = {
        program: 'BSIT',
        skills: 'HTML, CSS, JavaScript, TypeScript, React, Node.js',
        workExperience: '5 years in web development and software engineering',
        yearsOfExperience: 5,
        managedCompanies: 10,
        successfulPlacements: 25,
        achievements: 'Coordinator of the Year 2023'
      };
      console.log('🔄 Using fallback profile due to error:', fallbackProfile);
      setCoordinatorProfile(fallbackProfile);
      setMatchingEnabled(true);
      console.log('✅ Error fallback coordinator profile state set successfully');
    }
  };

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, selectedSchoolYear, companies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching pending companies from API...');
      const response = await apiService.getCompanies();
      
      if (response.success && response.companies && Array.isArray(response.companies)) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        console.log('📊 Sample company data:', response.companies[0]);
        
        // Filter to only get pending companies (not approved)
        const pendingCompanies = response.companies.filter(company => 
          company.partnershipStatus === 'pending' || 
          !company.partnershipStatus || // Include companies without partnership status set
          company.partnershipStatus === 'rejected' // Include rejected companies for review
        );
        
        console.log('📋 Pending companies found:', pendingCompanies.length);
        console.log('📊 Pending companies sample:', pendingCompanies[0]);
        
        // Process pending companies with matching algorithm
        const processedCompanies = await processCompaniesWithMatching(pendingCompanies);
        setCompanies(processedCompanies);
        
        // Calculate stats from real data - only count pending companies
        const mockStats: InternStats = {
          activeInterns: 0, // This would need to be calculated from internships table
          activeCompanies: processedCompanies.length, // Shows pending companies count
          currentSchoolYear: '2024-2025',
          totalApplications: 0, // This would need to be calculated from applications table
          pendingApprovals: processedCompanies.length, // Shows pending approvals count
        };
        setStats(mockStats);
        
        // Animate stats counting
        animateStats(mockStats);
      } else {
        console.error('❌ Failed to fetch companies:', response.message);
        setCompanies([]); // Set empty array as fallback
        Alert.alert('Error', response.message || 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setCompanies([]); // Set empty array as fallback
      Alert.alert('Error', 'Failed to fetch companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserLocation = async () => {
    try {
      if (!currentUser) {
        console.log('❌ No current user found for location fetching');
        return;
      }

      console.log('🔍 Fetching current user location for ID:', currentUser.id);
      const response = await apiService.getProfile(currentUser.id);
      console.log('📍 Location fetch response:', response);
      
      if (response.success && response.user) {
        const user = response.user;
        console.log('📍 User profile data:', {
          latitude: user.latitude,
          longitude: user.longitude,
          hasLocation: user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined
        });
        
        // Check if user has saved location coordinates
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          console.log('✅ User has location data, setting currentUserLocation');
          setCurrentUserLocation({
            latitude: user.latitude,
            longitude: user.longitude,
            profilePicture: user.profilePicture
          });
          console.log('📍 Current user location set:', {
            latitude: user.latitude,
            longitude: user.longitude
          });
        } else {
          console.log('❌ User has no location data - latitude:', user.latitude, 'longitude:', user.longitude);
          // Set a default location for Davao region if no location is saved
          console.log('🔄 Setting default location for Davao region');
          setCurrentUserLocation({
            latitude: 7.0731, // Davao City coordinates as default
            longitude: 125.6128,
            profilePicture: user.profilePicture
          });
          console.log('📍 Default location set for Davao region');
        }
      } else {
        console.log('❌ Failed to fetch user profile for location');
        // Set default location even if API fails
        console.log('🔄 Setting default location due to API failure');
        setCurrentUserLocation({
          latitude: 7.0731, // Davao City coordinates as default
          longitude: 125.6128,
          profilePicture: undefined
        });
      }
    } catch (error) {
      console.error('❌ Error fetching current user location:', error);
      // Set default location even if there's an error
      console.log('🔄 Setting default location due to error');
      setCurrentUserLocation({
        latitude: 7.0731, // Davao City coordinates as default
        longitude: 125.6128,
        profilePicture: undefined
      });
    }
  };

  // Matching Algorithm Functions
  const processCompaniesWithMatching = async (companies: Company[]): Promise<Company[]> => {
    console.log('🎯 Processing companies with matching...');
    console.log('👤 Coordinator profile state:', coordinatorProfile);
    console.log('🔧 Matching enabled state:', matchingEnabled);
    console.log('📍 Current user location:', currentUserLocation);
    
    // Always process companies, even if coordinator profile is not available
    if (!coordinatorProfile) {
      console.log('⚠️ No coordinator profile available, processing companies without matching');
      return companies.map(company => {
        const distanceResult = calculateDistance(company);
        return {
          ...company,
          matchingScore: 0,
          matchingReasons: ['No coordinator profile available'],
          distance: distanceResult.distance,
          distanceText: distanceResult.distanceText
        };
      });
    }

    if (!matchingEnabled) {
      console.log('⚠️ Matching disabled, processing companies without matching');
      return companies.map(company => {
        const distanceResult = calculateDistance(company);
        return {
          ...company,
          matchingScore: 0,
          matchingReasons: ['Matching disabled'],
          distance: distanceResult.distance,
          distanceText: distanceResult.distanceText
        };
      });
    }

    console.log('🎯 Processing companies with matching algorithm...');
    console.log('👤 Coordinator profile:', coordinatorProfile);
    console.log('🏢 Companies to process:', companies.length);
    
    const processedCompanies = companies.map(company => {
      const matchingResult = calculateMatchingScore(coordinatorProfile, company);
      const distanceResult = calculateDistance(company);
      console.log(`📊 Company ${company.name} - Score: ${matchingResult.score}, Distance: ${distanceResult.distanceText}, Reasons:`, matchingResult.reasons);
      return {
        ...company,
        matchingScore: matchingResult.score,
        matchingReasons: matchingResult.reasons,
        distance: distanceResult.distance,
        distanceText: distanceResult.distanceText
      };
    });

    // Sort by matching score first, then by distance (closest first)
    processedCompanies.sort((a, b) => {
      const scoreDiff = (b.matchingScore || 0) - (a.matchingScore || 0);
      if (Math.abs(scoreDiff) < 0.1) { // If scores are very close, sort by distance
        return (a.distance || Infinity) - (b.distance || Infinity);
      }
      return scoreDiff;
    });
    
    console.log('✅ Companies processed with matching scores and distances');
    console.log('📈 Sorted companies:', processedCompanies.map(c => ({ 
      name: c.name, 
      score: c.matchingScore, 
      distance: c.distanceText 
    })));
    return processedCompanies;
  };

  const calculateMatchingScore = (coordinator: any, company: any): { score: number; reasons: string[] } => {
    let totalScore = 0;
    const reasons: string[] = [];

    // 40% - Course Match
    const courseScore = calculateCourseMatch(coordinator, company);
    totalScore += courseScore * 0.4;
    if (courseScore > 0) {
      reasons.push(`Course relevance: ${Math.round(courseScore * 100)}%`);
    }

    // 30% - Skills Match
    const skillsScore = calculateSkillsMatch(coordinator, company);
    totalScore += skillsScore * 0.3;
    if (skillsScore > 0) {
      reasons.push(`Skills match: ${Math.round(skillsScore * 100)}%`);
    }

    // 15% - Experience Match
    const experienceScore = calculateExperienceMatch(coordinator, company);
    totalScore += experienceScore * 0.15;
    if (experienceScore > 0) {
      reasons.push(`Experience relevance: ${Math.round(experienceScore * 100)}%`);
    }

    // 10% - System Inferred Relevance
    const systemScore = calculateSystemRelevance(coordinator, company);
    totalScore += systemScore * 0.1;
    if (systemScore > 0) {
      reasons.push(`System relevance: ${Math.round(systemScore * 100)}%`);
    }

    return {
      score: Math.min(Math.max(totalScore, 0), 1), // Clamp between 0 and 1
      reasons: reasons
    };
  };

  const calculateCourseMatch = (coordinator: any, company: any): number => {
    if (!coordinator.program || !company.industry) {
      console.log(`📚 Course match - Missing data: program=${coordinator.program}, industry=${company.industry}`);
      return 0;
    }

    const coordinatorProgram = coordinator.program.toLowerCase();
    const companyIndustry = company.industry.toLowerCase();

    console.log(`📚 Course match - Program: ${coordinatorProgram}, Industry: ${companyIndustry}`);

    // Check for direct program matches in industry
    if (companyIndustry.includes(coordinatorProgram)) {
      console.log(`📚 Course match - Direct match found: ${coordinatorProgram}`);
      return 1.0;
    }

    // Check for related programs in industry
    const programKeywords = {
      'bsit': ['information technology', 'it', 'computer science', 'software engineering', 'web development', 'mobile development', 'technology'],
      'bscs': ['computer science', 'cs', 'information technology', 'software engineering', 'technology', 'it'],
      'bsis': ['information systems', 'is', 'information technology', 'business technology', 'technology', 'it'],
      'bse': ['education', 'teaching', 'pedagogy', 'academic'],
      'bsba': ['business administration', 'business', 'management', 'marketing', 'commerce'],
      'bsa': ['accountancy', 'accounting', 'finance', 'financial'],
      'bsn': ['nursing', 'healthcare', 'medical', 'health'],
      'bsm': ['medicine', 'medical', 'healthcare', 'health']
    };

    const keywords = programKeywords[coordinatorProgram as keyof typeof programKeywords] || [];
    const matchCount = keywords.filter(keyword => 
      companyIndustry.includes(keyword)
    ).length;

    const score = keywords.length > 0 ? matchCount / keywords.length : 0;
    console.log(`📚 Course match - Keywords: ${keywords.join(', ')}, Matches: ${matchCount}, Score: ${score}`);
    return score;
  };

  const calculateSkillsMatch = (coordinator: any, company: any): number => {
    if (!coordinator.skills || (!company.skillsRequired && !company.qualifications)) {
      console.log(`🔧 Skills match - Missing data: skills=${coordinator.skills}, skillsRequired=${company.skillsRequired}, qualifications=${company.qualifications}`);
      return 0;
    }

    const coordinatorSkills = coordinator.skills.toLowerCase().split(',').map((s: string) => s.trim());
    
    // Use both skillsRequired and qualifications for better matching
    const companySkillsText = `${company.skillsRequired || ''} ${company.qualifications || ''}`.toLowerCase();
    const companySkills = companySkillsText.split(/[,\s]+/).filter(s => s.length > 0);

    console.log(`🔧 Skills match - Coordinator: [${coordinatorSkills.join(', ')}], Company: [${companySkills.join(', ')}]`);

    const matchingSkills = coordinatorSkills.filter((skill: string) =>
      companySkills.some((reqSkill: string) => 
        reqSkill.includes(skill) || skill.includes(reqSkill)
      )
    );

    const score = companySkills.length > 0 ? matchingSkills.length / companySkills.length : 0;
    console.log(`🔧 Skills match - Matching: [${matchingSkills.join(', ')}], Score: ${score}`);
    return score;
  };

  const calculateExperienceMatch = (coordinator: any, company: any): number => {
    if (!coordinator.workExperience || !company.industry) return 0;

    const coordinatorExperience = coordinator.workExperience.toLowerCase();
    const companyIndustry = company.industry.toLowerCase();

    // Check if coordinator's experience matches company industry
    if (coordinatorExperience.includes(companyIndustry)) {
      return 1.0;
    }

    // Check for related industry keywords
    const industryKeywords = {
      'technology': ['software', 'it', 'tech', 'digital', 'computer'],
      'healthcare': ['medical', 'health', 'hospital', 'clinic', 'pharmaceutical'],
      'education': ['school', 'university', 'academic', 'teaching', 'learning'],
      'finance': ['banking', 'financial', 'accounting', 'investment', 'insurance'],
      'retail': ['commerce', 'sales', 'marketing', 'customer', 'business']
    };

    const keywords = industryKeywords[companyIndustry as keyof typeof industryKeywords] || [];
    const matchCount = keywords.filter(keyword => 
      coordinatorExperience.includes(keyword)
    ).length;

    return keywords.length > 0 ? matchCount / keywords.length : 0;
  };

  const calculateSystemRelevance = (coordinator: any, company: any): number => {
    let score = 0;

    // Check for achievements and certifications
    if (coordinator.achievements && coordinator.achievements.length > 0) {
      score += 0.3;
    }

    // Check for years of experience
    if (coordinator.yearsOfExperience && coordinator.yearsOfExperience > 3) {
      score += 0.3;
    }

    // Check for successful placements
    if (coordinator.successfulPlacements && coordinator.successfulPlacements > 5) {
      score += 0.2;
    }

    // Check for managed companies
    if (coordinator.managedCompanies && coordinator.managedCompanies > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  };

  // Distance calculation function using Haversine formula
  const calculateDistance = (company: Company): { distance: number; distanceText: string } => {
    console.log('🔍 Calculating distance for company:', company.name);
    console.log('📍 Company coordinates:', { lat: company.latitude, lng: company.longitude });
    console.log('📍 User location:', currentUserLocation);
    
    if (!currentUserLocation || !company.latitude || !company.longitude) {
      console.log('❌ Missing location data - user:', !!currentUserLocation, 'company lat:', company.latitude, 'company lng:', company.longitude);
      return {
        distance: Infinity,
        distanceText: 'Location unavailable'
      };
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(company.latitude - currentUserLocation.latitude);
    const dLon = toRadians(company.longitude - currentUserLocation.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(currentUserLocation.latitude)) * 
      Math.cos(toRadians(company.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    let distanceText: string;
    if (distance < 1) {
      distanceText = `${Math.round(distance * 1000)}m away`;
    } else if (distance < 10) {
      distanceText = `${distance.toFixed(1)}km away`;
    } else {
      distanceText = `${Math.round(distance)}km away`;
    }

    console.log('✅ Distance calculated:', { distance, distanceText });
    return {
      distance,
      distanceText
    };
  };

  // Helper function to convert degrees to radians
  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const filterCompanies = () => {
    let filtered = companies;

    // Companies are already filtered to pending in fetchData, so no need to filter again
    // Just apply search and school year filters

    // Filter by school year
    filtered = filtered.filter(company => company.schoolYear === selectedSchoolYear);

    // Filter by search query - now includes more fields from the migration
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (company.qualifications && company.qualifications.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (company.skillsRequired && company.skillsRequired.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (company.companyDescription && company.companyDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (company.contactPerson && company.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  const handleViewProfile = (company: Company) => {
    Alert.alert(
      'Company Profile',
      `Viewing profile for ${company.name}`,
      [{ text: 'OK' }]
    );
  };

  const handlePartnerAction = (company: Company) => {
    setSelectedCompanyForUpload(company);
    setShowFileUploadModal(true);
  };

  const handleFileUploadSuccess = (url: string, publicId: string) => {
    console.log('File uploaded successfully:', { url, publicId });
    
    // Show success modal
    const companyName = selectedCompanyForUpload?.name || 'Company';
    setSuccessMessage(`MOA document successfully uploaded for ${companyName}! The company has been notified and the partnership process can now proceed.`);
    setShowSuccessModal(true);
    
    // Close the file upload modal
    closeFileUploadModal();
  };

  const closeFileUploadModal = () => {
    setShowFileUploadModal(false);
    setSelectedCompanyForUpload(null);
  };

  const handleViewLocation = () => {
    if (selectedCompany) {
      setShowLocationMap(true);
    }
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  const handleYearSelect = (year: string) => {
    setSelectedSchoolYear(year);
    setShowYearSelector(false);
  };

  const closeYearSelector = () => {
    setShowYearSelector(false);
  };

  const animateStats = (targetStats: InternStats) => {
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const animateStep = () => {
      if (currentStep <= steps) {
        const progress = currentStep / steps;
        
        setAnimatedStats({
          activeInterns: Math.floor(targetStats.activeInterns * progress),
          activeCompanies: Math.floor(targetStats.activeCompanies * progress),
          totalApplications: Math.floor(targetStats.totalApplications * progress),
          pendingApprovals: Math.floor(targetStats.pendingApprovals * progress),
        });
        
        currentStep++;
        setTimeout(animateStep, stepDuration);
      }
    };
    
    animateStep();
  };

  // Skeleton Loading Components
  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonText} />
        </View>
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
      <View style={styles.skeletonActions}>
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonButton} />
      </View>
    </View>
  );

  const SkeletonStatCard = () => (
    <View style={styles.skeletonStatCard}>
      <View style={styles.skeletonStatIcon} />
      <View style={styles.skeletonStatNumber} />
      <View style={styles.skeletonStatLabel} />
      <View style={styles.skeletonStatSubLabel} />
    </View>
  );

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

  const getPartnerStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      default: return '#666';
    }
  };

  const getPartnerStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Partner';
      case 'inactive': return 'Not Partner';
      default: return 'Unknown';
    }
  };

  const CompanyCard = ({ company }: { company: Company }) => (
    <View style={styles.companyCard}>
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
          <Text style={styles.schoolYear}>School Year: {company.schoolYear}</Text>
          {company.qualifications && (
            <Text style={styles.qualificationsText}>Qualifications: {company.qualifications}</Text>
          )}
          {company.contactPerson && (
            <Text style={styles.contactText}>Contact: {company.contactPerson}</Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.partnerBadge, { backgroundColor: getPartnerStatusColor(company.partnerStatus) }]}>
            <Text style={styles.partnerText}>{getPartnerStatusText(company.partnerStatus)}</Text>
          </View>
        </View>
      </View>

      {/* Matching Score and Distance Display */}
      {(company.matchingScore !== undefined || company.distanceText) && (
        <View style={styles.matchingContainer}>
          <View style={styles.matchingScoreContainer}>
            {company.matchingScore !== undefined && (
              <>
                <MaterialIcons name="trending-up" size={16} color="#34a853" />
                <Text style={styles.matchingScoreText}>
                  {Math.round(company.matchingScore * 100)}% Match
                </Text>
              </>
            )}
            {company.distanceText && (
              <>
                <MaterialIcons name="location-on" size={16} color="#4285f4" style={{ marginLeft: 16 }} />
                <Text style={styles.distanceText}>
                  {company.distanceText}
                </Text>
              </>
            )}
          </View>
          {company.matchingReasons && company.matchingReasons.length > 0 && (
            <View style={styles.matchingReasonsContainer}>
              {company.matchingReasons.slice(0, 2).map((reason, index) => (
                <Text key={index} style={styles.matchingReasonText}>
                  • {reason}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.companyDetails}>
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>{company.address}</Text>
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
                  backgroundColor: company.availableSlots > 0 ? '#34a853' : '#ea4335'
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.moaContainer}>
          <Text style={styles.moaLabel}>MOA Status:</Text>
          <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
            <Text style={styles.moaText}>{getMOAStatusText(company.moaStatus)}</Text>
          </View>
          {company.moaExpiryDate && (
            <Text style={styles.moaDate}>Expires: {company.moaExpiryDate}</Text>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {company.description}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewDetails(company)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.partnerButton]} 
          onPress={() => handlePartnerAction(company)}
        >
          <MaterialIcons name="handshake" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Partner</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Section Skeleton */}
        <View style={styles.welcomeSection}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>

        {/* Stats Section Skeleton */}
        <View style={styles.statsSection}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </View>

        {/* Search Section Skeleton */}
        <View style={styles.searchSection}>
          <View style={styles.skeletonSearchBar} />
        </View>

        {/* Companies Section Skeleton */}
        <View style={styles.companiesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back, Coordinator!</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your internship program and track student progress.
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <MaterialIcons name="business-center" size={32} color="#F4D03F" />
          <Text style={styles.statNumber}>{animatedStats.activeCompanies}</Text>
          <Text style={styles.statLabel}>Pending Companies</Text>
          <Text style={styles.statSubLabel}>{stats.currentSchoolYear}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="work" size={32} color="#2D5A3D" />
          <Text style={styles.statNumber}>{animatedStats.totalApplications}</Text>
          <Text style={styles.statLabel}>Total Applications</Text>
          <Text style={styles.statSubLabel}>This Year</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="pending" size={32} color="#E8A598" />
          <Text style={styles.statNumber}>{animatedStats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending Approvals</Text>
          <Text style={styles.statSubLabel}>Needs Review</Text>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pending companies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#878787"
            />
          </View>
        </View>
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>School Year:</Text>
          <TouchableOpacity 
            style={styles.yearSelector}
            onPress={() => setShowYearSelector(true)}
          >
            <Text style={styles.yearText}>{selectedSchoolYear}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Companies Section */}
      <View style={styles.companiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {coordinatorProfile ? 'Personalized Pending Company Matches' : 'Pending Companies for Review'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {coordinatorProfile 
              ? `${filteredCompanies.length} pending companies ranked by relevance and distance for ${coordinatorProfile.program || 'your program'}`
              : `${filteredCompanies.length} pending companies awaiting approval for ${selectedSchoolYear}`
            }
          </Text>
          {coordinatorProfile && (
            <Text style={styles.matchingInfoText}>
              Based on your skills, experience, program: {coordinatorProfile.program}, and proximity to your location
            </Text>
          )}
        </View>

        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No pending companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : `No pending companies available for ${selectedSchoolYear}`
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </View>

      {/* Company Details Modal */}
      <Modal
        visible={showCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCompanyModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeCompanyModal}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedCompany && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <View style={styles.modalTitleRow}>
                      <Image
                        source={{ uri: selectedCompany.profilePicture || 'https://via.placeholder.com/50x50?text=Company' }}
                        style={styles.modalProfilePicture}
                        defaultSource={{ uri: 'https://via.placeholder.com/50x50?text=Company' }}
                      />
                      <View style={styles.modalTitleTextContainer}>
                        <Text style={styles.modalTitle}>Company Details</Text>
                        <Text style={styles.modalSubtitle}>{selectedCompany.name}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Modal Body */}
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Company Profile Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Company Profile</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="business" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Company Name</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.name}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="work" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Industry</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.industry}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="location-on" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Address</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.address}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="email" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Email</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.email}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="language" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Website</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.website || 'Not provided'}</Text>
                        </View>
                      </View>
                      {selectedCompany.qualifications && (
                        <View style={styles.modalInfoRow}>
                          <MaterialIcons name="school" size={20} color="#4285f4" />
                          <View style={styles.modalInfoContent}>
                            <Text style={styles.modalInfoLabel}>Qualifications</Text>
                            <Text style={styles.modalInfoValue}>{selectedCompany.qualifications}</Text>
                          </View>
                        </View>
                      )}
                      {selectedCompany.skillsRequired && (
                        <View style={styles.modalInfoRow}>
                          <MaterialIcons name="code" size={20} color="#4285f4" />
                          <View style={styles.modalInfoContent}>
                            <Text style={styles.modalInfoLabel}>Skills Required</Text>
                            <Text style={styles.modalInfoValue}>{selectedCompany.skillsRequired}</Text>
                          </View>
                        </View>
                      )}
                      {selectedCompany.contactPerson && (
                        <View style={styles.modalInfoRow}>
                          <MaterialIcons name="person" size={20} color="#4285f4" />
                          <View style={styles.modalInfoContent}>
                            <Text style={styles.modalInfoLabel}>Contact Person</Text>
                            <Text style={styles.modalInfoValue}>{selectedCompany.contactPerson}</Text>
                          </View>
                        </View>
                      )}
                      {selectedCompany.companySize && (
                        <View style={styles.modalInfoRow}>
                          <MaterialIcons name="group" size={20} color="#4285f4" />
                          <View style={styles.modalInfoContent}>
                            <Text style={styles.modalInfoLabel}>Company Size</Text>
                            <Text style={styles.modalInfoValue}>{selectedCompany.companySize}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Information Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Status Information</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="check-circle" size={20} color={selectedCompany.status === 'active' ? '#34a853' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Account Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.status === 'active' ? '#34a853' : '#ea4335' }]}>
                            {selectedCompany.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="handshake" size={20} color={selectedCompany.partnerStatus === 'active' ? '#34a853' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Partner Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.partnerStatus === 'active' ? '#34a853' : '#ea4335' }]}>
                            {selectedCompany.partnerStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="description" size={20} color={selectedCompany.moaStatus === 'active' ? '#34a853' : selectedCompany.moaStatus === 'pending' ? '#fbbc04' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>MOA Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.moaStatus === 'active' ? '#34a853' : selectedCompany.moaStatus === 'pending' ? '#fbbc04' : '#ea4335' }]}>
                            {selectedCompany.moaStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="school" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>School Year</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.schoolYear}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Capacity & Opportunities Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Capacity & Opportunities</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="people" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Available Slots</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.availableSlots}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="group" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Total Slots</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.totalSlots}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="trending-up" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Utilization</Text>
                          <Text style={styles.modalInfoValue}>
                            {selectedCompany.totalSlots > 0 ? Math.round((selectedCompany.availableSlots / selectedCompany.totalSlots) * 100) : 0}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Matching Information Section */}
                  {(selectedCompany.matchingScore !== undefined || selectedCompany.distanceText) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Matching Analysis</Text>
                      <View style={styles.modalInfoCard}>
                        {selectedCompany.matchingScore !== undefined && (
                          <View style={styles.modalInfoRow}>
                            <MaterialIcons name="trending-up" size={20} color="#34a853" />
                            <View style={styles.modalInfoContent}>
                              <Text style={styles.modalInfoLabel}>Overall Match Score</Text>
                              <Text style={[styles.modalInfoValue, { color: '#34a853', fontWeight: 'bold' }]}>
                                {Math.round(selectedCompany.matchingScore * 100)}%
                              </Text>
                            </View>
                          </View>
                        )}
                        {selectedCompany.distanceText && (
                          <View style={styles.modalInfoRow}>
                            <MaterialIcons name="location-on" size={20} color="#4285f4" />
                            <View style={styles.modalInfoContent}>
                              <Text style={styles.modalInfoLabel}>Distance from You</Text>
                              <Text style={[styles.modalInfoValue, { color: '#4285f4', fontWeight: 'bold' }]}>
                                {selectedCompany.distanceText}
                              </Text>
                            </View>
                          </View>
                        )}
                        {selectedCompany.matchingReasons && selectedCompany.matchingReasons.length > 0 && (
                          <View style={styles.modalInfoRow}>
                            <MaterialIcons name="list" size={20} color="#4285f4" />
                            <View style={styles.modalInfoContent}>
                              <Text style={styles.modalInfoLabel}>Match Reasons</Text>
                              {selectedCompany.matchingReasons.map((reason, index) => (
                                <Text key={index} style={[styles.modalInfoValue, { fontSize: 12, marginBottom: 2 }]}>
                                  • {reason}
                                </Text>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Additional Details Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Additional Details</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="info" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Description</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.description}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="calendar-today" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Join Date</Text>
                          <Text style={styles.modalInfoValue}>{new Date(selectedCompany.joinDate).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="update" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Last Updated</Text>
                          <Text style={styles.modalInfoValue}>{new Date(selectedCompany.updatedAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.locationButton]}
                    onPress={handleViewLocation}
                  >
                    <MaterialIcons name="location-on" size={16} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>View All Locations</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* File Upload Modal */}
      <FileUploadModal
        visible={showFileUploadModal}
        onClose={closeFileUploadModal}
        onUploadSuccess={handleFileUploadSuccess}
        companyName={selectedCompanyForUpload?.name || ''}
        companyId={selectedCompanyForUpload?.id || ''}
        uploadedBy={currentUser?.id || ''}
      />

      {/* Company Location Map */}
      <CompanyLocationMap
        visible={showLocationMap}
        onClose={closeLocationMap}
        companies={companies}
        currentUserLocation={currentUserLocation || undefined}
        selectedCompany={selectedCompany || undefined}
        selectedCoordinatorUserId={selectedCompany?.userId}
        onViewPictures={(companyId) => {
          console.log('📸 View Pictures clicked from map for company:', companyId);
          // Handle view pictures if needed
        }}
      />

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSuccessModal}
      >
        <TouchableOpacity 
          style={styles.successModalOverlay}
          activeOpacity={1}
          onPress={closeSuccessModal}
        >
          <TouchableOpacity 
            style={styles.successModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color="#34a853" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
                    <MaterialIcons name="check" size={20} color="#1E3A5F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255); ', // Gray background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#2A2A2E',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#2A2A2E',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 12,
    fontFamily: 'System',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    lineHeight: 24,
    opacity: 0.9,
    fontWeight: '400',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
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
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: '600',
  },
  statSubLabel: {
    fontSize: 10,
    color: '#878787', // Muted gray
    textAlign: 'center',
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
  searchContainer: {
    marginBottom: 15,
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
    color: '#F56E0F', // Primary orange
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
  },
  filterLabel: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
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
  companiesSection: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e', // Dark text
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666', // Dark gray
  },
  companyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    borderRadius: 35,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 6,
  },
  companyIndustry: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    marginBottom: 8,
  },
  schoolYear: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  partnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partnerText: {
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
    fontSize: 15,
    color: '#FBFBFB', // Light text
    marginLeft: 6,
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
    color: '#FBFBFB', // Light text
    marginRight: 8,
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F56E0F', // Primary orange
  },
  slotBar: {
    height: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 3,
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
    fontSize: 15,
    color: '#FBFBFB', // Light text
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
    color: '#FBFBFB', // Light text
  },
  moaDate: {
    fontSize: 13,
    color: '#FBFBFB', // Light text
    opacity: 0.8,
  },
  description: {
    fontSize: 15,
    color: '#FBFBFB', // Light text
    lineHeight: 22,
    opacity: 0.9,
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
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  profileButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  partnerButton: {
    backgroundColor: '#878787', // Muted gray
  },
  removeButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#FBFBFB', // Light text for all buttons
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#2A2A2E',
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
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  modalInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: '#34a853',
    borderColor: '#34a853',
  },
  contactButton: {
    backgroundColor: '#4285f4',
    borderColor: '#4285f4',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Matching algorithm styles
  matchingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#34a853',
  },
  matchingScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchingScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34a853',
    marginLeft: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285f4',
    marginLeft: 6,
  },
  matchingReasonsContainer: {
    marginTop: 4,
  },
  matchingReasonText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
    opacity: 0.9,
  },
  matchingInfoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  programText: {
    fontSize: 12,
    color: '#F4D03F',
    fontWeight: '500',
    marginTop: 2,
  },
  qualificationsText: {
    fontSize: 12,
    color: '#fff',
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.8,
  },
  contactText: {
    fontSize: 12,
    color: '#34a853',
    fontWeight: '500',
    marginTop: 2,
  },
  // Success Modal styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#34a853',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Skeleton Loading Styles
  skeletonCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    marginRight: 15,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 4,
    width: '50%',
  },
  skeletonText: {
    height: 14,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    width: '40%',
  },
  skeletonContent: {
    marginBottom: 15,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonLineShort: {
    height: 14,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    width: '60%',
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonButton: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
  },
  skeletonStatCard: {
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
  skeletonStatIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 16,
    marginBottom: 8,
  },
  skeletonStatNumber: {
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: 40,
  },
  skeletonStatLabel: {
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 4,
    width: 60,
  },
  skeletonStatSubLabel: {
    height: 10,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    width: 40,
  },
  skeletonSearchBar: {
    height: 48,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
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
    color: '#1E3A5F',
    fontWeight: '600',
  },
});
