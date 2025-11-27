import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DatePicker from '@react-native-community/datetimepicker';
import { apiService } from '../../../lib/api';

const { width, height } = Dimensions.get('window');

interface Intern {
  id: string;
  student_id: string;
  applicationId?: number;
  finishedAt?: string | null;
  first_name: string;
  last_name: string;
  expected_start_date?: string;
  expected_end_date?: string;
  started_at?: string; // Actual start date from applications table
  finished_at?: string; // Actual finish date from applications table
  totalHours?: number; // Total hours from applications table (hours_of_internship)
}

interface CompanyProfile {
  company_name?: string;
  address?: string;
  city?: string;
  zip?: string;
  phone_number?: string;
  contact_person?: string;
}

interface SupervisorEvaluationPanelProps {
  selectedIntern: Intern | null;
  onClose: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  companyId: string;
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
  companyProfile?: CompanyProfile;
  slideAnim: Animated.Value;
}

export default function SupervisorEvaluationPanel({
  selectedIntern,
  onClose,
  isMobile,
  isTablet,
  isDesktop,
  companyId,
  currentUser,
  companyProfile,
  slideAnim,
}: SupervisorEvaluationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingEvaluationId, setExistingEvaluationId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Section I: COMPANY AND SUPERVISOR
  const [organizationCompanyName, setOrganizationCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [supervisorPosition, setSupervisorPosition] = useState('');
  const [supervisorPhone, setSupervisorPhone] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  
  // Section II: ON-THE-JOB TRAINING DATA
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [totalHours, setTotalHours] = useState('');
  const [descriptionOfDuties, setDescriptionOfDuties] = useState('');
  
  // Section III: PERFORMANCE EVALUATION
  const [question1Performance, setQuestion1Performance] = useState<'Outstanding' | 'Good' | 'Average' | 'Poor' | ''>('');
  const [question2SkillsCareer, setQuestion2SkillsCareer] = useState<boolean | null>(null);
  const [question2Elaboration, setQuestion2Elaboration] = useState('');
  const [question3FulltimeCandidate, setQuestion3FulltimeCandidate] = useState<boolean | null>(null);
  const [question4InterestOtherTrainees, setQuestion4InterestOtherTrainees] = useState<boolean | null>(null);
  const [question4Elaboration, setQuestion4Elaboration] = useState('');
  
  // Rating Scale items (1-5)
  const [workPerformance1, setWorkPerformance1] = useState<number | ''>('');
  const [workPerformance2, setWorkPerformance2] = useState<number | ''>('');
  const [workPerformance3, setWorkPerformance3] = useState<number | ''>('');
  const [workPerformance4, setWorkPerformance4] = useState<number | ''>('');
  const [workPerformance5, setWorkPerformance5] = useState<number | ''>('');
  const [workPerformance6, setWorkPerformance6] = useState<number | ''>('');
  const [communication1, setCommunication1] = useState<number | ''>('');
  const [communication2, setCommunication2] = useState<number | ''>('');
  const [professionalConduct1, setProfessionalConduct1] = useState<number | ''>('');
  const [professionalConduct2, setProfessionalConduct2] = useState<number | ''>('');
  const [professionalConduct3, setProfessionalConduct3] = useState<number | ''>('');
  const [punctuality1, setPunctuality1] = useState<number | ''>('');
  const [punctuality2, setPunctuality2] = useState<number | ''>('');
  const [punctuality3, setPunctuality3] = useState<number | ''>('');
  const [flexibility1, setFlexibility1] = useState<number | ''>('');
  const [flexibility2, setFlexibility2] = useState<number | ''>('');
  const [attitude1, setAttitude1] = useState<number | ''>('');
  const [attitude2, setAttitude2] = useState<number | ''>('');
  const [attitude3, setAttitude3] = useState<number | ''>('');
  const [attitude4, setAttitude4] = useState<number | ''>('');
  const [attitude5, setAttitude5] = useState<number | ''>('');
  const [reliability1, setReliability1] = useState<number | ''>('');
  const [reliability2, setReliability2] = useState<number | ''>('');
  const [reliability3, setReliability3] = useState<number | ''>('');
  const [reliability4, setReliability4] = useState<number | ''>('');
  
  // Supervisor info
  const [supervisorName, setSupervisorName] = useState('');
  const [evaluationDate, setEvaluationDate] = useState<Date>(new Date());
  const [showEvaluationDatePicker, setShowEvaluationDatePicker] = useState(false);

  // Initialize form with company profile data
  useEffect(() => {
    if (companyProfile) {
      setOrganizationCompanyName(companyProfile.company_name || '');
      setAddress(companyProfile.address || '');
      // Note: city, zip, phone might need to be parsed from address or fetched separately
      setSupervisorPhone(companyProfile.phone_number || '');
      setSupervisorName(companyProfile.contact_person || '');
    }
  }, [companyProfile]);

  // Helper function to parse date from various formats (timestamp, ISO, date string)
  const parseDateFromString = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    // Handle timestamp format: "2025-11-20 16:54:32.874" -> extract "2025-11-20"
    // Handle ISO format: "2025-11-20T16:54:32.874Z" -> extract "2025-11-20"
    // Handle date format: "2025-11-20" -> use as is
    let datePart = dateString.trim();
    
    // If contains space, split and take first part (date)
    if (datePart.includes(' ')) {
      datePart = datePart.split(' ')[0];
    }
    // If contains 'T', split and take first part (date)
    else if (datePart.includes('T')) {
      datePart = datePart.split('T')[0];
    }
    
    // Parse YYYY-MM-DD format and create date in local timezone
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    // Fallback: try standard Date parsing
    const fallbackDate = new Date(datePart);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
    
    return null;
  };

  // Initialize form with intern data - use started_at and finished_at from applications table
  useEffect(() => {
    if (selectedIntern) {
      // Parse started_at - extract date part from timestamp
      if (selectedIntern.started_at) {
        const parsedStartDate = parseDateFromString(selectedIntern.started_at);
        if (parsedStartDate) {
          setStartDate(parsedStartDate);
        }
      } else if (selectedIntern.expected_start_date) {
        // Fallback to expected_start_date if started_at is not available
        const parsedStartDate = parseDateFromString(selectedIntern.expected_start_date);
        if (parsedStartDate) {
          setStartDate(parsedStartDate);
        }
      }
      
      // Parse finished_at - extract date part from timestamp
      if (selectedIntern.finished_at) {
        const parsedEndDate = parseDateFromString(selectedIntern.finished_at);
        if (parsedEndDate) {
          setEndDate(parsedEndDate);
        }
      } else if (selectedIntern.expected_end_date) {
        // Fallback to expected_end_date if finished_at is not available
        const parsedEndDate = parseDateFromString(selectedIntern.expected_end_date);
        if (parsedEndDate) {
          setEndDate(parsedEndDate);
        }
      }
      
      // Set total hours from application (will be overwritten by existing evaluation if it exists)
      if (selectedIntern.totalHours) {
        setTotalHours(selectedIntern.totalHours.toString());
      }
    }
  }, [selectedIntern]);

  // Fetch existing evaluation
  useEffect(() => {
    if (selectedIntern && selectedIntern.student_id) {
      fetchExistingEvaluation();
    }
  }, [selectedIntern]);

  const fetchExistingEvaluation = async () => {
    if (!selectedIntern || !selectedIntern.student_id) return;
    
    setLoading(true);
    try {
      const response = await apiService.getSupervisorEvaluation(
        selectedIntern.student_id,
        companyId
      );
      
      if (response.success && (response as any).evaluationForm) {
        const evalData = (response as any).evaluationForm;
        setExistingEvaluationId(evalData.id.toString());
        
        // Populate form with existing data
        setOrganizationCompanyName(evalData.organization_company_name || '');
        setAddress(evalData.address || '');
        setCity(evalData.city || '');
        setZip(evalData.zip || '');
        setSupervisorPosition(evalData.supervisor_position || '');
        setSupervisorPhone(evalData.supervisor_phone || '');
        setSupervisorEmail(evalData.supervisor_email || '');
        
        if (evalData.start_date) {
          const parsedStartDate = parseDateFromString(evalData.start_date);
          if (parsedStartDate) setStartDate(parsedStartDate);
        }
        if (evalData.end_date) {
          const parsedEndDate = parseDateFromString(evalData.end_date);
          if (parsedEndDate) setEndDate(parsedEndDate);
        }
        setTotalHours(evalData.total_hours?.toString() || '');
        setDescriptionOfDuties(evalData.description_of_duties || '');
        
        setQuestion1Performance(evalData.question_1_performance || '');
        setQuestion2SkillsCareer(evalData.question_2_skills_career ?? null);
        setQuestion2Elaboration(evalData.question_2_elaboration || '');
        setQuestion3FulltimeCandidate(evalData.question_3_fulltime_candidate ?? null);
        setQuestion4InterestOtherTrainees(evalData.question_4_interest_other_trainees ?? null);
        setQuestion4Elaboration(evalData.question_4_elaboration || '');
        
        // Rating items
        setWorkPerformance1(evalData.work_performance_1 || '');
        setWorkPerformance2(evalData.work_performance_2 || '');
        setWorkPerformance3(evalData.work_performance_3 || '');
        setWorkPerformance4(evalData.work_performance_4 || '');
        setWorkPerformance5(evalData.work_performance_5 || '');
        setWorkPerformance6(evalData.work_performance_6 || '');
        setCommunication1(evalData.communication_1 || '');
        setCommunication2(evalData.communication_2 || '');
        setProfessionalConduct1(evalData.professional_conduct_1 || '');
        setProfessionalConduct2(evalData.professional_conduct_2 || '');
        setProfessionalConduct3(evalData.professional_conduct_3 || '');
        setPunctuality1(evalData.punctuality_1 || '');
        setPunctuality2(evalData.punctuality_2 || '');
        setPunctuality3(evalData.punctuality_3 || '');
        setFlexibility1(evalData.flexibility_1 || '');
        setFlexibility2(evalData.flexibility_2 || '');
        setAttitude1(evalData.attitude_1 || '');
        setAttitude2(evalData.attitude_2 || '');
        setAttitude3(evalData.attitude_3 || '');
        setAttitude4(evalData.attitude_4 || '');
        setAttitude5(evalData.attitude_5 || '');
        setReliability1(evalData.reliability_1 || '');
        setReliability2(evalData.reliability_2 || '');
        setReliability3(evalData.reliability_3 || '');
        setReliability4(evalData.reliability_4 || '');
        
        setSupervisorName(evalData.supervisor_name || '');
        if (evalData.evaluation_date) {
          const parsedEvalDate = parseDateFromString(evalData.evaluation_date);
          if (parsedEvalDate) setEvaluationDate(parsedEvalDate);
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedIntern) return;
    
    // Validation
    if (!organizationCompanyName || !address || !city || !zip || !supervisorPosition ||
        !startDate || !endDate || !totalHours || !descriptionOfDuties ||
        !question1Performance || question2SkillsCareer === null ||
        question3FulltimeCandidate === null || question4InterestOtherTrainees === null ||
        !evaluationDate) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const evaluationData = {
        studentId: selectedIntern.student_id,
        companyId: companyId,
        applicationId: selectedIntern.applicationId?.toString(),
        organizationCompanyName,
        address,
        city,
        zip,
        supervisorPosition,
        supervisorPhone: supervisorPhone || undefined,
        supervisorEmail: supervisorEmail || undefined,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalHours: parseFloat(totalHours),
        descriptionOfDuties,
        question1Performance: question1Performance as 'Outstanding' | 'Good' | 'Average' | 'Poor',
        question2SkillsCareer: question2SkillsCareer === true,
        question2Elaboration: question2Elaboration || undefined,
        question3FulltimeCandidate: question3FulltimeCandidate === true,
        question4InterestOtherTrainees: question4InterestOtherTrainees === true,
        question4Elaboration: question4Elaboration || undefined,
        workPerformance1: workPerformance1 !== '' ? Number(workPerformance1) : undefined,
        workPerformance2: workPerformance2 !== '' ? Number(workPerformance2) : undefined,
        workPerformance3: workPerformance3 !== '' ? Number(workPerformance3) : undefined,
        workPerformance4: workPerformance4 !== '' ? Number(workPerformance4) : undefined,
        workPerformance5: workPerformance5 !== '' ? Number(workPerformance5) : undefined,
        workPerformance6: workPerformance6 !== '' ? Number(workPerformance6) : undefined,
        communication1: communication1 !== '' ? Number(communication1) : undefined,
        communication2: communication2 !== '' ? Number(communication2) : undefined,
        professionalConduct1: professionalConduct1 !== '' ? Number(professionalConduct1) : undefined,
        professionalConduct2: professionalConduct2 !== '' ? Number(professionalConduct2) : undefined,
        professionalConduct3: professionalConduct3 !== '' ? Number(professionalConduct3) : undefined,
        punctuality1: punctuality1 !== '' ? Number(punctuality1) : undefined,
        punctuality2: punctuality2 !== '' ? Number(punctuality2) : undefined,
        punctuality3: punctuality3 !== '' ? Number(punctuality3) : undefined,
        flexibility1: flexibility1 !== '' ? Number(flexibility1) : undefined,
        flexibility2: flexibility2 !== '' ? Number(flexibility2) : undefined,
        attitude1: attitude1 !== '' ? Number(attitude1) : undefined,
        attitude2: attitude2 !== '' ? Number(attitude2) : undefined,
        attitude3: attitude3 !== '' ? Number(attitude3) : undefined,
        attitude4: attitude4 !== '' ? Number(attitude4) : undefined,
        attitude5: attitude5 !== '' ? Number(attitude5) : undefined,
        reliability1: reliability1 !== '' ? Number(reliability1) : undefined,
        reliability2: reliability2 !== '' ? Number(reliability2) : undefined,
        reliability3: reliability3 !== '' ? Number(reliability3) : undefined,
        reliability4: reliability4 !== '' ? Number(reliability4) : undefined,
        supervisorName: supervisorName || undefined,
        evaluationDate: evaluationDate.toISOString().split('T')[0],
      };

      let response;
      if (existingEvaluationId) {
        response = await apiService.updateSupervisorEvaluation(
          existingEvaluationId,
          evaluationData,
          currentUser.id
        );
      } else {
        response = await apiService.createSupervisorEvaluation(
          evaluationData,
          currentUser.id
        );
      }

      if (response.success) {
        // Update existingEvaluationId if it was a new evaluation
        if (!existingEvaluationId && (response as any).evaluationForm?.id) {
          setExistingEvaluationId((response as any).evaluationForm.id.toString());
        }
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to save evaluation form.');
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      Alert.alert('Error', 'Failed to save evaluation form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedIntern) return null;

  const panelWidth = isMobile ? width : isTablet ? width * 0.7 : width * 0.5;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          width: panelWidth,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="assessment" size={24} color="#F56E0F" />
          <Text style={styles.headerTitle}>Supervisor Evaluation Form</Text>
        </View>
        <View style={styles.headerActions}>
          {!loading && (
            <TouchableOpacity
              style={[styles.topSaveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#fff" />
                  <Text style={styles.topSaveButtonText}>
                    {existingEvaluationId ? 'Update' : 'Save'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F56E0F" />
          <Text style={styles.loadingText}>Loading evaluation form...</Text>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.internName}>
              {selectedIntern.first_name} {selectedIntern.last_name}
            </Text>

            {/* Section I: COMPANY AND SUPERVISOR */}
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Section I: COMPANY AND SUPERVISOR</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Organization/Company Name *</Text>
              <TextInput
                style={styles.input}
                value={organizationCompanyName}
                onChangeText={setOrganizationCompanyName}
                placeholder="Enter company name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>ZIP *</Text>
                <TextInput
                  style={styles.input}
                  value={zip}
                  onChangeText={setZip}
                  placeholder="Enter ZIP code"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Position *</Text>
              <TextInput
                style={styles.input}
                value={supervisorPosition}
                onChangeText={setSupervisorPosition}
                placeholder="Enter supervisor position"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={supervisorPhone}
                  onChangeText={setSupervisorPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={supervisorEmail}
                  onChangeText={setSupervisorEmail}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Section II: ON-THE-JOB TRAINING DATA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Section II: ON-THE-JOB TRAINING DATA</Text>
            
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {startDate.toLocaleDateString()}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DatePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowStartDatePicker(false);
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>End Date *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {endDate.toLocaleDateString()}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DatePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowEndDatePicker(false);
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Hours *</Text>
              <TextInput
                style={styles.input}
                value={totalHours}
                onChangeText={setTotalHours}
                placeholder="Enter total hours"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description of Duties *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descriptionOfDuties}
                onChangeText={setDescriptionOfDuties}
                placeholder="Enter description of duties"
                multiline
                numberOfLines={5}
              />
            </View>
          </View>

          {/* Section III: PERFORMANCE EVALUATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Section III: PERFORMANCE EVALUATION</Text>
            
            {/* Question 1 */}
            <View style={styles.formGroup}>
              <Text style={styles.questionText}>
                1. How well did the Trainee perform the assigned tasks? *
              </Text>
              <View style={styles.radioGroup}>
                {['Outstanding', 'Good', 'Average', 'Poor'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.radioOption}
                    onPress={() => setQuestion1Performance(option as any)}
                  >
                    <MaterialIcons
                      name={question1Performance === option ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={24}
                      color={question1Performance === option ? '#F56E0F' : '#666'}
                    />
                    <Text style={styles.radioLabel}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Question 2 */}
            <View style={styles.formGroup}>
              <Text style={styles.questionText}>
                2. Does the Trainee possess basic skills, intelligence, and motivation to pursue a successful career in the IT industry? *
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion2SkillsCareer(true)}
                >
                  <MaterialIcons
                    name={question2SkillsCareer === true ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question2SkillsCareer === true ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>YES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion2SkillsCareer(false)}
                >
                  <MaterialIcons
                    name={question2SkillsCareer === false ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question2SkillsCareer === false ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>NO</Text>
                </TouchableOpacity>
              </View>
              {question2SkillsCareer === false && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>(Please elaborate)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={question2Elaboration}
                    onChangeText={setQuestion2Elaboration}
                    placeholder="Enter elaboration"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </View>

            {/* Question 3 */}
            <View style={styles.formGroup}>
              <Text style={styles.questionText}>
                3. Would you consider the Trainee as a likely candidate for a full-time position in your area of experience? *
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion3FulltimeCandidate(true)}
                >
                  <MaterialIcons
                    name={question3FulltimeCandidate === true ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question3FulltimeCandidate === true ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>YES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion3FulltimeCandidate(false)}
                >
                  <MaterialIcons
                    name={question3FulltimeCandidate === false ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question3FulltimeCandidate === false ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>NO</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Question 4 */}
            <View style={styles.formGroup}>
              <Text style={styles.questionText}>
                4. Are you interested in other Trainees from our University? *
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion4InterestOtherTrainees(true)}
                >
                  <MaterialIcons
                    name={question4InterestOtherTrainees === true ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question4InterestOtherTrainees === true ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>YES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setQuestion4InterestOtherTrainees(false)}
                >
                  <MaterialIcons
                    name={question4InterestOtherTrainees === false ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={question4InterestOtherTrainees === false ? '#F56E0F' : '#666'}
                  />
                  <Text style={styles.radioLabel}>NO</Text>
                </TouchableOpacity>
              </View>
              {question4InterestOtherTrainees === false && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>(If NO, please elaborate)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={question4Elaboration}
                    onChangeText={setQuestion4Elaboration}
                    placeholder="Enter elaboration"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </View>

            {/* Question 5: Rating Scale */}
            <View style={styles.formGroup}>
              <Text style={styles.questionText}>
                5. Listed below are several qualities we believe are important to the successful completion of an OJT experience.
              </Text>
              <Text style={styles.instructionText}>
                (To the supervisor: Please rate each item using the rating scale provided below)
              </Text>
              
              <View style={styles.ratingScale}>
                <Text style={styles.ratingScaleLabel}>Rating Scale:</Text>
                <View style={styles.ratingScaleItems}>
                  <Text style={styles.ratingScaleItem}>5 - EXCELLENT</Text>
                  <Text style={styles.ratingScaleItem}>4 - VERY GOOD</Text>
                  <Text style={styles.ratingScaleItem}>3 - GOOD</Text>
                  <Text style={styles.ratingScaleItem}>2 - POOR</Text>
                  <Text style={styles.ratingScaleItem}>1 - VERY POOR</Text>
                </View>
              </View>

              {/* Work Performance */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>A. WORK PERFORMANCE</Text>
                {[
                  { label: 'Shows creativity and originality', value: workPerformance1, setter: setWorkPerformance1 },
                  { label: 'Apply theories and knowledge', value: workPerformance2, setter: setWorkPerformance2 },
                  { label: 'Demonstrates technology skills', value: workPerformance3, setter: setWorkPerformance3 },
                  { label: 'Clear understanding of tasks', value: workPerformance4, setter: setWorkPerformance4 },
                  { label: 'Exhibits innovativeness', value: workPerformance5, setter: setWorkPerformance5 },
                  { label: 'Accomplishes tasks with desired output', value: workPerformance6, setter: setWorkPerformance6 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Communication Skills */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>B. COMMUNICATION SKILLS</Text>
                {[
                  { label: 'Communicates with supervisors regularly', value: communication1, setter: setCommunication1 },
                  { label: 'Promotes good communication', value: communication2, setter: setCommunication2 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Professional Conduct */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>C. PROFESSIONAL CONDUCT</Text>
                {[
                  { label: 'Demonstrates respect and courtesy', value: professionalConduct1, setter: setProfessionalConduct1 },
                  { label: 'Establishes good working relationship', value: professionalConduct2, setter: setProfessionalConduct2 },
                  { label: 'Listens well and asks questions', value: professionalConduct3, setter: setProfessionalConduct3 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Punctuality */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>D. PUNCTUALITY</Text>
                {[
                  { label: 'Demonstrated punctuality', value: punctuality1, setter: setPunctuality1 },
                  { label: 'Reports to specified schedule', value: punctuality2, setter: setPunctuality2 },
                  { label: 'Practices diligence and professionalism', value: punctuality3, setter: setPunctuality3 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Flexibility */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>E. FLEXIBILITY</Text>
                {[
                  { label: 'Exhibits flexibility and adaptability', value: flexibility1, setter: setFlexibility1 },
                  { label: 'Carries out orders easily', value: flexibility2, setter: setFlexibility2 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Attitude */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>F. ATTITUDE</Text>
                {[
                  { label: 'Displays optimism and perseverance', value: attitude1, setter: setAttitude1 },
                  { label: 'Demonstrates willingness to accept direction', value: attitude2, setter: setAttitude2 },
                  { label: 'Exhibits zeal to learn', value: attitude3, setter: setAttitude3 },
                  { label: 'Promotes self-confidence and maturity', value: attitude4, setter: setAttitude4 },
                  { label: 'Exercises self-discipline and dedication', value: attitude5, setter: setAttitude5 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Reliability */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>G. RELIABILITY</Text>
                {[
                  { label: 'Handles tasks without supervision', value: reliability1, setter: setReliability1 },
                  { label: 'Follows orders and finishes on time', value: reliability2, setter: setReliability2 },
                  { label: 'Acts accordingly with responsibility', value: reliability3, setter: setReliability3 },
                  { label: 'Has initiative and drive', value: reliability4, setter: setReliability4 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingItem}>
                    <Text style={styles.ratingItemLabel}>{item.label}</Text>
                    <View style={styles.ratingButtons}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingButton,
                            item.value === rating && styles.ratingButtonSelected,
                          ]}
                          onPress={() => item.setter(item.value === rating ? '' : rating)}
                        >
                          <Text
                            style={[
                              styles.ratingButtonText,
                              item.value === rating && styles.ratingButtonTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Supervisor Signature */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Supervisor Name</Text>
              <TextInput
                style={styles.input}
                value={supervisorName}
                onChangeText={setSupervisorName}
                placeholder="Enter supervisor name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Evaluation Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEvaluationDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {evaluationDate.toLocaleDateString()}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>
              {showEvaluationDatePicker && (
                <DatePicker
                  value={evaluationDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEvaluationDatePicker(false);
                    if (date) setEvaluationDate(date);
                  }}
                />
              )}
            </View>
          </View>
          </ScrollView>

          {/* Save Button - Fixed at bottom */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {existingEvaluationId ? 'Update Evaluation' : 'Save Evaluation'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successModalHeader}>
              <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
              <Text style={styles.successModalTitle}>Success!</Text>
            </View>
            <View style={styles.successModalContent}>
              <Text style={styles.successModalMessage}>
                {existingEvaluationId 
                  ? 'Evaluation form updated successfully!'
                  : 'Evaluation form saved successfully!'}
              </Text>
            </View>
            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
              >
                <Text style={styles.successModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F56E0F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  topSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0, // Important for flex to work with ScrollView
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20, // Extra padding at bottom for better spacing
  },
  internName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  instructionText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  ratingScale: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  ratingScaleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingScaleItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ratingScaleItem: {
    fontSize: 12,
    color: '#666',
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  ratingItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingItemLabel: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    backgroundColor: '#F56E0F',
    borderColor: '#F56E0F',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  ratingButtonTextSelected: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    width: '100%', // Ensure footer takes full width
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56E0F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successModalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
  },
  successModalContent: {
    padding: 24,
    paddingTop: 0,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
  successModalActions: {
    padding: 24,
    paddingTop: 0,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

