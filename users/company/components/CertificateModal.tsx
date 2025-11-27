import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import { CERTIFICATE_TEMPLATES, SAMPLE_PREVIEW_DATA, CertificateTemplate } from '../utils/certificateTemplates';
import {
  generateCertificatePreview,
  generateAndUploadCertificates,
  InternData,
  CompanyData,
} from '../utils/certificateGenerator';

const { width } = Dimensions.get('window');

interface CompletedIntern {
  id: string;
  student_id: string;
  application_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  student_email: string;
  id_number?: string;
  major: string;
  year: string;
  position: string;
  department?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  started_at?: string;
  finished_at: string;
  totalHours: number;
  status: 'completed';
}

interface CustomTemplate {
  id: number;
  template_name: string;
  template_image_url: string;
  is_default: boolean;
}

interface CertificateModalProps {
  visible: boolean;
  onClose: () => void;
  companyId: string;
  companyData: {
    companyName: string;
    address: string;
    signature?: string | null;
    contactPerson?: string | null;
  };
  onSuccess?: (message?: string) => void;
}

export default function CertificateModal({
  visible,
  onClose,
  companyId,
  companyData,
  onSuccess,
}: CertificateModalProps) {
  const [completedInterns, setCompletedInterns] = useState<CompletedIntern[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('gold_blue_premium');
  const [selectedInterns, setSelectedInterns] = useState<string[]>([]);
  const [contactPersonTitle, setContactPersonTitle] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  // Fetch completed interns and custom templates when modal opens
  useEffect(() => {
    if (visible && companyId) {
      fetchCompletedInterns();
      fetchCustomTemplates();
    } else {
      // Reset state when modal closes
      setSelectedInterns([]);
      setContactPersonTitle('');
      setPreviewImageUrl(null);
      setProgress({ current: 0, total: 0 });
    }
  }, [visible, companyId]);

  const fetchCustomTemplates = async () => {
    try {
      const response = await apiService.getCustomTemplates(companyId);
      if (response.success && (response as any).templates) {
        setCustomTemplates((response as any).templates);
      }
    } catch (error) {
      console.error('Error fetching custom templates:', error);
    }
  };

  // Update preview when template, interns, or contact person title changes
  useEffect(() => {
    if (visible && selectedTemplate && companyData) {
      updatePreview();
    }
  }, [selectedTemplate, selectedInterns, contactPersonTitle, visible]);

  const fetchCompletedInterns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompletedInterns(companyId);
      
      if (response.success && response.interns) {
        setCompletedInterns(response.interns);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch completed interns');
      }
    } catch (error) {
      console.error('Error fetching completed interns:', error);
      Alert.alert('Error', 'Failed to fetch completed interns');
    } finally {
      setLoading(false);
    }
  };

  // Create custom template objects from fetched templates
  const customTemplateObjects: CertificateTemplate[] = useMemo(() => {
    if (customTemplates.length === 0) return [];
    
    // Use the first template as a base for text styling
    const baseTemplate = CERTIFICATE_TEMPLATES[0];
    
    return customTemplates.map((template) => ({
      id: `custom_template_${template.id}`,
      name: template.template_name || 'Custom Template',
      isCustom: true,
      customImageUrl: template.template_image_url,
      config: baseTemplate.config, // Use base template config for text styling
      // textZones can be added later for custom positioning
    }));
  }, [customTemplates]);

  // Get all available templates (including all custom templates)
  const availableTemplates = useMemo(() => {
    const templates = [...CERTIFICATE_TEMPLATES];
    templates.push(...customTemplateObjects);
    return templates;
  }, [customTemplateObjects]);

  const updatePreview = async () => {
    try {
      setGeneratingPreview(true);
      
      const template = availableTemplates.find(t => t.id === selectedTemplate);
      if (!template) return;
      
      // Determine preview data
      let previewInternData: InternData;
      if (selectedInterns.length > 0) {
        // Use first selected intern's data
        const firstIntern = completedInterns.find(i => i.id === selectedInterns[0]);
        if (firstIntern) {
          // Use same fallback logic as certificate generation
          let firstName = firstIntern.first_name?.trim() || '';
          let middleName = firstIntern.middle_name?.trim() || '';
          let lastName = firstIntern.last_name?.trim() || '';
          
          // Remove 'N/A' from middle name - treat it as empty
          if (middleName === 'N/A' || middleName === 'n/a' || middleName === '') {
            middleName = '';
          }
          
          // If names are empty, try to extract from email or use id_number
          if (!firstName && !lastName) {
            if (firstIntern.student_email) {
              const emailParts = firstIntern.student_email.split('@')[0];
              const nameParts = emailParts.split(/[._-]/);
              if (nameParts.length >= 2) {
                firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
                lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
              } else if (nameParts.length === 1) {
                firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
                lastName = '';
              }
            }
            
            if (!firstName && !lastName && firstIntern.id_number) {
              firstName = 'Student';
              lastName = firstIntern.id_number;
            }
          }
          
          // Construct the full name parts properly
          const nameParts = [];
          if (firstName) nameParts.push(firstName);
          if (middleName) nameParts.push(middleName);
          if (lastName) nameParts.push(lastName);
          
          let finalFirstName = '';
          let finalLastName = '';
          
          if (nameParts.length > 0) {
            finalFirstName = nameParts[0];
            if (nameParts.length > 1) {
              finalLastName = nameParts.slice(1).join(' ');
            }
          } else {
            finalFirstName = 'Student';
            finalLastName = 'Name';
          }
          
          previewInternData = {
            firstName: finalFirstName,
            lastName: finalLastName,
            totalHours: firstIntern.totalHours,
            startDate: firstIntern.expected_start_date || firstIntern.started_at || '',
            endDate: firstIntern.finished_at,
          };
        } else {
          previewInternData = SAMPLE_PREVIEW_DATA;
        }
      } else {
        // Use sample data
        previewInternData = SAMPLE_PREVIEW_DATA;
      }
      
      // Generate preview
      const previewImage = await generateCertificatePreview(
        template,
        previewInternData,
        {
          ...companyData,
          contactPersonTitle: contactPersonTitle || undefined,
        }
      );
      
      setPreviewImageUrl(previewImage);
    } catch (error) {
      console.error('Error generating preview:', error);
      Alert.alert('Error', 'Failed to generate preview');
    } finally {
      setGeneratingPreview(false);
    }
  };

  const toggleInternSelection = (internId: string) => {
    setSelectedInterns(prev => {
      if (prev.includes(internId)) {
        return prev.filter(id => id !== internId);
      } else {
        return [...prev, internId];
      }
    });
  };

  const handleGenerateCertificates = async () => {
    if (selectedInterns.length === 0) {
      Alert.alert('Error', 'Please select at least one intern');
      return;
    }

    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template');
      return;
    }

    try {
      setGenerating(true);
      setProgress({ current: 0, total: selectedInterns.length });

      let template = availableTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template not found');
      }

      // If it's a custom template, we need to get the actual template data
      if (template.isCustom && template.customImageUrl) {
        // Template is already set up correctly, just use it
      }

      // Get intern data for generation
      const internsToGenerate = selectedInterns.map(internId => {
        const intern = completedInterns.find(i => i.id === internId);
        if (!intern) throw new Error(`Intern ${internId} not found`);
        
        // Log the intern data for debugging
        console.log('📋 Intern data for certificate generation:', {
          id: intern.id,
          first_name: intern.first_name,
          middle_name: intern.middle_name,
          last_name: intern.last_name,
          student_email: intern.student_email,
          id_number: intern.id_number,
          rawData: intern,
          allKeys: Object.keys(intern)
        });
        
        // Get name parts - handle null, undefined, and empty strings
        // Check for both the direct properties and any variations
        let firstName = '';
        let middleName = '';
        let lastName = '';
        
        // Try to get first_name
        if (intern.first_name && typeof intern.first_name === 'string' && intern.first_name.trim()) {
          firstName = intern.first_name.trim();
        }
        
        // Try to get middle_name (skip if 'N/A')
        if (intern.middle_name && typeof intern.middle_name === 'string') {
          const trimmed = intern.middle_name.trim();
          if (trimmed && trimmed !== 'N/A' && trimmed !== 'n/a') {
            middleName = trimmed;
          }
        }
        
        // Try to get last_name
        if (intern.last_name && typeof intern.last_name === 'string' && intern.last_name.trim()) {
          lastName = intern.last_name.trim();
        }
        
        console.log('🔍 Extracted name parts:', { firstName, middleName, lastName });
        
        // If names are empty, try to extract from email or use id_number
        if (!firstName && !lastName) {
          if (intern.student_email) {
            // Try to extract name from email (e.g., "john.doe@email.com" -> "John Doe")
            const emailParts = intern.student_email.split('@')[0];
            const nameParts = emailParts.split(/[._-]/);
            if (nameParts.length >= 2) {
              firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
              lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
            } else if (nameParts.length === 1) {
              firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
              lastName = '';
            }
          }
          
          // If still empty, use id_number as last resort
          if (!firstName && !lastName && intern.id_number) {
            firstName = 'Student';
            lastName = intern.id_number;
          }
        }
        
        // Construct the full name properly
        // Combine all name parts, excluding empty ones and 'N/A'
        const nameParts = [];
        if (firstName && firstName.trim()) nameParts.push(firstName.trim());
        if (middleName && middleName.trim() && middleName !== 'N/A' && middleName !== 'n/a') {
          nameParts.push(middleName.trim());
        }
        if (lastName && lastName.trim()) nameParts.push(lastName.trim());
        
        // If we have name parts, construct the name; otherwise use fallback
        let finalFirstName = '';
        let finalLastName = '';
        
        if (nameParts.length > 0) {
          // First name is always the first part
          finalFirstName = nameParts[0];
          // Everything else (middle + last, or just last) goes to last name
          if (nameParts.length > 1) {
            finalLastName = nameParts.slice(1).join(' ');
          } else {
            // If only first name exists, leave lastName empty (will show just first name)
            finalLastName = '';
          }
        } else {
          // Fallback if no name parts
          finalFirstName = 'Student';
          finalLastName = 'Name';
        }
        
        console.log('✅ Using names for certificate:', { 
          original: { 
            first: firstName, 
            middle: middleName, 
            last: lastName 
          },
          nameParts: nameParts,
          constructed: { 
            first: finalFirstName, 
            last: finalLastName 
          },
          willDisplay: finalLastName 
            ? `${finalFirstName} ${finalLastName}`.trim()
            : finalFirstName
        });
        
        return {
          firstName: finalFirstName,
          lastName: finalLastName,
          totalHours: intern.totalHours,
          startDate: intern.expected_start_date || intern.started_at || '',
          endDate: intern.finished_at,
          studentId: intern.student_id,
          applicationId: intern.application_id.toString(),
        };
      });

      // Generate and upload certificates
      console.log(`🚀 Starting certificate generation for ${internsToGenerate.length} intern(s)`);
      console.log('📋 Interns to generate:', internsToGenerate);
      console.log('🏢 Company data:', companyData);
      console.log('🎨 Template:', template.id);
      
      let results;
      try {
        results = await generateAndUploadCertificates(
          template,
          internsToGenerate,
          {
            ...companyData,
            contactPersonTitle: contactPersonTitle || undefined,
          },
          companyId,
          (current, total) => {
            setProgress({ current, total });
          }
        );
        console.log('📊 Generation results:', results);
      } catch (genError) {
        console.error('❌ Certificate generation error:', genError);
        throw genError;
      }

      // Separate successful and failed results
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      console.log(`📈 Results summary: ${successfulResults.length} successful, ${failedResults.length} failed`);

      if (successfulResults.length === 0) {
        const errorDetails = failedResults.length > 0 
          ? failedResults.map(r => `Student ${r.studentId}: ${r.error || 'Unknown error'}`).join('; ')
          : 'No results returned from generation function';
        throw new Error(`Failed to generate any certificates. ${errorDetails}`);
      }

      console.log(`✅ Generated ${successfulResults.length} certificate(s), saving to database...`);

      // Save certificates to database - only include successfully generated certificates
      const certificatesToSave = successfulResults.map((result) => {
        // Find the intern data that matches this result
        const intern = internsToGenerate.find(i => i.studentId === result.studentId && i.applicationId === result.applicationId);
        if (!intern) {
          throw new Error(`Could not find intern data for certificate result: ${result.studentId}`);
        }
        
        return {
          companyId,
          studentId: intern.studentId,
          applicationId: intern.applicationId,
          certificateUrl: result.certificateUrl!,
          certificatePublicId: result.certificatePublicId!,
          templateId: selectedTemplate.startsWith('custom_template_') 
            ? `custom_${selectedTemplate.replace('custom_template_', '')}` 
            : selectedTemplate,
          totalHours: intern.totalHours,
          startDate: intern.startDate,
          endDate: intern.endDate,
          contactPersonTitle: contactPersonTitle || undefined,
        };
      });

      const saveResponse = await apiService.saveCertificates(certificatesToSave);

      if (saveResponse.success) {
        const totalSelected = selectedInterns.length;
        const successCount = successfulResults.length;
        const failedCount = failedResults.length;
        
        let message = `Successfully generated ${successCount} certificate(s)!`;
        if (failedCount > 0) {
          message += `\n\n${failedCount} certificate(s) failed to generate.`;
        }
        
        // Call onSuccess with the message, then close the modal
        if (onSuccess) {
          onSuccess(message);
        }
        onClose();
      } else {
        throw new Error(saveResponse.message || 'Failed to save certificates');
      }
    } catch (error) {
      console.error('Error generating certificates:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate certificates');
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const template = CERTIFICATE_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeftSection}>
              <MaterialIcons name="card-membership" size={24} color="#F56E0F" />
              <Text style={styles.modalTitle}>Generate Certificates</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F56E0F" />
              <Text style={styles.loadingText}>Loading completed interns...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Two-column layout: Settings on left, Preview on right */}
              <View style={styles.contentContainer}>
                {/* Left Column: Settings */}
                <View style={styles.settingsColumn}>
                  {/* Template Selector */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Select Template</Text>
                    <View style={styles.templateSelector}>
                      {availableTemplates.map((tmpl) => {
                        // Get primary border color (use top color as default)
                        const primaryBorderColor = tmpl.config.border.topColor || tmpl.config.border.rightColor || '#000000';
                        // Get decorative border color if enabled
                        const decorativeColor = tmpl.config.decorativeBorders.enabled 
                          ? tmpl.config.decorativeBorders.leftColor || tmpl.config.decorativeBorders.topColor 
                          : null;
                        
                        return (
                          <TouchableOpacity
                            key={tmpl.id}
                            style={[
                              styles.templateOption,
                              selectedTemplate === tmpl.id && styles.templateOptionSelected,
                            ]}
                            onPress={() => setSelectedTemplate(tmpl.id)}
                          >
                            <View
                              style={[
                                styles.templatePreviewBox,
                                { borderColor: primaryBorderColor },
                              ]}
                            >
                              {/* Show custom template image if available */}
                              {tmpl.isCustom && tmpl.customImageUrl ? (
                                <Image
                                  source={{ uri: tmpl.customImageUrl }}
                                  style={styles.templatePreviewImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <>
                                  {/* Decorative border indicator */}
                                  {decorativeColor && (
                                    <View
                                      style={[
                                        styles.templateRibbon,
                                        {
                                          backgroundColor: decorativeColor,
                                          left: 0,
                                        },
                                      ]}
                                    />
                                  )}
                                  {/* Logo indicator if enabled */}
                                  {tmpl.config.logo.enabled && (
                                    <View
                                      style={[
                                        styles.templateLogoIndicator,
                                        {
                                          backgroundColor: tmpl.config.logo.backgroundColor,
                                          top: 10,
                                        },
                                      ]}
                                    />
                                  )}
                                  {/* Banner indicator if enabled */}
                                  {tmpl.config.banner.enabled && (
                                    <View
                                      style={[
                                        styles.templateBannerIndicator,
                                        {
                                          backgroundColor: tmpl.config.banner.backgroundColor,
                                          top: 40,
                                        },
                                      ]}
                                    />
                                  )}
                                </>
                              )}
                            </View>
                            <Text style={styles.templateName}>{tmpl.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Contact Person Title */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Contact Person Title (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={contactPersonTitle}
                      onChangeText={setContactPersonTitle}
                      placeholder="e.g., Store Manager/Owner"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Intern Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                      Select Completed Interns ({selectedInterns.length} selected)
                    </Text>
                    {completedInterns.length === 0 ? (
                      <View style={styles.emptyInternsContainer}>
                        <MaterialIcons name="people-outline" size={48} color="#999" />
                        <Text style={styles.emptyInternsText}>No completed interns found</Text>
                        <Text style={styles.emptyInternsSubtext}>
                          Interns must finish their internship before certificates can be generated
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.internList} nestedScrollEnabled={true}>
                        {completedInterns.map((intern) => (
                          <TouchableOpacity
                            key={intern.id}
                            style={styles.internItem}
                            onPress={() => toggleInternSelection(intern.id)}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                selectedInterns.includes(intern.id) && styles.checkboxSelected,
                              ]}
                            >
                              {selectedInterns.includes(intern.id) && (
                                <MaterialIcons name="check" size={20} color="#F56E0F" />
                              )}
                            </View>
                            <View style={styles.internInfo}>
                              <Text style={styles.internName} numberOfLines={1}>
                                {intern.first_name && intern.last_name
                                  ? `${intern.first_name} ${intern.last_name}`
                                  : intern.student_email || `Student ${intern.student_id}`}
                              </Text>
                              <Text style={styles.internDetails}>
                                {intern.totalHours} hours • {intern.position || 'Intern'}
                              </Text>
                            </View>
                            {selectedInterns[0] === intern.id && (
                              <MaterialIcons name="visibility" size={20} color="#4285f4" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                {/* Right Column: Preview */}
                <View style={styles.previewColumn}>
                  <View style={styles.previewSection}>
                    <View style={styles.previewHeader}>
                      <MaterialIcons name="preview" size={20} color="#F56E0F" />
                      <Text style={styles.previewTitle}>Certificate Preview</Text>
                    </View>

                    {generatingPreview ? (
                      <View style={styles.previewLoading}>
                        <ActivityIndicator size="large" color="#F56E0F" />
                        <Text style={styles.previewLoadingText}>Generating preview...</Text>
                      </View>
                    ) : previewImageUrl ? (
                      <ScrollView
                        style={styles.previewContainer}
                        contentContainerStyle={styles.previewContent}
                        showsVerticalScrollIndicator={true}
                        maximumZoomScale={2}
                        minimumZoomScale={0.5}
                      >
                        <Image
                          source={{ uri: previewImageUrl }}
                          style={styles.previewImage}
                          resizeMode="contain"
                        />
                        {selectedInterns.length > 0 && (
                          <View style={styles.previewNote}>
                            <MaterialIcons name="info" size={16} color="#4285f4" />
                            <Text style={styles.previewNoteText}>
                              Preview showing data for:{' '}
                              {completedInterns.find(i => i.id === selectedInterns[0])?.first_name}{' '}
                              {completedInterns.find(i => i.id === selectedInterns[0])?.last_name}
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    ) : (
                      <View style={styles.previewEmpty}>
                        <MaterialIcons name="image" size={48} color="#999" />
                        <Text style={styles.previewEmptyText}>Select a template to preview</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            {generating && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Generating {progress.current} of {progress.total}...
                </Text>
                <ActivityIndicator size="small" color="#F56E0F" style={styles.progressIndicator} />
              </View>
            )}
            <View style={styles.footerButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={generating}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (selectedInterns.length === 0 || !selectedTemplate || generating) &&
                    styles.generateButtonDisabled,
                ]}
                onPress={handleGenerateCertificates}
                disabled={selectedInterns.length === 0 || !selectedTemplate || generating}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="card-membership" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>
                      Generate ({selectedInterns.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
  },
  modalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: width < 768 ? 16 : 20,
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 1400,
    maxHeight: '95%',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width < 768 ? 20 : 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
    borderTopLeftRadius: width < 768 ? 16 : 20,
    borderTopRightRadius: width < 768 ? 16 : 20,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: width < 768 ? 20 : 22,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: width < 768 ? 16 : 20,
  },
  contentContainer: {
    flexDirection: width < 768 ? 'column' : 'row',
    gap: width < 768 ? 20 : 24,
    flex: 1,
  },
  settingsColumn: {
    flex: width < 768 ? 1 : 0.4,
    gap: 20,
  },
  previewColumn: {
    flex: width < 768 ? 1 : 0.6,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: width < 768 ? 14 : 13,
    fontWeight: '700',
    color: '#F56E0F',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  templateSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateOption: {
    width: width < 768 ? '48%' : '45%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
  },
  templateOptionSelected: {
    borderColor: '#F56E0F',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  templatePreviewBox: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  templatePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  templateRibbon: {
    position: 'absolute',
    width: 20,
    height: '100%',
  },
  templateLogoIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    left: 10,
  },
  templateBannerIndicator: {
    position: 'absolute',
    width: '60%',
    height: 8,
    borderRadius: 4,
    left: '20%',
  },
  templateName: {
    fontSize: 12,
    color: '#FBFBFB',
    textAlign: 'center',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FBFBFB',
    backgroundColor: '#2A2A2E',
    minHeight: 44,
  },
  internList: {
    maxHeight: width < 768 ? 300 : 400,
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    padding: 8,
  },
  internItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1B1B1E',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#F56E0F',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#F56E0F',
  },
  internInfo: {
    flex: 1,
  },
  internName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  internDetails: {
    fontSize: 12,
    color: '#F56E0F',
  },
  emptyInternsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
  },
  emptyInternsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '600',
  },
  emptyInternsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F56E0F',
    maxHeight: width < 768 ? 600 : 800,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  previewContainer: {
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    maxHeight: width < 768 ? 500 : 700,
  },
  previewContent: {
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  previewLoading: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
  },
  previewLoadingText: {
    marginTop: 12,
    color: '#F56E0F',
    fontSize: 14,
  },
  previewEmpty: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
  },
  previewEmptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  previewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  previewNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#4285f4',
  },
  modalFooter: {
    padding: width < 768 ? 20 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
    borderBottomLeftRadius: width < 768 ? 16 : 20,
    borderBottomRightRadius: width < 768 ? 16 : 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#FBFBFB',
  },
  progressIndicator: {
    marginLeft: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    alignItems: 'center',
    backgroundColor: '#1B1B1E',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F56E0F',
    gap: 8,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

