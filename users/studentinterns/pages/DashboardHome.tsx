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
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import CompanyLocationMap from '../../../components/CompanyLocationMap';
import ResumeUploadModal from '../../../components/ResumeUploadModal';

const { width } = Dimensions.get('window');

// Matching Algorithm Functions
const calculateMatchingScore = (student: any, company: any): { score: number; reasons: string[] } => {
  let totalScore = 0;
  const reasons: string[] = [];
  
  // 40% - Course Match
  const courseScore = calculateCourseMatch(student, company);
  totalScore += courseScore * 0.4;
  if (courseScore > 0) {
    reasons.push(`Course match: ${Math.round(courseScore * 100)}%`);
  }
  
  // 30% - Skills Match
  const skillsScore = calculateSkillsMatch(student, company);
  totalScore += skillsScore * 0.3;
  if (skillsScore > 0) {
    reasons.push(`Skills match: ${Math.round(skillsScore * 100)}%`);
  }
  
  // 15% - Experience Match
  const experienceScore = calculateExperienceMatch(student, company);
  totalScore += experienceScore * 0.15;
  if (experienceScore > 0) {
    reasons.push(`Experience match: ${Math.round(experienceScore * 100)}%`);
  }
  
  // 10% - System Inferred Relevance (calculated but not displayed)
  const systemScore = calculateSystemRelevance(student, company);
  totalScore += systemScore * 0.1;
  // System relevance is included in calculation but not shown in display
  
  console.log(`🔍 Matching calculation for ${company.name}:`, {
    courseScore,
    skillsScore,
    experienceScore,
    systemScore,
    totalScore,
    reasons
  });
  
  const finalScore = Math.min(Math.max(totalScore, 0), 1); // Clamp between 0 and 1
  console.log(`🎯 Final matching score for ${company.name}: ${finalScore}`);
  
  return {
    score: finalScore,
    reasons: reasons
  };
};

const calculateCourseMatch = (student: any, company: any): number => {
  console.log(`📚 Course match - student program: ${student?.program}, company industry: ${company?.industry}`);
  if (!student?.program || !company?.industry) return 0;
  
  const program = student.program.toLowerCase();
  const industry = company.industry.toLowerCase();
  
  // Define course-industry mappings
  const courseIndustryMap: { [key: string]: string[] } = {
    'computer science': ['technology', 'software', 'it', 'tech', 'information technology'],
    'information technology': ['technology', 'software', 'it', 'tech', 'information technology'],
    'software engineering': ['technology', 'software', 'it', 'tech', 'information technology'],
    'business administration': ['business', 'finance', 'marketing', 'management', 'consulting'],
    'marketing': ['business', 'marketing', 'advertising', 'media', 'communications'],
    'accounting': ['finance', 'accounting', 'business', 'banking'],
    'engineering': ['engineering', 'manufacturing', 'technology', 'construction'],
    'nursing': ['healthcare', 'medical', 'hospital', 'health'],
    'psychology': ['healthcare', 'social services', 'counseling', 'human resources'],
    'education': ['education', 'training', 'academic', 'school']
  };
  
  const relevantIndustries = courseIndustryMap[program] || [];
  const matchFound = relevantIndustries.some(relIndustry => 
    industry.includes(relIndustry) || relIndustry.includes(industry)
  );
  
  console.log(`📚 Course match - program: ${program}, industry: ${industry}, relevant industries: [${relevantIndustries.join(', ')}], match found: ${matchFound}`);
  const score = matchFound ? 1 : 0;
  console.log(`📚 Course match score: ${score}`);
  return score;
};

const calculateSkillsMatch = (student: any, company: any): number => {
  console.log(`🛠️ Skills match - student skills: ${student?.skills}, company skills: ${company?.skillsRequired}`);
  if (!student?.skills || !company?.skillsRequired) return 0;
  
  const studentSkills = student.skills.toLowerCase().split(/[,\s]+/).filter((s: string) => s.length > 0);
  const requiredSkills = company.skillsRequired.toLowerCase().split(/[,\s]+/).filter((s: string) => s.length > 0);
  
  if (studentSkills.length === 0 || requiredSkills.length === 0) return 0;
  
  const matchedSkills = studentSkills.filter((skill: string) => 
    requiredSkills.some((reqSkill: string) => 
      skill.includes(reqSkill) || reqSkill.includes(skill) || 
      skill === reqSkill
    )
  );
  
  const score = matchedSkills.length / requiredSkills.length;
  console.log(`🛠️ Skills match - student skills: [${studentSkills.join(', ')}], required: [${requiredSkills.join(', ')}], matched: [${matchedSkills.join(', ')}], score: ${score}`);
  console.log(`🛠️ Skills match final score: ${score}`);
  return score;
};

const calculateExperienceMatch = (student: any, company: any): number => {
  console.log(`💼 Experience match - student experience: ${student?.work_experience}, student projects: ${student?.projects}, company industry: ${company?.industry}`);
  if (!student?.work_experience && !student?.projects) return 0;
  
  const experience = (student.work_experience || '').toLowerCase();
  const projects = (student.projects || '').toLowerCase();
  const industry = (company.industry || '').toLowerCase();
  
  let relevanceScore = 0;
  
  // Check work experience relevance
  if (experience.includes(industry) || experience.includes('intern') || experience.includes('work')) {
    relevanceScore += 0.5;
  }
  
  // Check project relevance
  if (projects.includes(industry) || projects.includes('project') || projects.includes('development')) {
    relevanceScore += 0.5;
  }
  
  console.log(`💼 Experience relevance score: ${relevanceScore}`);
  const finalScore = Math.min(relevanceScore, 1);
  console.log(`💼 Experience match final score: ${finalScore}`);
  return finalScore;
};

const calculateSystemRelevance = (student: any, company: any): number => {
  let score = 0;
  
  console.log(`🔍 System relevance - student data:`, {
    github_url: student?.github_url,
    portfolio_url: student?.portfolio_url,
    linkedin_url: student?.linkedin_url,
    gpa: student?.gpa,
    achievements: student?.achievements
  });
  
  // Check for portfolio/GitHub presence
  if (student?.github_url || student?.portfolio_url) {
    score += 0.3;
  }
  
  // Check for LinkedIn presence
  if (student?.linkedin_url) {
    score += 0.2;
  }
  
  // Check GPA (if available and good)
  if (student?.gpa && student.gpa >= 3.0) {
    score += 0.3;
  }
  
  // Check for achievements
  if (student?.achievements && student.achievements.trim().length > 0) {
    score += 0.2;
  }
  
  console.log(`🔍 System relevance score: ${score}`);
  const finalScore = Math.min(score, 1);
  console.log(`🔍 System relevance final score: ${finalScore}`);
  return finalScore;
};

// Distance calculation function using Haversine formula
const calculateDistance = (company: any, currentUserLocation: any): { distance: number; distanceText: string } => {
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
  console.log('📍 Distance calculation final result:', { distance, distanceText });
  return {
    distance,
    distanceText
  };
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

const rankCompaniesByRelevance = (companies: any[], student: any, currentUserLocation: any): any[] => {
  if (!student) return companies;
  
  return companies
    .map(company => {
      const matching = calculateMatchingScore(student, company);
      const distanceResult = calculateDistance(company, currentUserLocation);
      console.log(`🎯 Company ${company.name} matching score:`, matching.score, 'reasons:', matching.reasons);
      return {
        ...company,
        matchingScore: matching.score,
        matchingReasons: matching.reasons,
        distance: distanceResult.distance,
        distanceText: distanceResult.distanceText
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.matchingScore - a.matchingScore;
      if (Math.abs(scoreDiff) < 0.1) { // If scores are very close, sort by distance
        return (a.distance || Infinity) - (b.distance || Infinity);
      }
      return scoreDiff;
    }); // Sort by relevance score first, then by distance
};

const filterRelevantCompanies = (companies: any[], student: any, currentUserLocation: any): any[] => {
  if (!student) return companies;
  
  return companies
    .map(company => {
      const matching = calculateMatchingScore(student, company);
      const distanceResult = calculateDistance(company, currentUserLocation);
      console.log(`🎯 Company ${company.name} matching score:`, matching.score, 'reasons:', matching.reasons);
      return {
        ...company,
        matchingScore: matching.score,
        matchingReasons: matching.reasons,
        distance: distanceResult.distance,
        distanceText: distanceResult.distanceText
      };
    })
    .filter(company => {
      const willShow = company.matchingScore > 0.01;
      console.log(`🔍 Company ${company.name} - matching score: ${company.matchingScore}, will show: ${willShow}`);
      if (!willShow) {
        console.log(`❌ Filtering out ${company.name} due to low matching score: ${company.matchingScore}`);
      }
      return willShow; // Only show companies with at least 1% relevance (temporarily lowered for debugging)
    })
    .sort((a, b) => {
      const scoreDiff = b.matchingScore - a.matchingScore;
      if (Math.abs(scoreDiff) < 0.1) { // If scores are very close, sort by distance
        return (a.distance || Infinity) - (b.distance || Infinity);
      }
      return scoreDiff;
    }); // Sort by relevance score first, then by distance
};

interface Company {
  id: string;
  userId?: string; // Add user_id from users table
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  // Additional slot fields from database
  availableInternSlots?: number;
  totalInternCapacity?: number;
  currentInternCount?: number;
  description: string;
  website: string;
  isFavorite: boolean;
  rating: number;
  partnershipStatus: 'approved' | 'pending' | 'rejected';
  // Additional fields for matching
  qualifications?: string;
  skillsRequired?: string;
  matchingScore?: number;
  matchingReasons?: string[];
  // Location-based matching fields
  distance?: number;
  distanceText?: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface DashboardHomeProps {
  currentUser: UserInfo;
}

export default function DashboardHome({ currentUser }: DashboardHomeProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedCompanyForApplication, setSelectedCompanyForApplication] = useState<Company | null>(null);
  const [animatingHearts, setAnimatingHearts] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Animation values for stats
  const [animatedStats, setAnimatedStats] = useState({
    companyCount: 0,
    availableSlots: 0,
    favoritesCount: 0
  });

  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSkeleton) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [showSkeleton]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchStudentProfile();
      await fetchCurrentUserLocation();
    };
    initializeData();
  }, []);

  // Animation function for counting numbers
  const animateValue = (start: number, end: number, duration: number, callback: (value: number) => void) => {
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const currentValue = Math.floor(start + (end - start) * progress);
      callback(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  // Animate stats when companies data changes
  useEffect(() => {
    if (Array.isArray(companies) && companies.length > 0) {
      const totalSlots = companies.reduce((sum, company) => {
        if (!company) return sum;
        return sum + (company.availableInternSlots || company.availableSlots || 0);
      }, 0);
      const favoritesCount = companies.filter(company => company && company.isFavorite).length;
      
      // Animate company count
      animateValue(0, companies.length, 1500, (value) => {
        setAnimatedStats(prev => ({ ...prev, companyCount: value }));
      });
      
      // Animate available slots
      animateValue(0, totalSlots, 2000, (value) => {
        setAnimatedStats(prev => ({ ...prev, availableSlots: value }));
      });
      
      // Animate favorites count
      animateValue(0, favoritesCount, 1800, (value) => {
        setAnimatedStats(prev => ({ ...prev, favoritesCount: value }));
      });
    }
  }, [companies]);

  // Filter companies based on search query
  useEffect(() => {
    if (!Array.isArray(companies)) {
      setFilteredCompanies([]);
      return;
    }
    
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company => {
        if (!company) return false;
        
        const searchTerm = searchQuery.toLowerCase();
        return (
          (company.name && company.name.toLowerCase().includes(searchTerm)) ||
          (company.industry && company.industry.toLowerCase().includes(searchTerm)) ||
          (company.location && company.location.toLowerCase().includes(searchTerm)) ||
          (company.address && company.address.toLowerCase().includes(searchTerm)) ||
          (company.description && company.description.toLowerCase().includes(searchTerm))
        );
      });
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  useEffect(() => {
    if (studentProfile) {
      // If currentUserLocation is still null after fetching, set a default
      if (!currentUserLocation) {
        console.log('🔄 Setting fallback location since currentUserLocation is null');
        setCurrentUserLocation({
          latitude: 7.0731, // Davao City coordinates as default
          longitude: 125.6128,
          profilePicture: undefined
        });
      } else {
        fetchCompanies();
      }
    }
  }, [studentProfile, currentUserLocation]);

  // Additional effect to handle the case where location is set after studentProfile
  useEffect(() => {
    if (studentProfile && currentUserLocation) {
      console.log('📍 Both studentProfile and currentUserLocation are available, fetching companies');
      fetchCompanies();
    }
  }, [studentProfile, currentUserLocation]);

  const fetchStudentProfile = async () => {
    try {
      if (!currentUser) return;
      
      const response = await apiService.getProfile(currentUser.id);
      if (response.success && response.user) {
        setStudentProfile(response.user);
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      const response = await apiService.getAllCompanies();
      
      if (response.success && response.companies) {
        // Filter companies to only show those with approved partnership status
        let companies = response.companies.filter((company: any) => company.partnershipStatus === 'approved');
        console.log('📊 Companies received from API:', response.companies.length);
        console.log('📊 Companies with approved partnership:', companies.length);
        console.log('📊 Company details with slots:', companies.map((c: any) => ({
          name: c.name,
          partnershipStatus: c.partnershipStatus,
          moaStatus: c.moaStatus,
          availableSlots: c.availableSlots,
          totalSlots: c.totalSlots,
          availableInternSlots: c.availableInternSlots,
          totalInternCapacity: c.totalInternCapacity,
          currentInternCount: c.currentInternCount
        })));
        
        // Filter out companies where student has approved applications
        if (currentUser) {
          // Use currentUser.id directly as applications table uses user_id as student_id
          const userId = currentUser.id;
          console.log('🔍 Filtering out companies with approved applications for user:', userId);
            
          try {
            // Get all student applications (API expects user_id)
            const applicationResponse = await apiService.getStudentApplications(userId);
            console.log('📋 Student applications response:', applicationResponse);
            
            if (applicationResponse.success && applicationResponse.applications && applicationResponse.applications.length > 0) {
              // Filter to get only approved applications
              const approvedApplications = applicationResponse.applications.filter((app: any) => 
                app.status === 'approved'
              );
              console.log('✅ Approved applications found:', approvedApplications.length);
              console.log('📋 Approved applications details:', approvedApplications.map((app: any) => ({
                id: app.id,
                company_id: app.company_id,
                status: app.status
              })));
              
              if (approvedApplications.length > 0) {
              // Get list of company IDs with approved applications
              const approvedCompanyIds = approvedApplications.map((app: any) => app.company_id);
              console.log('🏢 Company IDs with approved applications:', approvedCompanyIds);
              console.log('🏢 Company IDs types:', approvedCompanyIds.map((id: any) => typeof id));
              
                // Filter out companies where student has approved application
              const originalCount = companies.length;
              console.log('🏢 Original companies before filtering:', companies.map((c: any) => ({ id: c.id, name: c.name, idType: typeof c.id })));
              
              companies = companies.filter((company: any) => {
                // Convert both to strings for comparison to handle type mismatches
                const companyIdStr = String(company.id);
                const hasApprovedApplication = approvedCompanyIds.some((approvedId: any) => String(approvedId) === companyIdStr);
                
                if (hasApprovedApplication) {
                    console.log(`❌ Hiding company ${company.name} (ID: ${company.id}, type: ${typeof company.id}) - student has approved application`);
                }
                
                return !hasApprovedApplication;
              });
              
              console.log(`📊 Companies filtered: ${originalCount} → ${companies.length} (removed ${originalCount - companies.length})`);
              console.log('🏢 Remaining companies after filtering:', companies.map((c: any) => ({ id: c.id, name: c.name })));
            } else {
                console.log('ℹ️ No approved applications found, showing all companies');
              }
            } else {
              console.log('ℹ️ No applications found or API error, showing all companies');
            }
          } catch (error) {
            console.error('❌ Error fetching student applications:', error);
            // Continue with all companies if there's an error
          }
        }
        
        // Apply skill-based matching if student profile is available (for ranking, not filtering)
        let relevantCompanies = companies;
        if (studentProfile) {
          console.log('👤 Student profile for matching:', {
            program: studentProfile.program,
            skills: studentProfile.skills,
            work_experience: studentProfile.work_experience,
            projects: studentProfile.projects,
            gpa: studentProfile.gpa,
            achievements: studentProfile.achievements
          });
          relevantCompanies = rankCompaniesByRelevance(companies, studentProfile, currentUserLocation);
          console.log('🎯 Companies after skill and location ranking:', relevantCompanies.length);
          console.log('📍 Current user location for matching:', currentUserLocation);
        }
        
        // Load favorite status for each company
        if (currentUser) {
          const companiesWithFavorites = await Promise.all(
            relevantCompanies.map(async (company: any) => {
              try {
                const studentResponse = await apiService.getProfile(currentUser.id);
                if (studentResponse.success && studentResponse.user) {
                  const studentId = studentResponse.user.student_id || studentResponse.user.id;
                  const favoriteResponse = await apiService.checkFavoriteStatus(studentId, company.id);
                  return {
                    ...company,
                    isFavorite: favoriteResponse.success ? (favoriteResponse.isFavorited || false) : false
                  };
                }
                return { ...company, isFavorite: false };
              } catch (error) {
                console.error(`Error checking favorite status for company ${company.id}:`, error);
                return { ...company, isFavorite: false };
              }
            })
          );
          setCompanies(companiesWithFavorites);
        } else {
          setCompanies(relevantCompanies.map((company: any) => ({ ...company, isFavorite: false })));
        }
      } else {
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

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleViewLocation = (company: Company) => {
    setSelectedCompany(company);
    setShowLocationMap(true);
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const handleToggleFavorite = async (companyId: string) => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Start animation and haptic feedback
      setAnimatingHearts(prev => new Set(prev).add(companyId));
      Vibration.vibrate(50); // Short vibration for feedback

      // Get the student ID from the current user
      const studentResponse = await apiService.getProfile(currentUser.id);
      if (!studentResponse.success || !studentResponse.user) {
        Alert.alert('Error', 'Failed to get student information');
        setAnimatingHearts(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
        return;
      }

      const studentId = studentResponse.user.student_id || studentResponse.user.id;

      // Toggle favorite using API
      const response = await apiService.toggleFavorite(studentId, companyId);
      
      if (response.success) {
        // Update local state
        setCompanies(companies.map(company => 
          company.id === companyId 
            ? { ...company, isFavorite: response.isFavorited || false }
            : company
        ));
        
        // Show success message
        Alert.alert(
          'Success', 
          (response.isFavorited || false)
            ? 'Company added to favorites!' 
            : 'Company removed from favorites!'
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    } finally {
      // Stop animation after a delay
      setTimeout(() => {
        setAnimatingHearts(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
      }, 1000);
    }
  };

  const handleApply = (company: Company) => {
    setSelectedCompanyForApplication(company);
    setShowResumeModal(true);
  };

  const toggleCardExpansion = (companyId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleApplicationSubmitted = () => {
    // Show success modal
    setSuccessMessage(`Your application for ${selectedCompanyForApplication?.name} has been submitted successfully!`);
    setShowSuccessModal(true);
  };

  const closeResumeModal = () => {
    setShowResumeModal(false);
    setSelectedCompanyForApplication(null);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  // Animated Heart Component
  const AnimatedHeart = ({ companyId, isFavorite }: { companyId: string; isFavorite: boolean }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const sparkAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;
    const isAnimating = animatingHearts.has(companyId);

    useEffect(() => {
      if (isAnimating) {
        // Enhanced bounce animation sequence
        Animated.sequence([
          // Initial scale up
          Animated.timing(scaleAnim, {
            toValue: 1.6,
            duration: 200,
            useNativeDriver: true,
          }),
          // Bounce back with spring
          Animated.spring(scaleAnim, {
            toValue: 0.9,
            tension: 150,
            friction: 4,
            useNativeDriver: true,
          }),
          // Final settle
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Enhanced rotation animation
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Pulse animation for added effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ).start();

        // Spark effect animation
        Animated.sequence([
          Animated.timing(sparkAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(sparkAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Additional bounce effect
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isAnimating]);

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const sparkOpacity = sparkAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const sparkScale = sparkAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1.5],
    });

    return (
      <View style={{ position: 'relative' }}>
        {/* Spark effects */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            opacity: sparkOpacity,
            transform: [{ scale: sparkScale }],
            zIndex: 1,
          }}
        >
          {/* Spark particles */}
          {[...Array(8)].map((_, index) => {
            const angle = (index * 45) * (Math.PI / 180);
            const radius = 20;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 4,
                  height: 4,
                  backgroundColor: isFavorite ? '#ea4335' : '#F4D03F',
                  borderRadius: 2,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: sparkScale },
                  ],
                }}
              />
            );
          })}
        </Animated.View>

        {/* Main heart icon */}
        <Animated.View
          style={{
            transform: [
              { scale: Animated.multiply(Animated.multiply(scaleAnim, pulseAnim), bounceAnim) },
              { rotate: rotate },
            ],
            shadowColor: isFavorite ? '#ea4335' : '#666',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isAnimating ? 1 : 0.3,
            shadowRadius: isAnimating ? 12 : 4,
            elevation: isAnimating ? 12 : 4,
            zIndex: 2,
            borderWidth: 2,
            borderColor: isFavorite ? '#ea4335' : '#F4D03F',
            borderRadius: 16,
            padding: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <MaterialIcons 
            name={isFavorite ? "favorite" : "favorite-border"} 
            size={24} 
            color={isFavorite ? "#ea4335" : "#F4D03F"} 
          />
        </Animated.View>
      </View>
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

  // Skeleton Components
  const SkeletonStatsCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonStatCard}>
        <Animated.View style={[styles.skeletonIcon, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonNumber, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLabel, { opacity: shimmerOpacity }]} />
      </View>
    );
  };

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
            <Animated.View style={[styles.skeletonCompanyName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonCompanyIndustry, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonRating, { opacity: shimmerOpacity }]} />
          </View>
          <Animated.View style={[styles.skeletonFavoriteButton, { opacity: shimmerOpacity }]} />
        </View>
        
        <View style={styles.skeletonCompanyDetails}>
          <Animated.View style={[styles.skeletonLocation, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonSlots, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonMOA, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonDescription, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonDescription, { opacity: shimmerOpacity }]} />
        </View>
        
        <View style={styles.skeletonActionButtons}>
          <Animated.View style={[styles.skeletonActionButton, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonActionButton, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  const CompanyCard = ({ company }: { company: Company }) => {
    const isExpanded = expandedCards.has(company.id);
    
    return (
      <View style={styles.companyCard}>
        <View style={styles.companyHeader}>
          <View style={styles.headerTopRow}>
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
                <Text style={styles.slotLabelHeader}>Available Slots : </Text>
                <Text style={styles.slotValueHeader}>
                  {company.availableInternSlots || company.availableSlots}/{company.totalInternCapacity || company.totalSlots}
                </Text>
              </View>
            </View>
            {/* Matching Score Box - Right side on desktop, hidden on mobile (shown below) */}
            {width >= 768 && (company.matchingScore !== undefined || company.distanceText) && (
              <View style={styles.matchingBoxCollapsed}>
                <View style={styles.matchingScoreContainerCollapsed}>
                  {company.matchingScore !== undefined && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="trending-up" size={16} color="#34a853" />
                      <Text style={styles.matchingScoreTextCollapsed}>
                        {Math.round(company.matchingScore * 100)}% Match
                      </Text>
                    </View>
                  )}
                  {company.distanceText && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="location-on" size={16} color="#4285f4" />
                      <Text style={styles.distanceTextCollapsed}>
                        {company.distanceText}
                      </Text>
                    </View>
                  )}
                </View>
                {company.matchingReasons && company.matchingReasons.length > 0 && (
                  <View style={styles.matchingReasonsContainerCollapsed}>
                    {company.matchingReasons.slice(0, 2).map((reason, index) => (
                      <Text key={index} style={styles.matchingReasonTextCollapsed}>
                        • {reason}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={() => handleToggleFavorite(company.id)}
            >
              <AnimatedHeart 
                companyId={company.id}
                isFavorite={company.isFavorite}
              />
            </TouchableOpacity>
          </View>
          {/* Matching Score Box - Below on mobile only */}
          {width < 768 && (company.matchingScore !== undefined || company.distanceText) && (
            <View style={styles.matchingBoxCollapsed}>
              <View style={styles.matchingScoreContainerCollapsed}>
                {company.matchingScore !== undefined && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="trending-up" size={14} color="#34a853" />
                    <Text style={styles.matchingScoreTextCollapsed}>
                      {Math.round(company.matchingScore * 100)}% Match
                    </Text>
                  </View>
                )}
                {company.distanceText && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="location-on" size={14} color="#4285f4" />
                    <Text style={styles.distanceTextCollapsed}>
                      {company.distanceText}
                    </Text>
                  </View>
                )}
              </View>
              {company.matchingReasons && company.matchingReasons.length > 0 && (
                <View style={styles.matchingReasonsContainerCollapsed}>
                  {company.matchingReasons.slice(0, 2).map((reason, index) => (
                    <Text key={index} style={styles.matchingReasonTextCollapsed}>
                      • {reason}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.companyDetails}>
            <View style={styles.locationContainer}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.locationText}>{company.location || company.address}</Text>
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
        )}

        {/* Action Buttons - Only visible when expanded */}
        {isExpanded && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]} 
              onPress={() => handleViewDetails(company)}
            >
              <MaterialIcons name="visibility" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.applyButton,
                (company.availableInternSlots || company.availableSlots) === 0 && styles.disabledButton
              ]} 
              onPress={() => handleApply(company)}
              disabled={(company.availableInternSlots || company.availableSlots) === 0}
            >
              <MaterialIcons 
                name="send" 
                size={16} 
                color={(company.availableInternSlots || company.availableSlots) > 0 ? "#02050a" : "#fff"} 
              />
              <Text style={[
                styles.actionButtonText,
                (company.availableInternSlots || company.availableSlots) > 0 && styles.applyButtonText
              ]}>
                {(company.availableInternSlots || company.availableSlots) === 0 ? 'Full' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expand/Collapse Button */}
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => toggleCardExpansion(company.id)}
        >
          <MaterialIcons 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={24} 
            color="#F56E0F" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back, Student!</Text>
        <Text style={styles.welcomeSubtitle}>
          Discover amazing internship opportunities with our partner companies.
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        {showSkeleton ? (
          <>
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <MaterialIcons name="business-center" size={32} color="#F56E0F" />
              <Text style={styles.statNumber}>{animatedStats.companyCount}</Text>
              <Text style={styles.statLabel}>Partner Companies</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="work" size={32} color="#F56E0F" />
              <Text style={styles.statNumber}>{animatedStats.availableSlots}</Text>
              <Text style={styles.statLabel}>Available Slots</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="favorite" size={32} color="#F56E0F" />
              <Text style={styles.statNumber}>{animatedStats.favoritesCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#F56E0F" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies, industries, or locations..."
            placeholderTextColor="#878787"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#F56E0F"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Companies Section */}
      <View style={styles.companiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : (studentProfile ? 'Personalized Internship Matches' : 'Available Internships')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {searchQuery 
              ? `${filteredCompanies.length} companies found for "${searchQuery}"`
              : studentProfile 
                ? `${companies.length} approved partner companies matched to your skills, program, and location`
                : `${companies.filter(c => c.availableSlots > 0).length} approved partner companies with open positions`
            }
          </Text>
          {studentProfile && !searchQuery && (
            <Text style={styles.matchingInfoText}>
              Only approved partner companies are shown. Companies are ranked by relevance to your {studentProfile.program} program, skills, and proximity to your location. Companies where you have approved applications are hidden.
            </Text>
          )}
        </View>

        {showSkeleton ? (
          <>
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
          </>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name={searchQuery ? "search-off" : "business-center"} size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No companies found' : 'No companies available'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `No companies match your search for "${searchQuery}". Try different keywords or check your spelling.`
                : studentProfile 
                  ? 'No new internship opportunities available. Only approved partner companies are shown, and companies where you have approved applications are hidden.'
                  : 'No approved partner companies available. Check back later for new internship opportunities.'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={styles.clearSearchButtonLarge}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchTextLarge}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </View>

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
                    onPress={() => handleToggleFavorite(selectedCompany.id)}
                  >
                    <AnimatedHeart 
                      companyId={selectedCompany.id}
                      isFavorite={selectedCompany.isFavorite}
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
                {/* Matching Score and Distance in Modal */}
                {(selectedCompany.matchingScore !== undefined || selectedCompany.distanceText) && (
                  <View style={styles.modalMatchingContainer}>
                    <View style={styles.modalMatchingHeader}>
                      {selectedCompany.matchingScore !== undefined && (
                        <>
                          <MaterialIcons name="trending-up" size={20} color="#34a853" />
                          <Text style={styles.modalMatchingTitle}>Match Score: {Math.round(selectedCompany.matchingScore * 100)}%</Text>
                        </>
                      )}
                      {selectedCompany.distanceText && (
                        <>
                          <MaterialIcons name="location-on" size={20} color="#4285f4" style={{ marginLeft: 16 }} />
                          <Text style={styles.modalDistanceTitle}>Distance: {selectedCompany.distanceText}</Text>
                        </>
                      )}
                    </View>
                    {selectedCompany.matchingReasons && selectedCompany.matchingReasons.length > 0 && (
                      <View style={styles.modalMatchingReasons}>
                        {selectedCompany.matchingReasons.map((reason, index) => (
                          <Text key={index} style={styles.modalMatchingReason}>
                            • {reason}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

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
                    <Text style={styles.modalInfoLabel}>Address:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.address}</Text>
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
                    <Text style={styles.modalInfoValue}>
                      {selectedCompany.availableInternSlots || selectedCompany.availableSlots}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="group" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Total Capacity:</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedCompany.totalInternCapacity || selectedCompany.totalSlots}
                    </Text>
                  </View>
                  
                  {(selectedCompany.currentInternCount !== undefined) && (
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name="people" size={20} color="#666" />
                      <Text style={styles.modalInfoLabel}>Current Interns:</Text>
                      <Text style={styles.modalInfoValue}>{selectedCompany.currentInternCount}</Text>
                    </View>
                  )}
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="percent" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Fill Rate:</Text>
                    <Text style={styles.modalInfoValue}>
                      {(selectedCompany.totalInternCapacity || selectedCompany.totalSlots) > 0 
                        ? Math.round(((selectedCompany.availableInternSlots || selectedCompany.availableSlots) / (selectedCompany.totalInternCapacity || selectedCompany.totalSlots)) * 100) 
                        : 0}%
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Description:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.description}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.locationButton]}
                  onPress={() => handleViewLocation(selectedCompany)}
                >
                  <MaterialIcons name="location-on" size={16} color="#fff" />
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>View Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={80} color="#34a853" />
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Text style={styles.successSubtext}>
              You will be notified about the status of your application.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Dark background
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
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  welcomeSection: {
    padding: width < 768 ? 16 : 24, // Responsive padding
    backgroundColor: '#2A2A2E', // Dark secondary background
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: width < 768 ? 20 : 24, // Smaller on mobile
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: width < 768 ? 14 : 16, // Smaller on mobile
    color: '#F56E0F', // Orange accent
    lineHeight: width < 768 ? 20 : 22, // Adjusted line height
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    paddingVertical: 12,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearSearchButtonLarge: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'center',
  },
  clearSearchTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Skeleton Loading Styles
  skeletonStatCard: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.1)',
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 16,
    marginBottom: 12,
  },
  skeletonNumber: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonLabel: {
    width: 80,
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
  },
  skeletonCompanyCard: {
    backgroundColor: '#F5F1E8',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.1)',
  },
  skeletonCompanyHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  skeletonProfileContainer: {
    marginRight: 16,
  },
  skeletonProfileImage: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 35,
  },
  skeletonCompanyInfo: {
    flex: 1,
  },
  skeletonCompanyName: {
    width: '80%',
    height: 22,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonCompanyIndustry: {
    width: '60%',
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonRating: {
    width: 60,
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
  },
  skeletonFavoriteButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
  },
  skeletonCompanyDetails: {
    marginBottom: 20,
  },
  skeletonLocation: {
    width: '90%',
    height: 20,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonSlots: {
    width: '70%',
    height: 40,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonMOA: {
    width: '50%',
    height: 20,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonDescription: {
    width: '100%',
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  skeletonActionButton: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#FBFBFB',
    textAlign: 'center',
  },
  companiesSection: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15141',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#000', // Light text
    fontWeight: '400',
  },
  companyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  companyHeader: {
    marginBottom: width < 768 ? 16 : 20,
  },
  headerTopRow: {
    flexDirection: width < 768 ? 'column' : 'row',
    alignItems: width < 768 ? 'flex-start' : 'flex-start',
    gap: width < 768 ? 12 : 12,
    marginBottom: width < 768 ? 12 : 0,
    flexWrap: width < 768 ? 'nowrap' : 'nowrap',
  },
  profileContainer: {
    marginRight: width < 768 ? 0 : 16,
    marginBottom: width < 768 ? 8 : 0,
  },
  profileImage: {
    width: width < 768 ? 60 : width < 1024 ? 65 : 70,
    height: width < 768 ? 60 : width < 1024 ? 65 : 70,
    borderRadius: width < 768 ? 30 : width < 1024 ? 32.5 : 35,
    borderWidth: width < 768 ? 2 : 3,
    borderColor: '#F56E0F', // Primary orange border
  },
  profilePlaceholder: {
    width: width < 768 ? 60 : width < 1024 ? 65 : 70,
    height: width < 768 ? 60 : width < 1024 ? 65 : 70,
    borderRadius: width < 768 ? 30 : width < 1024 ? 32.5 : 35,
    backgroundColor: '#2A2A2E', // Dark input/gray background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: width < 768 ? 2 : 3,
    borderColor: '#F56E0F',
  },
  profileText: {
    fontSize: width < 768 ? 24 : width < 1024 ? 26 : 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyInfo: {
    flex: 1,
    width: width < 768 ? '100%' : 'auto',
  },
  companyName: {
    fontSize: width < 768 ? 18 : width < 1024 ? 20 : 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: width < 768 ? 4 : 6,
    fontFamily: 'System',
  },
  companyIndustry: {
    fontSize: width < 768 ? 14 : width < 1024 ? 15 : 16,
    color: '#F56E0F', // Primary orange
    marginBottom: width < 768 ? 6 : 8,
    fontWeight: '600',
  },
  slotsContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  slotLabelHeader: {
    fontSize: width < 768 ? 13 : width < 1024 ? 14 : 15,
    color: '#fff',
    fontWeight: '500',
  },
  slotValueHeader: {
    fontSize: width < 768 ? 13 : width < 1024 ? 14 : 15,
    fontWeight: 'bold',
    color: '#F4D03F', // Yellow color for slots
  },
  favoriteButton: {
    padding: width < 768 ? 8 : 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: width < 768 ? 10 : 12,
    alignSelf: width < 768 ? 'flex-end' : 'auto',
    marginTop: width < 768 ? -50 : 0,
    marginBottom: width < 768 ? 12 : 0,
  },
  companyDetails: {
    marginBottom: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  slotsContainer: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  slotsContainerCollapsed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  matchingBoxCollapsed: {
    backgroundColor: '#5D4037', // Brown/dark brown color
    borderRadius: width < 768 ? 10 : 12,
    padding: width < 768 ? 10 : 12,
    minWidth: width < 768 ? '100%' : width < 1024 ? 170 : 180,
    maxWidth: width < 768 ? '100%' : width < 1024 ? 200 : 220,
    marginRight: width < 768 ? 0 : 8,
    alignSelf: width < 768 ? 'stretch' : 'flex-start',
    width: width < 768 ? '100%' : 'auto',
    flexShrink: 0,
  },
  matchingScoreContainerCollapsed: {
    flexDirection: 'column',
    gap: width < 768 ? 3 : 4,
    marginBottom: width < 768 ? 6 : 8,
  },
  matchingScoreTextCollapsed: {
    fontSize: width < 768 ? 12 : width < 1024 ? 13 : 14,
    fontWeight: 'bold',
    color: '#F56E0F', // Orange text
    marginLeft: 6,
  },
  distanceTextCollapsed: {
    fontSize: width < 768 ? 12 : width < 1024 ? 13 : 14,
    fontWeight: '600',
    color: '#F56E0F', // Orange text
    marginLeft: 6,
  },
  matchingReasonsContainerCollapsed: {
    marginTop: width < 768 ? 6 : 8,
    gap: width < 768 ? 3 : 4,
  },
  matchingReasonTextCollapsed: {
    fontSize: width < 768 ? 11 : 12,
    color: '#fff',
    lineHeight: width < 768 ? 14 : 16,
    opacity: 0.9,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F4D03F',
  },
  slotBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 4,
  },
  currentInternsText: {
    fontSize: 13,
    color: '#fff',
    marginTop: 6,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  moaLabel: {
    fontSize: 15,
    color: '#fff',
    marginRight: 8,
    fontWeight: '500',
  },
  moaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  moaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
  },
  description: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    opacity: 0.9,
    fontWeight: '400',
  },
   actionButtons: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     gap: 16,
   },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewButton: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  locationButton: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  applyButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  applyButtonText: {
    color: '#fff', // White text for orange button
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff', // White text for all buttons
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  expandButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#F5F1E8',
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
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  successButton: {
    backgroundColor: '#34a853',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Matching Score Styles
  matchingContainer: {
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F56E0F',
  },
  matchingScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchingScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F', // Primary orange
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F56E0F', // Primary orange
    marginLeft: 8,
  },
  matchingReasonsContainer: {
    gap: 6,
  },
  matchingReasonText: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    opacity: 0.9,
  },
  matchingInfoText: {
    fontSize: 13,
    color: '#000', // Light text
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.7,
  },
  // Modal Matching Styles
  modalMatchingContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34a853',
  },
  modalMatchingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalMatchingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34a853',
    marginLeft: 8,
  },
  modalDistanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285f4',
    marginLeft: 8,
  },
  modalMatchingReasons: {
    gap: 6,
  },
  modalMatchingReason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
