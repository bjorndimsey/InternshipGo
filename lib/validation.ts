export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface FieldValidation {
  [key: string]: ValidationResult;
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) {
    return { isValid: false, message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  return { isValid: true, message: '' };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password.trim()) {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword.trim()) {
    return { isValid: false, message: 'Confirm password is required' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }
  return { isValid: true, message: '' };
};

export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, message: 'Phone number is required' };
  }
  const phoneRegex = /^09\d{9}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    return { isValid: false, message: 'Phone number must be 11 digits starting with 09' };
  }
  return { isValid: true, message: '' };
};

export const validateAddress = (address: string): ValidationResult => {
  if (!address.trim()) {
    return { isValid: false, message: 'Address is required' };
  }
  if (address.length < 12) {
    return { isValid: false, message: 'Address must be at least 12 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateYear = (year: string): ValidationResult => {
  if (!year.trim()) {
    return { isValid: false, message: 'Year is required' };
  }
  const validYears = ['4th', '5th', '6th', '7th', '8th'];
  if (!validYears.includes(year.toLowerCase())) {
    return { isValid: false, message: 'Year must be 4th to 8th year' };
  }
  return { isValid: true, message: '' };
};

export const validateProgram = (program: string): ValidationResult => {
  if (!program.trim()) {
    return { isValid: false, message: 'Program is required' };
  }
  const validPrograms = ['BSIT', 'BSCE', 'BITM', 'BSMRS', 'BSM'];
  if (!validPrograms.includes(program)) {
    return { isValid: false, message: 'Please select a valid program' };
  }
  return { isValid: true, message: '' };
};

export const validateMajor = (major: string, program: string): ValidationResult => {
  if (!major.trim()) {
    return { isValid: false, message: 'Major is required' };
  }
  
  if (program === 'BSIT') {
    const validMajors = ['MOBILE Dev', 'ITBAN', 'Multimedia'];
    if (!validMajors.includes(major)) {
      return { isValid: false, message: 'Please select a valid major for BSIT' };
    }
  }
  
  return { isValid: true, message: '' };
};

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value.trim()) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  return { isValid: true, message: '' };
};

export const validateIdNumber = (idNumber: string): ValidationResult => {
  if (!idNumber.trim()) {
    return { isValid: false, message: 'ID Number is required' };
  }
  const idRegex = /^\d{4}-\d{4}$/;
  if (!idRegex.test(idNumber)) {
    return { isValid: false, message: 'ID Number must be in format XXXX-XXXX' };
  }
  return { isValid: true, message: '' };
};

export const validateAge = (age: string): ValidationResult => {
  if (!age.trim()) {
    return { isValid: false, message: 'Age is required' };
  }
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
    return { isValid: false, message: 'Age must be between 16 and 100' };
  }
  return { isValid: true, message: '' };
};

export const validateDateOfBirth = (dateOfBirth: string): ValidationResult => {
  if (!dateOfBirth.trim()) {
    return { isValid: false, message: 'Date of birth is required' };
  }
  
  // Check if date is in MM/DD/YYYY format
  const mmddyyyyRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!mmddyyyyRegex.test(dateOfBirth)) {
    return { isValid: false, message: 'Date must be in MM/DD/YYYY format' };
  }
  
  const [month, day, year] = dateOfBirth.split('/').map(num => parseInt(num, 10));
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  
  if (isNaN(date.getTime())) {
    return { isValid: false, message: 'Please enter a valid date' };
  }
  
  if (age < 16 || age > 100) {
    return { isValid: false, message: 'Age must be between 16 and 100 years old' };
  }
  
  return { isValid: true, message: '' };
};

export const validateCompanyName = (companyName: string): ValidationResult => {
  if (!companyName.trim()) {
    return { isValid: false, message: 'Company name is required' };
  }
  if (companyName.length < 2) {
    return { isValid: false, message: 'Company name must be at least 2 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateIndustry = (industry: string): ValidationResult => {
  if (!industry.trim()) {
    return { isValid: false, message: 'Industry is required' };
  }
  if (industry.length < 2) {
    return { isValid: false, message: 'Industry must be at least 2 characters' };
  }
  return { isValid: true, message: '' };
};

// Program options for dropdown
export const PROGRAM_OPTIONS = [
  { value: 'BSIT', label: 'BSIT - Bachelor of Science in Information Technology' },
  { value: 'BSCE', label: 'BSCE - Bachelor of Science in Civil Engineering' },
  { value: 'BITM', label: 'BITM - Bachelor of Science in Industrial Technology Management' },
  { value: 'BSMRS', label: 'BSMRS - Bachelor of Science in Mathematics Research and Statistics' },
  { value: 'BSM', label: 'BSM - Bachelor of Science in Mathematics' },
];

// Major options for BSIT
export const BSIT_MAJOR_OPTIONS = [
  { value: 'MOBILE Dev', label: 'Mobile Development' },
  { value: 'ITBAN', label: 'ITBAN' },
  { value: 'Multimedia', label: 'Multimedia' },
];

// Year options
export const YEAR_OPTIONS = [
  { value: '4th', label: '4th Year' },
  { value: '5th', label: '5th Year' },
  { value: '6th', label: '6th Year' },
  { value: '7th', label: '7th Year' },
  { value: '8th', label: '8th Year' },
];
