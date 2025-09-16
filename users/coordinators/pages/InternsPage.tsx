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

const { width } = Dimensions.get('window');

interface Intern {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  studentId: string;
  academicYear: string;
  major: string;
  university: string;
  gpa: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  internshipCompany?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  requirements: {
    resume: boolean;
    transcript: boolean;
    recommendationLetter: boolean;
    medicalClearance: boolean;
    insurance: boolean;
  };
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface InternsPageProps {
  currentUser: UserInfo | null;
}

export default function InternsPage({ currentUser }: InternsPageProps) {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [showRequirements, setShowRequirements] = useState(false);
  const [showAddInternModal, setShowAddInternModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [addInternEmail, setAddInternEmail] = useState('');
  const [addInternStudentId, setAddInternStudentId] = useState('');
  const [addInternSchoolYear, setAddInternSchoolYear] = useState('2024-2025');
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentFound, setStudentFound] = useState<any>(null);
  const [searchError, setSearchError] = useState('');

  const schoolYears = ['2023-2024', '2024-2025', '2025-2026'];

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, selectedSchoolYear, interns]);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setInterns([]);
        return;
      }

      console.log('Fetching interns for coordinator:', currentUser.id);
      
      // Fetch interns from the database
      const response = await apiService.getCoordinatorInterns(currentUser.id);
      
      if (response.success && response.interns) {
        console.log('✅ Interns fetched successfully:', response.interns.length);
        
        // Transform the data to match the Intern interface
        const transformedInterns: Intern[] = response.interns.map((intern: any) => ({
          id: intern.id,
          firstName: intern.first_name,
          lastName: intern.last_name,
          email: intern.email,
          phoneNumber: intern.phone_number || 'N/A',
          studentId: intern.id_number,
          academicYear: intern.year,
          major: intern.major,
          university: intern.university || 'University of Technology',
          gpa: intern.gpa || 'N/A',
          schoolYear: intern.school_year,
          status: intern.status || 'active',
          internshipCompany: intern.internship_company || undefined,
          internshipStartDate: intern.internship_start_date || undefined,
          internshipEndDate: intern.internship_end_date || undefined,
          requirements: {
            resume: intern.resume || false,
            transcript: intern.transcript || false,
            recommendationLetter: intern.recommendation_letter || false,
            medicalClearance: intern.medical_clearance || false,
            insurance: intern.insurance || false,
          },
        }));
        
        setInterns(transformedInterns);
      } else {
        console.log('No interns found or error:', response.message);
        setInterns([]);
      }
    } catch (error) {
      console.error('Error fetching interns:', error);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const filterInterns = () => {
    let filtered = interns;

    // Filter by school year
    filtered = filtered.filter(intern => intern.schoolYear === selectedSchoolYear);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(intern =>
        intern.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (intern.internshipCompany && intern.internshipCompany.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredInterns(filtered);
  };

  const handleViewDetails = (intern: Intern) => {
    Alert.alert(
      'Intern Details',
      `Name: ${intern.firstName} ${intern.lastName}\nStudent ID: ${intern.studentId}\nEmail: ${intern.email}\nPhone: ${intern.phoneNumber}\nMajor: ${intern.major}\nUniversity: ${intern.university}\nGPA: ${intern.gpa}\nStatus: ${intern.status}\n${intern.internshipCompany ? `Company: ${intern.internshipCompany}` : ''}\n${intern.internshipStartDate ? `Start Date: ${intern.internshipStartDate}` : ''}\n${intern.internshipEndDate ? `End Date: ${intern.internshipEndDate}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleViewProfile = (intern: Intern) => {
    Alert.alert(
      'Intern Profile',
      `Viewing profile for ${intern.firstName} ${intern.lastName}`,
      [{ text: 'OK' }]
    );
  };

  const handleDeleteIntern = (intern: Intern) => {
    Alert.alert(
      'Delete Intern',
      `Are you sure you want to delete ${intern.firstName} ${intern.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setInterns(interns.filter(i => i.id !== intern.id));
            Alert.alert('Success', 'Intern deleted successfully');
          }
        },
      ]
    );
  };

  const handleRequirements = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowRequirements(true);
  };

  const handleRequirementToggle = (requirement: keyof Intern['requirements']) => {
    if (!selectedIntern) return;
    
    const updatedIntern = {
      ...selectedIntern,
      requirements: {
        ...selectedIntern.requirements,
        [requirement]: !selectedIntern.requirements[requirement],
      },
    };
    
    setSelectedIntern(updatedIntern);
    setInterns(interns.map(intern =>
      intern.id === updatedIntern.id ? updatedIntern : intern
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      case 'graduated': return '#4285f4';
      case 'suspended': return '#fbbc04';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'graduated': return 'Graduated';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
    }
  };

  const getRequirementsProgress = (requirements: Intern['requirements']) => {
    const total = Object.keys(requirements).length;
    const completed = Object.values(requirements).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const validateStudentId = (studentId: string) => {
    const regex = /^\d{4}-\d{4}$/;
    return regex.test(studentId);
  };

  const searchStudent = async () => {
    if (!addInternEmail.trim() && !addInternStudentId.trim()) {
      setSearchError('Please enter either email or student ID');
      return;
    }

    if (addInternStudentId.trim() && !validateStudentId(addInternStudentId)) {
      setSearchError('Student ID must be in format xxxx-xxxx');
      return;
    }

    try {
      setSearchingStudent(true);
      setSearchError('');
      setStudentFound(null);

      // Search by email or student ID
      const searchParams = addInternEmail.trim() 
        ? { email: addInternEmail.trim() }
        : { studentId: addInternStudentId.trim() };

      console.log('Searching for student with params:', searchParams);
      
      // This would be a new API endpoint to search for students
      const response = await apiService.searchStudent(searchParams);
      
      if (response.success && response.student) {
        setStudentFound(response.student);
        console.log('Student found:', response.student);
      } else {
        setSearchError('Student not found');
      }
    } catch (error) {
      console.error('Error searching for student:', error);
      setSearchError('Error searching for student. Please try again.');
    } finally {
      setSearchingStudent(false);
    }
  };

  const addStudentAsIntern = async () => {
    if (!studentFound) {
      setSearchError('Please search for a student first');
      return;
    }

    if (!currentUser) {
      setSearchError('User not authenticated');
      return;
    }

    try {
      console.log('Adding student as intern:', studentFound);
      console.log('Current user ID:', currentUser.id);
      
      // This would be a new API endpoint to add student as intern
      const response = await apiService.addStudentAsIntern({
        studentId: studentFound.id,
        schoolYear: addInternSchoolYear,
        coordinatorId: currentUser.id // Use actual current user ID
      });

      if (response.success) {
        Alert.alert('Success', 'Student added as intern successfully');
        setShowAddInternModal(false);
        setAddInternEmail('');
        setAddInternStudentId('');
        setStudentFound(null);
        setSearchError('');
        // Refresh the interns list
        await fetchInterns();
      } else {
        setSearchError(response.message || 'Failed to add student as intern');
      }
    } catch (error) {
      console.error('Error adding student as intern:', error);
      // Extract the actual error message from the error object
      const errorMessage = error instanceof Error ? error.message : 'Error adding student as intern. Please try again.';
      setSearchError(errorMessage);
    }
  };

  const closeAddInternModal = () => {
    setShowAddInternModal(false);
    setAddInternEmail('');
    setAddInternStudentId('');
    setStudentFound(null);
    setSearchError('');
  };

  const InternCard = ({ intern }: { intern: Intern }) => {
    const requirementsProgress = getRequirementsProgress(intern.requirements);
    
    return (
      <View style={styles.internCard}>
        <View style={styles.internHeader}>
          <View style={styles.profileContainer}>
            {intern.profilePicture ? (
              <Image source={{ uri: intern.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileText}>
                  {intern.firstName.charAt(0)}{intern.lastName.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.internInfo}>
            <Text style={styles.internName}>
              {intern.firstName} {intern.lastName}
            </Text>
            <Text style={styles.studentId}>{intern.studentId}</Text>
            <Text style={styles.major}>{intern.major}</Text>
            <Text style={styles.academicYear}>{intern.academicYear}</Text>
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
              <Text style={styles.contactText}>{intern.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="phone" size={16} color="#666" />
              <Text style={styles.contactText}>{intern.phoneNumber}</Text>
            </View>
          </View>

          {intern.internshipCompany && (
            <View style={styles.internshipInfo}>
              <Text style={styles.internshipLabel}>Current Internship:</Text>
              <Text style={styles.internshipCompany}>{intern.internshipCompany}</Text>
              <Text style={styles.internshipDates}>
                {intern.internshipStartDate} - {intern.internshipEndDate}
              </Text>
            </View>
          )}

          <View style={styles.requirementsContainer}>
            <View style={styles.requirementsHeader}>
              <Text style={styles.requirementsLabel}>Requirements Progress:</Text>
              <Text style={styles.requirementsProgress}>{requirementsProgress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${requirementsProgress}%`,
                    backgroundColor: requirementsProgress === 100 ? '#34a853' : '#fbbc04'
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]} 
            onPress={() => handleViewDetails(intern)}
          >
            <MaterialIcons name="visibility" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.profileButton]} 
            onPress={() => handleViewProfile(intern)}
          >
            <MaterialIcons name="person" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.requirementsButton]} 
            onPress={() => handleRequirements(intern)}
          >
            <MaterialIcons name="assignment" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Requirements</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => handleDeleteIntern(intern)}
          >
            <MaterialIcons name="delete" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const RequirementItem = ({ 
    label, 
    completed, 
    onToggle 
  }: { 
    label: string; 
    completed: boolean; 
    onToggle: () => void;
  }) => (
    <TouchableOpacity style={styles.requirementItem} onPress={onToggle}>
      <View style={styles.requirementInfo}>
        <MaterialIcons 
          name={completed ? "check-circle" : "radio-button-unchecked"} 
          size={24} 
          color={completed ? "#34a853" : "#666"} 
        />
        <Text style={[
          styles.requirementLabel,
          completed && styles.completedRequirement
        ]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
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
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>School Year:</Text>
          <TouchableOpacity style={styles.yearSelector}>
            <Text style={styles.yearText}>{selectedSchoolYear}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddInternModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Intern</Text>
          </TouchableOpacity>
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
            {filteredInterns.filter(i => i.status === 'graduated').length}
          </Text>
          <Text style={styles.statLabel}>Graduated</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredInterns.filter(i => getRequirementsProgress(i.requirements) < 100).length}
          </Text>
          <Text style={styles.statLabel}>Incomplete</Text>
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
                : `No interns found for ${selectedSchoolYear}`
              }
            </Text>
          </View>
        ) : (
          filteredInterns.map((intern) => (
            <InternCard key={intern.id} intern={intern} />
          ))
        )}
      </ScrollView>

      {/* Requirements Modal */}
      <Modal
        visible={showRequirements}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequirements(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Requirements - {selectedIntern?.firstName} {selectedIntern?.lastName}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowRequirements(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.requirementsList}>
              {selectedIntern && (
                <>
                  <RequirementItem
                    label="Resume"
                    completed={selectedIntern.requirements.resume}
                    onToggle={() => handleRequirementToggle('resume')}
                  />
                  <RequirementItem
                    label="Official Transcript"
                    completed={selectedIntern.requirements.transcript}
                    onToggle={() => handleRequirementToggle('transcript')}
                  />
                  <RequirementItem
                    label="Recommendation Letter"
                    completed={selectedIntern.requirements.recommendationLetter}
                    onToggle={() => handleRequirementToggle('recommendationLetter')}
                  />
                  <RequirementItem
                    label="Medical Clearance"
                    completed={selectedIntern.requirements.medicalClearance}
                    onToggle={() => handleRequirementToggle('medicalClearance')}
                  />
                  <RequirementItem
                    label="Insurance Documentation"
                    completed={selectedIntern.requirements.insurance}
                    onToggle={() => handleRequirementToggle('insurance')}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Intern Modal */}
      <Modal
        visible={showAddInternModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddInternModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Intern</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={closeAddInternModal}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addInternForm}>
              <Text style={styles.formLabel}>Search Student</Text>
              <Text style={styles.formSubLabel}>Enter either email or student ID to search</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="student@university.edu"
                  value={addInternEmail}
                  onChangeText={setAddInternEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Student ID (Format: xxxx-xxxx)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1234-5678"
                  value={addInternStudentId}
                  onChangeText={setAddInternStudentId}
                  maxLength={9}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>School Year</Text>
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerText}>{addInternSchoolYear}</Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </View>
              </View>

              {searchError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.searchButton, searchingStudent && styles.disabledButton]}
                onPress={searchStudent}
                disabled={searchingStudent}
              >
                {searchingStudent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="search" size={20} color="#fff" />
                )}
                <Text style={styles.searchButtonText}>
                  {searchingStudent ? 'Searching...' : 'Search Student'}
                </Text>
              </TouchableOpacity>

              {studentFound && (
                <View style={styles.studentFoundContainer}>
                  <Text style={styles.studentFoundTitle}>Student Found:</Text>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {studentFound.first_name} {studentFound.last_name}
                    </Text>
                    <Text style={styles.studentDetails}>
                      ID: {studentFound.id_number} | {studentFound.major}
                    </Text>
                    <Text style={styles.studentDetails}>
                      Email: {studentFound.email}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addStudentAsIntern}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add as Intern</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  yearText: {
    fontSize: 14,
    color: '#1a1a2e',
    marginRight: 4,
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
  major: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  academicYear: {
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
  internshipInfo: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  internshipLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  internshipCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  internshipDates: {
    fontSize: 12,
    color: '#999',
  },
  requirementsContainer: {
    marginTop: 10,
  },
  requirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  requirementsLabel: {
    fontSize: 14,
    color: '#666',
  },
  requirementsProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
    backgroundColor: '#4285f4',
  },
  profileButton: {
    backgroundColor: '#34a853',
  },
  requirementsButton: {
    backgroundColor: '#fbbc04',
  },
  deleteButton: {
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
    maxWidth: 400,
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
  requirementsList: {
    maxHeight: 400,
    padding: 20,
  },
  requirementItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requirementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementLabel: {
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 12,
  },
  completedRequirement: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  // Add Intern Modal Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34a853',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addInternForm: {
    padding: 20,
    maxHeight: 500,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  formSubLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#1a1a2e',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  studentFoundContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  studentFoundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  studentInfo: {
    marginBottom: 16,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});
