import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { apiService } from '../../../lib/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isMobile = screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isDesktop = screenWidth >= 1024;

interface Requirement {
  id: string;
  name: string;
  completed: boolean;
}

interface Intern {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  studentId: string;
  userId?: string;
  academicYear: string;
  major: string;
  program: string;
  university: string;
  gpa: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  internshipCompany?: string;
  coordinatorName?: string;
  requirements: Requirement[];
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface AllInternsPageProps {
  currentUser: UserInfo | null;
  onBack?: () => void;
}

interface Class {
  id: string;
  className: string;
  schoolYear: string;
  classCode: string;
  studentCount: number;
  status: string;
}

export default function AllInternsPage({ 
  currentUser, 
  onBack 
}: AllInternsPageProps) {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [allInterns, setAllInterns] = useState<Intern[]>([]); // Store all interns before filtering
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: screenWidth, height: screenHeight });
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    fetchAllInterns();
    fetchClasses();

    // Cleanup: prepare for slide out when component unmounts
    return () => {
      Animated.timing(slideAnim, {
        toValue: dimensions.width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
  }, [dimensions.width]);

  useEffect(() => {
    // Filter interns when class selection changes
    if (selectedClassId) {
      filterInternsByClass(selectedClassId);
    } else {
      // Show all interns if no class selected
      setInterns(allInterns);
    }
  }, [selectedClassId, allInterns]);

  useEffect(() => {
    // Filter interns based on search query
    if (searchQuery.trim() === '') {
      setFilteredInterns(interns);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = interns.filter(intern => {
        const fullName = `${intern.firstName} ${intern.middleName || ''} ${intern.lastName}`.toLowerCase();
        const studentId = intern.studentId?.toLowerCase() || '';
        const email = intern.email?.toLowerCase() || '';
        const major = intern.major?.toLowerCase() || '';
        const program = intern.program?.toLowerCase() || '';
        const coordinator = intern.coordinatorName?.toLowerCase() || '';
        const company = intern.internshipCompany?.toLowerCase() || '';
        
        return fullName.includes(query) ||
               studentId.includes(query) ||
               email.includes(query) ||
               major.includes(query) ||
               program.includes(query) ||
               coordinator.includes(query) ||
               company.includes(query);
      });
      setFilteredInterns(filtered);
    }
  }, [searchQuery, interns]);

  const fetchAllInterns = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setInterns([]);
        setLoading(false);
        return;
      }

      console.log('Fetching all students for coordinator:', currentUser.id);
      
      // First, fetch the coordinator's requirements to filter by
      const coordinatorRequirementsResponse = await apiService.getCoordinatorRequirements(currentUser.id);
      const coordinatorRequirementIds = new Set<string>();
      
      if (coordinatorRequirementsResponse.success && coordinatorRequirementsResponse.requirements) {
        coordinatorRequirementsResponse.requirements.forEach((req: any) => {
          const reqId = String(req.requirement_id || '');
          if (reqId) {
            coordinatorRequirementIds.add(reqId);
          }
        });
      }
      
      // Fetch all students from the database (like InternsManagement.tsx)
      const response = await apiService.getAllStudents();
      
      if (response.success) {
        const responseData = response as any;
        const studentsData = responseData.students || responseData.data?.students || responseData.data || [];
        
        console.log('✅ All students fetched successfully:', studentsData.length);
        
        // Transform the data to match the Intern interface and fetch requirements
        const transformedInterns: Intern[] = await Promise.all(
          studentsData.map(async (student: any) => {
            const studentId = student.id?.toString() || '';
            const userId = student.user_id?.toString() || '';
            
            // Fetch requirements, submissions, coordinator, and company for this student
            const [requirements, submissions, coordinatorName, companyName] = await Promise.all([
              fetchStudentRequirements(studentId),
              fetchStudentSubmissions(studentId),
              fetchStudentCoordinator(studentId),
              fetchStudentCompany(userId)
            ]);
            
            // Filter requirements to only include those from this coordinator
            const coordinatorRequirements = requirements.filter((req: any) => {
              const reqId = String(req.requirement_id || req.id || '');
              return coordinatorRequirementIds.has(reqId);
            });
            
            // Filter submissions to only include those from this coordinator
            const coordinatorSubmissions = submissions.filter((sub: any) => {
              const subId = String(sub.requirement_id || '');
              return coordinatorRequirementIds.has(subId);
            });
            
            // Create a map of all requirements (both assigned and submitted)
            const allRequirements = new Map();
            
            // Add assigned requirements
            coordinatorRequirements.forEach((req: any) => {
              const reqId = String(req.requirement_id || req.id || '');
              allRequirements.set(reqId, {
                id: reqId,
                name: req.requirement_name || req.name,
                completed: false
              });
            });
            
            // Add submitted requirements
            coordinatorSubmissions.forEach((sub: any) => {
              const subId = String(sub.requirement_id || '');
              const existingReq = allRequirements.get(subId);
              if (existingReq) {
                allRequirements.set(subId, {
                  ...existingReq,
                  completed: sub.status === 'approved'
                });
              } else {
                allRequirements.set(subId, {
                  id: subId,
                  name: sub.requirement_name,
                  completed: sub.status === 'approved'
                });
              }
            });
            
            const requirementsWithStatus = Array.from(allRequirements.values());
            
            return {
              id: student.id?.toString() || '',
              firstName: student.first_name || '',
              middleName: student.middle_name || '',
              lastName: student.last_name || '',
              email: student.email || '',
              phoneNumber: student.phone_number || 'N/A',
              profilePicture: student.profile_picture || null,
              studentId: student.id_number || '',
              userId: student.user_id?.toString() || '',
              academicYear: student.year || '',
              major: student.major || '',
              program: student.program || 'N/A',
              university: student.university || 'Davao Oriental State University',
              gpa: student.gpa?.toString() || 'N/A',
              schoolYear: student.school_year || student.year || '',
              status: student.is_active === false ? 'inactive' : (student.status || 'active'),
              internshipCompany: companyName !== 'N/A' ? companyName : undefined,
              coordinatorName: coordinatorName,
              requirements: requirementsWithStatus,
            };
          })
        );
        
        setAllInterns(transformedInterns);
        // If no class is selected, show all interns
        if (!selectedClassId) {
          setInterns(transformedInterns);
        }
      } else {
        console.log('No students found or error:', response.message);
        setAllInterns([]);
        setInterns([]);
      }
    } catch (error) {
      console.error('Error fetching all students:', error);
      setAllInterns([]);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      // Fetch all classes, not just the current coordinator's classes
      const response = await apiService.getAllClasses() as any;
      
      if (response.success && response.classes) {
        const classesData = response.classes || [];
        setClasses(classesData.map((cls: any) => ({
          id: cls.id?.toString() || '',
          className: cls.className || cls.class_name || '',
          schoolYear: cls.schoolYear || cls.school_year || '',
          classCode: cls.classCode || cls.class_code || '',
          studentCount: cls.studentCount || 0,
          status: cls.status || 'active'
        })));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const filterInternsByClass = async (classId: string) => {
    try {
      // Fetch students enrolled in this class
      const response = await apiService.getClassStudents(classId) as any;
      
      if (response.success && response.students) {
        const enrolledStudents = response.students || [];
        const enrolledIds = new Set<string>(enrolledStudents.map((s: any) => s.id?.toString() || ''));
        setEnrolledStudentIds(enrolledIds);
        
        // Filter interns to only show those enrolled in the selected class
        const filtered = allInterns.filter(intern => enrolledIds.has(intern.id));
        setInterns(filtered);
      } else {
        // If no students found, show empty list
        setInterns([]);
        setEnrolledStudentIds(new Set<string>());
      }
    } catch (error) {
      console.error('Error filtering interns by class:', error);
      setInterns([]);
      setEnrolledStudentIds(new Set<string>());
    }
  };

  const handleClassSelect = (classId: string | null) => {
    setSelectedClassId(classId);
    setShowClassDropdown(false);
  };

  const downloadInternsExcel = async () => {
    try {
      Alert.alert('Processing', 'Preparing Excel file...');
      
      // Use filtered interns if search is active, otherwise use all interns
      const internsToExport = searchQuery.trim() !== '' ? filteredInterns : interns;
      
      if (internsToExport.length === 0) {
        Alert.alert('Info', 'No interns to export.');
        return;
      }

      // Prepare data for Excel
      const excelData = internsToExport.map((intern, index) => {
        return {
          'No.': index + 1,
          'Student ID': intern.studentId || 'N/A',
          'First Name': intern.firstName || 'N/A',
          'Middle Name': intern.middleName || 'N/A',
          'Last Name': intern.lastName || 'N/A',
          'Email': intern.email || 'N/A',
          'Phone Number': intern.phoneNumber || 'N/A',
          'Major': intern.major || 'N/A',
          'Program': intern.program || 'N/A',
          'Academic Year': intern.academicYear || 'N/A',
          'School Year': intern.schoolYear || 'N/A',
          'University': intern.university || 'N/A',
          'Coordinator': intern.coordinatorName || 'N/A',
          'Company': intern.internshipCompany || 'N/A',
        };
      });

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Interns');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });

      // Create blob and download
      if (Platform.OS === 'web') {
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = selectedClassId 
          ? `Interns_${classes.find(c => c.id === selectedClassId)?.className || 'Class'}_${new Date().toISOString().split('T')[0]}.xlsx`
          : `All_Interns_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Excel file downloaded successfully!');
      } else {
        Alert.alert('Info', 'Excel download is currently only available on web. Please use the web version to download the list.');
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      Alert.alert('Error', 'Failed to download Excel file. Please try again.');
    }
  };

  const fetchStudentRequirements = async (studentId: string) => {
    try {
      const response = await apiService.getStudentRequirements(studentId);
      if (response.success) {
        return response.requirements || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching student requirements:', error);
      return [];
    }
  };

  const fetchStudentSubmissions = async (studentId: string) => {
    try {
      const response = await apiService.getStudentSubmissions(studentId);
      if (response.success) {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching student submissions:', error);
      return [];
    }
  };

  const fetchStudentCoordinator = async (studentId: string) => {
    try {
      // Get student requirements which includes coordinator_id
      const response = await apiService.getStudentRequirements(studentId);
      if (response.success && response.requirements && response.requirements.length > 0) {
        const firstReq = response.requirements[0];
        if (firstReq.coordinator_id) {
          const coordinatorResponse = await apiService.getCoordinatorProfile(firstReq.coordinator_id.toString());
          if (coordinatorResponse.success && coordinatorResponse.user) {
            const coordinator = coordinatorResponse.user;
            return `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim() || 'N/A';
          }
        }
      }
      return 'N/A';
    } catch (error) {
      console.error('Error fetching student coordinator:', error);
      return 'N/A';
    }
  };

  const fetchStudentCompany = async (userId: string) => {
    try {
      // Get student applications (student_id in API is actually user_id)
      const applicationsResponse = await apiService.getStudentApplications(userId);
      if (applicationsResponse.success && applicationsResponse.applications) {
        const approvedApp = applicationsResponse.applications.find((app: any) => app.status === 'approved');
        if (approvedApp && approvedApp.company_id) {
          const companyResponse = await apiService.getCompany(approvedApp.company_id.toString());
          if (companyResponse.success) {
            const companyData = companyResponse as any;
            if (companyData.company && companyData.company.name) {
              return companyData.company.name;
            }
          }
        }
      }
      return 'N/A';
    } catch (error) {
      console.error('Error fetching student company:', error);
      return 'N/A';
    }
  };

  const handleBack = () => {
    // Slide out animation before going back
    Animated.timing(slideAnim, {
      toValue: dimensions.width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onBack) {
        onBack();
      }
    });
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

  const getRequirementsProgressText = (requirements: Requirement[]) => {
    if (requirements.length === 0) return '0/0';
    const completed = requirements.filter(req => req.completed).length;
    return `${completed}/${requirements.length}`;
  };

  // Group interns by school year
  const groupInternsBySchoolYear = () => {
    const grouped: { [key: string]: Intern[] } = {};
    const internsToGroup = searchQuery.trim() !== '' ? filteredInterns : interns;
    internsToGroup.forEach(intern => {
      const year = intern.schoolYear || 'Unknown';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(intern);
    });
    return grouped;
  };

  const groupedInterns = groupInternsBySchoolYear();
  const schoolYears = Object.keys(groupedInterns).sort().reverse(); // Sort descending (newest first)

  const renderInternTable = (schoolYear: string, internsInYear: Intern[]) => {
    const isMobileNow = dimensions.width < 768;
    
    return (
      <View key={schoolYear} style={[styles.schoolYearSection, { paddingHorizontal: isMobileNow ? 10 : 20 }]}>
        <View style={styles.schoolYearHeader}>
          <Text style={styles.schoolYearTitle}>Class {schoolYear}</Text>
          <Text style={styles.schoolYearCount}>({internsInYear.length} intern{internsInYear.length !== 1 ? 's' : ''})</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.tableScrollView}
        >
          <View style={[styles.tableContainer, { minWidth: isMobileNow ? 1700 : '100%' }]}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, styles.tableCellNo]}>
                <Text style={styles.tableHeaderText}>#</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellName]}>
                <Text style={styles.tableHeaderText}>Name</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellStudentId]}>
                <Text style={styles.tableHeaderText}>Student ID</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellMajor]}>
                <Text style={styles.tableHeaderText}>Major</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellYear]}>
                <Text style={styles.tableHeaderText}>Year</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellProgram]}>
                <Text style={styles.tableHeaderText}>Program</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellCoordinator]}>
                <Text style={styles.tableHeaderText}>Coordinator</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableCellCompany, styles.tableCellLast]}>
                <Text style={styles.tableHeaderText}>Company</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {internsInYear.map((intern, index) => (
              <View 
                key={intern.id} 
                style={[
                  styles.tableRow,
                  index % 2 === 0 && styles.tableRowEven
                ]}
              >
                <View style={[styles.tableCell, styles.tableCellNo]}>
                  <Text style={styles.tableCellText}>{index + 1}</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellName]}>
                  <View style={styles.nameCell}>
                    {intern.profilePicture ? (
                      <Image 
                        source={{ uri: intern.profilePicture }} 
                        style={styles.tableProfileImage}
                      />
                    ) : (
                      <View style={styles.tableProfileImagePlaceholder}>
                        <Text style={styles.tableProfileText}>
                          {intern.firstName.charAt(0)}{intern.lastName.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.tableCellText} numberOfLines={1}>
                      {intern.firstName}{intern.middleName && intern.middleName !== 'N/A' ? ` ${intern.middleName}` : ''} {intern.lastName}
                    </Text>
                  </View>
                </View>
                <View style={[styles.tableCell, styles.tableCellStudentId]}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {intern.studentId}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellMajor]}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {intern.major}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellYear]}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {intern.academicYear}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellProgram]}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {intern.program || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellCoordinator]}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {intern.coordinatorName || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellCompany, styles.tableCellLast]}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {intern.internshipCompany || 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Header with Filter */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <MaterialIcons name="arrow-back" size={24} color="#F56E0F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Interns List</Text>
        <View style={styles.headerRight}>
          {/* Download Excel Button and Class Filter Dropdown */}
          <View style={styles.headerActionsContainer}>
            {/* Download Excel Button */}
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={downloadInternsExcel}
            >
              <MaterialIcons name="download" size={18} color="#fff" />
              <Text style={styles.downloadButtonText}>Excel</Text>
            </TouchableOpacity>
            {/* Compact Class Filter Dropdown */}
            <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.classDropdownButtonCompact}
              onPress={() => setShowClassDropdown(!showClassDropdown)}
            >
              <MaterialIcons name="filter-list" size={18} color="#F56E0F" />
              <Text style={[styles.classDropdownTextCompact, !selectedClassId && styles.classDropdownPlaceholder]}>
                {selectedClassId 
                  ? classes.find(c => c.id === selectedClassId)?.className || 'Class'
                  : 'All'
                }
              </Text>
              <MaterialIcons 
                name={showClassDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={18} 
                color="#F56E0F" 
              />
            </TouchableOpacity>
            
            <Modal
              visible={showClassDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowClassDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowClassDropdown(false)}
              >
                <View style={styles.dropdownWrapper}>
                  <View style={styles.classDropdownList}>
                    <TouchableOpacity
                      style={[styles.classDropdownItem, !selectedClassId && styles.classDropdownItemSelected]}
                      onPress={() => handleClassSelect(null)}
                    >
                      <Text style={[
                        styles.classDropdownItemText,
                        !selectedClassId && styles.classDropdownItemTextSelected
                      ]}>
                        All Classes
                      </Text>
                      {!selectedClassId && (
                        <MaterialIcons name="check" size={20} color="#F56E0F" />
                      )}
                    </TouchableOpacity>
                    {classes.length === 0 ? (
                      <View style={styles.classDropdownItem}>
                        <Text style={styles.classDropdownItemText}>
                          No classes available
                        </Text>
                      </View>
                    ) : (
                      classes.map((cls) => (
                        <TouchableOpacity
                          key={cls.id}
                          style={[
                            styles.classDropdownItem,
                            selectedClassId === cls.id && styles.classDropdownItemSelected
                          ]}
                          onPress={() => handleClassSelect(cls.id)}
                        >
                          <View style={styles.classDropdownItemContent}>
                            <Text style={[
                              styles.classDropdownItemText,
                              selectedClassId === cls.id && styles.classDropdownItemTextSelected
                            ]}>
                              {cls.className}
                            </Text>
                            <Text style={styles.classDropdownItemSubtext}>
                              {cls.schoolYear} • {cls.studentCount} students
                            </Text>
                          </View>
                          {selectedClassId === cls.id && (
                            <MaterialIcons name="check" size={20} color="#F56E0F" />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, email, major, program, coordinator, or company..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#878787"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <MaterialIcons name="close" size={20} color="#878787" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F56E0F" />
          <Text style={styles.loadingText}>Loading all interns...</Text>
        </View>
      ) : schoolYears.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="school" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Interns Found</Text>
          <Text style={styles.emptyStateText}>
            No interns have been assigned yet.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
        >
          {schoolYears.map(schoolYear => 
            renderInternTable(schoolYear, groupedInterns[schoolYear])
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255);',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1B1B1E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  headerActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#FBFBFB',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  schoolYearSection: {
    marginBottom: 24,
    paddingTop: 20,
  },
  schoolYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
  },
  schoolYearTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginRight: 8,
  },
  schoolYearCount: {
    fontSize: 14,
    color: '#878787',
    fontWeight: '500',
  },
  tableScrollView: {
    marginHorizontal: -10,
  },
  tableContainer: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2E',
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
  },
  tableHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(245, 110, 15, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F56E0F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1B1B1E',
  },
  tableRowEven: {
    backgroundColor: 'rgba(245, 110, 15, 0.05)',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    minHeight: 60,
  },
  tableCellText: {
    fontSize: 13,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  // Table Cell Widths
  tableCellNo: {
    width: 80,
    minWidth: 80,
    alignItems: 'center',
  },
  tableCellName: {
    width: 300,
    minWidth: 250,
  },
  tableCellStudentId: {
    width: 200,
    minWidth: 150,
  },
  tableCellMajor: {
    width: 230,
    minWidth: 220,
  },
  tableCellYear: {
    width: 100,
    minWidth: 100,
    alignItems: 'center',
  },
  tableCellProgram: {
    width: 230,
    minWidth: 220,
  },
  tableCellCoordinator: {
    width: 230,
    minWidth: 220,
  },
  tableCellCompany: {
    width: 250,
    minWidth: 250,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tableProfileImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56E0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
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
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
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
  dropdownContainer: {
    position: 'relative',
    zIndex: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  dropdownWrapper: {
    alignItems: 'flex-end',
  },
  classDropdownButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2A2A2E',
    minWidth: 80,
  },
  classDropdownTextCompact: {
    fontSize: 13,
    color: '#FBFBFB',
    fontWeight: '500',
    maxWidth: 100,
  },
  classDropdownPlaceholder: {
    color: '#878787',
  },
  classDropdownList: {
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    backgroundColor: '#1B1B1E',
    maxHeight: 300,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: '#F56E0F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    width: 250,
  },
  classDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  classDropdownItemSelected: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
  },
  classDropdownItemContent: {
    flex: 1,
  },
  classDropdownItemText: {
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
    marginBottom: 2,
  },
  classDropdownItemTextSelected: {
    color: '#F56E0F',
    fontWeight: '700',
  },
  classDropdownItemSubtext: {
    fontSize: 12,
    color: '#878787',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1B1B1E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FBFBFB',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#34a853',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

