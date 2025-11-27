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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isMobile = screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isDesktop = screenWidth >= 1024;

interface Company {
  id: string;
  company_name: string;
  industry: string;
  company_address: string;
  company_profile_picture?: string;
  status: string;
  application_date?: string;
}

interface Intern {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  userId?: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface AssignedCompaniesPageProps {
  currentUser: UserInfo | null;
  selectedIntern?: Intern | null;
  onBack?: () => void;
}

export default function AssignedCompaniesPage({ 
  currentUser, 
  selectedIntern,
  onBack 
}: AssignedCompaniesPageProps) {
  const [assignedCompanies, setAssignedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [internName, setInternName] = useState('');
  const [dimensions, setDimensions] = useState({ width: screenWidth, height: screenHeight });
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;

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

    if (selectedIntern) {
      setInternName(`${selectedIntern.firstName} ${selectedIntern.lastName}`);
      fetchAssignedCompanies(selectedIntern);
    }

    // Cleanup: prepare for slide out when component unmounts
    return () => {
      Animated.timing(slideAnim, {
        toValue: dimensions.width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
  }, [selectedIntern, dimensions.width]);

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

  // Responsive styles based on screen width
  const getResponsiveStyles = () => {
    const isMobileNow = dimensions.width < 768;
    const isTabletNow = dimensions.width >= 768 && dimensions.width < 1024;
    
    return {
      headerPadding: isMobileNow ? 12 : isTabletNow ? 16 : 20,
      headerTitleSize: isMobileNow ? 16 : isTabletNow ? 18 : 20,
      headerSubtitleSize: isMobileNow ? 12 : isTabletNow ? 13 : 14,
      contentPadding: isMobileNow ? 10 : isTabletNow ? 15 : 20,
      tableHeaderTextSize: isMobileNow ? 10 : isTabletNow ? 11 : 12,
      tableCellTextSize: isMobileNow ? 11 : isTabletNow ? 12 : 13,
      tableCellPadding: isMobileNow ? 8 : isTabletNow ? 10 : 12,
      tableCellMinHeight: isMobileNow ? 50 : isTabletNow ? 55 : 60,
      imageSize: isMobileNow ? 24 : isTabletNow ? 28 : 32,
    };
  };

  const responsiveStyles = getResponsiveStyles();

  const fetchAssignedCompanies = async (intern: Intern) => {
    try {
      setLoading(true);
      const studentUserId = intern.userId;

      if (!studentUserId) {
        console.error('❌ No userId found for intern:', intern.id);
        setAssignedCompanies([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching applications for student userId:', studentUserId);

      const response = await apiService.getStudentApplications(studentUserId.toString());

      console.log('📋 Applications response:', response);

      if (response.success && response.applications) {
        // Find all approved applications
        const approvedApplications = response.applications.filter(
          (app: any) => app.status === 'approved'
        );

        console.log('✅ Approved applications found:', approvedApplications.length);

        if (approvedApplications.length > 0) {
          const companies: Company[] = approvedApplications.map((app: any) => ({
            id: app.company_id?.toString() || '',
            company_name: app.company_name || 'Unknown Company',
            industry: app.industry || 'N/A',
            company_address: app.company_address || 'N/A',
            company_profile_picture: app.company_profile_picture,
            status: app.status || 'approved',
            application_date: app.created_at || app.submitted_at,
          }));
          setAssignedCompanies(companies);
        } else {
          console.log('⚠️ No approved application found for student');
          setAssignedCompanies([]);
        }
      } else {
        console.log('⚠️ No applications found or error in response');
        setAssignedCompanies([]);
      }
    } catch (error) {
      console.error('❌ Error fetching assigned companies:', error);
      setAssignedCompanies([]);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: responsiveStyles.headerPadding, paddingVertical: responsiveStyles.headerPadding }]}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons 
              name="arrow-back" 
              size={dimensions.width < 768 ? 20 : 24} 
              color="#F56E0F" 
            />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: responsiveStyles.headerTitleSize }]}>
            Assigned Companies {assignedCompanies.length > 0 && `(${assignedCompanies.length})`}
          </Text>
          {internName && (
            <Text style={[styles.headerSubtitle, { fontSize: responsiveStyles.headerSubtitleSize }]}>
              {internName}
            </Text>
          )}
        </View>
      </View>

      {/* Table Content */}
      <ScrollView 
        style={[styles.content, { padding: responsiveStyles.contentPadding }]} 
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F56E0F" />
            <Text style={[styles.loadingText, { fontSize: dimensions.width < 768 ? 14 : 16 }]}>
              Loading company information...
            </Text>
          </View>
        ) : assignedCompanies.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={dimensions.width < 768}
            contentContainerStyle={dimensions.width >= 768 ? { width: '100%' } : {}}
          >
            <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[
                styles.tableHeaderCell, 
                styles.tableCellNo,
                { paddingHorizontal: responsiveStyles.tableCellPadding, paddingVertical: responsiveStyles.tableCellPadding }
              ]}>
                <Text style={[styles.tableHeaderText, { fontSize: responsiveStyles.tableHeaderTextSize }]}>#</Text>
              </View>
              <View style={[
                styles.tableHeaderCell, 
                styles.tableCellCompany,
                { paddingHorizontal: responsiveStyles.tableCellPadding, paddingVertical: responsiveStyles.tableCellPadding }
              ]}>
                <Text style={[styles.tableHeaderText, { fontSize: responsiveStyles.tableHeaderTextSize }]}>
                  {dimensions.width < 768 ? 'Company' : 'Company Name'}
                </Text>
              </View>
              <View style={[
                styles.tableHeaderCell, 
                styles.tableCellIndustry,
                { paddingHorizontal: responsiveStyles.tableCellPadding, paddingVertical: responsiveStyles.tableCellPadding }
              ]}>
                <Text style={[styles.tableHeaderText, { fontSize: responsiveStyles.tableHeaderTextSize }]}>INDU</Text>
              </View>
              <View style={[
                styles.tableHeaderCell, 
                styles.tableCellAddress,
                { paddingHorizontal: responsiveStyles.tableCellPadding, paddingVertical: responsiveStyles.tableCellPadding }
              ]}>
                <Text style={[styles.tableHeaderText, { fontSize: responsiveStyles.tableHeaderTextSize }]}>Address</Text>
              </View>
              <View style={[
                styles.tableHeaderCell, 
                styles.tableCellDate, 
                styles.tableCellLast,
                { paddingHorizontal: responsiveStyles.tableCellPadding, paddingVertical: responsiveStyles.tableCellPadding }
              ]}>
                <Text style={[styles.tableHeaderText, { fontSize: responsiveStyles.tableHeaderTextSize }]}>
                  {dimensions.width < 768 ? 'Date' : 'Application Date'}
                </Text>
              </View>
            </View>

            {/* Table Rows */}
            {assignedCompanies.map((company, index) => (
              <View key={company.id || index} style={styles.tableRow}>
                <View style={[
                  styles.tableCell, 
                  styles.tableCellNo,
                  { 
                    paddingHorizontal: responsiveStyles.tableCellPadding, 
                    paddingVertical: responsiveStyles.tableCellPadding,
                    minHeight: responsiveStyles.tableCellMinHeight
                  }
                ]}>
                  <Text style={[styles.tableCellText, { fontSize: responsiveStyles.tableCellTextSize }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={[
                  styles.tableCell, 
                  styles.tableCellCompany,
                  { 
                    paddingHorizontal: responsiveStyles.tableCellPadding, 
                    paddingVertical: responsiveStyles.tableCellPadding,
                    minHeight: responsiveStyles.tableCellMinHeight
                  }
                ]}>
                  <View style={styles.companyNameCell}>
                    {company.company_profile_picture ? (
                      <Image 
                        source={{ uri: company.company_profile_picture }} 
                        style={[
                          styles.tableCompanyImage,
                          { 
                            width: responsiveStyles.imageSize, 
                            height: responsiveStyles.imageSize,
                            borderRadius: responsiveStyles.imageSize / 2,
                            marginRight: dimensions.width < 768 ? 6 : 8
                          }
                        ]}
                      />
                    ) : (
                      <View style={[
                        styles.tableCompanyImagePlaceholder,
                        { 
                          width: responsiveStyles.imageSize, 
                          height: responsiveStyles.imageSize,
                          borderRadius: responsiveStyles.imageSize / 2,
                          marginRight: dimensions.width < 768 ? 6 : 8
                        }
                      ]}>
                        <MaterialIcons 
                          name="business" 
                          size={dimensions.width < 768 ? 12 : dimensions.width < 1024 ? 14 : 16} 
                          color="#F56E0F" 
                        />
                      </View>
                    )}
                    <Text 
                      style={[styles.tableCellText, { fontSize: responsiveStyles.tableCellTextSize }]} 
                      numberOfLines={dimensions.width < 768 ? 1 : 2}
                    >
                      {company.company_name}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.tableCell, 
                  styles.tableCellIndustry,
                  { 
                    paddingHorizontal: responsiveStyles.tableCellPadding, 
                    paddingVertical: responsiveStyles.tableCellPadding,
                    minHeight: responsiveStyles.tableCellMinHeight
                  }
                ]}>
                  <Text 
                    style={[styles.tableCellText, { fontSize: responsiveStyles.tableCellTextSize }]} 
                    numberOfLines={dimensions.width < 768 ? 1 : 2}
                  >
                    {company.industry}
                  </Text>
                </View>
                <View style={[
                  styles.tableCell, 
                  styles.tableCellAddress,
                  { 
                    paddingHorizontal: responsiveStyles.tableCellPadding, 
                    paddingVertical: responsiveStyles.tableCellPadding,
                    minHeight: responsiveStyles.tableCellMinHeight
                  }
                ]}>
                  <Text 
                    style={[styles.tableCellText, { fontSize: responsiveStyles.tableCellTextSize }]} 
                    numberOfLines={dimensions.width < 768 ? 2 : 3}
                  >
                    {company.company_address}
                  </Text>
                </View>
                <View style={[
                  styles.tableCell, 
                  styles.tableCellDate, 
                  styles.tableCellLast,
                  { 
                    paddingHorizontal: responsiveStyles.tableCellPadding, 
                    paddingVertical: responsiveStyles.tableCellPadding,
                    minHeight: responsiveStyles.tableCellMinHeight
                  }
                ]}>
                  <Text style={[styles.tableCellText, { fontSize: responsiveStyles.tableCellTextSize }]}>
                    {company.application_date 
                      ? new Date(company.application_date).toLocaleDateString()
                      : 'N/A'
                    }
                  </Text>
                </View>
              </View>
            ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyCompanyContainer}>
            <MaterialIcons 
              name="business" 
              size={dimensions.width < 768 ? 48 : dimensions.width < 1024 ? 56 : 64} 
              color="#ccc" 
            />
            <Text style={[
              styles.emptyCompanyTitle,
              { fontSize: dimensions.width < 768 ? 18 : dimensions.width < 1024 ? 19 : 20 }
            ]}>
              No Company Assigned
            </Text>
            <Text style={[
              styles.emptyCompanyText,
              { fontSize: dimensions.width < 768 ? 12 : dimensions.width < 1024 ? 13 : 14 }
            ]}>
              This student has not been assigned to any company yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151419',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1B1B1E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#878787',
  },
  content: {
    flex: 1,
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
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1B1B1E',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2E',
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
  },
  tableHeaderCell: {
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
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  // Table Cell Widths (responsive)
  tableCellNo: {
    width: isMobile ? 50 : isTablet ? 60 : 80,
    alignItems: 'center',
  },
  tableCellCompany: {
    flex: isMobile ? 2.5 : 3,
    minWidth: isMobile ? 200 : isTablet ? 250 : 300,
  },
  tableCellIndustry: {
    flex: isMobile ? 1.5 : 2,
    minWidth: isMobile ? 120 : isTablet ? 160 : 200,
  },
  tableCellAddress: {
    flex: isMobile ? 2.5 : 3,
    minWidth: isMobile ? 180 : isTablet ? 220 : 250,
  },
  tableCellDate: {
    flex: isMobile ? 1.5 : 2,
    minWidth: isMobile ? 100 : isTablet ? 120 : 150,
    alignItems: 'center',
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  companyNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCompanyImage: {
    // Size is set dynamically based on screen size
  },
  tableCompanyImagePlaceholder: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    // Size is set dynamically based on screen size
  },
  emptyCompanyContainer: {
    alignItems: 'center',
    padding: isMobile ? 40 : isTablet ? 50 : 60,
    justifyContent: 'center',
  },
  emptyCompanyTitle: {
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCompanyText: {
    color: '#878787',
    textAlign: 'center',
    lineHeight: isMobile ? 18 : 20,
  },
});

