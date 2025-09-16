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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import StudentLocationMap from '../../../components/StudentLocationMap';

const { width } = Dimensions.get('window');

interface Intern {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  student_email: string;
  student_profile_picture?: string;
  major: string;
  year: string;
  position: string;
  department?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  applied_at: string;
  status: 'active' | 'inactive' | 'completed' | 'terminated';
  // Location data
  student_latitude?: number;
  student_longitude?: number;
  // Additional fields for display
  attendance?: {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
  };
  performance?: {
    rating: number;
    feedback: string;
    lastReview: string;
  };
  documents?: {
    resume: boolean;
    transcript: boolean;
    recommendationLetter: boolean;
    medicalClearance: boolean;
    insurance: boolean;
  };
}

interface InternsPageProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
}

export default function InternsPage({ currentUser }: InternsPageProps) {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);

  useEffect(() => {
    fetchInterns();
    fetchCurrentUserLocation();
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, interns]);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved applications for company:', currentUser.id);
      
      const response = await apiService.getApprovedApplications(currentUser.id);
      
      if (response.success && response.applications) {
        console.log('Approved applications fetched:', response.applications);
        
        // Transform approved applications to intern format
        const transformedInterns: Intern[] = response.applications.map((app: any) => ({
          id: app.id.toString(),
          student_id: app.student_id.toString(),
          first_name: app.first_name || 'Unknown',
          last_name: app.last_name || 'Student',
          student_email: app.student_email || 'N/A',
          student_profile_picture: app.student_profile_picture,
          major: app.major || 'N/A',
          year: app.year || 'N/A',
          position: app.position || 'Intern',
          department: app.department || 'N/A',
          expected_start_date: app.expected_start_date,
          expected_end_date: app.expected_end_date,
          applied_at: app.applied_at,
          status: 'active' as const, // All approved applications are considered active interns
          // Location data
          student_latitude: app.student_latitude,
          student_longitude: app.student_longitude,
          // Default values for display
          attendance: {
            present: 0,
            absent: 0,
            late: 0,
            totalDays: 0,
          },
          performance: {
            rating: 0,
            feedback: 'No feedback available yet',
            lastReview: 'N/A',
          },
          documents: {
            resume: !!app.resume_url,
            transcript: !!app.transcript_url,
            recommendationLetter: false,
            medicalClearance: false,
            insurance: false,
          },
        }));
        
        setInterns(transformedInterns);
      } else {
        console.log('No approved applications found or error:', response);
        setInterns([]);
      }
    } catch (error) {
      console.error('Error fetching approved applications:', error);
      setInterns([]);
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

  const filterInterns = () => {
    let filtered = interns;

    if (searchQuery) {
      filtered = filtered.filter(intern =>
        intern.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.position.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInterns(filtered);
  };


  const updateApplicationStatusToRejected = async (applicationId: string) => {
    try {
      console.log('🔥 Updating application status to rejected in database...');
      console.log('🔥 Application ID:', applicationId);
      console.log('🔥 Current user ID:', currentUser.id);
      
      const response = await apiService.updateApplicationStatus(
        applicationId, 
        'rejected', 
        'Intern removed from program by company',
        currentUser.id
      );
      
      console.log('🔥 Database update response:', response);
      
      if (response.success) {
        console.log('✅ Application status updated to rejected successfully');
      } else {
        console.error('❌ Failed to update application status:', response.message);
        Alert.alert('Error', 'Failed to update application status in database');
      }
    } catch (error) {
      console.error('❌ Error updating application status:', error);
      Alert.alert('Error', 'Failed to update application status');
    }
  };

  const handleRemoveIntern = (intern: Intern) => {
    console.log('🔥 ===== REMOVE INTERN DEBUGGING =====');
    console.log('🔥 Remove button clicked for intern:', intern.first_name, intern.last_name);
    console.log('🔥 Intern ID:', intern.id);
    console.log('🔥 Current interns count:', interns.length);
    console.log('🔥 Current filtered interns count:', filteredInterns.length);
    
    console.log('🔥 About to show Alert.alert...');
    
    try {
      Alert.alert(
        'Remove Intern',
        `Are you sure you want to remove ${intern.first_name} ${intern.last_name} from the internship program?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🔥 Remove cancelled by user');
            }
          },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => {
              console.log('🔥 User confirmed removal');
              console.log('🔥 Removing intern with ID:', intern.id);
              
              // Update application status to rejected in database
              updateApplicationStatusToRejected(intern.id);
              
              // Update local state
              const updatedInterns = interns.filter(i => i.id !== intern.id);
              const updatedFilteredInterns = filteredInterns.filter(i => i.id !== intern.id);
              
              console.log('🔥 Updated interns count:', updatedInterns.length);
              console.log('🔥 Updated filtered interns count:', updatedFilteredInterns.length);
              
              setInterns(updatedInterns);
              setFilteredInterns(updatedFilteredInterns);
              
              console.log('🔥 State updated successfully');
              Alert.alert('Success', 'Intern removed successfully');
            }
          },
        ]
      );
      console.log('🔥 Alert.alert called successfully');
    } catch (error) {
      console.error('🔥 Error showing Alert:', error);
    }
  };

  const handleAttendance = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowAttendanceModal(true);
  };

  const handleViewDetails = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowDetailsModal(true);
  };

  const handleViewLocation = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowLocationMap(true);
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const handleAddIntern = () => {
    Alert.alert(
      'Add Intern',
      'Add intern functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      case 'completed': return '#4285f4';
      case 'terminated': return '#fbbc04';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'completed': return 'Completed';
      case 'terminated': return 'Terminated';
      default: return 'Unknown';
    }
  };

  const getAttendancePercentage = (attendance?: Intern['attendance']) => {
    if (!attendance || attendance.totalDays === 0) return 0;
    return Math.round((attendance.present / attendance.totalDays) * 100);
  };

  const InternCard = ({ intern }: { intern: Intern }) => {
    const attendancePercentage = getAttendancePercentage(intern.attendance);
    
    return (
      <View style={styles.internCard}>
        <View style={styles.internHeader}>
        <View style={styles.profileContainer}>
          {intern.student_profile_picture ? (
            <Image source={{ uri: intern.student_profile_picture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>
                {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.internInfo}>
          <Text style={styles.internName}>
            {intern.first_name} {intern.last_name}
          </Text>
          <Text style={styles.studentId}>{intern.student_id}</Text>
          <Text style={styles.position}>{intern.position}</Text>
          <Text style={styles.department}>{intern.department || 'N/A'}</Text>
        </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intern.status) }]}>
              <Text style={styles.statusText}>{getStatusText(intern.status)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.internDetails}>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <MaterialIcons name="email" size={16} color="#666" />
              <Text style={styles.contactText}>{intern.student_email}</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="school" size={16} color="#666" />
              <Text style={styles.contactText}>{intern.major} • {intern.year}</Text>
            </View>
          </View>

          <View style={styles.attendanceContainer}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceLabel}>Attendance:</Text>
              <Text style={styles.attendancePercentage}>{attendancePercentage}%</Text>
            </View>
            <View style={styles.attendanceBar}>
              <View 
                style={[
                  styles.attendanceFill, 
                  { 
                    width: `${attendancePercentage}%`,
                    backgroundColor: attendancePercentage >= 90 ? '#34a853' : attendancePercentage >= 70 ? '#fbbc04' : '#ea4335'
                  }
                ]} 
              />
            </View>
            <Text style={styles.attendanceDetails}>
              {intern.attendance?.present || 0} present, {intern.attendance?.absent || 0} absent, {intern.attendance?.late || 0} late
            </Text>
          </View>

          <View style={styles.performanceContainer}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Performance:</Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#fbbc04" />
                <Text style={styles.ratingText}>{intern.performance?.rating || 0}/5</Text>
              </View>
            </View>
            <Text style={styles.performanceFeedback} numberOfLines={2}>
              {intern.performance?.feedback || 'No feedback available yet'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]} 
            onPress={() => handleViewDetails(intern)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="visibility" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.locationButton]} 
            onPress={() => handleViewLocation(intern)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="location-on" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.attendanceButton]} 
            onPress={() => handleAttendance(intern)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="event-note" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Attendance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.removeButton]} 
            onPress={() => {
              console.log('🔥 ===== BUTTON CLICK DEBUGGING =====');
              console.log('🔥 Remove button onPress triggered');
              console.log('🔥 Button pressed for intern:', intern.first_name, intern.last_name);
              
              // Use modal approach instead of Alert
              setSelectedIntern(intern);
              setShowRemoveConfirmModal(true);
              console.log('🔥 Showing remove confirmation modal');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="remove" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading interns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interns Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddIntern}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Intern</Text>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search interns..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredInterns.length}</Text>
          <Text style={styles.statLabel}>Total Interns</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34a853' }]}>
            {filteredInterns.filter(i => i.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#4285f4' }]}>
            {filteredInterns.filter(i => i.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredInterns.filter(i => getAttendancePercentage(i.attendance) >= 90).length}
          </Text>
          <Text style={styles.statLabel}>Good Attendance</Text>
        </View>
      </View>

      {/* Interns List */}
      <ScrollView style={styles.internsList} showsVerticalScrollIndicator={false}>
        {filteredInterns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No interns found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Add your first intern to get started'
              }
            </Text>
          </View>
        ) : (
          filteredInterns.map((intern) => (
            <InternCard key={intern.id} intern={intern} />
          ))
        )}
      </ScrollView>

      {/* Attendance Modal */}
      <Modal
        visible={showAttendanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Attendance - {selectedIntern?.first_name} {selectedIntern?.last_name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowAttendanceModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.attendanceContent}>
              {selectedIntern && (
                <View>
                  <View style={styles.attendanceStats}>
                    <View style={styles.attendanceStatItem}>
                      <Text style={styles.attendanceStatNumber}>{selectedIntern.attendance?.present || 0}</Text>
                      <Text style={styles.attendanceStatLabel}>Present</Text>
                    </View>
                    <View style={styles.attendanceStatItem}>
                      <Text style={styles.attendanceStatNumber}>{selectedIntern.attendance?.absent || 0}</Text>
                      <Text style={styles.attendanceStatLabel}>Absent</Text>
                    </View>
                    <View style={styles.attendanceStatItem}>
                      <Text style={styles.attendanceStatNumber}>{selectedIntern.attendance?.late || 0}</Text>
                      <Text style={styles.attendanceStatLabel}>Late</Text>
                    </View>
                    <View style={styles.attendanceStatItem}>
                      <Text style={styles.attendanceStatNumber}>{selectedIntern.attendance?.totalDays || 0}</Text>
                      <Text style={styles.attendanceStatLabel}>Total Days</Text>
                    </View>
                  </View>
                  
                  <View style={styles.attendancePercentageContainer}>
                    <Text style={styles.attendancePercentageLabel}>Attendance Percentage:</Text>
                    <Text style={styles.attendancePercentageValue}>
                      {getAttendancePercentage(selectedIntern.attendance)}%
                    </Text>
                  </View>
                  
                  <View style={styles.attendanceActions}>
                    <TouchableOpacity style={styles.markPresentButton}>
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.markPresentText}>Mark Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.markAbsentButton}>
                      <MaterialIcons name="close" size={20} color="#fff" />
                      <Text style={styles.markAbsentText}>Mark Absent</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Full Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Intern Details - {selectedIntern?.first_name} {selectedIntern?.last_name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedIntern && (
                <View>
                  <Text style={styles.modalSectionTitle}>Personal Information</Text>
                  <Text style={styles.modalText}>Name: {selectedIntern.first_name} {selectedIntern.last_name}</Text>
                  <Text style={styles.modalText}>Student ID: {selectedIntern.student_id}</Text>
                  <Text style={styles.modalText}>Email: {selectedIntern.student_email}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Academic Information</Text>
                  <Text style={styles.modalText}>Major: {selectedIntern.major}</Text>
                  <Text style={styles.modalText}>Academic Year: {selectedIntern.year}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Internship Details</Text>
                  <Text style={styles.modalText}>Position: {selectedIntern.position}</Text>
                  <Text style={styles.modalText}>Department: {selectedIntern.department || 'N/A'}</Text>
                  <Text style={styles.modalText}>Status: {getStatusText(selectedIntern.status)}</Text>
                  <Text style={styles.modalText}>Start Date: {selectedIntern.expected_start_date || 'N/A'}</Text>
                  <Text style={styles.modalText}>End Date: {selectedIntern.expected_end_date || 'N/A'}</Text>
                  <Text style={styles.modalText}>Applied: {new Date(selectedIntern.applied_at).toLocaleDateString()}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Performance</Text>
                  <Text style={styles.modalText}>Rating: {selectedIntern.performance?.rating || 0}/5</Text>
                  <Text style={styles.modalText}>Feedback: {selectedIntern.performance?.feedback || 'No feedback available yet'}</Text>
                  <Text style={styles.modalText}>Last Review: {selectedIntern.performance?.lastReview || 'N/A'}</Text>
                  
                  <Text style={styles.modalSectionTitle}>Attendance</Text>
                  <Text style={styles.modalText}>Present: {selectedIntern.attendance?.present || 0} days</Text>
                  <Text style={styles.modalText}>Absent: {selectedIntern.attendance?.absent || 0} days</Text>
                  <Text style={styles.modalText}>Late: {selectedIntern.attendance?.late || 0} days</Text>
                  <Text style={styles.modalText}>Total Days: {selectedIntern.attendance?.totalDays || 0} days</Text>
                  <Text style={styles.modalText}>Attendance Rate: {getAttendancePercentage(selectedIntern.attendance)}%</Text>
                  
                  <Text style={styles.modalSectionTitle}>Documents</Text>
                  <Text style={styles.modalText}>Resume: {selectedIntern.documents?.resume ? '✓ Available' : '✗ Not Available'}</Text>
                  <Text style={styles.modalText}>Transcript: {selectedIntern.documents?.transcript ? '✓ Available' : '✗ Not Available'}</Text>
                  <Text style={styles.modalText}>Recommendation Letter: {selectedIntern.documents?.recommendationLetter ? '✓ Available' : '✗ Not Available'}</Text>
                  <Text style={styles.modalText}>Medical Clearance: {selectedIntern.documents?.medicalClearance ? '✓ Available' : '✗ Not Available'}</Text>
                  <Text style={styles.modalText}>Insurance: {selectedIntern.documents?.insurance ? '✓ Available' : '✗ Not Available'}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Location Map */}
      <StudentLocationMap
        visible={showLocationMap}
        onClose={closeLocationMap}
        selectedApplication={selectedIntern ? {
          id: selectedIntern.id,
          first_name: selectedIntern.first_name,
          last_name: selectedIntern.last_name,
          student_latitude: selectedIntern.student_latitude || 0,
          student_longitude: selectedIntern.student_longitude || 0,
          student_profile_picture: selectedIntern.student_profile_picture,
        } : undefined}
        currentUserLocation={currentUserLocation || undefined}
      />

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRemoveConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Remove Intern</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowRemoveConfirmModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Are you sure you want to remove {selectedIntern?.first_name} {selectedIntern?.last_name} from the internship program?
              </Text>
              <Text style={styles.modalText}>
                This action will update their application status to rejected and remove them from the interns list.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  console.log('🔥 Remove cancelled by user');
                  setShowRemoveConfirmModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: '#ea4335' }]}
                onPress={() => {
                  console.log('🔥 User confirmed removal via modal');
                  if (selectedIntern) {
                    // Update application status to rejected in database
                    updateApplicationStatusToRejected(selectedIntern.id);
                    
                    // Update local state
                    setInterns(interns.filter(i => i.id !== selectedIntern.id));
                    setFilteredInterns(filteredInterns.filter(i => i.id !== selectedIntern.id));
                    
                    console.log('🔥 Intern removed successfully');
                    setShowRemoveConfirmModal(false);
                    Alert.alert('Success', 'Intern removed successfully');
                  }
                }}
              >
                <Text style={[styles.cancelButtonText, { color: '#fff' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  internsList: {
    flex: 1,
    padding: 20,
  },
  internCard: {
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
  internHeader: {
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
  internInfo: {
    flex: 1,
  },
  internName: {
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
  internDetails: {
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
  attendanceContainer: {
    marginBottom: 10,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  attendanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  attendancePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  attendanceBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  attendanceFill: {
    height: '100%',
    borderRadius: 3,
  },
  attendanceDetails: {
    fontSize: 12,
    color: '#999',
  },
  performanceContainer: {
    marginTop: 10,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginLeft: 4,
  },
  performanceFeedback: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: '23%',
    justifyContent: 'center',
    minHeight: 36,
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  attendanceButton: {
    backgroundColor: '#fbbc04',
  },
  removeButton: {
    backgroundColor: '#ea4335',
  },
  locationButton: {
    backgroundColor: '#9c27b0',
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
    maxWidth: 500,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  attendanceContent: {
    padding: 20,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  attendanceStatItem: {
    alignItems: 'center',
  },
  attendanceStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  attendancePercentageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  attendancePercentageLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  attendancePercentageValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  markPresentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34a853',
    paddingVertical: 12,
    borderRadius: 8,
  },
  markPresentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  markAbsentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea4335',
    paddingVertical: 12,
    borderRadius: 8,
  },
  markAbsentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
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
});
