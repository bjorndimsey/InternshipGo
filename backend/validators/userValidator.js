const Joi = require('joi');

// Common validation rules
const commonSchema = {
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().when('googleId', {
    is: Joi.exist(),
    then: Joi.string().allow('google_oauth').optional(),
    otherwise: Joi.string().min(6).required()
  }).messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  confirmPassword: Joi.string().when('googleId', {
    is: Joi.exist(),
    then: Joi.string().allow('google_oauth').optional(),
    otherwise: Joi.string().valid(Joi.ref('password')).required()
  }).messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Confirm password is required'
  }),
  userType: Joi.string().valid('Student', 'Coordinator', 'Company').required().messages({
    'any.only': 'Invalid user type',
    'any.required': 'User type is required'
  }),
  googleId: Joi.string().optional(),
  profilePicture: Joi.string().uri().optional()
};

// Student-specific validation
const studentSchema = Joi.object({
  ...commonSchema,
  idNumber: Joi.string().pattern(/^\d{4}-\d{4}$/).required().messages({
    'string.pattern.base': 'ID number must be in format XXXX-XXXX',
    'any.required': 'ID number is required'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  age: Joi.alternatives()
    .try(
      Joi.number().integer().min(16).max(100),
      Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
        const num = parseInt(value);
        if (num < 16 || num > 100) {
          return helpers.error('age.range');
        }
        return num;
      })
    )
    .required()
    .messages({
      'age.range': 'Age must be between 16 and 100',
      'any.required': 'Age is required',
      'alternatives.match': 'Age must be a valid number between 16 and 100'
    }),
  year: Joi.string().min(1).max(20).required().messages({
    'string.min': 'Year is required',
    'any.required': 'Year is required'
  }),
  dateOfBirth: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required().messages({
    'string.pattern.base': 'Date of birth must be in format MM/DD/YYYY',
    'any.required': 'Date of birth is required'
  }),
  program: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Program must be at least 2 characters',
    'any.required': 'Program is required'
  }),
  major: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Major must be at least 2 characters',
    'any.required': 'Major is required'
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address must not exceed 500 characters',
    'any.required': 'Address is required'
  }),
  // Allow other fields but don't require them for Student
  phoneNumber: Joi.string().allow('', null).optional(),
  companyName: Joi.string().allow('', null).optional(),
  industry: Joi.string().allow('', null).optional()
});

// Coordinator-specific validation
const coordinatorSchema = Joi.object({
  ...commonSchema,
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  program: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Program must be at least 2 characters',
    'any.required': 'Program is required'
  }),
  phoneNumber: Joi.string().pattern(/^[\+]?[0-9][\d]{7,15}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number (8-16 digits)',
    'any.required': 'Phone number is required'
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address must not exceed 500 characters',
    'any.required': 'Address is required'
  }),
  // Allow other fields but don't require them for Coordinator
  idNumber: Joi.string().allow('', null).optional(),
  age: Joi.string().allow('', null).optional(),
  year: Joi.string().allow('', null).optional(),
  dateOfBirth: Joi.string().allow('', null).optional(),
  major: Joi.string().allow('', null).optional(),
  companyName: Joi.string().allow('', null).optional(),
  industry: Joi.string().allow('', null).optional()
});

// Company-specific validation
const companySchema = Joi.object({
  ...commonSchema,
  companyName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name must not exceed 100 characters',
    'any.required': 'Company name is required'
  }),
  industry: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Industry must be at least 2 characters',
    'string.max': 'Industry must not exceed 100 characters',
    'any.required': 'Industry is required'
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address must not exceed 500 characters',
    'any.required': 'Address is required'
  }),
  // Allow other fields but don't require them for Company
  firstName: Joi.string().allow('', null).optional(),
  lastName: Joi.string().allow('', null).optional(),
  idNumber: Joi.string().allow('', null).optional(),
  age: Joi.string().allow('', null).optional(),
  year: Joi.string().allow('', null).optional(),
  dateOfBirth: Joi.string().allow('', null).optional(),
  program: Joi.string().allow('', null).optional(),
  major: Joi.string().allow('', null).optional(),
  phoneNumber: Joi.string().allow('', null).optional()
});

// Main validation function
function validateUser(data) {
  const { userType } = data;
  
  // Clean up empty strings but keep them as empty strings for validation
  const cleanedData = { ...data };
  
  // Keep empty strings as empty strings, don't convert to null
  // The validation will handle empty strings properly
  
  let schema;
  switch (userType) {
    case 'Student':
      schema = studentSchema;
      break;
    case 'Coordinator':
      schema = coordinatorSchema;
      break;
    case 'Company':
      schema = companySchema;
      break;
    default:
      throw new Error('Invalid user type');
  }
  
  return schema.validate(cleanedData, { abortEarly: false, allowUnknown: true });
}

module.exports = {
  validateUser,
  studentSchema,
  coordinatorSchema,
  companySchema
};
