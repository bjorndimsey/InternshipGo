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
  Linking,
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

  useEffect(() => {
    fetchApplications();
    fetchCurrentUserLocation();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, filter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log('Fetching applications for company:', currentUser.id);
      
      const response = await apiService.getCompanyApplications(currentUser.id);
      
      if (response.success && response.applications) {
        console.log('Applications fetched:', response.applications);
        setApplications(response.applications);
      } else {
        console.log('No applications found or error:', response);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
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

  const filterApplications = () => {
    let filtered = applications;

    // Filter out approved and rejected applications from the main display
    // Only show pending and under-review applications
    filtered = filtered.filter(app => 
      app.status === 'pending' || app.status === 'under-review'
    );

    // Filter by status (but only for pending and under-review)
    if (filter !== 'all') {
      if (filter === 'pending' || filter === 'under-review') {
        filtered = filtered.filter(app => app.status === filter);
      }
      // For approved and rejected, show empty since we filter them out above
      if (filter === 'approved' || filter === 'rejected') {
        filtered = [];
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(application =>
        (application.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (application.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
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
        Alert.alert('Success', 'Application approved successfully! The status has been updated.');
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
        Alert.alert('Success', 'Application rejected successfully! The status has been updated.');
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

  const ApplicationCard = ({ application }: { application: Application }) => (
    <View style={styles.applicationCard}>
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
          <Text style={styles.studentId}>{application.student_id}</Text>
          <Text style={styles.position}>{application.position}</Text>
          <Text style={styles.department}>{application.department || 'N/A'}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
            <Text style={styles.statusText}>{getStatusText(application.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.applicationDetails}>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <MaterialIcons name="email" size={16} color="#666" />
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

      <View style={styles.actionButtons}>
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
            {console.log('🔥 RENDERING APPROVE/REJECT BUTTONS for application:', application.id, 'status:', application.status)}
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]} 
              onPress={() => {
                console.log('🔥 APPROVE BUTTON CLICKED!', application.id);
                // Direct API call without Alert dialog
                console.log('🧪 Testing direct API call...');
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
                // Direct API call without Alert dialog
                console.log('🧪 Testing direct REJECT API call...');
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
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Applications Management</Text>
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
          </ScrollView>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredApplications.length}</Text>
          <Text style={styles.statLabel}>Active Applications</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredApplications.filter(a => a.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#4285f4' }]}>
            {filteredApplications.filter(a => a.status === 'under-review').length}
          </Text>
          <Text style={styles.statLabel}>Under Review</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34a853' }]}>
            {applications.filter(a => a.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved (See Interns)</Text>
        </View>
      </View>

      {/* Applications List */}
      <ScrollView style={styles.applicationsList} showsVerticalScrollIndicator={false}>
        {filteredApplications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No applications found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : filter === 'approved' || filter === 'rejected'
                ? 'Approved and rejected applications are now managed in the Interns page'
                : 'No pending applications available at the moment'
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
                  <Text style={styles.modalText}>Student ID: {selectedApplication.student_id}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
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
    backgroundColor: '#4285f4',
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  applicationsList: {
    flex: 1,
    padding: 20,
  },
  applicationCard: {
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
  applicationInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  position: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  department: {
    fontSize: 12,
    color: '#999',
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
    color: '#666',
    marginLeft: 8,
  },
  academicInfo: {
    marginBottom: 10,
  },
  academicText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
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
    color: '#999',
    fontStyle: 'italic',
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
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
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
    lineHeight: 22,
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
  downloadButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#34a853',
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
  transcriptButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#9c27b0',
    alignItems: 'center',
  },
  transcriptButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  approveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#34a853',
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  rejectButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#ea4335',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
