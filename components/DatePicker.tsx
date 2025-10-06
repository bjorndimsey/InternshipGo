import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  value: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export default function DatePicker({ 
  value, 
  onDateChange, 
  placeholder = "Select date",
  error = false,
  disabled = false 
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  const formatDateForBackend = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (selectedDate: Date) => {
    setSelectedDate(selectedDate);
    const formattedDate = formatDateForBackend(selectedDate); // MM/DD/YYYY format
    onDateChange(formattedDate);
    setShowPicker(false);
  };

  const handleWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value;
    if (dateValue) {
      const date = new Date(dateValue);
      setSelectedDate(date);
      const formattedDate = formatDateForBackend(date); // MM/DD/YYYY format
      onDateChange(formattedDate);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
    
    // Handle YYYY-MM-DD format (fallback)
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const openPicker = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.dateButton,
          error && styles.errorBorder,
          disabled && styles.disabledButton,
        ]}
        onPress={openPicker}
        disabled={disabled}
      >
        <Text style={[
          styles.dateText,
          !value && styles.placeholderText,
          error && styles.errorText,
          disabled && styles.disabledText,
        ]}>
          {formatDisplayDate(value)}
        </Text>
        <Ionicons 
          name="calendar-outline" 
          size={20} 
          color={error ? '#FF6B6B' : disabled ? '#999' : '#1E3A5F'} 
        />
      </TouchableOpacity>

      {showPicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowPicker(false)}
                >
                  <Ionicons name="close" size={24} color="#1E3A5F" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.datePickerContainer}>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={value && value.includes('/') ? 
                      (() => {
                        const [month, day, year] = value.split('/');
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      })() : 
                      value || ''}
                    onChange={handleWebDateChange}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    style={styles.webDateInput}
                  />
                ) : (
                  <View style={styles.mobileDateContainer}>
                    <Text style={styles.mobileDateText}>
                      {formatDisplayDate(value)}
                    </Text>
                    <Text style={styles.mobileDateHint}>
                      Please use your device's date picker
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dateButton: {
    borderWidth: 2,
    borderColor: '#1E3A5F',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorBorder: {
    borderColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999',
  },
  errorText: {
    color: '#FF6B6B',
  },
  disabledText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  closeButton: {
    padding: 5,
  },
  iosButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  iosButton: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  iosButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  webDateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10,
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  mobileDateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  mobileDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 10,
  },
  mobileDateHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
