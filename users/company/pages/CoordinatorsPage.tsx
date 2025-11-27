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
  Linking,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import CompanyLocationMap from '../../../components/CompanyLocationMap';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

interface Coordinator {
  id: string;
  userId?: string; // Add user_id from users table
  companyId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  employeeId: string;
  department: string;
  position: string;
  university: string;
  officeLocation: string;
  status: 'active' | 'inactive';
  moaStatus: 'sent' | 'received' | 'approved' | 'rejected' | 'expired' | 'active' | 'pending' | 'none';
  moaDocument?: string;
  moaUrl?: string;
  moaPublicId?: string;
  moaSentDate?: string;
  moaReceivedDate?: string;
  moaExpiryDate?: string;
  partnershipStatus: 'pending' | 'approved' | 'rejected';
  companyApproved?: boolean;
  coordinatorApproved?: boolean;
  assignedInterns: number;
  lastContact: string;
  latitude?: number;
  longitude?: number;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
}

interface CoordinatorsPageProps {
  currentUser: UserInfo | null;
}

export default function CoordinatorsPage({ currentUser }: CoordinatorsPageProps) {
  console.log('🔄 CoordinatorsPage component rendered');
  
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'partners' | 'pending'>('all');
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [coordinatorPictures, setCoordinatorPictures] = useState<any[]>([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [pageAnimation] = useState(new Animated.Value(0));
  const [statsAnimation] = useState(new Animated.Value(0));
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [coordinatorToRemove, setCoordinatorToRemove] = useState<Coordinator | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchCoordinators();
    fetchCurrentUserLocation();
  }, []);

  useEffect(() => {
    filterCoordinators();
  }, [searchQuery, filter, coordinators]);

  const fetchCoordinators = async () => {
    try {
      console.log('🔄 Starting fetchCoordinators...');
      setLoading(true);
      setShowSkeleton(true);
      
      // Start page animation
      Animated.timing(pageAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      // Test API connection first
      console.log('🧪 Testing API connection...');
      try {
        const testResponse = await fetch('http://localhost:3001/api/coordinators/test-partnership');
        const testData = await testResponse.json();
        console.log('✅ API connection test result:', testData);
        console.log('🔍 Sample coordinator fields:', Object.keys(testData.sampleCoordinator || {}));
      } catch (testError) {
        console.error('❌ API connection test failed:', testError);
      }
      
      // Simulate loading delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🔍 Fetching coordinators with MOA from API...');
      // Get the current company's ID by looking up the company record
      let companyId = null;
      if (currentUser) {
        try {
          // Get all companies and find the one that matches this user
          const companiesResponse = await apiService.getCompanies();
          console.log('📋 Companies response:', companiesResponse);
          if (companiesResponse.success && companiesResponse.companies) {
            console.log('📋 Available companies:', companiesResponse.companies.map((c: any) => ({ 
              id: c.id, 
              userId: c.userId, 
              name: c.name,
              company_name: c.company_name,
              user_id: c.user_id
            })));
            console.log('🔍 Looking for user ID:', currentUser.id);
            const userCompany = companiesResponse.companies.find((company: any) => 
              company.userId === currentUser.id || company.user_id === currentUser.id
            );
            if (userCompany) {
              companyId = userCompany.id.toString();
              console.log('📝 Found company ID from companies list:', companyId, 'for company:', userCompany.name);
            } else {
              console.log('⚠️ No company found for user, using user ID as fallback');
              console.log('🔍 Searched for user_id:', currentUser.id, 'or id:', currentUser.id);
              companyId = currentUser.id;
            }
          } else {
            console.log('⚠️ No companies found, using user ID as fallback');
            companyId = currentUser.id;
          }
        } catch (error) {
          console.log('⚠️ Error getting companies, using user ID as fallback:', error);
          companyId = currentUser.id;
        }
      }
      
      if (!companyId) {
        console.error('❌ No company ID available');
        setCoordinators([]);
        Alert.alert('Error', 'Unable to determine company ID');
        return;
      }
      
      // Store company ID for use in other functions
      setCompanyId(companyId);
      
      console.log('🔍 Using company ID for coordinator fetch:', companyId);
      const response = await apiService.getCoordinatorsWithMOA(companyId);
      console.log('📥 Raw API response:', response);
      
      if (response.success && response.coordinators && Array.isArray(response.coordinators)) {
        console.log('✅ Coordinators with MOA fetched successfully:', response.coordinators.length);
        console.log('📋 Coordinator details:', response.coordinators.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          companyId: c.companyId,
          hasCompanyId: !!c.companyId,
          moaUrl: c.moaUrl,
          hasMoaUrl: !!c.moaUrl,
          moaStatus: c.moaStatus,
          partnershipStatus: c.partnershipStatus,
          companyApproved: c.companyApproved,
          coordinatorApproved: c.coordinatorApproved
        })));
        setCoordinators(response.coordinators);
        console.log('✅ Coordinators state updated');
        
        // Start stats animation after data is loaded
        setTimeout(() => {
          Animated.timing(statsAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
          setShowSkeleton(false);
        }, 500);
      } else {
        console.error('❌ Failed to fetch coordinators with MOA:', response);
        console.error('❌ Response details:', {
          success: response.success,
          message: response.message,
          coordinators: response.coordinators,
          isArray: Array.isArray(response.coordinators)
        });
        setCoordinators([]); // Set empty array as fallback
        setShowSkeleton(false);
        Alert.alert('Error', typeof response.message === 'string' ? response.message : 'Failed to fetch coordinators');
      }
    } catch (error) {
      console.error('❌ Error fetching coordinators with MOA:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setCoordinators([]); // Set empty array as fallback
      setShowSkeleton(false);
      Alert.alert('Error', 'Failed to fetch coordinators. Please try again.');
    } finally {
      console.log('🔄 Setting loading to false');
      setLoading(false);
    }
  };

  const filterCoordinators = () => {
    console.log('🔍 Filtering coordinators...', {
      totalCoordinators: coordinators.length,
      filter,
      searchQuery,
      coordinators: coordinators.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        partnershipStatus: c.partnershipStatus
      }))
    });
    
    let filtered = coordinators;

    // Filter by partnership status
    switch (filter) {
      case 'partners':
        filtered = filtered.filter(c => c.partnershipStatus === 'approved');
        console.log('📊 After partners filter:', filtered.length);
        break;
      case 'pending':
        filtered = filtered.filter(c => c.partnershipStatus === 'pending');
        console.log('📊 After pending filter:', filtered.length);
        break;
      default:
        // Show all
        console.log('📊 Showing all coordinators:', filtered.length);
        break;
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(coordinator =>
        coordinator.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('📊 After search filter:', filtered.length);
    }

    console.log('✅ Final filtered coordinators:', filtered.length);
    setFilteredCoordinators(filtered);
  };

  const handleViewDetails = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowDetailsModal(true);
  };

  const fetchCurrentUserLocation = async () => {
    if (!currentUser) return;
    
    try {
      const response = await apiService.getProfile(currentUser.id);
      if (response.success && response.user) {
        const user = response.user;
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          setCurrentUserLocation({
            latitude: user.latitude,
            longitude: user.longitude,
            profilePicture: user.profile_picture
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current user location:', error);
    }
  };

  const handleViewLocation = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowLocationMap(true);
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const fetchCoordinatorPictures = async (coordinator: Coordinator) => {
    try {
      setPicturesLoading(true);
      console.log('📸 Fetching location pictures for coordinator:', coordinator);
      
      // Use userId if available, otherwise fall back to coordinator id
      const userId = coordinator.userId || coordinator.id;
      console.log('📸 Using userId for pictures:', userId);
      
      const response = await apiService.getLocationPictures(userId);
      console.log('📸 Location pictures response:', response);
      
      if (response.success && (response as any).pictures) {
        setCoordinatorPictures((response as any).pictures);
        console.log('✅ Location pictures loaded:', (response as any).pictures.length);
      } else {
        console.log('⚠️ No location pictures found or error:', response.message);
        setCoordinatorPictures([]);
      }
    } catch (error) {
      console.error('❌ Error fetching coordinator pictures:', error);
      setCoordinatorPictures([]);
    } finally {
      setPicturesLoading(false);
    }
  };

  const handleViewPictures = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowLocationPictures(true);
    fetchCoordinatorPictures(coordinator);
  };

  const closeLocationPictures = () => {
    setShowLocationPictures(false);
    setCoordinatorPictures([]);
  };


  const directFileDownload = async (coordinator: Coordinator) => {
    console.log('📥 ===== DIRECT FILE DOWNLOAD =====');
    console.log('👤 Coordinator:', {
      name: `${coordinator.firstName} ${coordinator.lastName}`,
      id: coordinator.id,
      moaUrl: coordinator.moaUrl
    });
    
    try {
      // Validate URL
      if (!coordinator.moaUrl) {
        throw new Error('No MOA URL available');
      }
      
      console.log('🔍 URL Validation:', {
        url: coordinator.moaUrl,
        isValid: coordinator.moaUrl.startsWith('http'),
        length: coordinator.moaUrl.length
      });
      
      // Create filename
      const sanitizedName = `${coordinator.firstName}_${coordinator.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const fileName = `MOA_${sanitizedName}_${coordinator.moaSentDate || new Date().toISOString().split('T')[0]}.pdf`;
      console.log('📝 Generated filename:', fileName);
      
      // Check if we're in a web environment
      const isWeb = typeof window !== 'undefined' && window.document;
      console.log('🌐 Environment check:', { isWeb, hasFileSystem: !!FileSystem.documentDirectory });
      
      if (isWeb) {
        // Use browser download for web
        console.log('🌐 Using browser download method...');
        
        // Fetch the file
        console.log('📥 Fetching file from URL...');
        const response = await fetch(coordinator.moaUrl!);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        console.log('📊 Fetch response:', {
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        // Convert to blob
        const blob = await response.blob();
        console.log('📄 Blob details:', {
          size: blob.size,
          type: blob.type
        });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ File download initiated in browser');
        Alert.alert('Download Started', `MOA document "${fileName}" download has started. Check your Downloads folder.`);
        
                } else {
        // Use FileSystem for native apps
        console.log('📱 Using FileSystem for native app...');
        
        // Check FileSystem availability
        console.log('📁 FileSystem Check:', {
          documentDirectory: FileSystem.documentDirectory,
          available: !!FileSystem.documentDirectory
        });
        
        if (!FileSystem.documentDirectory) {
          throw new Error('FileSystem not available');
        }
        
        // Download file
                const fileUri = FileSystem.documentDirectory + fileName;
        console.log('💾 Download Details:', {
          sourceUrl: coordinator.moaUrl,
          targetPath: fileUri,
          fileName: fileName
        });
        
        console.log('⬇️ Starting FileSystem.downloadAsync...');
                const downloadResult = await FileSystem.downloadAsync(
                  coordinator.moaUrl!,
                  fileUri
                );

        console.log('📊 Download Result:', {
          status: downloadResult.status,
          uri: downloadResult.uri,
          success: downloadResult.status === 200
        });

                if (downloadResult.status === 200) {
                  console.log('✅ File downloaded successfully');
          console.log('📁 Downloaded file location:', downloadResult.uri);
                  
                  // Try to share the file
          console.log('📤 Checking sharing availability...');
                  const isAvailable = await Sharing.isAvailableAsync();
          console.log('📤 Sharing available:', isAvailable);
                  
                  if (isAvailable) {
                    try {
              console.log('📤 Starting share process...');
                      await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `MOA Document - ${coordinator.firstName} ${coordinator.lastName}`,
                      });
              console.log('✅ File shared successfully');
                    } catch (shareError) {
                      console.error('❌ Share error:', shareError);
              console.log('⚠️ File downloaded but sharing failed. Check your device\'s file manager.');
                    }
                  } else {
            console.log('⚠️ Sharing not available, file saved locally');
                  }
                } else {
                  throw new Error(`Download failed with status: ${downloadResult.status}`);
                }
      }
    } catch (error) {
      console.error('❌ Direct download error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Download Error', `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('📥 ===== DIRECT FILE DOWNLOAD COMPLETED =====');
  };



  const handleAcceptPartnershipDirect = async (coordinator: Coordinator) => {
    try {
      console.log('🔥 DIRECT ACCEPT PARTNERSHIP CALLED!', coordinator.id);
      console.log('📤 API Request Details:', {
        coordinatorId: coordinator.id,
        status: 'approved',
        approvedBy: currentUser?.id || ''
      });
      
      console.log('🔄 Making API call to updateCoordinatorPartnershipStatus...');
      const response = await apiService.updateCoordinatorPartnershipStatus(
        coordinator.id,
        'approved',
        currentUser?.id || '',
        coordinator.companyId || undefined
      );
      console.log('📥 API Response:', response);
      console.log('📥 API Response Success:', response.success);
      console.log('📥 API Response Message:', response.message);

      if (response.success) {
        console.log('✅ MOA accepted successfully, updating UI immediately...');
        
        // Update the coordinator data immediately in the state
        // Set companyApproved to true since company just accepted the MOA
        // IMPORTANT: partnershipStatus should remain 'pending' until coordinator also approves
        const updatedCoordinator = (response as any).coordinator?.[0];
        const newPartnershipStatus = updatedCoordinator?.partnership_status || 'pending';
        
        console.log('🔍 Updated coordinator status:', {
          companyApproved: true,
          partnershipStatus: newPartnershipStatus,
          message: newPartnershipStatus === 'approved' 
            ? 'Both sides approved - partnership active!' 
            : 'Waiting for coordinator to approve'
        });
        
        setCoordinators(prevCoordinators => 
          prevCoordinators.map(coord => 
            coord.id === coordinator.id 
              ? { ...coord, companyApproved: true, partnershipStatus: newPartnershipStatus }
              : coord
          )
        );
        
        console.log('🔄 UI updated immediately, status should show "Waiting Coordinator" (company approved, waiting for coordinator)');
        Alert.alert(
          'MOA Accepted', 
          'You have accepted the MOA. The partnership will be active once the coordinator also approves.'
        );
      } else {
        console.error('❌ Failed to accept partnership:', response.message);
        Alert.alert('Error', response.message || 'Failed to accept partnership');
      }
    } catch (error) {
      console.error('❌ Error accepting partnership:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Error', `Failed to accept partnership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAcceptPartnership = async (coordinator: Coordinator) => {
    console.log('🔍 Coordinator data for partnership acceptance:', {
      id: coordinator.id,
      name: `${coordinator.firstName} ${coordinator.lastName}`,
      companyId: coordinator.companyId,
      hasCompanyId: !!coordinator.companyId,
      moaUrl: coordinator.moaUrl,
      partnershipStatus: coordinator.partnershipStatus
    });
    
    // Note: We don't need companyId for coordinator partnership updates
    console.log('✅ Proceeding with coordinator partnership update (companyId not required)');

    Alert.alert(
      'Accept Partnership',
      `Accept partnership with ${coordinator.firstName} ${coordinator.lastName}?\n\nThis will mark the company as having an active MOA in the program.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            console.log('🔥 USER CONFIRMED ACCEPT PARTNERSHIP!');
            try {
              console.log('✅ Accepting partnership for coordinator:', coordinator.id);
              console.log('📤 API Request Details:', {
                coordinatorId: coordinator.id,
                status: 'approved',
                approvedBy: currentUser?.id || ''
              });
              
              console.log('🔄 Making API call to updateCoordinatorPartnershipStatus...');
              const response = await apiService.updateCoordinatorPartnershipStatus(
                coordinator.id,
                'approved',
                currentUser?.id || ''
              );
              console.log('📥 API Response:', response);
              console.log('📥 API Response Success:', response.success);
              console.log('📥 API Response Message:', response.message);

              if (response.success) {
                // Refresh the coordinators list to get updated data from database
                console.log('✅ Partnership accepted successfully, refreshing coordinators list...');
                await fetchCoordinators();
                Alert.alert('Success', 'Partnership accepted successfully. The company now has an active MOA in the program.');
              } else {
                console.error('❌ Failed to accept partnership:', response.message);
                Alert.alert('Error', response.message || 'Failed to accept partnership');
              }
            } catch (error) {
              console.error('❌ Error accepting partnership:', error);
              console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : 'Unknown'
              });
              Alert.alert('Error', `Failed to accept partnership: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },
      ]
    );
  };

  const handleDenyPartnershipDirect = async (coordinator: Coordinator) => {
    try {
      console.log('🔥 DIRECT DENY PARTNERSHIP CALLED!', coordinator.id);
      console.log('📤 API Request Details:', {
        coordinatorId: coordinator.id,
        status: 'rejected',
        approvedBy: currentUser?.id || ''
      });
      
      console.log('🔄 Making API call to updateCoordinatorPartnershipStatus...');
      const response = await apiService.updateCoordinatorPartnershipStatus(
        coordinator.id,
        'rejected',
        currentUser?.id || '',
        coordinator.companyId || undefined
      );
      console.log('📥 API Response:', response);
      console.log('📥 API Response Success:', response.success);
      console.log('📥 API Response Message:', response.message);

      if (response.success) {
        console.log('✅ Partnership denied successfully, updating UI immediately...');
        
        // Update the coordinator data immediately in the state
        // Set companyApproved to false since company just rejected
        setCoordinators(prevCoordinators => 
          prevCoordinators.map(coord => 
            coord.id === coordinator.id 
              ? { ...coord, companyApproved: false, partnershipStatus: 'rejected' }
              : coord
          )
        );
        
        console.log('🔄 UI updated immediately, partnership status should now show as rejected');
        Alert.alert('Success', 'Partnership denied successfully! The status has been updated.');
      } else {
        console.error('❌ Failed to deny partnership:', response.message);
        Alert.alert('Error', response.message || 'Failed to deny partnership');
      }
    } catch (error) {
      console.error('❌ Error denying partnership:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Error', `Failed to deny partnership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDenyPartnership = async (coordinator: Coordinator) => {
    console.log('🔍 Coordinator data for partnership denial:', {
      id: coordinator.id,
      name: `${coordinator.firstName} ${coordinator.lastName}`,
      companyId: coordinator.companyId,
      hasCompanyId: !!coordinator.companyId,
      moaUrl: coordinator.moaUrl,
      partnershipStatus: coordinator.partnershipStatus
    });
    
    // Note: We don't need companyId for coordinator partnership updates
    console.log('✅ Proceeding with coordinator partnership denial (companyId not required)');

    Alert.alert(
      'Deny Partnership',
      `Deny partnership with ${coordinator.firstName} ${coordinator.lastName}?\n\nThis will remove the coordinator from the pending list and mark the partnership as rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deny', 
          style: 'destructive',
          onPress: async () => {
            console.log('🔥 USER CONFIRMED DENY PARTNERSHIP!');
            try {
              console.log('❌ Denying partnership for coordinator:', coordinator.id);
              console.log('📤 API Request Details:', {
                coordinatorId: coordinator.id,
                status: 'rejected',
                approvedBy: currentUser?.id || ''
              });
              const response = await apiService.updateCoordinatorPartnershipStatus(
                coordinator.id,
                'rejected',
                currentUser?.id || ''
              );
              console.log('📥 API Response:', response);
              console.log('📥 API Response Success:', response.success);
              console.log('📥 API Response Message:', response.message);

              if (response.success) {
                // Refresh the coordinators list to get updated data from database
                console.log('✅ Partnership denied successfully, refreshing coordinators list...');
                await fetchCoordinators();
                Alert.alert('Success', 'Partnership denied. The coordinator has been removed from the pending list.');
              } else {
                console.error('❌ Failed to deny partnership:', response.message);
                Alert.alert('Error', response.message || 'Failed to deny partnership');
              }
            } catch (error) {
              console.error('❌ Error denying partnership:', error);
              console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : 'Unknown'
              });
              Alert.alert('Error', `Failed to deny partnership: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },
      ]
    );
  };

  const handleRemoveCoordinator = (coordinator: Coordinator) => {
    console.log('🗑️ Remove coordinator partnership clicked for:', coordinator.id, coordinator.firstName, coordinator.lastName);
    setCoordinatorToRemove(coordinator);
    setShowRemoveModal(true);
  };

  const confirmRemoveCoordinator = async () => {
    if (!coordinatorToRemove || !companyId) {
      Alert.alert('Error', 'Coordinator or company ID not available');
      return;
    }

    console.log('🗑️ Confirming removal of partnership/MOA for coordinator:', coordinatorToRemove.id, coordinatorToRemove.firstName, coordinatorToRemove.lastName);
    setRemoving(true);

    try {
      const response = await apiService.removePartnership(companyId);
      
      console.log('🗑️ Remove partnership API response:', response);

      if (response.success) {
        console.log('✅ Partnership/MOA removed successfully, refreshing list...');
        // Refresh the coordinators list to reflect the changes
        await fetchCoordinators();
        setShowRemoveModal(false);
        setCoordinatorToRemove(null);
        Alert.alert('Success', `Partnership and MOA with ${coordinatorToRemove.firstName} ${coordinatorToRemove.lastName} have been removed. The coordinator remains in the system.`);
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

  const cancelRemoveCoordinator = () => {
    console.log('🗑️ User cancelled coordinator partnership removal');
    setShowRemoveModal(false);
    setCoordinatorToRemove(null);
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'approved': return '#34a853';
      case 'received': return '#4285f4';
      case 'sent': return '#fbbc04';
      case 'pending': return '#fbbc04';
      case 'rejected': return '#ea4335';
      case 'expired': return '#666';
      case 'none': return '#999';
      default: return '#666';
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'approved': return 'Approved';
      case 'received': return 'Received';
      case 'sent': return 'Sent';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      case 'none': return 'No MOA';
      default: return 'Unknown';
    }
  };

  const getPartnershipStatusText = (coordinator: Coordinator) => {
    // Use the actual approval flags, not partnershipStatus
    // Convert to boolean to handle various formats (true, 1, 'true', '1')
    // IMPORTANT: Only treat as true if explicitly true, 1, 'true', or '1'
    // undefined, null, false, 0, '', etc. should all be treated as false
    const companyApprovedValue = coordinator.companyApproved;
    const coordinatorApprovedValue = coordinator.coordinatorApproved;
    
    // Strict boolean conversion - only true if explicitly true or truthy number/string
    let companyApproved = false;
    if (companyApprovedValue === true) {
      companyApproved = true;
    } else if (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) {
      companyApproved = true;
    } else if (typeof companyApprovedValue === 'string') {
      const strValue = companyApprovedValue as string;
      companyApproved = strValue.toLowerCase() === 'true' || strValue === '1';
    }
    
    let coordinatorApproved = false;
    if (coordinatorApprovedValue === true) {
      coordinatorApproved = true;
    } else if (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) {
      coordinatorApproved = true;
    } else if (typeof coordinatorApprovedValue === 'string') {
      const strValue = coordinatorApprovedValue as string;
      coordinatorApproved = strValue.toLowerCase() === 'true' || strValue === '1';
    }
    
    // Check if MOA has been sent
    const moaSent = !!coordinator.moaUrl || 
                   coordinator.moaStatus === 'sent' || 
                   coordinator.moaStatus === 'received' || 
                   coordinator.moaStatus === 'active' ||
                   coordinator.moaStatus === 'approved';
    
    console.log('🔍 getPartnershipStatusText for coordinator:', {
      id: coordinator.id,
      name: `${coordinator.firstName} ${coordinator.lastName}`,
      companyApprovedRaw: coordinator.companyApproved,
      coordinatorApprovedRaw: coordinator.coordinatorApproved,
      companyApprovedBool: companyApproved,
      coordinatorApprovedBool: coordinatorApproved,
      moaSent,
      partnershipStatus: coordinator.partnershipStatus
    });
    
    // Both approved = active partnership
    if (companyApproved && coordinatorApproved) {
      console.log('✅ Both approved - showing Partner');
      return 'Partner';
    }
    // Company approved, waiting for coordinator to approve
    // From company's perspective: "Waiting Coordinator" means waiting for coordinator to approve
    if (companyApproved && !coordinatorApproved) {
      console.log('⏳ Company approved, waiting for coordinator to approve - showing Waiting Coordinator');
      return 'Waiting Coordinator';
    }
    // Coordinator approved first, waiting for company to approve
    // From company's perspective: "Waiting You" means waiting for you (the company) to approve
    if (!companyApproved && coordinatorApproved) {
      console.log('⏳ Coordinator approved, waiting for company to approve - showing Waiting You');
      return 'Waiting You';
    }
    // Neither approved - MOA sent but company hasn't accepted yet
    // This should show "Pending" to indicate company needs to accept
    if (moaSent) {
      console.log('⏸️ MOA sent but company has NOT accepted yet - showing Pending');
      return 'Pending';
    }
    // No MOA sent yet
    console.log('⏸️ No MOA sent yet - showing Pending');
    return 'Pending';
  };

  const getPartnershipStatusColor = (coordinator: Coordinator) => {
    // Use the actual approval flags, not partnershipStatus
    const companyApprovedValue = coordinator.companyApproved;
    const coordinatorApprovedValue = coordinator.coordinatorApproved;
    
    const companyApproved = companyApprovedValue === true || 
                            (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) ||
                            String(companyApprovedValue) === 'true' ||
                            String(companyApprovedValue) === '1';
    const coordinatorApproved = coordinatorApprovedValue === true || 
                                (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) ||
                                String(coordinatorApprovedValue) === 'true' ||
                                String(coordinatorApprovedValue) === '1';
    
    if (companyApproved && coordinatorApproved) {
      return '#34a853'; // Green - fully approved
    }
    if (companyApproved || coordinatorApproved) {
      return '#fbbc04'; // Yellow - waiting for other side
    }
    return '#878787'; // Gray - pending
  };

  const toggleCardExpansion = (coordinatorId: string) => {
    setExpandedCard(expandedCard === coordinatorId ? null : coordinatorId);
  };


  // Skeleton Components
  const SkeletonCoordinatorCard = () => {
    return (
      <View style={styles.skeletonCoordinatorCard}>
        <View style={styles.skeletonCoordinatorHeader}>
          <View style={styles.skeletonProfileContainer}>
            <View style={styles.skeletonProfileImage} />
          </View>
          <View style={styles.skeletonCoordinatorInfo}>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '70%' }]} />
            <View style={[styles.skeletonTextLine, { width: '60%' }]} />
            <View style={[styles.skeletonTextLine, { width: '50%' }]} />
          </View>
          <View style={styles.skeletonStatusContainer}>
            <View style={styles.skeletonStatusBadge} />
          </View>
        </View>

        <View style={styles.skeletonCoordinatorDetails}>
          <View style={styles.skeletonMoaContainer}>
            <View style={styles.skeletonMoaHeader}>
              <View style={[styles.skeletonTextLine, { width: '40%' }]} />
              <View style={[styles.skeletonTextLine, { width: '20%' }]} />
            </View>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '80%' }]} />
          </View>

          <View style={styles.skeletonStatsContainer}>
            <View style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
            <View style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
          </View>
        </View>

        <View style={styles.skeletonActionButtons}>
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
        </View>
      </View>
    );
  };

  const CoordinatorCard = ({ coordinator }: { coordinator: Coordinator }) => {
    console.log('🎴 Rendering CoordinatorCard for:', {
      id: coordinator.id,
      name: `${coordinator.firstName} ${coordinator.lastName}`,
      partnershipStatus: coordinator.partnershipStatus
    });
    
    const isExpanded = expandedCard === coordinator.id;
    
    return (
      <View style={[
        styles.coordinatorCard,
        isExpanded && styles.expandedCoordinatorCard
      ]}>
        <TouchableOpacity 
          onPress={() => toggleCardExpansion(coordinator.id)}
          style={styles.cardTouchable}
        >
          <View style={styles.coordinatorHeader}>
            <View style={styles.profileContainer}>
              {coordinator.profilePicture ? (
                <Image source={{ uri: coordinator.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>
                    {coordinator.firstName.charAt(0)}{coordinator.lastName.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.coordinatorInfo}>
              <Text style={styles.coordinatorName}>
                {coordinator.firstName} {coordinator.lastName}
              </Text>
              <Text style={styles.coordinatorPosition}>{coordinator.position}</Text>
              <Text style={styles.coordinatorDepartment}>{coordinator.department}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.partnershipBadge, { backgroundColor: getPartnershipStatusColor(coordinator) }]}>
                <Text style={styles.partnershipText}>{getPartnershipStatusText(coordinator)}</Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F56E0F" 
                style={styles.expandIcon}
              />
            </View>
          </View>

          <View style={styles.coordinatorDetails}>

          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={16} color="#fff" />
                <Text style={styles.contactText}>{coordinator.email}</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color="#fff" />
                <Text style={styles.contactText}>{coordinator.phoneNumber}</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="location-on" size={16} color="#fff" />
                <Text style={styles.contactText}>{coordinator.officeLocation}</Text>
              </View>
            </View>

            {coordinator.moaSentDate && (
              <Text style={styles.moaDate}>Sent: {coordinator.moaSentDate}</Text>
            )}
            {coordinator.moaReceivedDate && (
              <Text style={styles.moaDate}>Received: {coordinator.moaReceivedDate}</Text>
            )}
            {coordinator.moaExpiryDate && (
              <Text style={styles.moaDate}>Expires: {coordinator.moaExpiryDate}</Text>
            )}

            <View style={styles.expandedActionButtons}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.viewButton]} 
                  onPress={() => handleViewDetails(coordinator)}
                >
                  <MaterialIcons name="visibility" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                
                {coordinator.moaUrl && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.downloadButton]} 
                    onPress={() => {
                      console.log('📥 Direct file download pressed');
                      directFileDownload(coordinator);
                    }}
                  >
                    <MaterialIcons name="download" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Download MOA</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.removeButton, styles.removeButtonFullWidth]} 
                onPress={() => {
                  console.log('🔵 Remove button clicked');
                  handleRemoveCoordinator(coordinator);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="remove" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              // Show buttons ONLY when company hasn't approved yet (needs to accept MOA)
              // Hide buttons when company has already approved (status is "Waiting You")
              // Hide buttons when status is "Waiting Coordinator" (coordinator approved, waiting for company)
              const companyApprovedValue = coordinator.companyApproved;
              const coordinatorApprovedValue = coordinator.coordinatorApproved;
              
              // Use the same strict boolean conversion as getPartnershipStatusText
              let companyApproved = false;
              if (companyApprovedValue === true) {
                companyApproved = true;
              } else if (typeof companyApprovedValue === 'number' && companyApprovedValue === 1) {
                companyApproved = true;
              } else if (typeof companyApprovedValue === 'string') {
                const strValue = companyApprovedValue as string;
                companyApproved = strValue.toLowerCase() === 'true' || strValue === '1';
              }
              
              let coordinatorApproved = false;
              if (coordinatorApprovedValue === true) {
                coordinatorApproved = true;
              } else if (typeof coordinatorApprovedValue === 'number' && coordinatorApprovedValue === 1) {
                coordinatorApproved = true;
              } else if (typeof coordinatorApprovedValue === 'string') {
                const strValue = coordinatorApprovedValue as string;
                coordinatorApproved = strValue.toLowerCase() === 'true' || strValue === '1';
              }
              
              // Check if MOA has been sent (has moaUrl or moaStatus indicates it was sent)
              const moaSent = !!coordinator.moaUrl || 
                             coordinator.moaStatus === 'sent' || 
                             coordinator.moaStatus === 'received' || 
                             coordinator.moaStatus === 'active' ||
                             coordinator.moaStatus === 'approved';
              
              // Determine status
              // "Waiting Coordinator" = company approved, waiting for coordinator (companyApproved && !coordinatorApproved)
              // "Waiting You" = coordinator approved, waiting for company (!companyApproved && coordinatorApproved)
              const isWaitingCoordinator = companyApproved && !coordinatorApproved;
              const isWaitingYou = !companyApproved && coordinatorApproved;
              
              // Show buttons ONLY if:
              // - Company hasn't approved yet AND MOA has been sent (needs initial approval)
              // Hide buttons if:
              // - Company has approved (status is "Waiting Coordinator")
              // - Status is "Waiting You" (coordinator approved, waiting for company)
              // - Both have approved (Partner status)
              const shouldShowButtons = !companyApproved && moaSent && !coordinatorApproved;
              
              console.log('🔍 Button visibility check for coordinator', coordinator.id, ':', {
                companyApprovedValue,
                companyApproved,
                coordinatorApprovedValue,
                coordinatorApproved,
                moaSent,
                moaUrl: coordinator.moaUrl,
                moaStatus: coordinator.moaStatus,
                partnershipStatus: coordinator.partnershipStatus,
                isWaitingYou,
                isWaitingCoordinator,
                shouldShowButtons
              });
              
              if (!shouldShowButtons) {
                console.log('❌ Buttons not showing. Reasons:', {
                  companyHasApproved: companyApproved,
                  coordinatorHasApproved: coordinatorApproved,
                  moaNotSent: !moaSent,
                  isWaitingYou,
                  isWaitingCoordinator,
                  bothApproved: companyApproved && coordinatorApproved
                });
                return null;
              }
              
              console.log('✅ Showing Accept/Deny buttons');
              
              return (
                <View style={styles.partnershipActionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]} 
                    onPress={() => {
                      console.log('🔥 ACCEPT BUTTON CLICKED!', coordinator.id);
                      console.log('📋 Accepting MOA from coordinator. After acceptance, status will change to "Waiting You" and buttons will hide.');
                      handleAcceptPartnershipDirect(coordinator);
                    }}
                  >
                    <MaterialIcons name="check" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Accept MOA</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.denyButton]} 
                    onPress={() => {
                      console.log('🔥 DENY BUTTON CLICKED!', coordinator.id);
                      handleDenyPartnershipDirect(coordinator);
                    }}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Deny</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  console.log('🔄 Render state:', {
    loading,
    coordinatorsCount: coordinators.length,
    filteredCount: filteredCoordinators.length,
    filter,
    searchQuery
  });

  if (loading) {
    console.log('⏳ Showing loading screen...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading coordinators...</Text>
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
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search coordinators..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#878787"
            />
          </View>
        </View>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                All ({coordinators.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'partners' && styles.activeFilterTab]}
              onPress={() => setFilter('partners')}
            >
              <Text style={[styles.filterText, filter === 'partners' && styles.activeFilterText]}>
                Partners ({coordinators.filter(c => c.partnershipStatus === 'approved').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.activeFilterTab]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
                Pending ({coordinators.filter(c => c.partnershipStatus === 'pending').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {showSkeleton ? (
          // Show skeleton stats
          Array.from({ length: 4 }).map((_, index) => (
            <View key={`skeleton-stat-${index}`} style={styles.skeletonStatItem}>
              <View style={styles.skeletonStatNumber} />
              <View style={styles.skeletonStatLabel} />
            </View>
          ))
        ) : (
          <>
            <Animated.View 
              style={[
                styles.statItem,
                {
                  opacity: statsAnimation,
                  transform: [
                    {
                      scale: statsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.statNumber}>{filteredCoordinators.length}</Text>
              <Text style={styles.statLabel}>Total Coordinators</Text>
            </Animated.View>
            <Animated.View 
              style={[
                styles.statItem,
                {
                  opacity: statsAnimation,
                  transform: [
                    {
                      scale: statsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#34a853' }]}>
                {filteredCoordinators.filter(c => c.partnershipStatus === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>Partners</Text>
            </Animated.View>
            <Animated.View 
              style={[
                styles.statItem,
                {
                  opacity: statsAnimation,
                  transform: [
                    {
                      scale: statsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
                {filteredCoordinators.filter(c => c.partnershipStatus === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Animated.View>
            <Animated.View 
              style={[
                styles.statItem,
                {
                  opacity: statsAnimation,
                  transform: [
                    {
                      scale: statsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#4285f4' }]}>
                {filteredCoordinators.filter(c => c.moaStatus === 'active' || c.moaStatus === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>MOA Active</Text>
            </Animated.View>
          </>
        )}
      </View>

      {/* Coordinators List */}
      <ScrollView style={styles.coordinatorsList} showsVerticalScrollIndicator={false}>
        {showSkeleton ? (
          // Show skeleton loading
          Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCoordinatorCard key={`skeleton-${index}`} />
          ))
        ) : filteredCoordinators.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="supervisor-account" size={64} color="#F56E0F" />
            <Text style={styles.emptyStateTitle}>No coordinators found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No coordinators available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredCoordinators.map((coordinator) => (
            <CoordinatorCard key={coordinator.id} coordinator={coordinator} />
          ))
        )}
      </ScrollView>

      {/* Coordinator Details Modal */}
      {selectedCoordinator && (
        <Modal
          visible={showDetailsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coordinator Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Profile Section */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Profile Information</Text>
                <View style={styles.profileSection}>
                  {selectedCoordinator.profilePicture ? (
                    <Image 
                      source={{ uri: selectedCoordinator.profilePicture }} 
                      style={styles.modalProfileImage} 
                    />
                  ) : (
                    <View style={styles.modalProfilePlaceholder}>
                      <Text style={styles.modalProfileText}>
                        {selectedCoordinator.firstName.charAt(0)}{selectedCoordinator.lastName.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text style={styles.coordinatorName}>
                      {selectedCoordinator.firstName} {selectedCoordinator.lastName}
                    </Text>
                    <Text style={styles.coordinatorPosition}>{selectedCoordinator.position}</Text>
                    <Text style={styles.coordinatorDepartment}>{selectedCoordinator.department}</Text>
                  </View>
                </View>
              </View>

              {/* Contact Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.detailRow}>
                  <MaterialIcons name="email" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedCoordinator.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedCoordinator.phoneNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Office:</Text>
                  <Text style={styles.detailValue}>{selectedCoordinator.officeLocation}</Text>
                </View>
              </View>

              {/* University Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>University Information</Text>
                <View style={styles.detailRow}>
                  <MaterialIcons name="school" size={20} color="#666" />
                  <Text style={styles.detailLabel}>University:</Text>
                  <Text style={styles.detailValue}>{selectedCoordinator.university}</Text>
                </View>
              </View>

              {/* Status Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Status Information</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.detailLabel}>Partnership Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getPartnershipStatusColor(selectedCoordinator) }]}>
                    <Text style={styles.statusText}>{getPartnershipStatusText(selectedCoordinator)}</Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.detailLabel}>MOA Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getMOAStatusColor(selectedCoordinator.moaStatus) }]}>
                    <Text style={styles.statusText}>{getMOAStatusText(selectedCoordinator.moaStatus)}</Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.detailLabel}>Account Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedCoordinator.status === 'active' ? '#34a853' : '#ea4335' }]}>
                    <Text style={styles.statusText}>{selectedCoordinator.status}</Text>
                  </View>
                </View>
              </View>

              {/* MOA Information */}
              {selectedCoordinator.moaUrl && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>MOA Information</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.detailLabel}>MOA Document:</Text>
                    <Text style={styles.detailValue}>Available</Text>
                  </View>
                  {selectedCoordinator.moaSentDate && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Sent Date:</Text>
                      <Text style={styles.detailValue}>{selectedCoordinator.moaSentDate}</Text>
                    </View>
                  )}
                  {selectedCoordinator.moaReceivedDate && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="check-circle" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Received Date:</Text>
                      <Text style={styles.detailValue}>{selectedCoordinator.moaReceivedDate}</Text>
                    </View>
                  )}
                  {selectedCoordinator.moaExpiryDate && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="event" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Expiry Date:</Text>
                      <Text style={styles.detailValue}>{selectedCoordinator.moaExpiryDate}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Statistics */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{selectedCoordinator.assignedInterns}</Text>
                    <Text style={styles.statLabel}>Assigned Interns</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {Math.floor((new Date().getTime() - new Date(selectedCoordinator.lastContact).getTime()) / (1000 * 60 * 60 * 24))}
                    </Text>
                    <Text style={styles.statLabel}>Days Since Contact</Text>
                  </View>
                </View>
              </View>
      </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => handleViewLocation(selectedCoordinator)}
              >
                <MaterialIcons name="location-on" size={16} color="#fff" />
                <Text style={styles.locationButtonText}>View Location</Text>
              </TouchableOpacity>
            </View>

          </View>
        </Modal>
      )}

      {/* Coordinator Location Map */}
        <CompanyLocationMap
          visible={showLocationMap}
          onClose={closeLocationMap}
          companies={[]}
          currentUserLocation={currentUserLocation || undefined}
          selectedCompany={selectedCoordinator ? {
            id: selectedCoordinator.id,
            name: `${selectedCoordinator.firstName} ${selectedCoordinator.lastName}`,
            address: selectedCoordinator.officeLocation || 'Office location not specified',
            industry: 'Education',
            availableSlots: 0,
            totalSlots: 0,
            latitude: selectedCoordinator.latitude || 0,
            longitude: selectedCoordinator.longitude || 0
          } : undefined}
          selectedCoordinatorUserId={selectedCoordinator?.userId}
          onViewPictures={(coordinatorId) => {
            console.log('📸 View Pictures clicked from map for coordinator:', coordinatorId);
            handleViewPictures(selectedCoordinator!);
          }}
        />

      {/* Location Pictures Modal */}
      {selectedCoordinator && (
        <Modal
          visible={showLocationPictures}
          animationType="slide"
          transparent={false}
          onRequestClose={closeLocationPictures}
        >
          <View style={styles.picturesModalContainer}>
            <View style={styles.picturesModalHeader}>
              <Text style={styles.picturesModalTitle}>
                Location Pictures - {selectedCoordinator.firstName} {selectedCoordinator.lastName}
              </Text>
              <TouchableOpacity
                style={styles.picturesCloseButton}
                onPress={closeLocationPictures}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.picturesModalContent} showsVerticalScrollIndicator={false}>
              {picturesLoading ? (
                <View style={styles.picturesLoadingContainer}>
                  <ActivityIndicator size="large" color="#F56E0F" />
                  <Text style={styles.picturesLoadingText}>Loading pictures...</Text>
                </View>
              ) : coordinatorPictures.length === 0 ? (
                <View style={styles.picturesEmptyState}>
                  <MaterialIcons name="photo-camera" size={64} color="#ccc" />
                  <Text style={styles.picturesEmptyTitle}>No Pictures Available</Text>
                  <Text style={styles.picturesEmptyText}>
                    This coordinator hasn't uploaded any location pictures yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.picturesGrid}>
                  {coordinatorPictures.map((picture, index) => (
                    <View key={picture.id || index} style={styles.pictureCard}>
                      <Image 
                        source={{ uri: picture.url }} 
                        style={styles.pictureImage}
                        onError={(error) => {
                          console.error('Image load error:', error);
                        }}
                      />
                      {picture.description && (
                        <Text style={styles.pictureDescription} numberOfLines={2}>
                          {picture.description}
                        </Text>
                      )}
                      <Text style={styles.pictureDate}>
                        {new Date(picture.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Remove Coordinator Partnership Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelRemoveCoordinator}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.removeModalContent]}>
            <MaterialIcons name="warning" size={48} color="#ea4335" style={styles.modalWarningIcon} />
            <Text style={[styles.modalTitle, { color: '#FBFBFB', marginBottom: 12 }]}>Remove Partnership</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove the partnership and MOA with {coordinatorToRemove?.firstName} {coordinatorToRemove?.lastName}? This will remove the partnership relationship, but the coordinator will remain in the system. You can establish a new partnership later if needed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={cancelRemoveCoordinator}
                disabled={removing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]} 
                onPress={confirmRemoveCoordinator}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.79);', // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  searchSection: {
    backgroundColor: '#1B1B1E',
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
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
    color: '#F56E0F',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  activeFilterTab: {
    backgroundColor: '#F56E0F',
    borderColor: '#F56E0F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  activeFilterText: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1B1B1E',
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
    color: '#F56E0F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FBFBFB',
    textAlign: 'center',
    fontWeight: '600',
  },
  coordinatorsList: {
    flex: 1,
    padding: 20,
  },
  coordinatorCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  expandedCoordinatorCard: {
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
    flexDirection: 'column',
    gap: 8,
    marginTop: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  removeButtonFullWidth: {
    width: '100%',
  },
  partnershipActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  coordinatorHeader: {
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
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  coordinatorInfo: {
    flex: 1,
  },
  coordinatorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  coordinatorPosition: {
    fontSize: 14,
    color: '#F56E0F',
    marginBottom: 4,
    fontWeight: '500',
  },
  coordinatorDepartment: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
    opacity: 0.9,
  },
  coordinatorEmail: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  partnershipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partnershipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  coordinatorDetails: {
    marginBottom: 15,
  },
  moaContainer: {
    marginBottom: 15,
  },
  moaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moaLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  moaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moaStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
    opacity: 0.8,
  },
  contactInfo: {
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    opacity: 0.9,
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
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#F56E0F',
  },
  downloadButton: {
    backgroundColor: '#F56E0F',
  },
  acceptButton: {
    backgroundColor: '#34a853',
  },
  denyButton: {
    backgroundColor: '#ea4335',
  },
  removeButton: {
    backgroundColor: '#878787', // Muted gray
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#151419',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#878787',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Skeleton Loading Styles
  skeletonCoordinatorCard: {
    backgroundColor: '#1B1B1E',
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
  skeletonCoordinatorHeader: {
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
  skeletonCoordinatorInfo: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonStatusContainer: {
    alignItems: 'flex-end',
  },
  skeletonStatusBadge: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
  },
  skeletonCoordinatorDetails: {
    marginBottom: 15,
  },
  skeletonMoaContainer: {
    marginBottom: 15,
  },
  skeletonMoaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skeletonStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  skeletonStatItem: {
    alignItems: 'center',
  },
  skeletonStatNumber: {
    width: 40,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonStatLabel: {
    width: 60,
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
  },
  skeletonActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonActionButton: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  modalProfilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalProfileText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  profileInfo: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  downloadActionButton: {
    backgroundColor: '#34a853',
  },
  acceptActionButton: {
    backgroundColor: '#34a853',
  },
  denyActionButton: {
    backgroundColor: '#ea4335',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Remove Partnership Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  removeModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  modalWarningIcon: {
    alignSelf: 'center',
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
  modalDeleteButton: {
    backgroundColor: '#ea4335',
  },
  modalButtonText: {
    color: '#FBFBFB',
    fontSize: 14,
    fontWeight: '600',
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Location Pictures Modal Styles
  picturesModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  picturesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  picturesModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  picturesCloseButton: {
    padding: 8,
  },
  picturesModalContent: {
    flex: 1,
    padding: 20,
  },
  picturesLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  picturesLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  picturesEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  picturesEmptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  picturesEmptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  picturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  pictureCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pictureImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  pictureDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  pictureDate: {
    fontSize: 10,
    color: '#999',
  },
});
