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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import InternsComposedChart from './InternsComposedChart';
import { apiService } from '../../../lib/api';
import { useAuth } from '../../../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface CompanyInfo {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  description: string;
  website: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  moaStatus: 'active' | 'expired' | 'pending' | 'draft';
  moaExpiryDate?: string;
  moaDocument?: string;
  availableSlots: number;
  totalSlots: number;
  currentInterns: number;
  partnershipDate: string;
  isFavorite: boolean;
  rating: number;
  reviews: number;
}

interface CompanyStats {
  totalSlots: number;
  availableSlots: number;
  currentInterns: number;
  completedInterns: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageRating: number;
  totalReviews: number;
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [stats, setStats] = useState<CompanyStats>({
    totalSlots: 0,
    availableSlots: 0,
    currentInterns: 0,
    completedInterns: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [animatedStats, setAnimatedStats] = useState<CompanyStats>({
    totalSlots: 0,
    availableSlots: 0,
    currentInterns: 0,
    completedInterns: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchAnimation] = useState(new Animated.Value(0));
  const [statsAnimation] = useState(new Animated.Value(0));
  const [pageAnimation] = useState(new Animated.Value(0));
  const searchInputRef = useRef<TextInput>(null);

  // Chart state
  const [chartMonths, setChartMonths] = useState<string[]>([]);
  const [chartBars, setChartBars] = useState<number[]>([]);
  const [chartLine, setChartLine] = useState<number[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [chartWidthPx, setChartWidthPx] = useState<number>(width - 40);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      // Start page animation
      Animated.timing(pageAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      // Ensure we have a user (fall back to AsyncStorage)
      let effectiveUser = user;
      if (!effectiveUser) {
        try {
          const stored = await AsyncStorage.getItem('user');
          if (stored) effectiveUser = JSON.parse(stored);
        } catch {}
      }

      // Build base companyInfo from logged-in user if available
      const companyName = effectiveUser?.name || 'Your Company';
      const baseCompany: CompanyInfo = {
        id: (effectiveUser?.id || '1').toString(),
        name: companyName,
        industry: '—',
        location: '—',
        description: 'Manage your internship program, applications and attendance.',
        website: '-',
        contactPerson: companyName,
        contactEmail: effectiveUser?.email || '-',
        contactPhone: '-',
        moaStatus: 'active',
        availableSlots: 0,
        totalSlots: 0,
        currentInterns: 0,
        partnershipDate: new Date().toISOString().slice(0, 10),
        isFavorite: false,
        rating: 0,
        reviews: 0,
      };

      setCompanyInfo(baseCompany);

      // Resolve actual companies.id using profile-by-user endpoint for reliability
      let companyId = effectiveUser?.id?.toString() || '1';
      try {
        const profile = await apiService.getCompanyProfileByUserId(companyId);
        const resolved = (profile as any)?.user?.id;
        if (resolved) companyId = resolved.toString();
      } catch {}

      // Fetch approved applications (treated as current interns) for this company
      const approved = await apiService.getApprovedApplications(companyId);

      const approvedApps = (approved as any)?.applications || [];

      // Compute monthly counts for the current year (Jan-Dec)
      const currentYear = new Date().getFullYear();
      const months: string[] = [];
      const barCounts: number[] = [];
      const addedPerMonth: number[] = [];

      // Generate data for all 12 months of current year
      for (let month = 0; month < 12; month++) {
        const d = new Date(currentYear, month, 1);
        const label = d.toLocaleString('en-US', { month: 'short' });
        months.push(label);
        
        const count = approvedApps.filter((a: any) => {
          const dateStr = a.applied_at || a.created_at || a.reviewed_at || a.updated_at;
          if (!dateStr) return false;
          const ad = new Date(dateStr);
          return ad.getFullYear() === currentYear && ad.getMonth() === month;
        }).length;
        addedPerMonth.push(count);
      }

      // Bars are added per month; line is cumulative
      let running = 0;
      const lineCounts = addedPerMonth.map((c) => (running += c));

      // Debug logging to help understand the data
      console.log('Chart Data Debug:');
      console.log('Months:', months);
      console.log('Added per month:', addedPerMonth);
      console.log('Cumulative totals:', lineCounts);

      setChartMonths(months);
      setChartBars(addedPerMonth);
      setChartLine(lineCounts);

      // Fetch today's attendance for present today container and stats
      const attendanceToday = await apiService.getTodayAttendance(companyId, effectiveUser?.id?.toString() || '');
      const todayData = (attendanceToday as any)?.data || (attendanceToday as any)?.applications || (attendanceToday as any)?.records || [];
      setTodayAttendance(todayData);

      // Fetch attendance stats for today to populate stat cards
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      let s: any = { present: 0, late: 0, absent: 0, totalHours: 0 };
      try {
        const statsResp = await apiService.getAttendanceStats(companyId, effectiveUser?.id?.toString() || '', { startDate: todayStr, endDate: todayStr });
        s = (statsResp as any)?.data || s;
      } catch {}

      const liveStats: CompanyStats = {
        totalSlots: 0,
        availableSlots: 0,
        currentInterns: approvedApps.length,
        completedInterns: 0,
        pendingApplications: 0,
        approvedApplications: approvedApps.length,
        rejectedApplications: 0,
        averageRating: 0,
        totalReviews: 0,
      };

      setStats(liveStats);

      setTimeout(() => {
        animateStats(liveStats);
        setShowSkeleton(false);
      }, 300);
      
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateStats = (targetStats: CompanyStats) => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const animateStep = () => {
      if (currentStep <= steps) {
        const progress = currentStep / steps;
        
        setAnimatedStats({
          totalSlots: Math.floor(targetStats.totalSlots * progress),
          availableSlots: Math.floor(targetStats.availableSlots * progress),
          currentInterns: Math.floor(targetStats.currentInterns * progress),
          completedInterns: Math.floor(targetStats.completedInterns * progress),
          pendingApplications: Math.floor(targetStats.pendingApplications * progress),
          approvedApplications: Math.floor(targetStats.approvedApplications * progress),
          rejectedApplications: Math.floor(targetStats.rejectedApplications * progress),
          averageRating: Math.round((targetStats.averageRating * progress) * 10) / 10,
          totalReviews: Math.floor(targetStats.totalReviews * progress),
        });
        
        currentStep++;
        setTimeout(animateStep, stepDuration);
      }
    };
    
    animateStep();
  };

  const handleViewDetails = () => {
    if (!companyInfo) return;
    
    Alert.alert(
      'Company Details',
      `Name: ${companyInfo.name}\nIndustry: ${companyInfo.industry}\nLocation: ${companyInfo.location}\nDescription: ${companyInfo.description}\nWebsite: ${companyInfo.website}\nContact Person: ${companyInfo.contactPerson}\nContact Email: ${companyInfo.contactEmail}\nContact Phone: ${companyInfo.contactPhone}\nMOA Status: ${companyInfo.moaStatus}\nPartnership Date: ${companyInfo.partnershipDate}\nRating: ${companyInfo.rating}/5 (${companyInfo.reviews} reviews)`,
      [{ text: 'OK' }]
    );
  };

  const handleViewLocation = () => {
    Alert.alert(
      'View Location',
      'Opening location in maps...',
      [{ text: 'OK' }]
    );
  };

  const handleToggleFavorite = () => {
    if (!companyInfo) return;
    
    setCompanyInfo({
      ...companyInfo,
      isFavorite: !companyInfo.isFavorite
    });
    
    Alert.alert(
      'Success',
      companyInfo.isFavorite ? 'Removed from favorites' : 'Added to favorites'
    );
  };

  const handleApply = () => {
    Alert.alert(
      'Apply for Partnership',
      'This will send a partnership application to the university. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: () => Alert.alert('Success', 'Application submitted successfully') }
      ]
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'expired': return '#ea4335';
      case 'pending': return '#fbbc04';
      case 'draft': return '#666';
      default: return '#666';
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      case 'draft': return 'Draft';
      default: return 'Unknown';
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    } else {
      Animated.timing(searchAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setSearchQuery('');
    }
  };

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonRating} />
        </View>
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
    </View>
  );

  const SkeletonStatCard = () => (
    <View style={styles.skeletonStatCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonNumber} />
      <View style={styles.skeletonLabel} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading company dashboard...</Text>
      </View>
    );
  }

  if (!companyInfo) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#F56E0F" />
        <Text style={styles.errorTitle}>Error loading company data</Text>
        <Text style={styles.errorText}>Please try again later</Text>
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeTitle}>Welcome to your Company Portal!</Text>
              <Text style={styles.welcomeSubtitle}>
                Manage your internship program, view applications, and track progress.
              </Text>
            </View>
          </View>
        </View>

        {/* Stats directly under header */}
        <View style={styles.statsSection}>
          {showSkeleton ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <MaterialIcons name="school" size={32} color="#F56E0F" />
                <Text style={styles.statNumber}>{animatedStats.currentInterns}</Text>
                <Text style={styles.statLabel}>Approved Interns</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="check-circle" size={32} color="#34a853" />
                <Text style={styles.statNumber}>{todayAttendance.filter(r => r.status === 'present').length}</Text>
                <Text style={styles.statLabel}>Present Today</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="schedule" size={32} color="#F56E0F" />
                <Text style={styles.statNumber}>{todayAttendance.filter(r => r.status === 'late').length}</Text>
                <Text style={styles.statLabel}>Late Today</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="cancel" size={32} color="#ea4335" />
                <Text style={styles.statNumber}>{todayAttendance.filter(r => r.status === 'absent').length}</Text>
                <Text style={styles.statLabel}>Absent Today</Text>
              </View>
            </>
          )}
        </View>

        {/* Animated combined chart */}
        <View style={styles.chartSection} onLayout={(e) => setChartWidthPx(e.nativeEvent.layout.width)}>
        <Text style={styles.sectionTitle}>Interns Added - {new Date().getFullYear()}</Text>
          <View style={styles.chartCard}>
            
            {Platform.OS === 'web' ? (
              <InternsComposedChart monthlyAdded={chartBars} year={new Date().getFullYear()} />
            ) : (
              <AnimatedChart months={chartMonths} bars={chartBars} line={chartLine} widthPx={chartWidthPx} />
            )}
          </View>
        </View>

        {/* Present Today Section */}
        <View style={styles.presentSection}>
          <View style={styles.presentHeader}>
            <Text style={styles.sectionTitle}>Present Today</Text>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <MaterialIcons name="search" size={20} color="#F56E0F" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <Animated.View
            style={[
              styles.searchContainer,
              {
                opacity: searchAnimation,
                height: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50],
                }),
                marginBottom: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16],
                }),
              },
            ]}
          >
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search present interns..."
              placeholderTextColor="#878787"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <TouchableOpacity 
              style={styles.searchCloseButton}
              onPress={toggleSearch}
            >
              <MaterialIcons name="close" size={20} color="#878787" />
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.activityList}>
            {(() => {
              const presentInterns = todayAttendance.filter(r => r.status === 'present' || r.am_status === 'present' || r.pm_status === 'present');
              const filteredInterns = searchQuery 
                ? presentInterns.filter(r => 
                    `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : presentInterns;
              
              return filteredInterns.length === 0 ? (
                <Text style={{ color: '#878787' }}>
                  {searchQuery ? 'No interns found matching your search.' : 'No present interns recorded today.'}
                </Text>
              ) : (
                filteredInterns.map((r, idx) => (
                  <View key={`${r.user_id}-${idx}`} style={styles.activityItem}>
                    {r.profile_picture ? (
                      <Image 
                        source={{ uri: r.profile_picture }} 
                        style={styles.profileImageSmall}
                        defaultSource={require('../../../assets/icon.png')}
                      />
                    ) : (
                      <View style={styles.profilePlaceholderSmall}>
                        <Text style={styles.profileTextSmall}>
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim().charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{`${r.first_name || ''} ${r.last_name || ''}`.trim() || `User ${r.user_id}`}</Text>
                      <Text style={styles.activityDescription}>{`AM ${r.am_time_in || '--:--'} - ${r.am_time_out || '--:--'} | PM ${r.pm_time_in || '--:--'} - ${r.pm_time_out || '--:--'}`}</Text>
                    </View>
                  </View>
                ))
              );
            })()}
          </View>
        </View>

      {/* Only show Present Today after stats and chart */}
      </ScrollView>
    </Animated.View>
  );
}

// Simple animated bar + line chart without external libs
function AnimatedChart({ months, bars, line, widthPx }: { months: string[]; bars: number[]; line: number[]; widthPx: number }) {
  const height = 260;
  const padding = 40;
  const chartWidth = Math.max(200, (widthPx || width) - padding * 2);
  const colWidth = chartWidth / Math.max(1, months.length);

  const rawMax = Math.max(1, ...bars, ...line);
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const maxValue = Math.ceil(rawMax / step) * step;

  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: false }).start();
  }, [months.join(','), bars.join(','), line.join(',')]);

  // Inner plot bounds
  const topInset = padding * 0.5;
  const bottomInset = padding * 0.6;
  const innerHeight = height - (topInset + bottomInset);
  const scaleY = (v: number) => topInset + innerHeight * (1 - v / maxValue);
  const points = months.map((_, i) => ({
    lx: i * colWidth + colWidth / 2,
    ly: scaleY(line[i] || 0),
  }));

  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const handleMove = (evt: any) => {
    const x = evt.nativeEvent.locationX - padding;
    const i = Math.max(0, Math.min(months.length - 1, Math.round(x / colWidth)));
    const lx = padding + i * colWidth + colWidth / 2;
    const ly = scaleY(line[i] || 0);
    setHover({ i, x: lx, y: ly });
  };

  return (
    <View style={[{ height, width: '100%', paddingHorizontal: padding }]}> 
      <View
        style={{ position: 'absolute', left: padding, right: padding, top: topInset, bottom: bottomInset }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleMove}
        onResponderMove={handleMove}
        onResponderRelease={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((g, idx) => {
          const y = topInset + innerHeight * (1 - g);
          const val = Math.round(maxValue * g);
          return (
            <View key={idx} style={{ position: 'absolute', left: -8, right: 0, top: y, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ position: 'absolute', left: -padding + 4, top: -8, color: '#6f6f6f', fontSize: 10 }}>{val}</Text>
            </View>
          );
        })}

        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' }}>
          {months.map((m, i) => {
            const barH = (bars[i] / maxValue) * innerHeight;
            return (
              <Animated.View
                key={m + i}
                style={{
                  width: Math.max(12, colWidth * 0.55),
                  marginHorizontal: Math.max(2, colWidth * 0.225),
                  height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, barH] }),
                  backgroundColor: 'rgba(245, 110, 15, 0.45)',
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
              />
            );
          })}
        </View>

        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          {points.map((p, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            return (
              <View key={`seg-${i}`} style={{ position: 'absolute', left: Math.min(prev.lx, p.lx), top: Math.min(prev.ly, p.ly), width: Math.abs(p.lx - prev.lx), height: Math.abs(p.ly - prev.ly) }}>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderTopWidth: 2, borderColor: '#4ea1ff', transform: [{ rotateZ: `${Math.atan2(p.ly - prev.ly, p.lx - prev.lx)}rad` }] }} />
              </View>
            );
          })}
          {points.map((p, i) => (
            <View key={`dot-${i}`} style={{ position: 'absolute', left: p.lx - 4, top: p.ly - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ea1ff' }} />
          ))}
        </View>

        {hover && (
          <>
            {/* Crosshair */}
            <View style={{ position: 'absolute', left: hover.x, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            {/* Hover dot */}
            <View style={{ position: 'absolute', left: points[hover.i].lx - 5, top: points[hover.i].ly - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ea1ff' }} />
            {/* Tooltip */}
            <View style={{ position: 'absolute', left: Math.min(Math.max(0, hover.x - 70), chartWidth - 140), top: Math.max(0, points[hover.i].ly - 64), backgroundColor: '#111', borderColor: '#2a2a2e', borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{months[hover.i]}</Text>
              <Text style={{ color: '#9ad1ff', fontSize: 11 }}>Cumulative: {line[hover.i] || 0}</Text>
              <Text style={{ color: '#F56E0F', fontSize: 11 }}>Added: {bars[hover.i] || 0}</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
        {months.map((m, i) => (
          <Text key={`lbl-${i}`} style={{ color: '#878787', fontSize: 10, width: colWidth, textAlign: 'center' }}>{m}</Text>
        ))}
      </View>
    </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FBFBFB',
    textAlign: 'center',
  },
  welcomeSection: {
    padding: width < 768 ? 16 : 24, // Responsive padding
    backgroundColor: '#2A2A2E', // Dark secondary background
    marginBottom: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
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
  searchButton: {
    padding: width < 768 ? 8 : 10, // Smaller padding on mobile
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 12,
    paddingHorizontal: width < 768 ? 12 : 16, // Responsive padding
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: width < 768 ? 14 : 16, // Smaller font on mobile
    color: '#FBFBFB',
    paddingVertical: width < 768 ? 10 : 12, // Responsive padding
  },
  searchCloseButton: {
    padding: 8,
  },
  companyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 16,
    color: '#878787',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: '#878787',
    marginLeft: 4,
  },
  favoriteButton: {
    padding: 8,
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
    color: '#878787',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#FBFBFB',
    lineHeight: 20,
    marginBottom: 10,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#878787',
    marginLeft: 8,
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
    backgroundColor: '#F56E0F',
  },
  locationButton: {
    backgroundColor: '#34a853',
  },
  favoriteActionButton: {
    backgroundColor: '#ea4335',
  },
  applyButton: {
    backgroundColor: '#F56E0F',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  chartSection: {
    paddingHorizontal: 20, // Add margin to prevent chart from going to screen edges
    marginBottom: 20,
    width: '100%',
  },
  chartCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)'
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1B1B1E',
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
  moaSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  presentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  presentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15141',
    marginBottom: 15,
  },
  moaCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  moaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  moaInfo: {
    flex: 1,
  },
  moaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  moaSubtitle: {
    fontSize: 14,
    color: '#878787',
  },
  moaStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moaStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDetails: {
    gap: 12,
  },
  moaDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moaDetailLabel: {
    fontSize: 14,
    color: '#878787',
  },
  moaDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 14,
    color: '#F56E0F',
    marginLeft: 4,
    fontWeight: '500',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityList: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#878787',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#878787',
  },
  // Skeleton Loading Styles
  skeletonCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A2E',
    marginRight: 15,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: '50%',
  },
  skeletonRating: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    width: '40%',
  },
  skeletonContent: {
    marginTop: 10,
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
  skeletonStatCard: {
    flex: 1,
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 16,
    marginBottom: 12,
  },
  skeletonNumber: {
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    width: 40,
  },
  skeletonLabel: {
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    width: 60,
  },
  profileImageSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profilePlaceholderSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
});
