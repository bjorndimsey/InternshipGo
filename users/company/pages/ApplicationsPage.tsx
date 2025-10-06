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
  Modal,
  Linking,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import StudentLocationMap from '../../../components/StudentLocationMap';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

interface Application {
  id: string;
  student_id: string;
  company_id: string;
  position: string;
  department?: string;
  cover_letter?: string;
  resume_url?: string;
  resume_public_id?: string;
  transcript_url?: string;
  transcript_public_id?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  availability?: string;
  motivation?: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  // Student details from joins
  first_name?: string;
  last_name?: string;
  major?: string;
  year?: string;
  id_number?: string;
  student_email?: string;
  student_profile_picture?: string;
  student_latitude?: number;
  student_longitude?: number;
  // Company details from joins
  company_name?: string;
  industry?: string;
  company_address?: string;
  company_profile_picture?: string;
}

interface ApplicationsPageProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
}

export default function ApplicationsPage({ currentUser }: ApplicationsPageProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'under-review' | 'approved' | 'rejected'>('all');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);
  const [companySlots, setCompanySlots] = useState<{ available: number; total: number; current: number } | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [pageAnimation] = useState(new Animated.Value(0));
  const [statsAnimation] = useState(new Animated.Value(0));
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
    fetchCurrentUserLocation();
    fetchCompanySlots();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, filter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      console.log('Fetching applications for company:', currentUser.id);
      
      // Start page animation
      Animated.timing(pageAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      // Simulate loading delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await apiService.getCompanyApplications(currentUser.id);
      
      if (response.success && response.applications) {
        console.log('Applications fetched:', response.applications);
        setApplications(response.applications);
        
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
        console.log('No applications found or error:', response);
        setApplications([]);
        setShowSkeleton(false);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      setShowSkeleton(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserLocation = async () => {
    try {
      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const user = response.user;
        
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          setCurrentUserLocation({
            latitude: user.latitude,
            longitude: user.longitude,
            profilePicture: user.profilePicture
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current user location:', error);
    }
  };

  const fetchCompanySlots = async () => {
    try {
      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const user = response.user;
        
        // Get company information from the user profile
        if (user.company_id) {
          const companyResponse = await apiService.getCompany(user.company_id);
          
          if (companyResponse.success && companyResponse.data) {
            const company = companyResponse.data;
            setCompanySlots({
              available: company.available_intern_slots || 0,
              total: company.total_intern_capacity || 0,
              current: company.current_intern_count || 0
            });
            console.log('📊 Company slots loaded:', {
              available: company.available_intern_slots,
              total: company.total_intern_capacity,
              current: company.current_intern_count
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching company slots:', error);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(app => app.status === filter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(application =>
        (application.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.major?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.position?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  // Helper function to extract clean filename from Cloudinary URL
  const extractCleanFilename = (url: string, studentName: string, fileType: string): string => {
    try {
      console.log('🔍 Analyzing URL for filename extraction:', url);
      
      // For Cloudinary URLs, try to extract the original filename
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      console.log('📁 URL path parts:', pathParts);
      
      // Look for the actual filename in the path
      let originalFilename = '';
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        console.log(`🔍 Checking path part ${i}:`, part);
        
        if (part && part.includes('.') && !part.includes('v') && !part.includes('upload') && !part.includes('raw')) {
          originalFilename = part;
          console.log('✅ Found potential filename:', originalFilename);
          break;
        }
      }
      
      // If we found an original filename, use it as base
      if (originalFilename) {
        const nameWithoutExt = originalFilename.split('.')[0];
        const ext = originalFilename.split('.').pop()?.toLowerCase() || 'pdf';
        const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const result = `${fileType}_${cleanName}.${ext}`;
        console.log('📝 Using extracted filename:', result);
        return result;
      }
      
      console.log('⚠️ No original filename found in URL');
    } catch (error) {
      console.log('⚠️ Could not parse URL for original filename:', error);
    }
    
    // Fallback to generated filename with student name
    const sanitizedName = studentName.replace(/[^a-zA-Z0-9_]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const result = `${fileType}_${sanitizedName}_${dateStr}.pdf`;
    console.log('📝 Using fallback filename:', result);
    return result;
  };

  const directFileDownload = async (application: Application, fileType: 'resume' | 'transcript') => {
    console.log(`📥 ===== DIRECT ${fileType.toUpperCase()} DOWNLOAD =====`);
    const fileUrl = fileType === 'resume' ? application.resume_url : application.transcript_url;
    const fileName = fileType === 'resume' ? 'Resume' : 'Transcript';
    
    console.log('👤 Application Details:', {
      id: application.id,
      studentName: `${application.first_name} ${application.last_name}`,
      studentId: application.student_id,
      fileUrl: fileUrl,
      hasFile: !!fileUrl
    });
    
    try {
      // Validate URL
      if (!fileUrl) {
        throw new Error(`No ${fileName} URL available`);
      }
      
      console.log('🔍 URL Validation:', {
        url: fileUrl,
        isValid: fileUrl.startsWith('http'),
        length: fileUrl.length
      });
      
      // Generate clean filename
      const studentName = `${application.first_name}_${application.last_name}`;
      const generatedFileName = extractCleanFilename(fileUrl, studentName, fileName);
      console.log('📝 Generated filename:', generatedFileName);
      console.log('🔍 Original URL:', fileUrl);
      console.log('👤 Student name:', studentName);
      console.log('📄 File type:', fileName);
      
      // Check if we're in a web environment
      const isWeb = typeof window !== 'undefined' && window.document;
      console.log('🌐 Environment check:', { isWeb, hasFileSystem: !!FileSystem.documentDirectory });
      
      if (isWeb) {
        // Use browser download for web
        console.log('🌐 Using browser download method...');
        
        // Fetch the file
        console.log('📥 Fetching file from URL...');
        const response = await fetch(fileUrl);
        
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
        link.download = generatedFileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ File download initiated in browser');
        Alert.alert('Download Started', `${fileName} document "${generatedFileName}" download has started. Check your Downloads folder.`);
        
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
        const fileUri = FileSystem.documentDirectory + generatedFileName;
        console.log('💾 Download Details:', {
          sourceUrl: fileUrl,
          targetPath: fileUri,
          fileName: generatedFileName
        });
        
        console.log('⬇️ Starting FileSystem.downloadAsync...');
        const downloadResult = await FileSystem.downloadAsync(
          fileUrl,
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
                dialogTitle: `${fileName} Document - ${application.first_name} ${application.last_name}`,
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
      console.error(`❌ Direct ${fileType} download error:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Download Error', `Failed to download ${fileName.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log(`📥 ===== DIRECT ${fileType.toUpperCase()} DOWNLOAD COMPLETED =====`);
  };

  const handleDownloadResume = (application: Application) => {
    if (application.resume_url) {
      directFileDownload(application, 'resume');
    } else {
      Alert.alert('Error', 'No resume document available');
    }
  };

  const handleDownloadTranscript = (application: Application) => {
    if (application.transcript_url) {
      directFileDownload(application, 'transcript');
    } else {
      Alert.alert('Error', 'No transcript document available');
    }
  };

  const handleApproveApplicationDirect = async (application: Application) => {
    try {
      console.log('🔥 DIRECT APPROVE APPLICATION CALLED!', application.id);
      console.log('📤 API Request Details:', {
        applicationId: application.id,
        status: 'approved',
        notes: 'Application approved by company',
        reviewedBy: currentUser.id
      });
      
      console.log('🔄 Making API call to updateApplicationStatus...');
      const response = await apiService.updateApplicationStatus(
        application.id, 
        'approved', 
        'Application approved by company',
        currentUser.id
      );
      console.log('📥 API Response:', response);
      console.log('📥 API Response Success:', response.success);
      console.log('📥 API Response Message:', response.message);

      if (response.success) {
        console.log('✅ Application approved successfully, updating UI immediately...');
        
        // Update the application data immediately in the state
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app.id === application.id 
              ? { ...app, status: 'approved' as const }
              : app
          )
        );
        
        console.log('🔄 UI updated immediately, application status should now show as approved');
        Alert.alert(
          'Success', 
          'Application approved successfully! The status has been updated and a slot has been deducted from the company.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh applications and company slots to get updated information
                fetchApplications();
                fetchCompanySlots();
              }
            }
          ]
        );
      } else {
        console.error('❌ Failed to approve application:', response.message);
        Alert.alert('Error', response.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('❌ Error approving application:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Error', `Failed to approve application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleApproveApplication = async (application: Application) => {
    Alert.alert(
      'Approve Application',
      `Approve ${application.first_name} ${application.last_name}'s application for ${application.position}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: async () => {
            try {
              const response = await apiService.updateApplicationStatus(
                application.id, 
                'approved', 
                'Application approved by company',
                currentUser.id
              );
              
              if (response.success) {
                setApplications(applications.map(app => 
                  app.id === application.id 
                    ? { ...app, status: 'approved' as const }
                    : app
                ));
                Alert.alert('Success', 'Application approved successfully');
              } else {
                Alert.alert('Error', 'Failed to approve application');
              }
            } catch (error) {
              console.error('Error approving application:', error);
              Alert.alert('Error', 'Failed to approve application');
            }
          }
        },
      ]
    );
  };

  const handleRejectApplicationDirect = async (application: Application) => {
    try {
      console.log('🔥 DIRECT REJECT APPLICATION CALLED!', application.id);
      console.log('📤 API Request Details:', {
        applicationId: application.id,
        status: 'rejected',
        notes: 'Application rejected by company',
        reviewedBy: currentUser.id
      });
      
      console.log('🔄 Making API call to updateApplicationStatus...');
      const response = await apiService.updateApplicationStatus(
        application.id, 
        'rejected', 
        'Application rejected by company',
        currentUser.id
      );
      console.log('📥 API Response:', response);
      console.log('📥 API Response Success:', response.success);
      console.log('📥 API Response Message:', response.message);

      if (response.success) {
        console.log('✅ Application rejected successfully, updating UI immediately...');
        
        // Update the application data immediately in the state
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app.id === application.id 
              ? { ...app, status: 'rejected' as const }
              : app
          )
        );
        
        console.log('🔄 UI updated immediately, application status should now show as rejected');
        Alert.alert(
          'Success', 
          'Application rejected successfully! The status has been updated. If this was previously an approved application, a slot has been restored to the company.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh applications and company slots to get updated information
                fetchApplications();
                fetchCompanySlots();
              }
            }
          ]
        );
      } else {
        console.error('❌ Failed to reject application:', response.message);
        Alert.alert('Error', response.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('❌ Error rejecting application:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      Alert.alert('Error', `Failed to reject application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRejectApplication = async (application: Application) => {
    Alert.alert(
      'Reject Application',
      `Reject ${application.first_name} ${application.last_name}'s application for ${application.position}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.updateApplicationStatus(
                application.id, 
                'rejected', 
                'Application rejected by company',
                currentUser.id
              );
              
              if (response.success) {
                setApplications(applications.map(app => 
                  app.id === application.id 
                    ? { ...app, status: 'rejected' as const }
                    : app
                ));
                Alert.alert('Success', 'Application rejected');
              } else {
                Alert.alert('Error', 'Failed to reject application');
              }
            } catch (error) {
              console.error('Error rejecting application:', error);
              Alert.alert('Error', 'Failed to reject application');
            }
          }
        },
      ]
    );
  };

  const handleViewLocation = (application: Application) => {
    setSelectedApplication(application);
    setShowLocationMap(true);
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#34a853';
      case 'pending': return '#fbbc04';
      case 'rejected': return '#ea4335';
      case 'under-review': return '#4285f4';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'under-review': return 'Under Review';
      default: return 'Unknown';
    }
  };

  const toggleCardExpansion = (applicationId: string) => {
    setExpandedCard(expandedCard === applicationId ? null : applicationId);
  };

  // Skeleton Components
  const SkeletonApplicationCard = () => {
    return (
      <View style={styles.skeletonApplicationCard}>
        <View style={styles.skeletonApplicationHeader}>
          <View style={styles.skeletonProfileContainer}>
            <View style={styles.skeletonProfileImage} />
          </View>
          <View style={styles.skeletonApplicationInfo}>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '70%' }]} />
            <View style={[styles.skeletonTextLine, { width: '60%' }]} />
            <View style={[styles.skeletonTextLine, { width: '50%' }]} />
          </View>
          <View style={styles.skeletonStatusContainer}>
            <View style={styles.skeletonStatusBadge} />
          </View>
        </View>

        <View style={styles.skeletonApplicationDetails}>
          <View style={styles.skeletonContactInfo}>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '80%' }]} />
          </View>

          <View style={styles.skeletonAcademicInfo}>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '60%' }]} />
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

  const ApplicationCard = ({ application }: { application: Application }) => {
    const isExpanded = expandedCard === application.id;
    
    return (
      <View style={[
        styles.applicationCard,
        isExpanded && styles.expandedApplicationCard
      ]}>
        <TouchableOpacity 
          onPress={() => toggleCardExpansion(application.id)}
          style={styles.cardTouchable}
        >
          <View style={styles.applicationHeader}>
            <View style={styles.profileContainer}>
              {application.student_profile_picture ? (
                <Image source={{ uri: application.student_profile_picture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>
                    {application.first_name?.charAt(0) || 'S'}{application.last_name?.charAt(0) || 'T'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.applicationInfo}>
              <Text style={styles.applicantName}>
                {application.first_name} {application.last_name}
              </Text>
              <Text style={styles.studentId}>{application.id_number || application.student_id}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
                <Text style={styles.statusText}>{getStatusText(application.status)}</Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F4D03F" 
                style={styles.expandIcon}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.applicationDetails}>
              <Text style={styles.position}>{application.position}</Text>
              <Text style={styles.department}>{application.department || 'N/A'}</Text>
              
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={16} color="#fff" />
                  <Text style={styles.contactText}>{application.student_email || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.academicInfo}>
                <Text style={styles.academicText}>
                  {application.major || 'N/A'} • {application.year || 'N/A'}
                </Text>
              </View>

              <Text style={styles.applicationDate}>
                Applied: {new Date(application.applied_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.expandedActionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(application)}
              >
                <MaterialIcons name="visibility" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              {application.resume_url && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.downloadButton]} 
                  onPress={() => {
                    console.log('📥 Resume download button pressed');
                    handleDownloadResume(application);
                  }}
                >
                  <MaterialIcons name="download" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Resume</Text>
                </TouchableOpacity>
              )}
              
              {application.transcript_url && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.transcriptButton]} 
                  onPress={() => {
                    console.log('📥 Transcript download button pressed');
                    handleDownloadTranscript(application);
                  }}
                >
                  <MaterialIcons name="school" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Transcript</Text>
                </TouchableOpacity>
              )}
              
              {application.status === 'pending' || application.status === 'under-review' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton]} 
                    onPress={() => {
                      console.log('🔥 APPROVE BUTTON CLICKED!', application.id);
                      handleApproveApplicationDirect(application);
                    }}
                  >
                    <MaterialIcons name="check" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]} 
                    onPress={() => {
                      console.log('🔥 REJECT BUTTON CLICKED!', application.id);
                      handleRejectApplicationDirect(application);
                    }}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading applications...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Applications Management</Text>
        {companySlots && (
          <View style={styles.slotInfoContainer}>
            <View style={styles.slotInfoItem}>
              <Text style={styles.slotInfoLabel}>Available Slots</Text>
              <Text style={[styles.slotInfoValue, { color: companySlots.available > 0 ? '#34a853' : '#ea4335' }]}>
                {companySlots.available}
              </Text>
            </View>
            <View style={styles.slotInfoItem}>
              <Text style={styles.slotInfoLabel}>Total Capacity</Text>
              <Text style={styles.slotInfoValue}>{companySlots.total}</Text>
            </View>
            <View style={styles.slotInfoItem}>
              <Text style={styles.slotInfoLabel}>Current Interns</Text>
              <Text style={styles.slotInfoValue}>{companySlots.current}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search applications..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
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
                All ({applications.filter(a => a.status === 'pending' || a.status === 'under-review').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.activeFilterTab]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
                Pending ({applications.filter(a => a.status === 'pending').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'under-review' && styles.activeFilterTab]}
              onPress={() => setFilter('under-review')}
            >
              <Text style={[styles.filterText, filter === 'under-review' && styles.activeFilterText]}>
                Under Review ({applications.filter(a => a.status === 'under-review').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'approved' && styles.activeFilterTab]}
              onPress={() => setFilter('approved')}
            >
              <Text style={[styles.filterText, filter === 'approved' && styles.activeFilterText]}>
                Approved ({applications.filter(a => a.status === 'approved').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'rejected' && styles.activeFilterTab]}
              onPress={() => setFilter('rejected')}
            >
              <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText]}>
                Rejected ({applications.filter(a => a.status === 'rejected').length})
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
              <Text style={styles.statNumber}>{filteredApplications.length}</Text>
              <Text style={styles.statLabel}>Total Applications</Text>
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
              <Text style={[styles.statNumber, { color: '#F4D03F' }]}>
                {filteredApplications.filter(a => a.status === 'pending').length}
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
              <Text style={[styles.statNumber, { color: '#1E3A5F' }]}>
                {filteredApplications.filter(a => a.status === 'under-review').length}
              </Text>
              <Text style={styles.statLabel}>Under Review</Text>
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
              <Text style={[styles.statNumber, { color: '#2D5A3D' }]}>
                {filteredApplications.filter(a => a.status === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </Animated.View>
          </>
        )}
      </View>

      {/* Applications List */}
      <ScrollView style={styles.applicationsList} showsVerticalScrollIndicator={false}>
        {showSkeleton ? (
          // Show skeleton loading
          Array.from({ length: 3 }).map((_, index) => (
            <SkeletonApplicationCard key={`skeleton-${index}`} />
          ))
        ) : filteredApplications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={64} color="#F4D03F" />
            <Text style={styles.emptyStateTitle}>No applications found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No applications available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))
        )}
      </ScrollView>

      {/* Application Details Modal */}
      <Modal
        visible={showApplicationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Application Details - {selectedApplication?.first_name} {selectedApplication?.last_name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowApplicationModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedApplication && (
                <View>
                  <Text style={styles.modalSectionTitle}>Personal Information</Text>
                  <Text style={styles.modalText}>Name: {selectedApplication.first_name} {selectedApplication.last_name}</Text>
                  <Text style={styles.modalText}>Student ID: {selectedApplication.id_number || selectedApplication.student_id}</Text>
                  <Text style={styles.modalText}>Email: {selectedApplication.student_email || 'N/A'}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Academic Information</Text>
                  <Text style={styles.modalText}>Major: {selectedApplication.major || 'N/A'}</Text>
                  <Text style={styles.modalText}>Academic Year: {selectedApplication.year || 'N/A'}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Application Details</Text>
                  <Text style={styles.modalText}>Position: {selectedApplication.position}</Text>
                  <Text style={styles.modalText}>Department: {selectedApplication.department || 'N/A'}</Text>
                  <Text style={styles.modalText}>Application Date: {new Date(selectedApplication.applied_at).toLocaleDateString()}</Text>
                  <Text style={styles.modalText}>Status: {getStatusText(selectedApplication.status)}</Text>
                  
                  {selectedApplication.cover_letter && (
                    <>
                      <Text style={styles.modalSectionTitle}>Cover Letter</Text>
                      <Text style={styles.modalText}>{selectedApplication.cover_letter}</Text>
                    </>
                  )}
                  
                  {selectedApplication.motivation && (
                    <>
                      <Text style={styles.modalSectionTitle}>Motivation</Text>
                      <Text style={styles.modalText}>{selectedApplication.motivation}</Text>
                    </>
                  )}
                  
                  {selectedApplication.availability && (
                    <>
                      <Text style={styles.modalSectionTitle}>Availability</Text>
                      <Text style={styles.modalText}>{selectedApplication.availability}</Text>
                    </>
                  )}
                  
                  <Text style={styles.modalSectionTitle}>Expected Dates</Text>
                  <Text style={styles.modalText}>Start: {selectedApplication.expected_start_date || 'N/A'}</Text>
                  <Text style={styles.modalText}>End: {selectedApplication.expected_end_date || 'N/A'}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowApplicationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => handleViewLocation(selectedApplication!)}
              >
                <Text style={styles.locationButtonText}>View Location</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Location Map */}
      <StudentLocationMap
        visible={showLocationMap}
        onClose={closeLocationMap}
        selectedApplication={selectedApplication ? {
          id: selectedApplication.id,
          student_id: selectedApplication.student_id,
          first_name: selectedApplication.first_name,
          last_name: selectedApplication.last_name,
          student_latitude: selectedApplication.student_latitude,
          student_longitude: selectedApplication.student_longitude,
          student_profile_picture: selectedApplication.student_profile_picture,
        } : undefined}
        currentUserLocation={currentUserLocation || undefined}
        onViewPictures={(studentId) => {
          console.log('📸 View Pictures clicked from map for student:', studentId);
          // Handle view pictures if needed
        }}
      />
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
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 10,
  },
  slotInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  slotInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  slotInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  slotInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
    color: '#F4D03F',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A5F',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterTab: {
    backgroundColor: '#1E3A5F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
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
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  applicationsList: {
    flex: 1,
    padding: 20,
  },
  applicationCard: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  expandedApplicationCard: {
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
  applicationHeader: {
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
    backgroundColor: '#2D5A3D', // Forest green
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  applicationInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  studentId: {
    fontSize: 14,
    color: '#F4D03F', // Bright yellow
    marginBottom: 4,
    fontWeight: '500',
  },
  position: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
    opacity: 0.9,
  },
  department: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  statusContainer: {
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
  applicationDetails: {
    marginBottom: 15,
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
  academicInfo: {
    marginBottom: 10,
  },
  academicText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
    opacity: 0.9,
  },
  universityText: {
    fontSize: 12,
    color: '#999',
  },
  skillsContainer: {
    marginBottom: 10,
  },
  skillsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: '#4285f4',
  },
  moreSkillsText: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'center',
  },
  applicationDate: {
    fontSize: 12,
    color: '#fff',
    fontStyle: 'italic',
    opacity: 0.8,
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
    backgroundColor: '#2D5A3D', // Forest green
  },
  downloadButton: {
    backgroundColor: '#F4D03F', // Bright yellow
  },
  transcriptButton: {
    backgroundColor: '#9c27b0',
  },
  approveButton: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  rejectButton: {
    backgroundColor: '#ea4335',
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
    backgroundColor: '#F5F1E8',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Skeleton Loading Styles
  skeletonApplicationCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  skeletonApplicationHeader: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonApplicationInfo: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonStatusContainer: {
    alignItems: 'flex-end',
  },
  skeletonStatusBadge: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  skeletonApplicationDetails: {
    marginBottom: 15,
  },
  skeletonContactInfo: {
    marginBottom: 10,
  },
  skeletonAcademicInfo: {
    marginBottom: 10,
  },
  skeletonActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonActionButton: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  skeletonStatItem: {
    flex: 1,
    backgroundColor: '#1E3A5F',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  skeletonStatNumber: {
    width: 40,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonStatLabel: {
    width: 60,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
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
    maxWidth: 600,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  modalSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalSkillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalSkillText: {
    fontSize: 14,
    color: '#4285f4',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    flexWrap: 'wrap',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  locationButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4285f4',
    alignItems: 'center',
  },
  locationButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
