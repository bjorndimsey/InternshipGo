import { Alert, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { fromByteArray } from 'base64-js';
import type { PDFFont, PDFPage } from 'pdf-lib';

export interface AttendanceRecordEntry {
  id: string;
  companyId: string;
  companyName: string;
  date: string;
  status: string;
  amIn: string;
  amOut: string;
  pmIn: string;
  pmOut: string;
  totalHours: number;
  notes?: string | null;
  verification_status?: 'pending' | 'accepted' | 'denied';
  verified_by?: number;
  verified_at?: string;
  verification_remarks?: string;
}

export interface CompanyDtrData {
  companyId: string;
  companyName: string;
  companyAddress: string;
  attendanceEntries: AttendanceRecordEntry[];
  signatureUrl?: string;
  finishedAt?: string | null; // Date when internship was finished
  hoursOfInternship?: string | null; // Maximum hours allowed for this internship
}

export interface EvidenceEntry {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  notes: string;
  submittedAt: string;
  imageUrl?: string | null;
}

export interface StudentProfileDetails {
  id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  age?: number;
  year?: string;
  dateOfBirth?: string;
  program?: string;
  major?: string;
  address?: string;
  permanentAddress?: string;
  presentAddress?: string;
  phoneNumber?: string;
  sex?: string;
  civilStatus?: string;
  religion?: string;
  citizenship?: string;
  academicYear?: string;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  emergencyContactAddress?: string;
  photoUrl?: string;
}

export interface PersonalInformationData {
  fullName: string;
  dateOfBirth: string;
  age: string;
  sex: string;
  civilStatus: string;
  yearLevel: string;
  academicYear: string;
  religion: string;
  permanentAddress: string;
  presentAddress: string;
  contactNumber: string;
  emailAddress: string;
  citizenship: string;
  fathersName: string;
  fathersOccupation: string;
  mothersName: string;
  mothersOccupation: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  emergencyContactAddress: string;
}

export interface HTEInformationData {
  companyName: string;
  companyAddress: string;
  natureOfHte: string;
  headOfHte: string;
  headPosition: string;
  immediateSupervisor: string;
  supervisorPosition: string;
  telephoneNo: string;
  mobileNo: string;
  emailAddress: string;
  htePhotoUrl?: string;
}

export interface JournalStudentInfo {
  id: string;
  name: string;
  email: string;
}

export interface CertificateEntry {
  id: string;
  companyId: string;
  companyName: string;
  certificateUrl: string;
  generatedAt: string;
  totalHours?: number;
  startDate?: string;
  endDate?: string;
  templateId: string;
}

export interface TrainingScheduleEntry {
  id: string;
  taskClassification: string;
  toolsDeviceSoftwareUsed: string;
  totalHours: number;
}

export interface InternFeedbackFormData {
  id: string;
  studentId: string;
  companyId: string;
  question1: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question2: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question3: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question4: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question5: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question6: 'SA' | 'A' | 'N' | 'D' | 'SD';
  question7: 'SA' | 'A' | 'N' | 'D' | 'SD';
  problemsMet: string;
  otherConcerns: string;
  formDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorEvaluationFormData {
  id: string;
  studentId: string;
  companyId: string;
  applicationId?: string;
  // Section I: COMPANY AND SUPERVISOR
  organizationCompanyName: string;
  address: string;
  city: string;
  zip: string;
  supervisorPosition: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  // Section II: ON-THE-JOB TRAINING DATA
  startDate: string;
  endDate: string;
  totalHours: number;
  descriptionOfDuties: string;
  // Section III: PERFORMANCE EVALUATION
  question1Performance: 'Outstanding' | 'Good' | 'Average' | 'Poor';
  question2SkillsCareer: boolean;
  question2Elaboration?: string;
  question3FulltimeCandidate: boolean;
  question4InterestOtherTrainees: boolean;
  question4Elaboration?: string;
  // Work Performance (6 items, 1-5 rating)
  workPerformance1?: number;
  workPerformance2?: number;
  workPerformance3?: number;
  workPerformance4?: number;
  workPerformance5?: number;
  workPerformance6?: number;
  // Communication Skills (2 items, 1-5 rating)
  communication1?: number;
  communication2?: number;
  // Professional Conduct (3 items, 1-5 rating)
  professionalConduct1?: number;
  professionalConduct2?: number;
  professionalConduct3?: number;
  // Punctuality (3 items, 1-5 rating)
  punctuality1?: number;
  punctuality2?: number;
  punctuality3?: number;
  // Flexibility (2 items, 1-5 rating)
  flexibility1?: number;
  flexibility2?: number;
  // Attitude (5 items, 1-5 rating)
  attitude1?: number;
  attitude2?: number;
  attitude3?: number;
  attitude4?: number;
  attitude5?: number;
  // Reliability (4 items, 1-5 rating)
  reliability1?: number;
  reliability2?: number;
  reliability3?: number;
  reliability4?: number;
  // Total score
  totalScore?: number;
  // Supervisor signature
  supervisorName?: string;
  supervisorSignatureUrl?: string;
  // Company signature (from users.signature)
  companySignatureUrl?: string;
  evaluationDate: string;
  createdAt: string;
  updatedAt: string;
}

const PERSONAL_INFO_FIELD_DEFINITIONS: { key: keyof PersonalInformationData; label: string }[] = [
  { key: 'fullName', label: 'Name of Intern' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'sex', label: 'Sex' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'yearLevel', label: 'Year Level' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'religion', label: 'Religion' },
  { key: 'permanentAddress', label: 'Permanent Address' },
  { key: 'presentAddress', label: 'Present Address' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'emailAddress', label: 'Email Address' },
  { key: 'citizenship', label: 'Citizenship' },
  { key: 'fathersName', label: "Father's Name" },
  { key: 'fathersOccupation', label: "Father's Occupation" },
  { key: 'mothersName', label: "Mother's Name" },
  { key: 'mothersOccupation', label: "Mother's Occupation" },
  { key: 'emergencyContactName', label: 'Emergency Contact Name' },
  { key: 'emergencyContactRelationship', label: 'Emergency Relationship' },
  { key: 'emergencyContactNumber', label: 'Emergency Contact Number' },
  // Note: emergencyContactAddress is removed - it will use permanentAddress value
];

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

    if (candidateWidth <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const deriveAcademicYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

const formatDateLongUpper = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr.toString().toUpperCase();
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase();
};

const formatPersonalValue = (value: string, options?: { uppercase?: boolean }) => {
  const trimmed = (value || '').toString().trim();
  if (!trimmed) return '';
  if (options?.uppercase === false) {
    return trimmed;
  }
  return trimmed.toUpperCase();
};

type PdfLibModule = typeof import('pdf-lib');
let cachedPdfLib: PdfLibModule | null = null;

const loadPdfLib = async (): Promise<PdfLibModule> => {
  if (cachedPdfLib) {
    return cachedPdfLib;
  }

  const module = (await import('pdf-lib/dist/pdf-lib.esm.js')) as PdfLibModule;
  cachedPdfLib = module;
  return module;
};

/**
 * Draws personal information on the PDF page.
 * 
 * COORDINATE ADJUSTMENT GUIDE:
 * - PDF coordinates: (0,0) is at bottom-left, Y increases upward
 * - To move text DOWN: decrease Y value
 * - To move text UP: increase Y value  
 * - To move text RIGHT: increase X value
 * - To move text LEFT: decrease X value
 * 
 * TIP: Use a PDF viewer that shows coordinates (like Adobe Acrobat) to find exact positions.
 * Or generate a test PDF and adjust values incrementally (try ±5-10 points at a time).
 */
const drawPersonalInformationPage = async (
  page: PDFPage,
  personalInfo: PersonalInformationData,
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  photoUrl?: string
) => {
  const resolveValue = (value: string, uppercase: boolean = true) =>
    formatPersonalValue(value, { uppercase }) || 'N/A';
  
  // Draw profile photo if available
  // Photo box is typically at top-right, approximately: x=420-540, y=650-750
  // Note: Photo embedding will be handled at the PDF document level, not here
  // This function signature accepts photoUrl but embedding happens in generateJournalPdf
  
  // Calculate Y positions - Personal info form is in the lower-middle section
  // Based on the original coordinates (320, 300, etc.), these seem to work better
  // Using fixed coordinates that match the form field positions on page 4
  
  // Using coordinates that match the actual form field positions on page 4
  // Based on the visible labels in the PDF, adjusting Y coordinates to lower positions
  // PDF coordinates: Y=0 is bottom, Y=792 is top for standard letter size
  // Form fields are in the middle-lower section, around Y=250-450 range
  const layout: Array<{
    label: string;
    key: keyof PersonalInformationData;
    labelX: number;
    valueX: number;
    y: number;
    maxWidth?: number;
    uppercase?: boolean;
  }> = [
    // Row 1: Name of Intern (positioned below the picture area, value immediately after label, shifted right)
    { label: 'Name of Intern:', key: 'fullName', labelX: 90, valueX: 150, y: 320 },
    // Row 2: Date of Birth, Age, Sex, Civil Status (all on same line, values immediately after labels)
    { label: 'Date of Birth:', key: 'dateOfBirth', labelX: 90, valueX: 150, y: 300 },
    { label: 'Age:', key: 'age', labelX: 280, valueX: 310, y: 300 },
    { label: 'Sex:', key: 'sex', labelX: 370, valueX: 400, y: 300 },
    { label: 'Civil Status:', key: 'civilStatus', labelX: 450, valueX: 540, y: 300 },
    // Row 3: Year Level, Academic Year, Religion (all on same line, values immediately after labels)
    { label: 'Year Level:', key: 'yearLevel', labelX: 90, valueX: 150, y: 280 },
    { label: 'Academic Year:', key: 'academicYear', labelX: 280, valueX: 390, y: 280 },
    { label: 'Religion:', key: 'religion', labelX: 450, valueX: 560, y: 280 },
    // Row 4: Permanent Address (value beside label, shifted right)
    { label: 'Permanent Address:', key: 'permanentAddress', labelX: 90, valueX: 200, y: 260, maxWidth: 400 },
    // Row 5: Present Address (value beside label, shifted right)
    { label: 'Present Address:', key: 'presentAddress', labelX: 90, valueX: 200, y: 240, maxWidth: 400 },
    // Row 6: Contact Number, Email Address (on same line, values immediately after labels)
    { label: 'Contact Number:', key: 'contactNumber', labelX: 90, valueX: 150, y: 220 },
    { label: 'Email Address:', key: 'emailAddress', labelX: 380, valueX: 480, y: 220, uppercase: false, maxWidth: 120 },
    // Row 7: Citizenship (value immediately after label, shifted right)
    { label: 'Citizenship:', key: 'citizenship', labelX: 90, valueX: 150, y: 200 },
    // Row 8: Father's Name, Occupation (on same line, values immediately after labels)
    { label: 'Father\'s Name:', key: 'fathersName', labelX: 90, valueX: 150, y: 180 },
    { label: 'Occupation:', key: 'fathersOccupation', labelX: 380, valueX: 450, y: 180, maxWidth: 120 },
    // Row 9: Mother's Name, Occupation (on same line, values immediately after labels)
    { label: 'Mother\'s Name:', key: 'mothersName', labelX: 90, valueX: 150, y: 160 },
    { label: 'Occupation:', key: 'mothersOccupation', labelX: 380, valueX: 450, y: 160, maxWidth: 120 },
    // Row 10: Emergency Contact Name (value beside label, may wrap if needed, shifted right)
    { label: 'Person to be contacted in case of emergency:', key: 'emergencyContactName', labelX: 90, valueX: 400, y: 140, maxWidth: 200 },
    // Row 11: Relationship, Contact Number (emergency, on same line, values immediately after labels)
    { label: 'Relationship:', key: 'emergencyContactRelationship', labelX: 90, valueX: 150, y: 120 },
    { label: 'Contact Number:', key: 'emergencyContactNumber', labelX: 380, valueX: 480, y: 120 },
    // Row 12: Emergency Contact Address (value beside label, may wrap if needed, shifted right)
    { label: 'Address:', key: 'emergencyContactAddress', labelX: 90, valueX: 120, y: 100, maxWidth: 480 },
  ];

  let fieldsDrawn = 0;
  layout.forEach(({ label, key, labelX, valueX, y, maxWidth, uppercase = true }) => {
    // Draw the label
    try {
      page.drawText(label, {
        x: labelX,
        y,
        size: 11,
        font: boldFont,
        color: textColor,
      });
    } catch (error) {
      console.error(`❌ Error drawing label "${label}":`, error);
    }

    // Get the raw value from personalInfo
    const rawValue = personalInfo[key];
    
    // Debug: Log address fields specifically
    if (key === 'permanentAddress' || key === 'emergencyContactAddress') {
      console.log(`📋 Drawing ${key}:`, {
        key,
        rawValue,
        personalInfoPermanentAddress: personalInfo.permanentAddress,
        personalInfoEmergencyAddress: personalInfo.emergencyContactAddress,
      });
    }
    
    // Only draw value if it exists and is not empty
    if (rawValue && rawValue.toString().trim().length > 0) {
      try {
        const value = resolveValue(rawValue, uppercase);
        
        // Calculate label width to position value right after it
        const labelWidth = boldFont.widthOfTextAtSize(label, 11);
        
        // Determine value position:
        // - If valueX equals labelX, value goes on line below (for address fields)
        // - Otherwise, value goes on same line as label, right after the label
        // Note: We removed the label.length > 40 check so long labels can have values beside them
        const isValueBelow = valueX === labelX;
        // For same-line values, position right after the label with small gap
        // For below values (addresses), place them 15 points below the label
        const valueY = isValueBelow ? y - 15 : y;
        // If value should be on same line, position it right after label (with 5pt gap)
        // Otherwise use the specified valueX
        const actualValueX = isValueBelow ? labelX : (labelX + labelWidth + 5);
        
        // Debug: Log drawing details for address fields
        if (key === 'permanentAddress' || key === 'emergencyContactAddress') {
          console.log(`📋 Drawing details for ${key}:`, {
            label,
            value: value.substring(0, 50), // First 50 chars
            actualValueX,
            valueY,
            isValueBelow,
            labelX,
            valueX,
            labelWidth,
            rawValue,
            'personalInfo[key]': personalInfo[key],
          });
        }
        
        if (maxWidth) {
          const lines = wrapText(value, regularFont, 11, maxWidth);
          console.log(`📋 Wrapping ${key} into ${lines.length} lines`);
          lines.forEach((line, index) => {
            const lineY = valueY - index * 12;
            const valueColor = rgbFn(0, 0, 0); // Pure black
            const textWidth = regularFont.widthOfTextAtSize(line, 11);
            
            // Debug for address fields
            if (key === 'permanentAddress' || key === 'emergencyContactAddress') {
              console.log(`📋 Drawing line ${index} of ${key} at (${actualValueX}, ${lineY}): "${line}"`);
            }
            
            // Draw the text
            page.drawText(line, {
              x: actualValueX,
              y: lineY,
              size: 11,
              font: regularFont,
              color: valueColor,
            });
            
            // Draw underline for the text
            page.drawLine({
              start: { x: actualValueX, y: lineY - 2 },
              end: { x: actualValueX + textWidth, y: lineY - 2 },
              thickness: 0.5,
              color: valueColor,
            });
          });
        } else {
          const valueColor = rgbFn(0, 0, 0); // Pure black
          const textWidth = regularFont.widthOfTextAtSize(value, 11);
          
          // Debug for address fields
          if (key === 'permanentAddress' || key === 'emergencyContactAddress') {
            console.log(`📋 Drawing single line of ${key} at (${actualValueX}, ${valueY}): "${value}"`);
          }
          
          // Draw the text
          page.drawText(value, {
            x: actualValueX,
            y: valueY,
            size: 11,
            font: regularFont,
            color: valueColor,
          });
          
          // Draw underline for the text
          page.drawLine({
            start: { x: actualValueX, y: valueY - 2 },
            end: { x: actualValueX + textWidth, y: valueY - 2 },
            thickness: 0.5,
            color: valueColor,
          });
        }
        fieldsDrawn++;
        
        // Debug: Confirm field was drawn
        if (key === 'permanentAddress' || key === 'emergencyContactAddress') {
          console.log(`✅ Successfully drew ${key}, fieldsDrawn count: ${fieldsDrawn}`);
        }
      } catch (error) {
        console.error(`❌ Error drawing value for "${label}" (${key}):`, error);
      }
    }
    // If value is empty, don't draw anything (leave blank on PDF)
  });
};

/**
 * Draws Daily Time Record form on page 20
 * Fills in student name, HTE/company name, and address
 * Also draws the attendance table with attendance records
 */
const drawDailyTimeRecordForm = async (
  page: PDFPage,
  studentName: string,
  companyName: string,
  companyAddress: string,
  attendanceEntries: AttendanceRecordEntry[],
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  pdfDoc: any,
  companySignatureUrl?: string,
  showHeaderFields: boolean = true,
  showBottomSection: boolean = true,
  isSubsequentPage: boolean = false
) => {
  const resolveValue = (value: string, uppercase: boolean = true) =>
    formatPersonalValue(value, { uppercase }) || '';
  
  // Only draw header fields on the first page
  if (showHeaderFields) {
     // Layout for Daily Time Record form fields
     // Based on the template, these fields are positioned below the header
     // Only student name has data, rest are blank (labels only)
     const layout: Array<{
       label: string;
       value: string;
       labelX: number;
       valueX: number;
       y: number;
       maxWidth?: number;
       uppercase?: boolean;
     }> = [
       // Name of Student - filled with actual data
       { label: 'Name of Student: ', value: studentName, labelX: 100, valueX: 180, y: isSubsequentPage ? 500 : 470, maxWidth: 350, uppercase: true },
       // HTE (Company Name) - filled with actual data
       { label: 'HTE: ', value: companyName || '', labelX: 100, valueX: 100, y: isSubsequentPage ? 480 : 450, maxWidth: 430, uppercase: true },
       // Address - filled with actual data
       { label: 'Address: ', value: companyAddress || '', labelX: 100, valueX: 120, y: isSubsequentPage ? 460 : 430, maxWidth: 410, uppercase: true },
       // Group - label only, no data
       { label: 'Group: ', value: '', labelX: 100, valueX: 100, y: isSubsequentPage ? 440 : 410 },
       // Week - label only, no data
       { label: 'Week: ', value: '', labelX: 380, valueX: 400, y: isSubsequentPage ? 440 : 410 },
     ];

    layout.forEach(({ label, value, labelX, valueX, y, maxWidth, uppercase = true }) => {
    // Draw the label
    try {
      page.drawText(label, {
        x: labelX,
        y,
        size: 11,
        font: boldFont,
        color: textColor,
      });
    } catch (error) {
      console.error(`❌ Error drawing DTR label "${label}":`, error);
    }

    // Only draw value if it exists and is not empty
    if (value && value.toString().trim().length > 0) {
      try {
        const formattedValue = resolveValue(value, uppercase);
        
        // Calculate label width to position value right after it
        const labelWidth = boldFont.widthOfTextAtSize(label, 11);
        
        // Position value immediately after label (labelX + labelWidth) with no gap
        const actualValueX = labelX + labelWidth - 2;
        
        if (maxWidth) {
          const lines = wrapText(formattedValue, regularFont, 11, maxWidth);
          lines.forEach((line, index) => {
            const lineY = y - index * 12;
            const valueColor = rgbFn(0, 0, 0); // Pure black
            const textWidth = regularFont.widthOfTextAtSize(line, 11);
            
            // Draw the text
            page.drawText(line, {
              x: actualValueX,
              y: lineY,
              size: 11,
              font: regularFont,
              color: valueColor,
            });
            
            // Draw underline for the text
            page.drawLine({
              start: { x: actualValueX, y: lineY - 2 },
              end: { x: actualValueX + textWidth, y: lineY - 2 },
              thickness: 0.5,
              color: valueColor,
            });
          });
        } else {
          const valueColor = rgbFn(0, 0, 0); // Pure black
          const textWidth = regularFont.widthOfTextAtSize(formattedValue, 11);
          
          // Draw the text
          page.drawText(formattedValue, {
            x: actualValueX,
            y,
            size: 11,
            font: regularFont,
            color: valueColor,
          });
          
          // Draw underline for the text
          page.drawLine({
            start: { x: actualValueX, y: y - 2 },
            end: { x: actualValueX + textWidth, y: y - 2 },
            thickness: 0.5,
            color: valueColor,
          });
        }
      } catch (error) {
        console.error(`❌ Error drawing DTR value for "${label}":`, error);
      }
    }
    });
  }
  
  // Draw instruction text below the fields (adjusted for subsequent pages)
  try {
    const instructionY = isSubsequentPage ? 420 : 390; // Position below Group/Week fields (higher on subsequent pages)
    page.drawText('Instruction: Fill out this form as a basis of your attendance.', {
      x: 100,
      y: instructionY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
  } catch (error) {
    console.error('❌ Error drawing instruction text:', error);
  }
  
  // Draw attendance table below the instruction (adjusted for subsequent pages)
  const tableStartY = isSubsequentPage ? 400 : 370; // Position below instruction (higher on subsequent pages)
  await drawDailyTimeRecordTable(page, attendanceEntries, tableStartY, regularFont, boldFont, textColor, rgbFn, pdfDoc, companySignatureUrl, showBottomSection);
  
  console.log(`📋 Drew Daily Time Record form fields and table`);
};

/**
 * Draws the Daily Time Record table with attendance entries
 */
const drawDailyTimeRecordTable = async (
  page: PDFPage,
  attendanceEntries: AttendanceRecordEntry[],
  startY: number,
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  pdfDoc: any,
  companySignatureUrl?: string,
  showBottomSection: boolean = true
) => {
  const tableX = 100; // Align with labels above (same as labelX)
  const tableWidth = 462; // Adjusted to align with form fields above
  const rowHeight = 20;
  const headerHeight = 25;
  
  // Column widths
  const dateWidth = 70;
  const morningInWidth = 50;
  const morningOutWidth = 50;
  const afternoonInWidth = 52;
  const afternoonOutWidth = 50;
  const remarksWidth = 90;
  const signatureWidth = 100;
  
  // Draw table header
  const headerY = startY;
  
  // Header background
  page.drawRectangle({
    x: tableX,
    y: headerY - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: rgbFn(0.97, 0.95, 0.93),
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  
  let currentX = tableX;
  
  // Date column header - moved down to avoid line overlap
  page.drawText('Date', {
    x: currentX + 5,
    y: headerY - 18,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  currentX += dateWidth;
  
  // Morning header (merged cell) - moved down
  page.drawText('Morning', {
    x: currentX + 5,
    y: headerY - 8,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  
  // Morning IN sub-header - moved down
  page.drawText('IN', {
    x: currentX + 5,
    y: headerY - 18,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  currentX += morningInWidth;
  
  // Morning OUT sub-header - moved down
  page.drawText('OUT', {
    x: currentX + 5,
    y: headerY - 18,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  currentX += morningOutWidth;
  
  // Afternoon header (merged cell) - moved down
  page.drawText('Afternoon', {
    x: currentX + 5,
    y: headerY - 8,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  
  // Afternoon IN sub-header - moved down
  page.drawText('IN', {
    x: currentX + 5,
    y: headerY - 18,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  currentX += afternoonInWidth;
  
  // Afternoon OUT sub-header - moved down
  page.drawText('OUT', {
    x: currentX + 5,
    y: headerY - 18,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  currentX += afternoonOutWidth;
  
  // Remarks column header - moved down
  page.drawText('Remarks', {
    x: currentX + 5,
    y: headerY - 18,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  currentX += remarksWidth;
  
  // Signature column header - split into two lines like Morning/Afternoon, moved down
  const signatureHeaderX = currentX;
  page.drawText('Signature of HTE', {
    x: signatureHeaderX + 5,
    y: headerY - 8,
    size: 8,
    font: boldFont,
    color: textColor,
  });
  
  // Supervisor sub-header (below "Signature of HTE") - moved down
  page.drawText('Supervisor', {
    x: signatureHeaderX + 5,
    y: headerY - 18,
    size: 8,
    font: boldFont,
    color: textColor,
  });
  
  // Draw vertical lines for columns
  let lineX = tableX;
  page.drawLine({
    start: { x: lineX, y: headerY },
    end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) },
    thickness: 1,
    color: rgbFn(0, 0, 0),
  });
  
  lineX += dateWidth;
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += morningInWidth;
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += morningOutWidth;
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += afternoonInWidth;
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += afternoonOutWidth;
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += remarksWidth;
  // Draw left border of signature column (before the signature text)
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += signatureWidth;
  // Draw right border of signature column (after the signature text)
  page.drawLine({ start: { x: lineX, y: headerY }, end: { x: lineX, y: headerY - headerHeight - (rowHeight * 10) }, thickness: 1, color: rgbFn(0, 0, 0) });
  
  // Draw horizontal lines for rows
  let currentRowY = headerY - headerHeight;
  for (let i = 0; i <= 10; i++) {
    page.drawLine({
      start: { x: tableX, y: currentRowY },
      end: { x: tableX + tableWidth, y: currentRowY },
      thickness: 1,
      color: rgbFn(0, 0, 0),
    });
    currentRowY -= rowHeight;
  }
  
  // Fill table with attendance data (up to 10 rows)
  const entriesToShow = attendanceEntries.slice(0, 10);
  for (let index = 0; index < entriesToShow.length; index++) {
    const entry = entriesToShow[index];
    const rowY = headerY - headerHeight - (rowHeight * (index + 1)) + rowHeight / 2;
    let cellX = tableX;
    
    // Date
    const dateStr = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    page.drawText(dateStr, {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += dateWidth;
    
    // Morning IN
    page.drawText(entry.amIn || '--:--', {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += morningInWidth;
    
    // Morning OUT
    page.drawText(entry.amOut || '--:--', {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += morningOutWidth;
    
    // Afternoon IN
    page.drawText(entry.pmIn || '--:--', {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += afternoonInWidth;
    
    // Afternoon OUT
    page.drawText(entry.pmOut || '--:--', {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += afternoonOutWidth;
    
    // Remarks - show verification remarks if available, otherwise show notes
    const verificationRemarks = entry.verification_remarks || '';
    const notes = entry.notes || '';
    // Prioritize verification remarks (company's remarks), fallback to student's notes
    const remarks = verificationRemarks || notes;
    const remarksText = remarks.length > 15 ? remarks.substring(0, 15) + '...' : remarks;
    page.drawText(remarksText, {
      x: cellX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
    cellX += remarksWidth;
    
    // Signature column - draw signature image if available
    if (companySignatureUrl) {
      try {
        console.log('📝 Fetching signature image:', companySignatureUrl);
        const signatureResponse = await fetch(companySignatureUrl, {
          mode: 'cors',
          cache: 'no-cache',
        });

        if (signatureResponse.ok) {
          const signatureBytes = await signatureResponse.arrayBuffer();
          const contentType = signatureResponse.headers.get('content-type') || '';

          let signatureImage;
          try {
            if (contentType.includes('png') || companySignatureUrl.toLowerCase().endsWith('.png')) {
              signatureImage = await pdfDoc.embedPng(signatureBytes);
            } else {
              signatureImage = await pdfDoc.embedJpg(signatureBytes);
            }
          } catch (embedError) {
            // Try the other format if one fails
            if (contentType.includes('png') || companySignatureUrl.toLowerCase().endsWith('.png')) {
              signatureImage = await pdfDoc.embedJpg(signatureBytes);
            } else {
              signatureImage = await pdfDoc.embedPng(signatureBytes);
            }
          }

          // Signature image dimensions to fit in the cell
          const signatureMaxWidth = signatureWidth - 10; // Leave padding
          const signatureMaxHeight = rowHeight - 4; // Leave padding
          
          const signatureDims = signatureImage.scale(1);
          const signatureAspectRatio = signatureDims.width / signatureDims.height;
          
          let sigWidth = signatureMaxWidth;
          let sigHeight = signatureMaxWidth / signatureAspectRatio;
          
          // If height exceeds max, scale down
          if (sigHeight > signatureMaxHeight) {
            sigHeight = signatureMaxHeight;
            sigWidth = sigHeight * signatureAspectRatio;
          }
          
          // Center the signature horizontally within the cell
          const sigX = cellX + (signatureWidth - sigWidth) / 2;
          // Position signature slightly lower in the cell (move down by 5 points)
          const sigY = rowY - sigHeight / 2 + rowHeight / 2 - 10;
          
          // Draw the signature image
          page.drawImage(signatureImage, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
          });
          
          console.log('✅ Signature image embedded successfully');
        } else {
          console.error('❌ Failed to fetch signature image:', signatureResponse.status);
        }
      } catch (error) {
        console.error('❌ Error embedding signature image:', error);
        // Continue without signature if embedding fails
      }
    }
    // If no signature URL, leave the cell blank
  }
  
  // Empty rows (beyond available entries) will have:
  // - Table structure (borders/lines) - already drawn above
  // - Empty signature column cells - left blank (no signatures)
  // - Empty cells for Date, Morning IN/OUT, Afternoon IN/OUT, Remarks - left blank for future data entry
  
  // Draw bottom section: "Certified true and Correct:" and Site Supervisor signature line (on all pages)
  if (showBottomSection) {
    // Calculate the actual number of data rows drawn (up to 10 per page)
    // Note: attendanceEntries here are already filtered to only accepted entries
    const dataRowsDrawn = Math.min(attendanceEntries.length, 10);
    // The table always has 10 row lines drawn (for the grid), but we only fill dataRowsDrawn rows
    // Position below the last row line: headerY - headerHeight - (10 row lines) - spacing
    // Always position after 10 rows to match the table structure
    const bottomSectionY = headerY - headerHeight - (rowHeight * 10) - 30;
    
    // Certified text
    page.drawText('Certified true and Correct:', {
      x: tableX,
      y: bottomSectionY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
    
    // Site Supervisor signature line (right side)
    const signatureLineX = tableX + 300;
    const signatureLineWidth = 150;
    page.drawLine({
      start: { x: signatureLineX, y: bottomSectionY },
      end: { x: signatureLineX + signatureLineWidth, y: bottomSectionY },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
    
    page.drawText('Site Supervisor', {
      x: signatureLineX,
      y: bottomSectionY - 12,
      size: 9,
      font: regularFont,
      color: textColor,
    });
  }
};

/**
 * Draws the Practicum Report Summary on page 31
 * Section A: Total Internship Hours Summary (3 companies max)
 * Section B: Training Schedule and Breakdown Specifics (11 tasks max)
 */
const drawPracticumReportSummary = async (
  pdfDoc: any,
  companyDtrData: CompanyDtrData[],
  hteInfoArray: HTEInformationData[],
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  evidenceEntries: EvidenceEntry[],
  trainingSchedules?: TrainingScheduleEntry[],
  studentSignatureUrl?: string
) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const horizontalMargin = 40;
  
  // Ensure page 31 exists (index 30)
  let summaryPage;
  if (pdfDoc.getPageCount() > 30) {
    summaryPage = pdfDoc.getPage(30);
  } else {
    const [templatePage] = pdfDoc.getPages();
    summaryPage = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }
  
  let cursorY = pageHeight - 273; // Start lower on the page (moved down more)
  
  // Section A: Total Internship Hours Summary (header removed, starting directly with section)
  summaryPage.drawText('A. Total Internship Hours Summary', {
    x: horizontalMargin,
    y: cursorY,
    size: 12,
    font: boldFont,
    color: textColor,
  });
  cursorY -= 25;
  
  // Section A Table (reduced size)
  const tableAStartY = cursorY;
  const tableAX = horizontalMargin + 20; // Indent from margin
  const tableAWidth = pageWidth - (horizontalMargin * 2) - 40; // Reduced width
  const rowHeightA = 18; // Reduced height
  const headerHeightA = 22; // Reduced height
  
  // Column widths for Section A (reduced)
  const companyColWidth = 180;
  const supervisorColWidth = 180;
  const hoursColWidth = tableAWidth - companyColWidth - supervisorColWidth;
  
  // Draw table header
  summaryPage.drawRectangle({
    x: tableAX,
    y: tableAStartY - headerHeightA,
    width: tableAWidth,
    height: headerHeightA,
    color: rgbFn(0.97, 0.95, 0.93),
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  
  // Header text
  summaryPage.drawText('Office/Company', {
    x: tableAX + 5,
    y: tableAStartY - 18,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  summaryPage.drawText('Immediate Supervisor', {
    x: tableAX + companyColWidth + 5,
    y: tableAStartY - 18,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  summaryPage.drawText('Total Actual Hours of Internship', {
    x: tableAX + companyColWidth + supervisorColWidth + 5,
    y: tableAStartY - 18,
    size: 8,
    font: boldFont,
    color: textColor,
  });
  
  // Draw vertical lines
  let lineX = tableAX;
  summaryPage.drawLine({
    start: { x: lineX, y: tableAStartY },
    end: { x: lineX, y: tableAStartY - headerHeightA - (rowHeightA * 4) },
    thickness: 1,
    color: rgbFn(0, 0, 0),
  });
  lineX += companyColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableAStartY }, end: { x: lineX, y: tableAStartY - headerHeightA - (rowHeightA * 4) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += supervisorColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableAStartY }, end: { x: lineX, y: tableAStartY - headerHeightA - (rowHeightA * 4) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += hoursColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableAStartY }, end: { x: lineX, y: tableAStartY - headerHeightA - (rowHeightA * 4) }, thickness: 1, color: rgbFn(0, 0, 0) });
  
  // Draw horizontal lines
  let currentRowY = tableAStartY - headerHeightA;
  for (let i = 0; i <= 4; i++) {
    summaryPage.drawLine({
      start: { x: tableAX, y: currentRowY },
      end: { x: tableAX + tableAWidth, y: currentRowY },
      thickness: 1,
      color: rgbFn(0, 0, 0),
    });
    currentRowY -= rowHeightA;
  }
  
  // Fill Section A table with data (up to 3 companies)
  let totalHoursAll = 0;
  const companiesToShow = companyDtrData.slice(0, 3);
  
  for (let i = 0; i < companiesToShow.length; i++) {
    const companyData = companiesToShow[i];
    const rowY = tableAStartY - headerHeightA - (rowHeightA * (i + 1)) + rowHeightA / 2;
    
    // Check if internship is finished for this company
    const isFinished = companyData.finishedAt !== null && companyData.finishedAt !== undefined;
    
    // Calculate total hours for this company (only if internship is finished)
    // Only count hours from accepted attendance records
    const acceptedEntries = companyData.attendanceEntries.filter(entry => 
      entry.verification_status === 'accepted'
    );
    const calculatedHours = isFinished 
      ? acceptedEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0)
      : 0;
    
    // Cap the total hours at hoursOfInternship if it exceeds the limit
    // If hoursOfInternship is not set, use the calculated value
    const maxHours = companyData.hoursOfInternship 
      ? parseFloat(companyData.hoursOfInternship) || calculatedHours
      : calculatedHours;
    const companyTotalHours = Math.min(calculatedHours, maxHours);
    
    if (isFinished) {
      totalHoursAll += companyTotalHours;
    }
    
    // Get supervisor from HTE info
    const hteInfo = hteInfoArray.find(h => h.companyName === companyData.companyName);
    const supervisor = hteInfo?.immediateSupervisor || '';
    
    // Company name
    summaryPage.drawText(companyData.companyName || '', {
      x: tableAX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: companyColWidth - 10,
    });
    
    // Supervisor
    summaryPage.drawText(supervisor, {
      x: tableAX + companyColWidth + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: supervisorColWidth - 10,
    });
    
    // Total hours (only show if internship is finished)
    if (isFinished) {
      summaryPage.drawText(companyTotalHours.toFixed(2), {
        x: tableAX + companyColWidth + supervisorColWidth + 5,
        y: rowY,
        size: 9,
        font: regularFont,
        color: textColor,
      });
    }
    // If not finished, leave the cell blank
  }
  
  // Total row (only show total if at least one company is finished)
  const totalRowY = tableAStartY - headerHeightA - (rowHeightA * 4) + rowHeightA / 2;
  summaryPage.drawText('Total', {
    x: tableAX + companyColWidth + 5,
    y: totalRowY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  // Only show total hours if there are finished companies
  if (totalHoursAll > 0) {
    summaryPage.drawText(totalHoursAll.toFixed(2), {
      x: tableAX + companyColWidth + supervisorColWidth + 5,
      y: totalRowY,
      size: 10,
      font: boldFont,
      color: textColor,
    });
  }
  // If no finished companies, leave the total cell blank
  
  cursorY = tableAStartY - headerHeightA - (rowHeightA * 4) - 30;
  
  // Section B: Training Schedule and Breakdown Specifics
  summaryPage.drawText('B. Training Schedule and Breakdown Specifics', {
    x: horizontalMargin,
    y: cursorY,
    size: 12,
    font: boldFont,
    color: textColor,
  });
  cursorY -= 20;
  
  // Sub-section a. Training Schedule
  summaryPage.drawText('a. Training Schedule', {
    x: horizontalMargin + 20,
    y: cursorY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  cursorY -= 25;
  
  // Section B Table (reduced size)
  const tableBStartY = cursorY;
  const tableBX = horizontalMargin + 20; // Indent from margin
  const tableBWidth = pageWidth - (horizontalMargin * 2) - 40; // Reduced width
  const rowHeightB = 16; // Reduced height
  const headerHeightB = 20; // Reduced height
  
  // Column widths for Section B (reduced)
  const taskColWidth = 180;
  const toolsColWidth = 180;
  const hoursBColWidth = tableBWidth - taskColWidth - toolsColWidth;
  
  // Draw table header
  summaryPage.drawRectangle({
    x: tableBX,
    y: tableBStartY - headerHeightB,
    width: tableBWidth,
    height: headerHeightB,
    color: rgbFn(0.97, 0.95, 0.93),
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  
  // Header text
  summaryPage.drawText('Task/Job Classification', {
    x: tableBX + 5,
    y: tableBStartY - 16,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  summaryPage.drawText('Tools/Device/Software Used', {
    x: tableBX + taskColWidth + 5,
    y: tableBStartY - 16,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  summaryPage.drawText('Total Hours Assigned', {
    x: tableBX + taskColWidth + toolsColWidth + 5,
    y: tableBStartY - 16,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  
  // Draw vertical lines
  lineX = tableBX;
  summaryPage.drawLine({
    start: { x: lineX, y: tableBStartY },
    end: { x: lineX, y: tableBStartY - headerHeightB - (rowHeightB * 12) },
    thickness: 1,
    color: rgbFn(0, 0, 0),
  });
  lineX += taskColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableBStartY }, end: { x: lineX, y: tableBStartY - headerHeightB - (rowHeightB * 12) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += toolsColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableBStartY }, end: { x: lineX, y: tableBStartY - headerHeightB - (rowHeightB * 12) }, thickness: 1, color: rgbFn(0, 0, 0) });
  lineX += hoursBColWidth;
  summaryPage.drawLine({ start: { x: lineX, y: tableBStartY }, end: { x: lineX, y: tableBStartY - headerHeightB - (rowHeightB * 12) }, thickness: 1, color: rgbFn(0, 0, 0) });
  
  // Draw horizontal lines
  currentRowY = tableBStartY - headerHeightB;
  for (let i = 0; i <= 12; i++) {
    summaryPage.drawLine({
      start: { x: tableBX, y: currentRowY },
      end: { x: tableBX + tableBWidth, y: currentRowY },
      thickness: 1,
      color: rgbFn(0, 0, 0),
    });
    currentRowY -= rowHeightB;
  }
  
  // Fill Section B table with training schedule data (up to 11 entries)
  // IMPORTANT: Always fill the table with entries, regardless of whether hours match Section A
  // Only the signature and date are conditional (shown only if hours match)
  let totalHoursB = 0;
  console.log('📋 Training schedules received in drawPracticumReportSummary:', {
    trainingSchedules,
    length: trainingSchedules?.length || 0,
    hasData: !!trainingSchedules && trainingSchedules.length > 0
  });
  const schedulesToShow = trainingSchedules ? trainingSchedules.slice(0, 11) : [];
  console.log('📋 Schedules to show in Section B:', schedulesToShow.length, schedulesToShow);
  
  for (let i = 0; i < schedulesToShow.length; i++) {
    const schedule = schedulesToShow[i];
    const rowY = tableBStartY - headerHeightB - (rowHeightB * (i + 1)) + rowHeightB / 2;
    
    console.log(`📋 Drawing training schedule entry ${i + 1}:`, {
      taskClassification: schedule.taskClassification,
      toolsDeviceSoftwareUsed: schedule.toolsDeviceSoftwareUsed,
      totalHours: schedule.totalHours,
      rowY: rowY
    });
    
    totalHoursB += schedule.totalHours;
    
    // Task/Job Classification
    summaryPage.drawText(schedule.taskClassification || '', {
      x: tableBX + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: taskColWidth - 10,
    });
    
    // Tools/Device/Software Used
    summaryPage.drawText(schedule.toolsDeviceSoftwareUsed || '', {
      x: tableBX + taskColWidth + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: toolsColWidth - 10,
    });
    
    // Total Hours
    summaryPage.drawText(schedule.totalHours.toFixed(2), {
      x: tableBX + taskColWidth + toolsColWidth + 5,
      y: rowY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
  }
  
  console.log(`✅ Finished drawing ${schedulesToShow.length} training schedule entries. Total hours: ${totalHoursB.toFixed(2)}`);
  
  // Total row for Section B
  const totalBRowY = tableBStartY - headerHeightB - (rowHeightB * 12) + rowHeightB / 2;
  summaryPage.drawText('Total Hours', {
    x: tableBX + taskColWidth + 5,
    y: totalBRowY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  // Show total hours if there are training schedules
  if (totalHoursB > 0) {
    summaryPage.drawText(totalHoursB.toFixed(2), {
      x: tableBX + taskColWidth + toolsColWidth + 5,
      y: totalBRowY,
      size: 10,
      font: boldFont,
      color: textColor,
    });
  }
  
  cursorY = tableBStartY - headerHeightB - (rowHeightB * 12) - 30;
  
  // Signature section
  // Only show signature and date if total hours from Section A and B match
  const hoursMatch = Math.abs(totalHoursAll - totalHoursB) < 0.01; // Allow small floating point difference
  
  // Signature line position (defined before drawing so signature image can use it)
  const signatureLineX = horizontalMargin + 150;
  const signatureLineWidth = 200;
  
  // Draw signature image FIRST (behind the line and text) if hours match and signature URL is provided
  if (hoursMatch && studentSignatureUrl) {
    try {
      console.log('📷 Embedding student signature for page 31:', studentSignatureUrl);
      const signatureResponse = await fetch(studentSignatureUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (signatureResponse.ok) {
        const signatureBytes = await signatureResponse.arrayBuffer();
        const contentType = signatureResponse.headers.get('content-type') || '';
        
        let signatureImage;
        try {
          if (contentType.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          }
        } catch (embedError) {
          if (contentType.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          }
        }
        
        // Scale signature to fit within the signature line area
        const signatureMaxWidth = signatureLineWidth - 10;
        const signatureMaxHeight = 40;
        const sigDims = signatureImage.scale(1);
        const sigAspectRatio = sigDims.width / sigDims.height;
        
        let sigWidth = signatureMaxWidth;
        let sigHeight = signatureMaxWidth / sigAspectRatio;
        
        if (sigHeight > signatureMaxHeight) {
          sigHeight = signatureMaxHeight;
          sigWidth = sigHeight * sigAspectRatio;
        }
        
        // Center signature on the signature line - position it higher above the line
        const sigX = signatureLineX + (signatureLineWidth - sigWidth) / 2;
        const sigY = cursorY - sigHeight + 30; // Moved 20 points higher (was -5, now +15)
        
        summaryPage.drawImage(signatureImage, {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
        
        console.log('✅ Student signature embedded successfully on page 31');
      }
    } catch (error) {
      console.error('❌ Error embedding student signature:', error);
    }
  }
  
  // Draw signature label text (on top of signature image)
  summaryPage.drawText("Trainee's/Intern's Signature:", {
    x: horizontalMargin,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  
  // Draw signature line (on top of signature image)
  summaryPage.drawLine({
    start: { x: signatureLineX, y: cursorY - 2 },
    end: { x: signatureLineX + signatureLineWidth, y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Date
  summaryPage.drawText('Date:', {
    x: signatureLineX + signatureLineWidth + 30,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  
  // Date line
  const dateLineX = signatureLineX + signatureLineWidth + 70;
  const dateLineWidth = 100;
  summaryPage.drawLine({
    start: { x: dateLineX, y: cursorY - 2 },
    end: { x: dateLineX + dateLineWidth, y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw current date if hours match - position it higher above the line
  if (hoursMatch) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const dateTextWidth = regularFont.widthOfTextAtSize(currentDate, 10);
    summaryPage.drawText(currentDate, {
      x: dateLineX + (dateLineWidth - dateTextWidth) / 2,
      y: cursorY + 5, // Moved 20 points higher (was -15, now +5) - positioned above the date line
      size: 10,
      font: regularFont,
      color: textColor,
    });
  }
  
  
  // Page number
  summaryPage.drawText('31', {
    x: pageWidth - horizontalMargin - 20,
    y: 30,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  
  console.log('✅ Drew Practicum Report Summary on page 31');
};

/**
 * Draws the Intern Feedback Form on pages 34-35
 * Includes header fields, questionnaire table, free-text sections, signature, and legend
 */
const drawFeedbackForm = async (
  pdfDoc: any,
  studentName: string,
  hteInfoArray: HTEInformationData[],
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  pageWidth: number,
  pageHeight: number,
  horizontalMargin: number,
  studentSignatureUrl?: string,
  feedbackFormDataArray?: InternFeedbackFormData[],
  hteInfoWithCompanyId?: Array<{ hteInfo: HTEInformationData; companyId: string; companyName: string }>
) => {
  // Only draw feedback form if feedback data exists
  if (!feedbackFormDataArray || feedbackFormDataArray.length === 0) {
    console.log('ℹ️ No feedback form data, skipping feedback form drawing');
    return;
  }

  // Get first feedback form for page 34
  const feedbackFormData = feedbackFormDataArray[0];
  // Get second feedback form for page 35 (if exists)
  const feedbackFormData35 = feedbackFormDataArray.length > 1 ? feedbackFormDataArray[1] : undefined;

  // Find the HTE that matches the feedback form's companyId
  let matchingHte: HTEInformationData | undefined;
  if (hteInfoWithCompanyId && feedbackFormData.companyId) {
    const matchingHteEntry = hteInfoWithCompanyId.find(
      item => item.companyId === feedbackFormData.companyId
    );
    matchingHte = matchingHteEntry?.hteInfo;
  }
  
  // Fallback to first HTE if no match found
  if (!matchingHte && hteInfoArray && hteInfoArray.length > 0) {
    matchingHte = hteInfoArray[0];
  }

  // Page 34 (index 33)
  let feedbackPage34;
  if (pdfDoc.getPageCount() > 33) {
    feedbackPage34 = pdfDoc.getPage(33);
  } else {
    const [templatePage] = pdfDoc.getPages();
    feedbackPage34 = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }

  let cursorY = pageHeight - 320; // Start lower on the page

  // Header Section - Simple format matching first image
  // Name of Intern (top left, no colon after "Intern")
  const headerOffsetX = 60; // Move header fields to the right
  const internNameLabel = 'Name of Intern';
  const internNameLabelWidth = boldFont.widthOfTextAtSize(internNameLabel, 9);
  const internNameLineX = headerOffsetX + internNameLabelWidth + 10;
  const internNameLineWidth = 280; // Reduced line width
  
  feedbackPage34.drawText(internNameLabel, {
    x: headerOffsetX,
    y: cursorY,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage34.drawLine({
    start: { x: internNameLineX, y: cursorY - 2 },
    end: { x: internNameLineX + internNameLineWidth, y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw student name on the line
  if (studentName) {
    feedbackPage34.drawText(studentName, {
      x: internNameLineX + 4,
      y: cursorY - 1, // Position on the line (not below)
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: internNameLineWidth - 8,
    });
  }
  
  cursorY -= 28;

  // Name of HTE
  const hteNameLabel = 'Name of HTE:';
  const hteNameLabelWidth = boldFont.widthOfTextAtSize(hteNameLabel, 9);
  const hteNameLineX = headerOffsetX + hteNameLabelWidth + 8;
  const hteNameLineWidth = 280; // Reduced line width
  
  feedbackPage34.drawText(hteNameLabel, {
    x: headerOffsetX,
    y: cursorY,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage34.drawLine({
    start: { x: hteNameLineX, y: cursorY - 2 },
    end: { x: hteNameLineX + hteNameLineWidth, y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw HTE name on the line (use matching HTE from feedback form)
  if (matchingHte && matchingHte.companyName) {
    feedbackPage34.drawText(matchingHte.companyName, {
      x: hteNameLineX + 4,
      y: cursorY - 1, // Position on the line (not below)
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: hteNameLineWidth - 8,
    });
  }
  
  cursorY -= 28;

  // Date
  const dateLabel = 'Date:';
  const dateLabelWidth = boldFont.widthOfTextAtSize(dateLabel, 9);
  const dateLineX = headerOffsetX + dateLabelWidth + 8;
  const dateLineWidth = 160; // Reduced line width for date
  
  feedbackPage34.drawText(dateLabel, {
    x: headerOffsetX,
    y: cursorY,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage34.drawLine({
    start: { x: dateLineX, y: cursorY - 2 },
    end: { x: dateLineX + dateLineWidth, y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw form date on the line (use feedback form date if available, otherwise current date)
  let formDate = '';
  if (feedbackFormData?.formDate) {
    try {
      // Handle both date string (YYYY-MM-DD) and ISO string formats
      const dateValue = feedbackFormData.formDate;
      const dateObj = new Date(dateValue);
      if (!isNaN(dateObj.getTime())) {
        formDate = dateObj.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error parsing form date:', e);
    }
  }
  
  // Fallback to current date if no valid date found
  if (!formDate) {
    formDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  feedbackPage34.drawText(formDate, {
    x: dateLineX + 4,
    y: cursorY - 1, // Position on the line (not below)
    size: 9,
    font: regularFont,
    color: textColor,
    maxWidth: dateLineWidth - 8,
  });
  
  cursorY -= 24; // Increased spacing before table

  // Unified Table - includes statements, Problems Met, Other concerns, Signature, and Legend
  const tableMargin = 60; // Increased margin to make table smaller
  const tableX = tableMargin;
  const tableWidth = pageWidth - (tableMargin * 2);
  const questionColWidth = 320; // Reduced column width for questions
  const responseColWidth = (tableWidth - questionColWidth) / 5; // 5 equal response columns (SA, A, N, D, SD)
  const rowHeight = 24; // Reduced row height for statement rows
  const headerHeight = 20; // Reduced header height
  const problemsRowHeight = 20; // Reduced height for Problems Met row
  const concernsRowHeight = 20; // Reduced height for Other concerns row
  const signatureRowHeight = 40; // Reduced height for signature row
  const signatureSpacing = 15; // Additional spacing before separator line after signature
  const legendRowHeight = 40; // Increased height for legend row to prevent text cutoff

  // Calculate total table height (includes all rows plus signature spacing)
  const totalTableHeight = headerHeight + (rowHeight * 7) + problemsRowHeight + concernsRowHeight + signatureRowHeight + signatureSpacing + legendRowHeight;
  
  // Table header
  const headerY = cursorY;
  const columnHeaders = ['SA', 'A', 'N', 'D', 'SD'];
  
  // Draw outer table border (one unified table)
  feedbackPage34.drawRectangle({
    x: tableX,
    y: headerY - totalTableHeight,
    width: tableWidth,
    height: totalTableHeight,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });

  // Draw response column headers (centered in their columns)
  let colX = tableX + questionColWidth;
  columnHeaders.forEach((header) => {
    const headerWidth = regularFont.widthOfTextAtSize(header, 9);
    feedbackPage34.drawText(header, {
      x: colX + (responseColWidth - headerWidth) / 2,
      y: headerY - 15,
      size: 9,
      font: boldFont,
      color: textColor,
    });
    
    colX += responseColWidth;
  });

  // Draw horizontal line for header row separator
  feedbackPage34.drawLine({
    start: { x: tableX, y: headerY - headerHeight },
    end: { x: tableX + tableWidth, y: headerY - headerHeight },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Draw horizontal lines for statement rows (1-7)
  let currentRowY = headerY - headerHeight;
  for (let i = 0; i <= 7; i++) {
    feedbackPage34.drawLine({
      start: { x: tableX, y: currentRowY },
      end: { x: tableX + tableWidth, y: currentRowY },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
    currentRowY -= rowHeight;
  }

  // Draw vertical line between question column and response columns (only for statement rows)
  feedbackPage34.drawLine({
    start: { x: tableX + questionColWidth, y: headerY },
    end: { x: tableX + questionColWidth, y: headerY - headerHeight - (rowHeight * 7) },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Draw vertical lines for response columns (only for statement rows)
  colX = tableX + questionColWidth;
  for (let i = 0; i < 5; i++) {
    feedbackPage34.drawLine({
      start: { x: colX, y: headerY },
      end: { x: colX, y: headerY - headerHeight - (rowHeight * 7) },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
    colX += responseColWidth;
  }

  // Questions/Statements (rows 1-7)
  const questions = [
    'My training is aligned with my field of specialization.',
    'My training is challenging.',
    'I have opportunities for learning.',
    'I am aware with the policies of the HTE.',
    'I have positive working relationship with my site supervisor and other employees of the HTE.',
    'I am aware of the risks and hazards of my working environment.',
    'My department is committed to ensuring the health and safety of the Interns.',
  ];

  questions.forEach((question, index) => {
    // Calculate row center Y position for vertical centering
    const rowTopY = headerY - headerHeight - (rowHeight * (index + 1));
    const rowCenterY = rowTopY + rowHeight / 2;
    
    // Draw question number and text (left-aligned in question column)
    const questionText = `${index + 1}. ${question}`;
    const questionLines = wrapText(questionText, regularFont, 9, questionColWidth - 20);
    
    // Calculate total height of wrapped text to center it vertically
    const totalTextHeight = questionLines.length * 10;
    const startY = rowCenterY + (totalTextHeight / 2) - 5; // Center the text block
    
    questionLines.forEach((line, lineIndex) => {
      feedbackPage34.drawText(line, {
        x: tableX + 8,
        y: startY - (lineIndex * 10),
        size: 9,
        font: regularFont,
        color: textColor,
        maxWidth: questionColWidth - 16,
      });
    });
    
    // Mark the response cell with "X" if feedback form data exists
    if (feedbackFormData) {
      const questionKey = `question${index + 1}` as keyof InternFeedbackFormData;
      const response = feedbackFormData[questionKey] as 'SA' | 'A' | 'N' | 'D' | 'SD';
      
      if (response) {
        // Find the column index for this response
        const responseColumnIndex = columnHeaders.indexOf(response);
        if (responseColumnIndex !== -1) {
          // Calculate the X position of the response column
          const responseColX = tableX + questionColWidth + (responseColumnIndex * responseColWidth);
          // Center the "X" in the cell
          const xText = 'X';
          const xTextWidth = regularFont.widthOfTextAtSize(xText, 9);
          const xX = responseColX + (responseColWidth - xTextWidth) / 2;
          const xY = rowCenterY + 3; // Center vertically in the row
          
          feedbackPage34.drawText(xText, {
            x: xX,
            y: xY,
            size: 9,
            font: boldFont,
            color: textColor,
          });
        }
      }
    }
  });

  // Calculate Y positions for remaining sections
  let sectionY = headerY - headerHeight - (rowHeight * 7);

  // Problems Met section (spans all columns) - smaller row below statement rows
  feedbackPage34.drawLine({
    start: { x: tableX, y: sectionY },
    end: { x: tableX + tableWidth, y: sectionY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  feedbackPage34.drawText('Problems Met:', {
    x: tableX + 8,
    y: sectionY - 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  // Draw Problems Met text if available
  if (feedbackFormData?.problemsMet) {
    const problemsText = feedbackFormData.problemsMet;
    const problemsLines = wrapText(problemsText, regularFont, 8, tableWidth - 120);
    problemsLines.forEach((line, lineIndex) => {
      feedbackPage34.drawText(line, {
        x: tableX + 120,
        y: sectionY - 6 - (lineIndex * 8),
        size: 8,
        font: regularFont,
        color: textColor,
        maxWidth: tableWidth - 128,
      });
    });
  }
  
  sectionY -= problemsRowHeight;
  
  feedbackPage34.drawLine({
    start: { x: tableX, y: sectionY },
    end: { x: tableX + tableWidth, y: sectionY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Other concerns section (spans all columns) - smaller row below Problems Met
  feedbackPage34.drawText('Other concerns:', {
    x: tableX + 8,
    y: sectionY - 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  // Draw Other concerns text if available
  if (feedbackFormData?.otherConcerns) {
    const concernsText = feedbackFormData.otherConcerns;
    const concernsLines = wrapText(concernsText, regularFont, 8, tableWidth - 120);
    concernsLines.forEach((line, lineIndex) => {
      feedbackPage34.drawText(line, {
        x: tableX + 120,
        y: sectionY - 6 - (lineIndex * 8),
        size: 8,
        font: regularFont,
        color: textColor,
        maxWidth: tableWidth - 128,
      });
    });
  }
  
  sectionY -= concernsRowHeight;
  
  feedbackPage34.drawLine({
    start: { x: tableX, y: sectionY },
    end: { x: tableX + tableWidth, y: sectionY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Signature section (spans all columns, signature line on the right)
  // Move entire section down to prevent image from being cut off at top
  const signatureLineWidth = 160; // Reduced width for smaller table
  const signatureLineX = tableX + tableWidth - signatureLineWidth - 8; // Right-aligned within table
  const signatureLineY = sectionY - 30; // Moved down to give space for signature image above
  
  // Draw signature image FIRST (above the line)
  if (studentSignatureUrl) {
    try {
      const signatureResponse = await fetch(studentSignatureUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (signatureResponse.ok) {
        const signatureBytes = await signatureResponse.arrayBuffer();
        const contentType = signatureResponse.headers.get('content-type') || '';
        
        let signatureImage;
        try {
          if (contentType.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          }
        } catch (embedError) {
          if (contentType.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          }
        }
        
        const signatureMaxWidth = signatureLineWidth - 8;
        const signatureMaxHeight = 25;
        const sigDims = signatureImage.scale(1);
        const sigAspectRatio = sigDims.width / sigDims.height;
        
        let sigWidth = signatureMaxWidth;
        let sigHeight = signatureMaxWidth / sigAspectRatio;
        
        if (sigHeight > signatureMaxHeight) {
          sigHeight = signatureMaxHeight;
          sigWidth = sigHeight * sigAspectRatio;
        }
        
        const sigX = signatureLineX + (signatureLineWidth - sigWidth) / 2;
        const sigY = signatureLineY + 5; // Position above the line (higher Y value)
        
        feedbackPage34.drawImage(signatureImage, {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
      }
    } catch (error) {
      console.error('❌ Error embedding signature in feedback form:', error);
    }
  }
  
  // Draw signature line
  feedbackPage34.drawLine({
    start: { x: signatureLineX, y: signatureLineY },
    end: { x: signatureLineX + signatureLineWidth, y: signatureLineY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // "Intern's signature" text BELOW the line
  const signatureLabelWidth = regularFont.widthOfTextAtSize("Intern's signature", 9);
  feedbackPage34.drawText("Intern's signature", {
    x: signatureLineX + (signatureLineWidth - signatureLabelWidth) / 2,
    y: signatureLineY - 12, // Position below the line (lower Y value)
    size: 9,
    font: regularFont,
    color: textColor,
  });
  
  sectionY -= signatureRowHeight;
  
  // Move separator line down further to avoid cutting through the signature label
  sectionY -= 15; // Additional spacing before separator line
  
  feedbackPage34.drawLine({
    start: { x: tableX, y: sectionY },
    end: { x: tableX + tableWidth, y: sectionY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Legend section (spans all columns, at bottom left)
  // Adjust positioning to fit within increased legend row height
  feedbackPage34.drawText('Legend:', {
    x: tableX + 8,
    y: sectionY - 12,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  const legendItems = [
    'SA-Strongly agree',
    'A- Agree',
    'N-Neutral',
    'D-Disagree',
    'SD-Strongly disagree',
  ];
  
  // Draw legend items in a row, left-aligned
  let legendX = tableX + 8;
  legendItems.forEach((item, index) => {
    const itemWidth = regularFont.widthOfTextAtSize(item, 8);
    feedbackPage34.drawText(item, {
      x: legendX,
      y: sectionY - 28,
      size: 8,
      font: regularFont,
      color: textColor,
    });
    legendX += itemWidth + 12; // Reduced spacing between items
  });
  
  // Footer and page number removed

  console.log('✅ Drew Feedback Form on page 34');

  // Page 35 (index 34) - Draw second feedback form if it exists, otherwise draw empty layout
  let feedbackPage35;
  if (pdfDoc.getPageCount() > 34) {
    feedbackPage35 = pdfDoc.getPage(34);
  } else {
    const [templatePage] = pdfDoc.getPages();
    feedbackPage35 = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }

  // Find the HTE that matches the second feedback form's companyId (if it exists)
  let matchingHte35: HTEInformationData | undefined;
  if (feedbackFormData35 && hteInfoWithCompanyId && feedbackFormData35.companyId) {
    const matchingHteEntry35 = hteInfoWithCompanyId.find(
      item => item.companyId === feedbackFormData35.companyId
    );
    matchingHte35 = matchingHteEntry35?.hteInfo;
  }
  
  // Fallback to first HTE if no match found
  if (!matchingHte35 && hteInfoArray && hteInfoArray.length > 0) {
    matchingHte35 = hteInfoArray[0];
  }

  // Draw header fields
  let cursorY35 = pageHeight - 320;
  const headerOffsetX35 = 60;
  
  // Name of Intern
  const internNameLabel35 = 'Name of Intern';
  const internNameLabelWidth35 = boldFont.widthOfTextAtSize(internNameLabel35, 9);
  const internNameLineX35 = headerOffsetX35 + internNameLabelWidth35 + 10;
  const internNameLineWidth35 = 280;
  
  feedbackPage35.drawText(internNameLabel35, {
    x: headerOffsetX35,
    y: cursorY35,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage35.drawLine({
    start: { x: internNameLineX35, y: cursorY35 - 2 },
    end: { x: internNameLineX35 + internNameLineWidth35, y: cursorY35 - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw student name on the line if second feedback form exists
  if (feedbackFormData35 && studentName) {
    feedbackPage35.drawText(studentName, {
      x: internNameLineX35 + 4,
      y: cursorY35 - 1,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: internNameLineWidth35 - 8,
    });
  }
  
  cursorY35 -= 28;

  // Name of HTE
  const hteNameLabel35 = 'Name of HTE:';
  const hteNameLabelWidth35 = boldFont.widthOfTextAtSize(hteNameLabel35, 9);
  const hteNameLineX35 = headerOffsetX35 + hteNameLabelWidth35 + 8;
  const hteNameLineWidth35 = 280;
  
  feedbackPage35.drawText(hteNameLabel35, {
    x: headerOffsetX35,
    y: cursorY35,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage35.drawLine({
    start: { x: hteNameLineX35, y: cursorY35 - 2 },
    end: { x: hteNameLineX35 + hteNameLineWidth35, y: cursorY35 - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw HTE name on the line if second feedback form exists
  if (feedbackFormData35 && matchingHte35 && matchingHte35.companyName) {
    feedbackPage35.drawText(matchingHte35.companyName, {
      x: hteNameLineX35 + 4,
      y: cursorY35 - 1,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: hteNameLineWidth35 - 8,
    });
  }
  
  cursorY35 -= 28;

  // Date
  const dateLabel35 = 'Date:';
  const dateLabelWidth35 = boldFont.widthOfTextAtSize(dateLabel35, 9);
  const dateLineX35 = headerOffsetX35 + dateLabelWidth35 + 8;
  const dateLineWidth35 = 160;
  
  feedbackPage35.drawText(dateLabel35, {
    x: headerOffsetX35,
    y: cursorY35,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  feedbackPage35.drawLine({
    start: { x: dateLineX35, y: cursorY35 - 2 },
    end: { x: dateLineX35 + dateLineWidth35, y: cursorY35 - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // Draw form date on the line if second feedback form exists
  if (feedbackFormData35) {
    let formDate35 = '';
    if (feedbackFormData35?.formDate) {
      try {
        const dateValue35 = feedbackFormData35.formDate;
        const dateObj35 = new Date(dateValue35);
        if (!isNaN(dateObj35.getTime())) {
          formDate35 = dateObj35.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
        }
      } catch (e) {
        console.error('Error parsing form date for page 35:', e);
      }
    }
    
    if (!formDate35) {
      formDate35 = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    feedbackPage35.drawText(formDate35, {
      x: dateLineX35 + 4,
      y: cursorY35 - 1,
      size: 9,
      font: regularFont,
      color: textColor,
      maxWidth: dateLineWidth35 - 8,
    });
  }
  
  cursorY35 -= 24;

  // Draw empty table structure (layout only, no data)
  const tableMargin35 = 60;
  const tableX35 = tableMargin35;
  const tableWidth35 = pageWidth - (tableMargin35 * 2);
  const questionColWidth35 = 320;
  const responseColWidth35 = (tableWidth35 - questionColWidth35) / 5;
  const rowHeight35 = 24;
  const headerHeight35 = 20;
  const problemsRowHeight35 = 20;
  const concernsRowHeight35 = 20;
  const signatureRowHeight35 = 40;
  const signatureSpacing35 = 15;
  const legendRowHeight35 = 40;

  const totalTableHeight35 = headerHeight35 + (rowHeight35 * 7) + problemsRowHeight35 + concernsRowHeight35 + signatureRowHeight35 + signatureSpacing35 + legendRowHeight35;
  
  const headerY35 = cursorY35;
  const columnHeaders35 = ['SA', 'A', 'N', 'D', 'SD'];
  
  // Draw outer table border
  feedbackPage35.drawRectangle({
    x: tableX35,
    y: headerY35 - totalTableHeight35,
    width: tableWidth35,
    height: totalTableHeight35,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });

  // Draw response column headers
  let colX35 = tableX35 + questionColWidth35;
  columnHeaders35.forEach((header) => {
    const headerWidth35 = regularFont.widthOfTextAtSize(header, 9);
    feedbackPage35.drawText(header, {
      x: colX35 + (responseColWidth35 - headerWidth35) / 2,
      y: headerY35 - 15,
      size: 9,
      font: boldFont,
      color: textColor,
    });
    
    colX35 += responseColWidth35;
  });

  // Draw horizontal line for header row separator
  feedbackPage35.drawLine({
    start: { x: tableX35, y: headerY35 - headerHeight35 },
    end: { x: tableX35 + tableWidth35, y: headerY35 - headerHeight35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Draw horizontal lines for statement rows (1-7)
  let currentRowY35 = headerY35 - headerHeight35;
  for (let i = 0; i <= 7; i++) {
    feedbackPage35.drawLine({
      start: { x: tableX35, y: currentRowY35 },
      end: { x: tableX35 + tableWidth35, y: currentRowY35 },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
    currentRowY35 -= rowHeight35;
  }

  // Draw vertical line between question column and response columns
  feedbackPage35.drawLine({
    start: { x: tableX35 + questionColWidth35, y: headerY35 },
    end: { x: tableX35 + questionColWidth35, y: headerY35 - headerHeight35 - (rowHeight35 * 7) },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Draw vertical lines for response columns
  colX35 = tableX35 + questionColWidth35;
  for (let i = 0; i < 5; i++) {
    feedbackPage35.drawLine({
      start: { x: colX35, y: headerY35 },
      end: { x: colX35, y: headerY35 - headerHeight35 - (rowHeight35 * 7) },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
    colX35 += responseColWidth35;
  }

  // Draw questions only (no responses marked)
  const questions35 = [
    'My training is aligned with my field of specialization.',
    'My training is challenging.',
    'I have opportunities for learning.',
    'I am aware with the policies of the HTE.',
    'I have positive working relationship with my site supervisor and other employees of the HTE.',
    'I am aware of the risks and hazards of my working environment.',
    'My department is committed to ensuring the health and safety of the Interns.',
  ];

  questions35.forEach((question, index) => {
    const rowTopY35 = headerY35 - headerHeight35 - (rowHeight35 * (index + 1));
    const rowCenterY35 = rowTopY35 + rowHeight35 / 2;
    
    const questionText35 = `${index + 1}. ${question}`;
    const questionLines35 = wrapText(questionText35, regularFont, 9, questionColWidth35 - 20);
    
    const totalTextHeight35 = questionLines35.length * 10;
    const startY35 = rowCenterY35 + (totalTextHeight35 / 2) - 5;
    
    questionLines35.forEach((line, lineIndex) => {
      feedbackPage35.drawText(line, {
        x: tableX35 + 8,
        y: startY35 - (lineIndex * 10),
        size: 9,
        font: regularFont,
        color: textColor,
        maxWidth: questionColWidth35 - 16,
      });
    });
    
    // Mark the response cell with "X" if second feedback form data exists
    if (feedbackFormData35) {
      const questionKey35 = `question${index + 1}` as keyof InternFeedbackFormData;
      const response35 = feedbackFormData35[questionKey35] as 'SA' | 'A' | 'N' | 'D' | 'SD';
      
      if (response35) {
        const responseColumnIndex35 = columnHeaders35.indexOf(response35);
        if (responseColumnIndex35 !== -1) {
          const responseColX35 = tableX35 + questionColWidth35 + (responseColumnIndex35 * responseColWidth35);
          const xText35 = 'X';
          const xTextWidth35 = regularFont.widthOfTextAtSize(xText35, 9);
          const xX35 = responseColX35 + (responseColWidth35 - xTextWidth35) / 2;
          const xY35 = rowCenterY35 + 3;
          
          feedbackPage35.drawText(xText35, {
            x: xX35,
            y: xY35,
            size: 9,
            font: boldFont,
            color: textColor,
          });
        }
      }
    }
  });

  // Calculate Y positions for remaining sections
  let sectionY35 = headerY35 - headerHeight35 - (rowHeight35 * 7);

  // Problems Met section
  feedbackPage35.drawLine({
    start: { x: tableX35, y: sectionY35 },
    end: { x: tableX35 + tableWidth35, y: sectionY35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  feedbackPage35.drawText('Problems Met:', {
    x: tableX35 + 8,
    y: sectionY35 - 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  // Draw Problems Met text if second feedback form exists
  if (feedbackFormData35?.problemsMet) {
    const problemsText35 = feedbackFormData35.problemsMet;
    const problemsLines35 = wrapText(problemsText35, regularFont, 8, tableWidth35 - 120);
    problemsLines35.forEach((line, lineIndex) => {
      feedbackPage35.drawText(line, {
        x: tableX35 + 120,
        y: sectionY35 - 6 - (lineIndex * 8),
        size: 8,
        font: regularFont,
        color: textColor,
        maxWidth: tableWidth35 - 128,
      });
    });
  }
  
  sectionY35 -= problemsRowHeight35;
  
  feedbackPage35.drawLine({
    start: { x: tableX35, y: sectionY35 },
    end: { x: tableX35 + tableWidth35, y: sectionY35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Other concerns section
  feedbackPage35.drawText('Other concerns:', {
    x: tableX35 + 8,
    y: sectionY35 - 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  // Draw Other concerns text if second feedback form exists
  if (feedbackFormData35?.otherConcerns) {
    const concernsText35 = feedbackFormData35.otherConcerns;
    const concernsLines35 = wrapText(concernsText35, regularFont, 8, tableWidth35 - 120);
    concernsLines35.forEach((line, lineIndex) => {
      feedbackPage35.drawText(line, {
        x: tableX35 + 120,
        y: sectionY35 - 6 - (lineIndex * 8),
        size: 8,
        font: regularFont,
        color: textColor,
        maxWidth: tableWidth35 - 128,
      });
    });
  }
  
  sectionY35 -= concernsRowHeight35;
  
  feedbackPage35.drawLine({
    start: { x: tableX35, y: sectionY35 },
    end: { x: tableX35 + tableWidth35, y: sectionY35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Signature section
  const signatureLineWidth35 = 160;
  const signatureLineX35 = tableX35 + tableWidth35 - signatureLineWidth35 - 8;
  const signatureLineY35 = sectionY35 - 30;
  
  // Draw signature image FIRST (above the line) if second feedback form exists
  if (feedbackFormData35 && studentSignatureUrl) {
    try {
      const signatureResponse35 = await fetch(studentSignatureUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (signatureResponse35.ok) {
        const signatureBytes35 = await signatureResponse35.arrayBuffer();
        const contentType35 = signatureResponse35.headers.get('content-type') || '';
        
        let signatureImage35;
        try {
          if (contentType35.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage35 = await pdfDoc.embedPng(signatureBytes35);
          } else {
            signatureImage35 = await pdfDoc.embedJpg(signatureBytes35);
          }
        } catch (embedError) {
          if (contentType35.includes('png') || studentSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage35 = await pdfDoc.embedJpg(signatureBytes35);
          } else {
            signatureImage35 = await pdfDoc.embedPng(signatureBytes35);
          }
        }
        
        const signatureMaxWidth35 = signatureLineWidth35 - 8;
        const signatureMaxHeight35 = 25;
        const sigDims35 = signatureImage35.scale(1);
        const sigAspectRatio35 = sigDims35.width / sigDims35.height;
        
        let sigWidth35 = signatureMaxWidth35;
        let sigHeight35 = signatureMaxWidth35 / sigAspectRatio35;
        
        if (sigHeight35 > signatureMaxHeight35) {
          sigHeight35 = signatureMaxHeight35;
          sigWidth35 = sigHeight35 * sigAspectRatio35;
        }
        
        const sigX35 = signatureLineX35 + (signatureLineWidth35 - sigWidth35) / 2;
        const sigY35 = signatureLineY35 + 5;
        
        feedbackPage35.drawImage(signatureImage35, {
          x: sigX35,
          y: sigY35,
          width: sigWidth35,
          height: sigHeight35,
        });
      }
    } catch (error) {
      console.error('❌ Error embedding signature in feedback form page 35:', error);
    }
  }
  
  // Draw signature line
  feedbackPage35.drawLine({
    start: { x: signatureLineX35, y: signatureLineY35 },
    end: { x: signatureLineX35 + signatureLineWidth35, y: signatureLineY35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  // "Intern's signature" text
  const signatureLabelWidth35 = regularFont.widthOfTextAtSize("Intern's signature", 9);
  feedbackPage35.drawText("Intern's signature", {
    x: signatureLineX35 + (signatureLineWidth35 - signatureLabelWidth35) / 2,
    y: signatureLineY35 - 12,
    size: 9,
    font: regularFont,
    color: textColor,
  });
  
  sectionY35 -= signatureRowHeight35;
  sectionY35 -= 15; // Additional spacing before separator line
  
  feedbackPage35.drawLine({
    start: { x: tableX35, y: sectionY35 },
    end: { x: tableX35 + tableWidth35, y: sectionY35 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Legend section
  feedbackPage35.drawText('Legend:', {
    x: tableX35 + 8,
    y: sectionY35 - 12,
    size: 9,
    font: boldFont,
    color: textColor,
  });
  
  const legendItems35 = [
    'SA-Strongly agree',
    'A- Agree',
    'N-Neutral',
    'D-Disagree',
    'SD-Strongly disagree',
  ];
  
  let legendX35 = tableX35 + 8;
  legendItems35.forEach((item) => {
    const itemWidth35 = regularFont.widthOfTextAtSize(item, 8);
    feedbackPage35.drawText(item, {
      x: legendX35,
      y: sectionY35 - 28,
      size: 8,
      font: regularFont,
      color: textColor,
    });
    legendX35 += itemWidth35 + 12;
  });

  if (feedbackFormData35) {
    console.log('✅ Drew Feedback Form on page 35 with second feedback data');
  } else {
    console.log('✅ Drew empty layout structure on page 35 (one feedback = one page)');
  }
};

/**
 * Draws supervisor evaluation form on 3 pages (pages 36-38, 39-41, or 42-44)
 * Each evaluation form spans 3 pages with all sections and ratings
 */
const drawSupervisorEvaluationForm = async (
  pdfDoc: any,
  evaluationData: SupervisorEvaluationFormData,
  studentName: string,
  startPageIndex: number, // 35 for first form (page 36), 38 for second (page 39), 41 for third (page 42)
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  pageWidth: number,
  pageHeight: number,
  horizontalMargin: number
) => {
  // Page 1: Section I, II, and Question 1
  let page1;
  if (startPageIndex < pdfDoc.getPageCount()) {
    page1 = pdfDoc.getPage(startPageIndex);
  } else {
    const [templatePage] = pdfDoc.getPages();
    page1 = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }

  // Page 2: Questions 2-4, Rating Scale, Work Performance, Personal Qualities (Communication, Interpersonal)
  let page2;
  if (startPageIndex + 1 < pdfDoc.getPageCount()) {
    page2 = pdfDoc.getPage(startPageIndex + 1);
  } else {
    const [templatePage] = pdfDoc.getPages();
    page2 = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }

  // Page 3: Personal Qualities (Punctuality, Flexibility, Attitude, Reliability), TOTAL, Signature
  let page3;
  if (startPageIndex + 2 < pdfDoc.getPageCount()) {
    page3 = pdfDoc.getPage(startPageIndex + 2);
  } else {
    const [templatePage] = pdfDoc.getPages();
    page3 = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
  }

  // ========== PAGE 1: Section I, II, and Question 1 ==========
  let cursorY = pageHeight - 240; // Start lower on the page

  // Title: "EVALUATION RATING SHEET FOR SUPERVISORS"
  const titleText = 'EVALUATION RATING SHEET FOR SUPERVISORS';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 14);
  page1.drawText(titleText, {
    x: (pageWidth - titleWidth) / 2,
    y: cursorY,
    size: 14,
    font: boldFont,
    color: textColor,
  });

  cursorY -= 30;

  // Introductory text: "[Student Name] is an OJT Trainee/Intern in your organization/office under your supervision."
  const introText = `${studentName} is an OJT Trainee/Intern in your organization/office under your supervision.`;
  const introLines = wrapText(introText, regularFont, 11, pageWidth - horizontalMargin * 2);
  introLines.forEach((line, index) => {
    page1.drawText(line, {
      x: horizontalMargin + 50, // Move more toward center, away from edge
      y: cursorY - (index * 12),
      size: 11,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= introLines.length * 12 + 10;

  // Instruction text
  page1.drawText('(Please provide an evaluation of the trainee\'s performance.)', {
    x: horizontalMargin + 50, // Move more toward center, away from edge
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  cursorY -= 30;

  // ========== SECTION I: COMPANY AND SUPERVISOR ==========
  const section1Text = 'Section I: COMPANY AND SUPERVISOR';
  const section1Lines = wrapText(section1Text, boldFont, 12, 300); // Limit width to 300
  section1Lines.forEach((line, index) => {
    page1.drawText(line, {
      x: horizontalMargin + 50, // Move more toward center, away from edge
      y: cursorY - (index * 14),
      size: 12,
      font: boldFont,
      color: textColor,
    });
  });
  cursorY -= section1Lines.length * 14 + (25 - 14); // Adjust spacing based on number of lines

  // Organization/Company Name
  const orgLabel = 'Organization/Company Name:';
  const orgLabelWidth = boldFont.widthOfTextAtSize(orgLabel, 10);
  const orgLabelX = horizontalMargin + 50;
  page1.drawText(orgLabel, {
    x: orgLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const orgValue = evaluationData.organizationCompanyName || '';
  const orgValueWidth = regularFont.widthOfTextAtSize(orgValue, 10);
  const orgValueX = orgLabelX + orgLabelWidth;
  page1.drawText(orgValue, {
    x: orgValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width to prevent hitting edge (leave 20pt margin from right edge)
  const orgMaxUnderlineWidth = pageWidth - orgValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: orgValueX, y: cursorY - 2 },
    end: { x: orgValueX + Math.max(orgValueWidth, Math.min(orgMaxUnderlineWidth, 400)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 20;

  // Address
  const addrLabel = 'Address:';
  const addrLabelWidth = boldFont.widthOfTextAtSize(addrLabel, 10);
  const addrLabelX = horizontalMargin + 50;
  page1.drawText(addrLabel, {
    x: addrLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const addrValue = evaluationData.address || '';
  const addrValueX = addrLabelX + addrLabelWidth;
  // Calculate max width for address text (leave 20pt margin from right edge)
  const addrMaxTextWidth = pageWidth - addrValueX - horizontalMargin - 20;
  const addrLines = wrapText(addrValue, regularFont, 10, addrMaxTextWidth);
  addrLines.forEach((line, index) => {
    const lineWidth = regularFont.widthOfTextAtSize(line, 10);
    page1.drawText(line, {
      x: addrValueX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
    page1.drawLine({
      start: { x: addrValueX, y: cursorY - (index * 12) - 2 },
      end: { x: addrValueX + Math.max(lineWidth, Math.min(addrMaxTextWidth, 400)), y: cursorY - (index * 12) - 2 },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
  });
  cursorY -= addrLines.length * 12 + 10;

  // City and ZIP (side by side)
  const cityLabel = 'City:';
  const cityLabelWidth = boldFont.widthOfTextAtSize(cityLabel, 10);
  const cityLabelX = horizontalMargin + 50;
  page1.drawText(cityLabel, {
    x: cityLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const cityValue = evaluationData.city || '';
  const cityValueWidth = regularFont.widthOfTextAtSize(cityValue, 10);
  const cityValueX = cityLabelX + cityLabelWidth;
  page1.drawText(cityValue, {
    x: cityValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for city (leave space for ZIP field and 20pt margin)
  const cityMaxUnderlineWidth = Math.min(200, pageWidth - cityValueX - 150 - horizontalMargin - 20);
  page1.drawLine({
    start: { x: cityValueX, y: cursorY - 2 },
    end: { x: cityValueX + Math.max(cityValueWidth, cityMaxUnderlineWidth), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  const zipLabel = 'ZIP:';
  const zipLabelWidth = boldFont.widthOfTextAtSize(zipLabel, 10);
  const zipX = horizontalMargin + 300;
  page1.drawText(zipLabel, {
    x: zipX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const zipValue = evaluationData.zip || '';
  const zipValueWidth = regularFont.widthOfTextAtSize(zipValue, 10);
  const zipValueX = zipX + zipLabelWidth;
  page1.drawText(zipValue, {
    x: zipValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for ZIP (leave 20pt margin from right edge)
  const zipMaxUnderlineWidth = pageWidth - zipValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: zipValueX, y: cursorY - 2 },
    end: { x: zipValueX + Math.max(zipValueWidth, Math.min(zipMaxUnderlineWidth, 100)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 20;

  // Position
  const posLabel = 'Position:';
  const posLabelWidth = boldFont.widthOfTextAtSize(posLabel, 10);
  const posLabelX = horizontalMargin + 50;
  page1.drawText(posLabel, {
    x: posLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const posValue = evaluationData.supervisorPosition || '';
  const posValueWidth = regularFont.widthOfTextAtSize(posValue, 10);
  const posValueX = posLabelX + posLabelWidth;
  page1.drawText(posValue, {
    x: posValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width to prevent hitting edge (leave 20pt margin from right edge)
  const posMaxUnderlineWidth = pageWidth - posValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: posValueX, y: cursorY - 2 },
    end: { x: posValueX + Math.max(posValueWidth, Math.min(posMaxUnderlineWidth, 400)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 20;

  // Phone and Email (side by side)
  const phoneLabel = 'Phone:';
  const phoneLabelWidth = boldFont.widthOfTextAtSize(phoneLabel, 10);
  const phoneLabelX = horizontalMargin + 50;
  page1.drawText(phoneLabel, {
    x: phoneLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const phoneValue = evaluationData.supervisorPhone || '';
  const phoneValueWidth = regularFont.widthOfTextAtSize(phoneValue, 10);
  const phoneValueX = phoneLabelX + phoneLabelWidth;
  page1.drawText(phoneValue, {
    x: phoneValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for phone (leave space for Email field and 20pt margin)
  const phoneMaxUnderlineWidth = Math.min(150, pageWidth - phoneValueX - 150 - horizontalMargin - 20);
  page1.drawLine({
    start: { x: phoneValueX, y: cursorY - 2 },
    end: { x: phoneValueX + Math.max(phoneValueWidth, phoneMaxUnderlineWidth), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  const emailLabel = 'Email:';
  const emailLabelWidth = boldFont.widthOfTextAtSize(emailLabel, 10);
  const emailX = horizontalMargin + 300;
  page1.drawText(emailLabel, {
    x: emailX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const emailValue = evaluationData.supervisorEmail || '';
  const emailValueWidth = regularFont.widthOfTextAtSize(emailValue, 10);
  const emailValueX = emailX + emailLabelWidth;
  page1.drawText(emailValue, {
    x: emailValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for email (leave 20pt margin from right edge)
  const emailMaxUnderlineWidth = pageWidth - emailValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: emailValueX, y: cursorY - 2 },
    end: { x: emailValueX + Math.max(emailValueWidth, Math.min(emailMaxUnderlineWidth, 250)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 40;

  // ========== SECTION II: ON-THE-JOB TRAINING DATA ==========
  const section2Text = 'Section II: ON-THE-JOB TRAINING DATA';
  const section2Lines = wrapText(section2Text, boldFont, 12, 300); // Limit width to 300
  section2Lines.forEach((line, index) => {
    page1.drawText(line, {
      x: horizontalMargin + 50, // Move more toward center, away from edge
      y: cursorY - (index * 14),
      size: 12,
      font: boldFont,
      color: textColor,
    });
  });
  cursorY -= section2Lines.length * 14 + (25 - 14); // Adjust spacing based on number of lines

  // Start Date and End Date (side by side)
  const startDateLabel = 'Start Date:';
  const startDateLabelWidth = boldFont.widthOfTextAtSize(startDateLabel, 10);
  const startDateLabelX = horizontalMargin + 50;
  page1.drawText(startDateLabel, {
    x: startDateLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const startDateValue = evaluationData.startDate
    ? new Date(evaluationData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const startDateValueWidth = regularFont.widthOfTextAtSize(startDateValue, 10);
  const startDateValueX = startDateLabelX + startDateLabelWidth;
  page1.drawText(startDateValue, {
    x: startDateValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for start date (leave space for End Date field and 20pt margin)
  const startDateMaxUnderlineWidth = Math.min(200, pageWidth - startDateValueX - 150 - horizontalMargin - 20);
  page1.drawLine({
    start: { x: startDateValueX, y: cursorY - 2 },
    end: { x: startDateValueX + Math.max(startDateValueWidth, startDateMaxUnderlineWidth), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  const endDateLabel = 'End Date:';
  const endDateLabelWidth = boldFont.widthOfTextAtSize(endDateLabel, 10);
  const endDateX = horizontalMargin + 300;
  page1.drawText(endDateLabel, {
    x: endDateX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const endDateValue = evaluationData.endDate
    ? new Date(evaluationData.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const endDateValueWidth = regularFont.widthOfTextAtSize(endDateValue, 10);
  const endDateValueX = endDateX + endDateLabelWidth;
  page1.drawText(endDateValue, {
    x: endDateValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width for end date (leave 20pt margin from right edge)
  const endDateMaxUnderlineWidth = pageWidth - endDateValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: endDateValueX, y: cursorY - 2 },
    end: { x: endDateValueX + Math.max(endDateValueWidth, Math.min(endDateMaxUnderlineWidth, 200)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 20;

  // Total Hours
  const hoursLabel = 'Total Hours:';
  const hoursLabelWidth = boldFont.widthOfTextAtSize(hoursLabel, 10);
  const hoursLabelX = horizontalMargin + 50;
  page1.drawText(hoursLabel, {
    x: hoursLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  const hoursValue = evaluationData.totalHours ? evaluationData.totalHours.toFixed(2) : '';
  const hoursValueWidth = regularFont.widthOfTextAtSize(hoursValue, 10);
  const hoursValueX = hoursLabelX + hoursLabelWidth;
  page1.drawText(hoursValue, {
    x: hoursValueX,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width to prevent hitting edge (leave 20pt margin from right edge)
  const hoursMaxUnderlineWidth = pageWidth - hoursValueX - horizontalMargin - 20;
  page1.drawLine({
    start: { x: hoursValueX, y: cursorY - 2 },
    end: { x: hoursValueX + Math.max(hoursValueWidth, Math.min(hoursMaxUnderlineWidth, 100)), y: cursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  cursorY -= 20;

  // Description of Duties
  const descLabel = 'Description of Duties:';
  const descLabelX = horizontalMargin + 50;
  page1.drawText(descLabel, {
    x: descLabelX,
    y: cursorY,
    size: 10,
    font: boldFont,
    color: textColor,
  });
  cursorY -= 15;
  const descValue = evaluationData.descriptionOfDuties || '';
  // Calculate max width for description text (leave 20pt margin from right edge)
  const descMaxTextWidth = pageWidth - descLabelX - horizontalMargin - 20;
  const descLines = wrapText(descValue, regularFont, 10, descMaxTextWidth);
  descLines.forEach((line, index) => {
    const lineWidth = regularFont.widthOfTextAtSize(line, 10);
    page1.drawText(line, {
      x: descLabelX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
    page1.drawLine({
      start: { x: descLabelX, y: cursorY - (index * 12) - 2 },
      end: { x: descLabelX + Math.max(lineWidth, Math.min(descMaxTextWidth, 500)), y: cursorY - (index * 12) - 2 },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
  });
  cursorY -= descLines.length * 12 + 30;

  // ========== SECTION III: PERFORMANCE EVALUATION ==========
  const section3Text = 'Section III: PERFORMANCE EVALUATION';
  const section3Lines = wrapText(section3Text, boldFont, 12, 300); // Limit width to 300
  section3Lines.forEach((line, index) => {
    page1.drawText(line, {
      x: horizontalMargin + 50, // Move more toward center, away from edge
      y: cursorY - (index * 14),
      size: 12,
      font: boldFont,
      color: textColor,
    });
  });
  cursorY -= section3Lines.length * 14 + (25 - 14); // Adjust spacing based on number of lines

  // Question 1: How well did the Trainee perform the assigned tasks?
  const q1Text = '1. How well did the Trainee perform the assigned tasks?';
  const q1StartX = horizontalMargin + 50;
  // Calculate max width for question text (leave 20pt margin from right edge)
  const q1MaxTextWidth = pageWidth - q1StartX - horizontalMargin - 20;
  const q1Lines = wrapText(q1Text, regularFont, 10, q1MaxTextWidth);
  q1Lines.forEach((line, index) => {
    page1.drawText(line, {
      x: q1StartX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= q1Lines.length * 12 + 10;

  // Rating options: Outstanding, Good, Average, Poor
  const ratingOptions = ['Outstanding', 'Good', 'Average', 'Poor'];
  const ratingStartX = horizontalMargin + 50;
  // Calculate spacing to ensure options don't hit the edge
  const totalOptionsWidth = ratingOptions.reduce((sum, option) => {
    const optionWidth = regularFont.widthOfTextAtSize(option, 10) + 25; // 25 = checkbox width (10) + spacing (15)
    return sum + optionWidth;
  }, 0);
  const ratingOptionsAvailableWidth = pageWidth - ratingStartX - horizontalMargin - 20;
  const spacingBetweenOptions = totalOptionsWidth < ratingOptionsAvailableWidth
    ? (ratingOptionsAvailableWidth - totalOptionsWidth) / (ratingOptions.length - 1)
    : 120; // Fallback to original spacing if options are too wide
  let currentOptionX = ratingStartX;
  ratingOptions.forEach((option, index) => {
    const optionX = currentOptionX;
    // Draw checkbox
    page1.drawRectangle({
      x: optionX,
      y: cursorY - 8,
      width: 10,
      height: 10,
      borderColor: rgbFn(0, 0, 0),
      borderWidth: 1,
    });
    // Mark if selected
    if (evaluationData.question1Performance === option) {
      page1.drawText('X', {
        x: optionX + 2,
        y: cursorY - 6,
        size: 8,
        font: boldFont,
        color: textColor,
      });
    }
    // Draw label
    const optionLabelWidth = regularFont.widthOfTextAtSize(option, 10);
    page1.drawText(option, {
      x: optionX + 15,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
    // Move to next position, ensuring we don't exceed page width
    if (index < ratingOptions.length - 1) {
      currentOptionX += 10 + 15 + optionLabelWidth + Math.min(spacingBetweenOptions, 120);
      // Ensure we don't exceed the page width
      const nextOptionWidth = regularFont.widthOfTextAtSize(ratingOptions[index + 1], 10) + 25;
      if (currentOptionX + nextOptionWidth > pageWidth - horizontalMargin - 20) {
        currentOptionX = pageWidth - horizontalMargin - 20 - nextOptionWidth;
      }
    }
  });
  cursorY -= 30;

  console.log(`✅ Drew Supervisor Evaluation Form Page 1 (page ${startPageIndex + 1})`);

  // ========== PAGE 2: Questions 2-4, Rating Scale, Unified Table ==========
  cursorY = pageHeight - 110; // Start lower on the page

  // Questions 2-4
  const q2Text = '2. Does the Trainee possess basic skills, intelligence, and motivation to pursue a successful career in the IT industry?';
  const q2StartX = horizontalMargin + 50;
  // Calculate max width for question text (leave 20pt margin from right edge)
  const q2MaxTextWidth = pageWidth - q2StartX - horizontalMargin - 20;
  const q2Lines = wrapText(q2Text, regularFont, 10, q2MaxTextWidth);
  q2Lines.forEach((line, index) => {
    page2.drawText(line, {
      x: q2StartX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= q2Lines.length * 12 + 10;

  // YES/NO for Question 2
  const yesNoX = horizontalMargin + 50;
  page2.drawRectangle({
    x: yesNoX,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (evaluationData.question2SkillsCareer) {
    page2.drawText('X', {
      x: yesNoX + 2,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('YES', {
    x: yesNoX + 15,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });

  page2.drawRectangle({
    x: yesNoX + 80,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (!evaluationData.question2SkillsCareer) {
    page2.drawText('X', {
      x: yesNoX + 82,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('NO', {
    x: yesNoX + 95,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });

  // Elaboration if NO
  if (!evaluationData.question2SkillsCareer && evaluationData.question2Elaboration) {
    cursorY -= 20;
    const elaborationLabel = '(Please elaborate)';
    const elaborationLabelX = yesNoX + 95 + 20;
    page2.drawText(elaborationLabel, {
      x: elaborationLabelX,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
    cursorY -= 15;
    const elaborationStartX = horizontalMargin + 50;
    // Calculate max width for elaboration text (leave 20pt margin from right edge)
    const elaborationMaxTextWidth = pageWidth - elaborationStartX - horizontalMargin - 20;
    const elaborationLines = wrapText(evaluationData.question2Elaboration, regularFont, 10, elaborationMaxTextWidth);
    elaborationLines.forEach((line, index) => {
      const lineWidth = regularFont.widthOfTextAtSize(line, 10);
      page2.drawText(line, {
        x: elaborationStartX,
        y: cursorY - (index * 12),
        size: 10,
        font: regularFont,
        color: textColor,
      });
      page2.drawLine({
        start: { x: elaborationStartX, y: cursorY - (index * 12) - 2 },
        end: { x: elaborationStartX + Math.max(lineWidth, Math.min(elaborationMaxTextWidth, 450)), y: cursorY - (index * 12) - 2 },
        thickness: 0.5,
        color: rgbFn(0, 0, 0),
      });
    });
    cursorY -= elaborationLines.length * 12;
  }
  cursorY -= 20;

  // Question 3
  const q3Text = '3. Would you consider the Trainee as a likely candidate for a full-time position in your area of experience?';
  const q3StartX = horizontalMargin + 50;
  // Calculate max width for question text (leave 20pt margin from right edge)
  const q3MaxTextWidth = pageWidth - q3StartX - horizontalMargin - 20;
  const q3Lines = wrapText(q3Text, regularFont, 10, q3MaxTextWidth);
  q3Lines.forEach((line, index) => {
    page2.drawText(line, {
      x: q3StartX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= q3Lines.length * 12 + 10;

  // YES/NO for Question 3
  page2.drawRectangle({
    x: yesNoX,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (evaluationData.question3FulltimeCandidate) {
    page2.drawText('X', {
      x: yesNoX + 2,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('YES', {
    x: yesNoX + 15,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });

  page2.drawRectangle({
    x: yesNoX + 80,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (!evaluationData.question3FulltimeCandidate) {
    page2.drawText('X', {
      x: yesNoX + 82,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('NO', {
    x: yesNoX + 95,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });
  cursorY -= 20;

  // Question 4
  const q4Text = '4. Are you interested in other Trainees from our University?';
  const q4StartX = horizontalMargin + 50;
  // Calculate max width for question text (leave 20pt margin from right edge)
  const q4MaxTextWidth = pageWidth - q4StartX - horizontalMargin - 20;
  const q4Lines = wrapText(q4Text, regularFont, 10, q4MaxTextWidth);
  q4Lines.forEach((line, index) => {
    page2.drawText(line, {
      x: q4StartX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= q4Lines.length * 12 + 10;

  // YES/NO for Question 4
  page2.drawRectangle({
    x: yesNoX,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (evaluationData.question4InterestOtherTrainees) {
    page2.drawText('X', {
      x: yesNoX + 2,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('YES', {
    x: yesNoX + 15,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });

  page2.drawRectangle({
    x: yesNoX + 80,
    y: cursorY - 8,
    width: 10,
    height: 10,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  if (!evaluationData.question4InterestOtherTrainees) {
    page2.drawText('X', {
      x: yesNoX + 82,
      y: cursorY - 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
  }
  page2.drawText('NO', {
    x: yesNoX + 95,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: textColor,
  });

  // Elaboration if NO
  if (!evaluationData.question4InterestOtherTrainees && evaluationData.question4Elaboration) {
    cursorY -= 20;
    const elaborationLabel = '(If NO, please elaborate)';
    const elaborationLabelX = yesNoX + 95 + 20;
    page2.drawText(elaborationLabel, {
      x: elaborationLabelX,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
    cursorY -= 15;
    const elaborationStartX = horizontalMargin + 50;
    // Calculate max width for elaboration text (leave 20pt margin from right edge)
    const elaborationMaxTextWidth = pageWidth - elaborationStartX - horizontalMargin - 20;
    const elaborationLines = wrapText(evaluationData.question4Elaboration, regularFont, 10, elaborationMaxTextWidth);
    elaborationLines.forEach((line, index) => {
      const lineWidth = regularFont.widthOfTextAtSize(line, 10);
      page2.drawText(line, {
        x: elaborationStartX,
        y: cursorY - (index * 12),
        size: 10,
        font: regularFont,
        color: textColor,
      });
      page2.drawLine({
        start: { x: elaborationStartX, y: cursorY - (index * 12) - 2 },
        end: { x: elaborationStartX + Math.max(lineWidth, Math.min(elaborationMaxTextWidth, 450)), y: cursorY - (index * 12) - 2 },
        thickness: 0.5,
        color: rgbFn(0, 0, 0),
      });
    });
    cursorY -= elaborationLines.length * 12;
  }
  cursorY -= 30;

  // Question 5: Rating Scale Introduction
  const q5Text = '5. Listed below are several qualities we believe are important to the successful completion of an OJT experience.';
  const q5StartX = horizontalMargin + 50;
  // Calculate max width for question text (leave 20pt margin from right edge)
  const q5MaxTextWidth = pageWidth - q5StartX - horizontalMargin - 20;
  const q5Lines = wrapText(q5Text, regularFont, 10, q5MaxTextWidth);
  q5Lines.forEach((line, index) => {
    page2.drawText(line, {
      x: q5StartX,
      y: cursorY - (index * 12),
      size: 10,
      font: regularFont,
      color: textColor,
    });
  });
  cursorY -= q5Lines.length * 12 + 5;

  // Instruction text in italics
  const instructionText = '(To the supervisor: Please rate each item using the rating scale provided below)';
  const instructionStartX = horizontalMargin + 50;
  // Calculate max width for instruction text (leave 20pt margin from right edge)
  const instructionMaxTextWidth = pageWidth - instructionStartX - horizontalMargin - 20;
  const instructionWidth = regularFont.widthOfTextAtSize(instructionText, 9);
  // Only draw if it fits, otherwise wrap it
  if (instructionWidth <= instructionMaxTextWidth) {
    page2.drawText(instructionText, {
      x: instructionStartX,
      y: cursorY,
      size: 9,
      font: regularFont,
      color: textColor,
    });
  } else {
    const instructionLines = wrapText(instructionText, regularFont, 9, instructionMaxTextWidth);
    instructionLines.forEach((line, index) => {
      page2.drawText(line, {
        x: instructionStartX,
        y: cursorY - (index * 10),
        size: 9,
        font: regularFont,
        color: textColor,
      });
    });
    cursorY -= (instructionLines.length - 1) * 10;
  }
  cursorY -= 20;

  // Rating Scale Legend
  const ratingScaleItems = [
    '5 - EXCELLENT',
    '4 - VERY GOOD',
    '3 - GOOD',
    '2 - POOR',
    '1 - VERY POOR',
  ];
  const ratingScaleStartX = horizontalMargin + 50;
  // Calculate spacing to ensure items don't hit the edge
  const totalItemsWidth = ratingScaleItems.reduce((sum, item) => sum + regularFont.widthOfTextAtSize(item, 10), 0);
  const ratingScaleAvailableWidth = pageWidth - ratingScaleStartX - horizontalMargin - 20;
  const spacingBetweenItems = totalItemsWidth < ratingScaleAvailableWidth 
    ? (ratingScaleAvailableWidth - totalItemsWidth) / (ratingScaleItems.length - 1)
    : 110; // Fallback to original spacing if items are too wide
  let currentX = ratingScaleStartX;
  ratingScaleItems.forEach((item, index) => {
    const itemWidth = regularFont.widthOfTextAtSize(item, 10);
    page2.drawText(item, {
      x: currentX,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: textColor,
    });
    // Move to next position, ensuring we don't exceed page width
    if (index < ratingScaleItems.length - 1) {
      currentX += itemWidth + Math.min(spacingBetweenItems, 110);
      // Ensure we don't exceed the page width
      if (currentX + regularFont.widthOfTextAtSize(ratingScaleItems[index + 1], 10) > pageWidth - horizontalMargin - 20) {
        currentX = pageWidth - horizontalMargin - 20 - regularFont.widthOfTextAtSize(ratingScaleItems[index + 1], 10);
      }
    }
  });
  cursorY -= 70; // Increased spacing to move table lower below Rating Scale

  // ========== UNIFIED TABLE: All items in one continuous table ==========
  // Minimize table: add extra horizontal margins to make it smaller
  const tableHorizontalMargin = 40; // Extra margin on each side to minimize table width
  const tableStartX = horizontalMargin + tableHorizontalMargin;
  const tableWidth = pageWidth - (horizontalMargin * 2) - (tableHorizontalMargin * 2); // Reduced width
  const criteriaColWidth = tableWidth * 0.75; // 75% for criteria column
  const ratingColWidth = (tableWidth - criteriaColWidth) / 5; // Remaining 25% divided by 5 rating columns
  const rowHeight = 25; // Reduced row height to minimize table
  const rowGap = 1; // Reduced gap between rows

  // Draw table header (only once, on page 2)
  const headerY = cursorY;
  page2.drawRectangle({
    x: tableStartX,
    y: headerY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });
  
  // Draw "CRITERIA" header
  page2.drawText('CRITERIA', {
    x: tableStartX + 5,
    y: headerY - rowHeight + 6,
    size: 8,
    font: boldFont,
    color: textColor,
  });
  
  // Draw rating column headers (5, 4, 3, 2, 1)
  const headerLabels = ['5', '4', '3', '2', '1'];
  headerLabels.forEach((label, index) => {
    const colX = tableStartX + criteriaColWidth + (index * ratingColWidth);
    const labelX = colX + (ratingColWidth - boldFont.widthOfTextAtSize(label, 8)) / 2;
    page2.drawText(label, {
      x: labelX,
      y: headerY - rowHeight + 6,
      size: 8,
      font: boldFont,
      color: textColor,
    });
    // Vertical line
    page2.drawLine({
      start: { x: colX, y: headerY },
      end: { x: colX, y: headerY - rowHeight },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
  });
  
  // Vertical line between CRITERIA and rating columns
  page2.drawLine({
    start: { x: tableStartX + criteriaColWidth, y: headerY },
    end: { x: tableStartX + criteriaColWidth, y: headerY - rowHeight },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });
  
  cursorY -= rowHeight + rowGap;

  // Helper function to draw a table row
  const drawTableRow = (page: any, rowY: number, itemText: string, rating: number | undefined) => {
    // Draw row border
    page.drawRectangle({
      x: tableStartX,
      y: rowY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgbFn(0, 0, 0),
      borderWidth: 0.5,
    });

    // Draw criteria text (left column) - adjusted for smaller rows
    const itemLines = wrapText(itemText, regularFont, 8, criteriaColWidth - 10);
    itemLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: tableStartX + 5,
        y: rowY - rowHeight + 6 + (itemLines.length - 1 - lineIndex) * 10,
        size: 8,
        font: regularFont,
        color: textColor,
      });
    });

    // Draw rating columns (5, 4, 3, 2, 1)
    for (let ratingCol = 0; ratingCol < 5; ratingCol++) {
      const ratingValue = 5 - ratingCol; // 5, 4, 3, 2, 1
      const colX = tableStartX + criteriaColWidth + (ratingCol * ratingColWidth);
      const centerX = colX + (ratingColWidth - regularFont.widthOfTextAtSize('X', 8)) / 2;
      const centerY = rowY - rowHeight / 2 + 3; // Adjusted for smaller rows

      // Mark if this rating matches
      if (rating === ratingValue) {
        page.drawText('X', {
          x: centerX,
          y: centerY,
          size: 8,
          font: boldFont,
          color: textColor,
        });
      }

      // Vertical line
      page.drawLine({
        start: { x: colX, y: rowY },
        end: { x: colX, y: rowY - rowHeight },
        thickness: 0.5,
        color: rgbFn(0, 0, 0),
      });
    }
    
    // Vertical line between CRITERIA and rating columns
    page.drawLine({
      start: { x: tableStartX + criteriaColWidth, y: rowY },
      end: { x: tableStartX + criteriaColWidth, y: rowY - rowHeight },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
  };

  // All evaluation items in order (matching the image)
  const allEvaluationItems: Array<{ text: string; key: string; section?: string; subsection?: string }> = [
    // Section A: WORK PERFORMANCE
    { text: 'Section A: WORK PERFORMANCE', key: '', section: 'A' },
    { text: '1. Shows creativity and originality in the work given', key: 'workPerformance1' },
    { text: '2. Apply the theories and knowledge learned at school on the task/project given', key: 'workPerformance2' },
    { text: '3. Demonstrates the skills and ability to use technology tools in the process of conducting tasks', key: 'workPerformance3' },
    { text: '4. Has a clear description and understanding about the task given by the superior and can able to grasp the instructions easily.', key: 'workPerformance4' },
    { text: '5. Exhibits innovativeness in the quality of work with regards to the unexpected work load demands of the superiors in a limited time', key: 'workPerformance5' },
    { text: '6. Can able to accomplish the task given and display the desired output/quality of the task.', key: 'workPerformance6' },
    // Section B: PERSONAL QUALITIES
    { text: 'Section B: PERSONAL QUALITIES', key: '', section: 'B' },
    // Communication Skills
    { text: 'Communication Skills', key: '', subsection: 'Communication' },
    { text: '1. Communicates with supervisors regularly and gives updates with regards to the assigned task given to him/her', key: 'communication1' },
    { text: '2. Promotes good communication effectively with regards to dealing with people he/she is associated with', key: 'communication2' },
    // Interpersonal Skills
    { text: 'Interpersonal Skills', key: '', subsection: 'Interpersonal' },
    // Professional Conduct (from page 3, but shown as part of unified table)
    { text: '1. Demonstrates respect and courtesy in interacting with superiors, employees and co-interns in his/her assigned organization', key: 'professionalConduct1' },
    { text: '2. Establishes comfortable and good working relationship with peers and supervisors', key: 'professionalConduct2' },
    { text: '3. Listens well with superiors and never hesitates to ask questions whenever it is necessary', key: 'professionalConduct3' },
    // Punctuality
    { text: 'Punctuality', key: '', subsection: 'Punctuality' },
    { text: '1. Demonstrated punctuality at work as he/she arrives and leaves on time', key: 'punctuality1' },
    { text: '2. He/she reports to the organization to the specified work schedule.', key: 'punctuality2' },
    { text: '3. Practices diligence and professionalism at work', key: 'punctuality3' },
    // Flexibility
    { text: 'Flexibility', key: '', subsection: 'Flexibility' },
    { text: '1. Exhibits flexibility and can able to adapt to the changes that might occur during the process of conducting the task', key: 'flexibility1' },
    { text: '2. Carry out orders easily and pays attention to the details of the tasks', key: 'flexibility2' },
    // Attitude
    { text: 'Attitude', key: '', subsection: 'Attitude' },
    { text: '1. Displays optimism and perseverance in the conduct of the task', key: 'attitude1' },
    { text: '2. Demonstrates willingness to accept direction, pieces of advice, words of wisdom and constructive counseling from superiors for the improvement of tasks', key: 'attitude2' },
    { text: '3. Exhibits the zeal to learn and be trained to improve capabilities and skills', key: 'attitude3' },
    { text: '4. Promotes self-confidence and poise and shows maturity in handling emotions and mental pressure', key: 'attitude4' },
    { text: '5. Exercises self-discipline and demonstrates dedication as well as commitment to his/her assigned tasks', key: 'attitude5' },
    // Reliability
    { text: 'Reliability', key: '', subsection: 'Reliability' },
    { text: '1. Knows how to handle tasks even without supervision and does not depend on others to do the tasks given to him/her', key: 'reliability1' },
    { text: '2. Follows orders and finishes the tasks within the specified period of time', key: 'reliability2' },
    { text: '3. Acts accordingly at work and carry out the tasks given to him/her with responsibility', key: 'reliability3' },
    { text: '4. Has a great deal of initiative and the drive to do what is required in the given task', key: 'reliability4' },
  ];

  // Track which page we're drawing on and cursor position
  let currentPage = page2;
  let currentCursorY = cursorY;
  let itemsDrawn = 0;

  // Draw all items in the unified table
  for (const item of allEvaluationItems) {
    // Check if we need to move to page 3
    if (currentCursorY < 100 && currentPage === page2) {
      // Move to page 3
      currentPage = page3;
      currentCursorY = pageHeight - 80; // Start from top of page 3
    }

    const rowY = currentCursorY;

    // If it's a section/subsection header, draw it as text (not a table row)
    if (!item.key) {
      if (item.section) {
        // Section header (A or B)
        currentPage.drawText(item.text, {
          x: tableStartX,
          y: currentCursorY -  10,
          size: 10,
          font: boldFont,
          color: textColor,
        });
        currentCursorY -= 20; // Reduced spacing for section headers
      } else if (item.subsection) {
        // Subsection header (Communication Skills, Punctuality, etc.)
        currentPage.drawText(item.text, {
          x: tableStartX + 20,
          y: currentCursorY - 10,
          size: 9,
          font: boldFont,
          color: textColor,
        });
        currentCursorY -= 18; // Reduced spacing for subsection headers
      }
      continue;
    }

    // Draw table row for this item
    const rating = (evaluationData as any)[item.key] as number | undefined;
    drawTableRow(currentPage, rowY, item.text, rating);
    currentCursorY -= rowHeight + rowGap; // Add gap between rows
    itemsDrawn++;
  }

  // Draw TOTAL row on page 3
  const totalRowY = currentCursorY;
  currentPage.drawRectangle({
    x: tableStartX,
    y: totalRowY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    borderColor: rgbFn(0, 0, 0),
    borderWidth: 1,
  });

  currentPage.drawText('TOTAL', {
    x: tableStartX + 5,
    y: totalRowY - rowHeight + 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });

  // Calculate and display total score
  const totalScore = evaluationData.totalScore || 0;
  const totalScoreText = totalScore.toString();
  const totalScoreX = tableStartX + tableWidth - 50 - regularFont.widthOfTextAtSize(totalScoreText, 9);
  currentPage.drawText(totalScoreText, {
    x: totalScoreX,
    y: totalRowY - rowHeight + 6,
    size: 9,
    font: boldFont,
    color: textColor,
  });

  // Draw vertical lines in TOTAL row
  for (let i = 0; i <= 5; i++) {
    const colX = tableStartX + (i === 0 ? 0 : criteriaColWidth + ((i - 1) * ratingColWidth));
    currentPage.drawLine({
      start: { x: colX, y: totalRowY },
      end: { x: colX, y: totalRowY - rowHeight },
      thickness: 0.5,
      color: rgbFn(0, 0, 0),
    });
  }

  cursorY = totalRowY - rowHeight - 30;

  console.log(`✅ Drew Supervisor Evaluation Form Page 2 (page ${startPageIndex + 2})`);

  // ========== Signature Section (on page 3, after TOTAL row) ==========
  // Draw signature section on the current page (should be page3) after TOTAL row
  currentCursorY = totalRowY - rowHeight - 20; // Moved up a bit
  
  // Supervisor Signature Section - centered and smaller
  // Draw supervisor signature line (at the top) - centered
  const supervisorSignatureLineWidth = 200; // Made smaller
  const supervisorSignatureLineX = (pageWidth - supervisorSignatureLineWidth) / 2; // Centered
  const supervisorSignatureLineY = currentCursorY + 20; // Moved up
  
  // Draw the underline at the top (for signature)
  currentPage.drawLine({
    start: { x: supervisorSignatureLineX, y: supervisorSignatureLineY },
    end: { x: supervisorSignatureLineX + supervisorSignatureLineWidth, y: supervisorSignatureLineY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Embed supervisor signature image if available (behind the text, positioned lower)
  if (evaluationData.supervisorSignatureUrl) {
    try {
      const signatureResponse = await fetch(evaluationData.supervisorSignatureUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });

      if (signatureResponse.ok) {
        const signatureBytes = await signatureResponse.arrayBuffer();
        const contentType = signatureResponse.headers.get('content-type') || '';

        let signatureImage;
        try {
          if (contentType.includes('png') || evaluationData.supervisorSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          }
        } catch (embedError) {
          if (contentType.includes('png') || evaluationData.supervisorSignatureUrl.toLowerCase().endsWith('.png')) {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          } else {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          }
        }

        const sigMaxWidth = supervisorSignatureLineWidth - 8;
        const sigMaxHeight = 25; // Made smaller
        const sigDims = signatureImage.scale(1);
        const sigAspectRatio = sigDims.width / sigDims.height;

        let sigWidth = sigMaxWidth;
        let sigHeight = sigMaxWidth / sigAspectRatio;

        if (sigHeight > sigMaxHeight) {
          sigHeight = sigMaxHeight;
          sigWidth = sigHeight * sigAspectRatio;
        }

        const sigX = supervisorSignatureLineX + (supervisorSignatureLineWidth - sigWidth) / 2;
        const sigY = supervisorSignatureLineY - 5; // Position below the line, behind text

        // Draw image first (behind text)
        currentPage.drawImage(signatureImage, {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
      }
    } catch (error) {
      console.error('❌ Error embedding supervisor signature:', error);
    }
  }

  // Draw "Supervisor" text below the line (centered, bold) - drawn after image so it appears on top
  const supervisorLabel = 'Supervisor';
  const supervisorLabelWidth = boldFont.widthOfTextAtSize(supervisorLabel, 9); // Made smaller
  const supervisorLabelX = supervisorSignatureLineX + (supervisorSignatureLineWidth - supervisorLabelWidth) / 2;
  currentPage.drawText(supervisorLabel, {
    x: supervisorLabelX,
    y: supervisorSignatureLineY - 10,
    size: 9, // Made smaller
    font: boldFont,
    color: textColor,
  });

  // "(Name over Printed Name)" text below "Supervisor" (centered)
  const nameOverPrintedText = '(Name over Printed Name)';
  const nameOverPrintedWidth = regularFont.widthOfTextAtSize(nameOverPrintedText, 8); // Made smaller
  const nameOverPrintedX = supervisorSignatureLineX + (supervisorSignatureLineWidth - nameOverPrintedWidth) / 2;
  currentPage.drawText(nameOverPrintedText, {
    x: nameOverPrintedX,
    y: supervisorSignatureLineY - 20,
    size: 8, // Made smaller
    font: regularFont,
    color: textColor,
  });

  // Draw supervisor name text below "(Name over Printed Name)" if available
  if (evaluationData.supervisorName) {
    const supervisorNameText = evaluationData.supervisorName.toUpperCase();
    const supervisorNameWidth = regularFont.widthOfTextAtSize(supervisorNameText, 9); // Made smaller
    const supervisorNameX = supervisorSignatureLineX + (supervisorSignatureLineWidth - supervisorNameWidth) / 2;
    currentPage.drawText(supervisorNameText, {
      x: supervisorNameX,
      y: supervisorSignatureLineY - 30,
      size: 9, // Made smaller
      font: regularFont,
      color: textColor,
    });
  }

  // Company Signature Section (below supervisor signature) - centered and smaller
  currentCursorY = supervisorSignatureLineY - 45; // Moved up, less spacing
  
  // Draw company signature line (at the top) - centered
  const companySignatureLineWidth = 200; // Made smaller
  const companySignatureLineX = (pageWidth - companySignatureLineWidth) / 2; // Centered
  const companySignatureLineY = currentCursorY - 2;

  // Draw the underline at the top (for signature)
  currentPage.drawLine({
    start: { x: companySignatureLineX, y: companySignatureLineY },
    end: { x: companySignatureLineX + companySignatureLineWidth, y: companySignatureLineY },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  // Embed company signature image if available (behind the text, positioned lower)
  if (evaluationData.companySignatureUrl) {
    try {
      const companySignatureResponse = await fetch(evaluationData.companySignatureUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });

      if (companySignatureResponse.ok) {
        const companySignatureBytes = await companySignatureResponse.arrayBuffer();
        const contentType = companySignatureResponse.headers.get('content-type') || '';

        let companySignatureImage;
        try {
          if (contentType.includes('png') || evaluationData.companySignatureUrl.toLowerCase().endsWith('.png')) {
            companySignatureImage = await pdfDoc.embedPng(companySignatureBytes);
          } else {
            companySignatureImage = await pdfDoc.embedJpg(companySignatureBytes);
          }
        } catch (embedError) {
          if (contentType.includes('png') || evaluationData.companySignatureUrl.toLowerCase().endsWith('.png')) {
            companySignatureImage = await pdfDoc.embedJpg(companySignatureBytes);
          } else {
            companySignatureImage = await pdfDoc.embedPng(companySignatureBytes);
          }
        }

        const companySigMaxWidth = companySignatureLineWidth - 8;
        const companySigMaxHeight = 25; // Made smaller
        const companySigDims = companySignatureImage.scale(1);
        const companySigAspectRatio = companySigDims.width / companySigDims.height;

        let companySigWidth = companySigMaxWidth;
        let companySigHeight = companySigMaxWidth / companySigAspectRatio;

        if (companySigHeight > companySigMaxHeight) {
          companySigHeight = companySigMaxHeight;
          companySigWidth = companySigHeight * companySigAspectRatio;
        }

        const companySigX = companySignatureLineX + (companySignatureLineWidth - companySigWidth) / 2;
        const companySigY = companySignatureLineY - 5; // Position below the line, behind text

        // Draw image first (behind text)
        currentPage.drawImage(companySignatureImage, {
          x: companySigX,
          y: companySigY,
          width: companySigWidth,
          height: companySigHeight,
        });
      }
    } catch (error) {
      console.error('❌ Error embedding company signature:', error);
    }
  }

  // Draw "Company Signature" label below the line - drawn after image so it appears on top
  const companySignatureLabel = 'Company Signature';
  const companySignatureLabelWidth = regularFont.widthOfTextAtSize(companySignatureLabel, 9); // Made smaller
  const companySignatureLabelX = companySignatureLineX + (companySignatureLineWidth - companySignatureLabelWidth) / 2;
  currentPage.drawText(companySignatureLabel, {
    x: companySignatureLabelX,
    y: companySignatureLineY - 10,
    size: 9, // Made smaller
    font: regularFont,
    color: textColor,
  });

  // Update cursor for date section - moved up to avoid footer
  currentCursorY = companySignatureLineY - 25;

  // Date - centered
  const dateLabel = 'Date:';
  const dateLabelWidth = regularFont.widthOfTextAtSize(dateLabel, 9); // Made smaller
  const dateLabelX = (pageWidth - 200) / 2; // Centered with space for date value
  currentPage.drawText(dateLabel, {
    x: dateLabelX,
    y: currentCursorY,
    size: 9, // Made smaller
    font: regularFont,
    color: textColor,
  });
  const evalDate = evaluationData.evaluationDate
    ? new Date(evaluationData.evaluationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const dateValueWidth = regularFont.widthOfTextAtSize(evalDate, 9); // Made smaller
  const dateValueX = dateLabelX + dateLabelWidth + 5; // Small gap after label
  currentPage.drawText(evalDate, {
    x: dateValueX,
    y: currentCursorY,
    size: 9, // Made smaller
    font: regularFont,
    color: textColor,
  });
  // Calculate max underline width to prevent hitting edge (leave 20pt margin from right edge)
  const dateMaxUnderlineWidth = pageWidth - dateValueX - horizontalMargin - 20;
  currentPage.drawLine({
    start: { x: dateValueX, y: currentCursorY - 2 },
    end: { x: dateValueX + Math.max(dateValueWidth, Math.min(dateMaxUnderlineWidth, 200)), y: currentCursorY - 2 },
    thickness: 0.5,
    color: rgbFn(0, 0, 0),
  });

  console.log(`✅ Drew Supervisor Evaluation Form Page 2 (page ${startPageIndex + 2})`);
  console.log(`✅ Drew Supervisor Evaluation Form Page 3 (page ${startPageIndex + 3})`);
};

/**
 * Draws a certificate on a PDF page (full-size, one per page)
 * Fetches the certificate image from Cloudinary and embeds it
 * Certificate image only, no additional information below
 */
const drawCertificate = async (
  page: PDFPage,
  certificate: CertificateEntry,
  pdfDoc: any,
  regularFont: PDFFont,
  boldFont: PDFFont,
  baseText: ReturnType<typeof import('pdf-lib').rgb>,
  mutedText: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb,
  pageWidth: number,
  pageHeight: number,
  horizontalMargin: number
) => {
  try {
    console.log('📷 Fetching certificate image:', certificate.certificateUrl);
    
    // Fetch certificate image from Cloudinary
    const imageResponse = await fetch(certificate.certificateUrl, {
      mode: 'cors',
      cache: 'no-cache',
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch certificate image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBytes = await imageResponse.arrayBuffer();
    console.log('📷 Certificate image fetched, size:', imageBytes.byteLength, 'bytes');

    // Determine image type and embed accordingly
    const contentType = imageResponse.headers.get('content-type') || '';
    console.log('📷 Certificate content type:', contentType);

    let certificateImage;
    try {
      if (contentType.includes('png') || certificate.certificateUrl.toLowerCase().endsWith('.png')) {
        certificateImage = await pdfDoc.embedPng(imageBytes);
        console.log('📷 Certificate PNG image embedded successfully');
      } else {
        certificateImage = await pdfDoc.embedJpg(imageBytes);
        console.log('📷 Certificate JPG image embedded successfully');
      }
    } catch (embedError) {
      // Try the other format if one fails
      console.log('📷 First format failed, trying alternative...');
      if (contentType.includes('png') || certificate.certificateUrl.toLowerCase().endsWith('.png')) {
        certificateImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        certificateImage = await pdfDoc.embedPng(imageBytes);
      }
    }

    // Calculate certificate image dimensions to fit on the page
    const topMargin = 50; // Space at top
    const bottomMargin = 50; // Space at bottom
    const sideMargin = horizontalMargin;
    
    const maxImageWidth = pageWidth - (sideMargin * 2);
    const maxImageHeight = pageHeight - topMargin - bottomMargin;
    
    const imageDims = certificateImage.scale(1);
    const imageAspectRatio = imageDims.width / imageDims.height;
    
    // Calculate dimensions to fit within available space while maintaining aspect ratio
    let imgWidth = maxImageWidth;
    let imgHeight = maxImageWidth / imageAspectRatio;
    
    // If height exceeds max, scale down
    if (imgHeight > maxImageHeight) {
      imgHeight = maxImageHeight;
      imgWidth = imgHeight * imageAspectRatio;
    }
    
    // Center the image horizontally
    const imgX = (pageWidth - imgWidth) / 2;
    // Position from top (PDF coordinates: Y=0 is bottom, Y=792 is top)
    const imgY = pageHeight - topMargin - imgHeight;
    
    console.log('📷 Drawing certificate image at:', {
      x: imgX,
      y: imgY,
      width: imgWidth,
      height: imgHeight
    });
    
    // Draw the certificate image
    page.drawImage(certificateImage, {
      x: imgX,
      y: imgY,
      width: imgWidth,
      height: imgHeight,
    });
    
    // No additional information drawn below certificate (removed company name, date, and total hours)
    
    console.log('✅ Certificate image drawn successfully');
  } catch (error) {
    console.error('❌ Error drawing certificate:', error);
    
    // Fallback: Draw error message
    const errorText = 'Certificate image unavailable';
    const errorWidth = regularFont.widthOfTextAtSize(errorText, 12);
    page.drawText(errorText, {
      x: (pageWidth - errorWidth) / 2,
      y: pageHeight / 2,
      size: 12,
      font: regularFont,
      color: mutedText,
    });
  }
};

/**
 * Draws empty HTE layout on page 17 (or other pages when no HTE info available)
 * Uses the same structure as drawHTEInformationPage but with empty underlines only
 */
const drawWaitingHTELayout = async (
  page: PDFPage,
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb
) => {
  // Draw the same layout structure as page 16, but with empty underlines only (no text)
  
  // Layout structure matching page 16
  const layout: Array<{
    label: string;
    labelX: number;
    y: number;
    underlineWidth?: number;
  }> = [
    // Row 1: Name of the HTE
    { label: 'Name of the HTE: ', labelX: 100, y: 440, underlineWidth: 400 },
    // Row 2: Address
    { label: 'Address: ', labelX: 100, y: 415, underlineWidth: 460 },
    // Row 3: Nature of the HTE
    { label: 'Nature of the HTE: ', labelX: 100, y: 390, underlineWidth: 350 },
    // Row 4: Head of the HTE
    { label: 'Head of the HTE: ', labelX: 100, y: 360, underlineWidth: 450 },
    // Row 5: Position
    { label: 'Position: ', labelX: 100, y: 340, underlineWidth: 460 },
    // Row 6: Immediate Supervisor of the Trainee
    { label: 'Immediate Supervisor of the Trainee:  ', labelX: 100, y: 315, underlineWidth: 280 },
    // Row 7: Position/Designation
    { label: 'Position/Designation: ', labelX: 100, y: 290, underlineWidth: 410 },
    // Row 8: Telephone No
    { label: 'Telephone No: ', labelX: 150, y: 240, underlineWidth: 200 },
    // Row 9: Mobile No (+63)
    { label: 'Mobile No: (+63) ', labelX: 150, y: 215, underlineWidth: 200 },
    // Row 10: Email Address
    { label: 'Email Address: ', labelX: 150, y: 190, underlineWidth: 430 },
  ];
  
  // Draw "Contact Information:" section label
  try {
    const contactInfoY = 265;
    page.drawText('Contact Information:', {
      x: 100,
      y: contactInfoY,
      size: 12,
      font: boldFont,
      color: textColor,
    });
  } catch (error) {
    console.error('❌ Error drawing Contact Information label:', error);
  }
  
  // Draw all labels and empty underlines (no text)
  layout.forEach(({ label, labelX, y, underlineWidth }) => {
    // Draw the label
    try {
      page.drawText(label, {
        x: labelX,
        y,
        size: 11,
        font: boldFont,
        color: textColor,
      });
    } catch (error) {
      console.error(`❌ Error drawing waiting HTE label "${label}":`, error);
    }
    
    // Draw empty underline only (no text)
    try {
      const labelWidth = boldFont.widthOfTextAtSize(label, 11);
      const actualValueX = labelX + labelWidth - 2;
      const underlineLength = underlineWidth || 300; // Default width if not specified
      const valueColor = rgbFn(0, 0, 0); // Pure black
      
      // Draw underline only (no text)
      page.drawLine({
        start: { x: actualValueX, y: y - 2 },
        end: { x: actualValueX + underlineLength, y: y - 2 },
        thickness: 0.5,
        color: valueColor,
      });
    } catch (error) {
      console.error(`❌ Error drawing waiting HTE underline for "${label}":`, error);
    }
  });
  
  console.log('📋 Drew waiting HTE layout with empty underlines only');
};

/**
 * Draws HTE (Host Training Establishment) Information on page 16
 * Similar structure to drawPersonalInformationPage
 */
const drawHTEInformationPage = async (
  page: PDFPage,
  hteInfo: HTEInformationData,
  regularFont: PDFFont,
  boldFont: PDFFont,
  textColor: ReturnType<typeof import('pdf-lib').rgb>,
  rgbFn: typeof import('pdf-lib').rgb
) => {
  const resolveValue = (value: string, uppercase: boolean = true) =>
    formatPersonalValue(value, { uppercase }) || 'N/A';
  
  // Check if HTE info is complete (all required fields filled)
  const requiredFields: Array<keyof HTEInformationData> = [
    'natureOfHte',
    'headOfHte',
    'headPosition',
    'immediateSupervisor',
    'supervisorPosition',
    'telephoneNo',
    'mobileNo',
    'emailAddress'
  ];
  
  const isComplete = requiredFields.every(field => {
    const value = hteInfo[field];
    return value && value.toString().trim().length > 0;
  });
  
  // If incomplete, only show company name and address
  if (!isComplete) {
    console.log('⚠️ HTE information incomplete, showing only company name and address');
    
    // Draw company name
    if (hteInfo.companyName) {
      const label = 'Name of the HTE: ';
      const value = resolveValue(hteInfo.companyName);
      const labelX = 100;
      const labelWidth = boldFont.widthOfTextAtSize(label, 11);
      const valueX = labelX + labelWidth - 2;
      
      page.drawText(label, {
        x: labelX,
        y: 440,
        size: 11,
        font: boldFont,
        color: textColor,
      });
      
      const valueColor = rgbFn(0, 0, 0);
      const textWidth = regularFont.widthOfTextAtSize(value, 11);
      
      page.drawText(value, {
        x: valueX,
        y: 440,
        size: 11,
        font: regularFont,
        color: valueColor,
      });
      
      page.drawLine({
        start: { x: valueX, y: 438 },
        end: { x: valueX + textWidth, y: 438 },
        thickness: 0.5,
        color: valueColor,
      });
    }
    
    // Draw company address
    if (hteInfo.companyAddress) {
      const label = 'Address: ';
      const value = resolveValue(hteInfo.companyAddress);
      const labelX = 100;
      const labelWidth = boldFont.widthOfTextAtSize(label, 11);
      const valueX = labelX + labelWidth - 2;
      
      page.drawText(label, {
        x: labelX,
        y: 415,
        size: 11,
        font: boldFont,
        color: textColor,
      });
      
      const valueColor = rgbFn(0, 0, 0);
      const lines = wrapText(value, regularFont, 11, 460);
      lines.forEach((line, index) => {
        const lineY = 415 - index * 12;
        const textWidth = regularFont.widthOfTextAtSize(line, 11);
        
        page.drawText(line, {
          x: valueX,
          y: lineY,
          size: 11,
          font: regularFont,
          color: valueColor,
        });
        
        page.drawLine({
          start: { x: valueX, y: lineY - 2 },
          end: { x: valueX + textWidth, y: lineY - 2 },
          thickness: 0.5,
          color: valueColor,
        });
      });
    }
    
    return; // Exit early, only showing company name and address
  }
  
  // Layout for HTE information fields on page 16
  // Values appear beside labels on the same line (matching the template)
  // Order: HTE fields first, then Contact Information section label, then contact fields
  const layout: Array<{
    label: string;
    key: keyof HTEInformationData;
    labelX: number;
    valueX: number;
    y: number;
    maxWidth?: number;
    uppercase?: boolean;
  }> = [
    // Row 1: Name of the HTE (value immediately after label, no gap) - moved to right and up
    { label: 'Name of the HTE: ', key: 'companyName', labelX: 100, valueX: 50, y: 440, maxWidth: 400 },
    // Row 2: Address (value immediately after label, no gap) - moved to right and up
    { label: 'Address: ', key: 'companyAddress', labelX: 100, valueX: 50, y: 415, maxWidth: 460 },
    // Row 3: Nature of the HTE (value immediately after label, no gap) - moved to right and up, increased width to prevent cutoff
    { label: 'Nature of the HTE: ', key: 'natureOfHte', labelX: 100, valueX: 50, y: 390, maxWidth: 350 },
    // Row 4: Head of the HTE (value immediately after label, no gap) - moved to right and up with gap after Nature
    { label: 'Head of the HTE: ', key: 'headOfHte', labelX: 100, valueX: 50, y: 360, maxWidth: 450 },
    // Row 5: Position (value immediately after label, no gap) - moved to right and up
    { label: 'Position: ', key: 'headPosition', labelX: 100, valueX: 50, y: 340, maxWidth: 460 },
    // Row 6: Immediate Supervisor of the Trainee (value immediately after label, no gap) - moved to right and up, increased width
    { label: 'Immediate Supervisor of the Trainee:  ', key: 'immediateSupervisor', labelX: 100, valueX: 50, y: 315, maxWidth: 280 },
    // Row 7: Position/Designation (value immediately after label, no gap) - moved to right and up, increased width
    { label: 'Position/Designation: ', key: 'supervisorPosition', labelX: 100, valueX: 50, y: 290, maxWidth: 410 },
    // Contact Information section label will be drawn at y: 245 (below supervisor fields with gap)
    // Row 8: Telephone No (value immediately after label, no gap) - moved to right and up
    { label: 'Telephone No: ', key: 'telephoneNo', labelX: 150, valueX: 50, y: 240 },
    // Row 9: Mobile No (+63) (value immediately after label, no gap) - moved to right and up
    { label: 'Mobile No: (+63) ', key: 'mobileNo', labelX: 150, valueX: 50, y: 215 },
    // Row 10: Email Address (value immediately after label, no gap) - moved to right and up
    { label: 'Email Address: ', key: 'emailAddress', labelX: 150, valueX: 50, y: 190, uppercase: false, maxWidth: 430 },
  ];
  
  // Draw "Contact Information:" section label after supervisor fields (below Position/Designation with gap) - moved to right and up
  try {
    const contactInfoY = 265; // Y position for "Contact Information:" label (below Position/Designation at y: 290, with 25pt gap)
    page.drawText('Contact Information:', {
      x: 100,
      y: contactInfoY,
      size: 12,
      font: boldFont,
      color: textColor,
    });
  } catch (error) {
    console.error('❌ Error drawing Contact Information label:', error);
  }

  let fieldsDrawn = 0;
  layout.forEach(({ label, key, labelX, valueX, y, maxWidth, uppercase = true }) => {
    // Draw the label
    try {
      page.drawText(label, {
        x: labelX,
        y,
        size: 11,
        font: boldFont,
        color: textColor,
      });
    } catch (error) {
      console.error(`❌ Error drawing HTE label "${label}":`, error);
    }

    // Get the raw value from hteInfo
    let rawValue = hteInfo[key];
    
    // Special handling for mobile number - format for display
    // The label already includes "(+63)", so we just need the number part
    if (key === 'mobileNo' && rawValue && rawValue.toString().trim().length > 0) {
      const mobileDigits = rawValue.toString().trim();
      // If it starts with 09, remove the leading 0 (since +63 is in the label)
      if (mobileDigits.startsWith('09')) {
        rawValue = mobileDigits.substring(1); // Remove leading 0, keep rest
      } else if (mobileDigits.startsWith('+63')) {
        rawValue = mobileDigits.substring(3); // Remove +63 prefix if present
      } else if (mobileDigits.startsWith('63')) {
        rawValue = mobileDigits.substring(2); // Remove 63 prefix if present
      }
    }
    
    // Special handling for telephone - show "Not Applicable" if empty
    if (key === 'telephoneNo' && (!rawValue || rawValue.toString().trim().length === 0)) {
      rawValue = 'Not Applicable';
    }
    
    // Only draw value if it exists and is not empty (or is "Not Applicable" for telephone)
    if (rawValue && rawValue.toString().trim().length > 0) {
      try {
        // Don't uppercase "Not Applicable" or email addresses
        const shouldUppercase = uppercase && key !== 'emailAddress' && rawValue !== 'Not Applicable';
        const value = shouldUppercase ? resolveValue(rawValue, true) : rawValue;
        
        // Calculate label width to position value right after it with no gap
        const labelWidth = boldFont.widthOfTextAtSize(label, 11);
        
        // Determine value position
        // Values always appear on the same line as labels, positioned immediately after the label with no gap
        const valueY = y;
        // Position value immediately after label (labelX + labelWidth) with no gap
        // Move slightly to the left by using a small offset (2-3 points) to bring values closer
        const actualValueX = labelX + labelWidth - 2;
        
        if (maxWidth) {
          const lines = wrapText(value, regularFont, 11, maxWidth);
          lines.forEach((line, index) => {
            const lineY = valueY - index * 12;
            const valueColor = rgbFn(0, 0, 0); // Pure black
            const textWidth = regularFont.widthOfTextAtSize(line, 11);
            
            // Draw the text
            page.drawText(line, {
              x: actualValueX,
              y: lineY,
              size: 11,
              font: regularFont,
              color: valueColor,
            });
            
            // Draw underline for the text
            page.drawLine({
              start: { x: actualValueX, y: lineY - 2 },
              end: { x: actualValueX + textWidth, y: lineY - 2 },
              thickness: 0.5,
              color: valueColor,
            });
          });
        } else {
          const valueColor = rgbFn(0, 0, 0); // Pure black
          const textWidth = regularFont.widthOfTextAtSize(value, 11);
          
          // Draw the text
          page.drawText(value, {
            x: actualValueX,
            y: valueY,
            size: 11,
            font: regularFont,
            color: valueColor,
          });
          
          // Draw underline for the text
          page.drawLine({
            start: { x: actualValueX, y: valueY - 2 },
            end: { x: actualValueX + textWidth, y: valueY - 2 },
            thickness: 0.5,
            color: valueColor,
          });
        }
        fieldsDrawn++;
      } catch (error) {
        console.error(`❌ Error drawing HTE value for "${label}" (${key}):`, error);
      }
    }
  });
  
  console.log(`📋 Drew ${fieldsDrawn} HTE information fields`);
};

export const buildPersonalInformation = (
  profile: StudentProfileDetails,
  fallbackEmail: string,
  rawUser?: any // Optional raw user data from API to check actual field values
) => {
  // Debug: Log the profile data to check addresses
  console.log('📋 Building personal info from profile:', {
    permanentAddress: profile.permanentAddress,
    presentAddress: profile.presentAddress,
    emergencyContactAddress: profile.emergencyContactAddress,
    address: profile.address,
    rawUserPermanentAddress: rawUser?.permanent_address,
  });

  // Permanent address value
  const permanentAddressValue = profile.permanentAddress || profile.address || '';
  
  // Emergency contact address should use the same value as permanent address
  // (removed emergency contact address input field, so it uses permanent address)
  const emergencyAddressValue = permanentAddressValue;

  const personalInfo: PersonalInformationData = {
    fullName: [profile.firstName, profile.middleName, profile.lastName]
      .filter(name => name && name.trim() && name.trim().toUpperCase() !== 'N/A')
      .join(' ')
      .trim(),
    dateOfBirth: formatDateLongUpper(profile.dateOfBirth),
    age: typeof profile.age === 'number' && !Number.isNaN(profile.age) ? profile.age.toString() : '',
    sex: profile.sex || '',
    civilStatus: profile.civilStatus || '',
    yearLevel: profile.year || '',
    academicYear: profile.academicYear || '', // Only use database value, no fallback
    religion: profile.religion || '',
    permanentAddress: permanentAddressValue,
    presentAddress: profile.presentAddress || profile.address || '',
    contactNumber: profile.phoneNumber || '',
    emailAddress: profile.email || fallbackEmail,
    citizenship: profile.citizenship || '',
    fathersName: profile.fatherName || '',
    fathersOccupation: profile.fatherOccupation || '',
    mothersName: profile.motherName || '',
    mothersOccupation: profile.motherOccupation || '',
    emergencyContactName: profile.emergencyContactName || '',
    emergencyContactRelationship: profile.emergencyContactRelationship || '',
    emergencyContactNumber: profile.emergencyContactNumber || '',
    emergencyContactAddress: emergencyAddressValue, // Use permanent address value (same as permanent address)
  };

  // Debug: Log the built personal info to verify addresses
  console.log('📋 Built personal info:', {
    permanentAddress: personalInfo.permanentAddress,
    presentAddress: personalInfo.presentAddress,
    emergencyContactAddress: personalInfo.emergencyContactAddress,
    '⚠️ Check if permanentAddress === emergencyContactAddress': personalInfo.permanentAddress === personalInfo.emergencyContactAddress,
  });

  // Check which fields are missing
  // Show modal if at least one field is missing
  // For permanentAddress, check the raw user data if available (to avoid fallback issues)
  const missingFields = PERSONAL_INFO_FIELD_DEFINITIONS.filter((field) => {
    // Special handling for permanentAddress - check the raw user data if available
    if (field.key === 'permanentAddress') {
      // If we have raw user data, check the actual permanent_address field
      if (rawUser && rawUser.hasOwnProperty('permanent_address')) {
        const actualValue = (rawUser.permanent_address || '').toString().trim();
        return actualValue.length === 0;
      }
      // Otherwise, check profile.permanentAddress but only if it's not the same as address (fallback)
      // If permanentAddress equals address, it likely came from a fallback, so check if address exists
      if (profile.permanentAddress === profile.address && profile.address) {
        // This means permanentAddress came from the fallback, so it's missing
        return true;
      }
      const actualValue = (profile.permanentAddress || '').toString().trim();
      return actualValue.length === 0;
    }
    // For other fields, check the personalInfo value
    const value = (personalInfo[field.key] || '').toString().trim();
    return value.length === 0;
  }).map((field) => field.label);

  return { personalInfo, missingFields };
};

export const generateJournalPdf = async (
  student: JournalStudentInfo,
  personalInfo: PersonalInformationData,
  companyDtrData: CompanyDtrData[],
  evidenceEntries: EvidenceEntry[],
  hteInfoArray?: HTEInformationData[],
  certificates?: CertificateEntry[],
  trainingSchedules?: TrainingScheduleEntry[],
  studentSignatureUrl?: string,
  feedbackFormDataArray?: InternFeedbackFormData[],
  hteInfoWithCompanyId?: Array<{ hteInfo: HTEInformationData; companyId: string; companyName: string }>,
  supervisorEvaluationFormsArray?: SupervisorEvaluationFormData[]
): Promise<string> => {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const journalAsset = Asset.fromModule(require('../../../OJT Journal new 15.pdf'));
  await journalAsset.downloadAsync();

  const assetUri = journalAsset.localUri || journalAsset.uri;

  if (!assetUri) {
    throw new Error('Unable to locate OJT Journal file.');
  }

  const templateBytes = await fetch(assetUri).then(response => response.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const horizontalMargin = 40;
  const verticalMargin = 50;
  const accentColor = rgb(0.96, 0.43, 0.06);
  const sectionBorderColor = rgb(0.82, 0.82, 0.82);
  const tableHeaderFill = rgb(0.97, 0.95, 0.93);
  const mutedText = rgb(0.38, 0.38, 0.38);
  const baseText = rgb(0.12, 0.12, 0.12);

  const personalPageIndex = Math.min(3, Math.max(0, pdfDoc.getPageCount() - 1));
  const personalInfoPage = pdfDoc.getPage(personalPageIndex);
  
  // IMPORTANT: Draw personal info FIRST before any other content to ensure it's visible
  // This ensures the text is drawn on top of the template
  
  // Get photo URL from student profile if available
  const photoUrl = (student as any).photoUrl || undefined;

  // Embed profile photo if available
  if (photoUrl) {
    try {
      console.log('📷 Attempting to embed photo:', photoUrl);
      
      // Fetch image with CORS handling
      const imageResponse = await fetch(photoUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const imageBytes = await imageResponse.arrayBuffer();
      console.log('📷 Image fetched, size:', imageBytes.byteLength, 'bytes');
      
      // Determine image type and embed accordingly
      let image;
      const contentType = imageResponse.headers.get('content-type') || '';
      console.log('📷 Content type:', contentType);
      
      try {
        if (contentType.includes('png') || photoUrl.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedPng(imageBytes);
          console.log('📷 PNG image embedded successfully');
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
          console.log('📷 JPG image embedded successfully');
        }
      } catch (embedError) {
        // Try the other format if one fails
        console.log('📷 First format failed, trying alternative...');
        if (contentType.includes('png') || photoUrl.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          image = await pdfDoc.embedPng(imageBytes);
        }
      }
      
      // Photo box dimensions: positioned in the picture box area
      // Based on the template, the picture box is below the header and title
      // Adjust Y coordinate to move it down significantly from the top
      const photoWidth = 142;
      const photoHeight = 145;
      const photoX = (615 - photoWidth) / 2 + 25; // Center horizontally then shift right: ~266 (was ~246)
      const photoY = 400; // Position lower on the page (moved down from 600 to 570, which is ~222pt from top)
      
      console.log('📷 Drawing image at:', { x: photoX, y: photoY, width: photoWidth, height: photoHeight });
      
      personalInfoPage.drawImage(image, {
        x: photoX,
        y: photoY,
        width: photoWidth,
        height: photoHeight,
      });
      
      console.log('✅ Photo embedded successfully in PDF');
    } catch (error) {
      console.error('❌ Error embedding profile photo in PDF:', error);
      // Continue without photo if embedding fails
    }
  } else {
    console.log('📷 No photo URL provided');
  }

  // Try to fill form fields first, then fall back to manual drawing
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (fields.length > 0) {
      // Map field names to our data
      const fieldMap: Record<string, keyof PersonalInformationData> = {
        'fullname': 'fullName', 'name': 'fullName', 'nameofintern': 'fullName',
        'dateofbirth': 'dateOfBirth', 'dob': 'dateOfBirth',
        'age': 'age',
        'sex': 'sex', 'gender': 'sex',
        'civilstatus': 'civilStatus',
        'yearlevel': 'yearLevel', 'year': 'yearLevel',
        'academicyear': 'academicYear',
        'religion': 'religion',
        // Address fields - order matters! Check permanent/present before emergency
        'permanentaddress': 'permanentAddress',
        'presentaddress': 'presentAddress',
        'contactnumber': 'contactNumber', 'phone': 'contactNumber',
        'emailaddress': 'emailAddress', 'email': 'emailAddress',
        'citizenship': 'citizenship',
        'fathersname': 'fathersName', 'fathername': 'fathersName',
        'fathersoccupation': 'fathersOccupation',
        'mothersname': 'mothersName', 'mothername': 'mothersName',
        'mothersoccupation': 'mothersOccupation',
        'emergencycontactname': 'emergencyContactName', 'emergencycontact': 'emergencyContactName',
        'emergencycontactrelationship': 'emergencyContactRelationship',
        'emergencycontactnumber': 'emergencyContactNumber', 'emergencyphone': 'emergencyContactNumber',
        // Emergency address - must come after permanent/present to avoid conflicts
        'emergencycontactaddress': 'emergencyContactAddress', 'emergencyaddress': 'emergencyContactAddress',
      };
      
      let filled = false;
      // Skip form field filling for address fields to avoid conflicts - use manual drawing instead
      const addressFields = ['permanentaddress', 'presentaddress', 'emergencycontactaddress', 'emergencyaddress', 'address'];
      const isAddressField = (fieldName: string) => addressFields.some(addr => fieldName.includes(addr));
      
      fields.forEach((field) => {
        const fieldName = field.getName().toLowerCase().replace(/\s+/g, '');
        
        // Skip address fields - let manual drawing handle them to avoid conflicts
        if (isAddressField(fieldName)) {
          console.log(`⏭️ Skipping form field "${fieldName}" - will use manual drawing for address fields`);
          return;
        }
        
        let matched = false;
        for (const [mapKey, infoKey] of Object.entries(fieldMap)) {
          // Check for exact match first (more specific), then includes
          if (fieldName === mapKey || (fieldName.includes(mapKey) && !matched)) {
            // For address fields, be more specific to avoid cross-matching
            if (mapKey.includes('address')) {
              // Ensure permanent address doesn't match emergency address fields
              if (mapKey === 'permanentaddress' && fieldName.includes('emergency')) {
                continue; // Skip - this is an emergency field, not permanent
              }
              // Ensure emergency address doesn't match permanent address fields
              if (mapKey.includes('emergency') && (fieldName.includes('permanent') || fieldName.includes('present'))) {
                continue; // Skip - this is a permanent/present field, not emergency
              }
            }
            
            const value = formatPersonalValue(personalInfo[infoKey], { uppercase: infoKey !== 'emailAddress' });
            
            // Debug: Log address field mappings
            if (infoKey === 'permanentAddress' || infoKey === 'emergencyContactAddress') {
              console.log(`📋 Form field mapping:`, {
                fieldName,
                mapKey,
                infoKey,
                value,
                personalInfoPermanentAddress: personalInfo.permanentAddress,
                personalInfoEmergencyAddress: personalInfo.emergencyContactAddress,
              });
            }
            
            if (value && value !== 'N/A') {
              try {
                if ('setText' in field) {
                  (field as any).setText(value);
                  filled = true;
                  matched = true;
                }
              } catch (e) {
                // Skip if field type doesn't support setText
              }
            }
            if (matched) break; // Stop after first match
          }
        }
      });
      
      // Always use manual drawing to ensure correct values (form fields might have conflicts)
      console.log('📋 Using manual drawing for personal information (form fields may have conflicts)');
      await drawPersonalInformationPage(personalInfoPage, personalInfo, regularFont, boldFont, baseText, rgb, photoUrl);
    } else {
      await drawPersonalInformationPage(personalInfoPage, personalInfo, regularFont, boldFont, baseText, rgb, photoUrl);
    }
  } catch (error) {
    // No form fields available, use manual drawing
    await drawPersonalInformationPage(personalInfoPage, personalInfo, regularFont, boldFont, baseText, rgb, photoUrl);
  }

  // Draw Daily Time Record forms (pages 20-30)
  // Always create pages 20-30 with table structure, fill with data when available
  const entriesPerPage = 10; // 10 rows per page
  const studentName = personalInfo.fullName || student.name || '';
  const totalDtrPages = 11; // Pages 20-30 (indices 19-29)
  const startPageIndex = 19; // Page 20 (index 19)
  const endPageIndex = 29; // Page 30 (index 29)
  
  try {
    // Create all DTR pages (20-30) first
    for (let pageIndex = startPageIndex; pageIndex <= endPageIndex; pageIndex++) {
      let dtrPage;
      if (pageIndex < pdfDoc.getPageCount()) {
        dtrPage = pdfDoc.getPage(pageIndex);
      } else {
        // Create a new page if it doesn't exist
        const [templatePage] = pdfDoc.getPages();
        dtrPage = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
        console.log('📄 Created new page', pageIndex + 1, 'for DTR');
      }
    }
    
    // Now fill pages with data from companies
    let currentPageIndex = startPageIndex;
    let companyDataIndex = 0;
    
    if (companyDtrData.length > 0) {
      console.log('📋 Drawing Daily Time Record forms for', companyDtrData.length, 'companies');
      
      // Iterate through each company
      for (const companyData of companyDtrData) {
        const { companyName, companyAddress, attendanceEntries, signatureUrl } = companyData;
        
        // Filter to only show accepted attendance records
        const acceptedEntries = attendanceEntries.filter(entry => 
          entry.verification_status === 'accepted'
        );
        
        if (acceptedEntries.length === 0) {
          console.log(`⏭️ Skipping company ${companyName} - no accepted attendance entries`);
          // Still need to draw blank pages for this company if we haven't exceeded page 30
          // But we'll skip for now and let the blank page drawing handle it
          continue;
        }
        
        const totalPages = Math.ceil(acceptedEntries.length / entriesPerPage);
        
        console.log(`📋 Drawing DTR for company "${companyName}":`, {
          totalEntries: attendanceEntries.length,
          acceptedEntries: acceptedEntries.length,
          entriesPerPage,
          totalPages,
          startingPage: currentPageIndex + 1
        });
        
        // Draw each page for this company (but don't exceed page 30)
        for (let pageNum = 0; pageNum < totalPages && currentPageIndex <= endPageIndex; pageNum++) {
          const dtrPage = pdfDoc.getPage(currentPageIndex);
          
          // Get entries for this page (only accepted entries)
          const startIndex = pageNum * entriesPerPage;
          const endIndex = Math.min(startIndex + entriesPerPage, acceptedEntries.length);
          const pageEntries = acceptedEntries.slice(startIndex, endIndex);
          
          console.log(`📋 Drawing DTR page ${currentPageIndex + 1} for "${companyName}" with ${pageEntries.length} entries`);
          
          await drawDailyTimeRecordForm(
            dtrPage, 
            studentName, 
            companyName, // HTE/Company name - display the actual value
            companyAddress, // Company address - display the actual value
            pageEntries, 
            regularFont, 
            boldFont, 
            baseText, 
            rgb, 
            pdfDoc, 
            signatureUrl, // signatureUrl - display the actual signature if available
            true, // Show header fields on all pages (Name of Student, HTE, Address, Group, Week)
            true, // Show bottom section on all pages
            pageNum > 0 // Is subsequent page within this company's section
          );
          
          // Move to next page
          currentPageIndex++;
        }
        
        console.log(`✅ Finished drawing DTR for company "${companyName}". Next company starts on page ${currentPageIndex + 1}`);
      }
    }
    
    // Fill remaining blank pages (20-30) with empty table structure
    // No company data displayed (labels only, no values)
    while (currentPageIndex <= endPageIndex) {
      const dtrPage = pdfDoc.getPage(currentPageIndex);
      const pageNum = currentPageIndex - startPageIndex;
      
      console.log(`📋 Drawing blank DTR page ${currentPageIndex + 1} with table structure`);
      
      await drawDailyTimeRecordForm(
        dtrPage, 
        studentName, 
        '', // companyName - not displayed (label only)
        '', // companyAddress - not displayed (label only)
        [], // Empty entries - table structure will still be drawn
        regularFont, 
        boldFont, 
        baseText, 
        rgb, 
        pdfDoc, 
        undefined, // signatureUrl - not displayed (no signatures)
        true, // Show header fields on all pages
        true, // Show bottom section on all pages
        pageNum > 0 // Is subsequent page
      );
      
      currentPageIndex++;
    }
    
    console.log(`✅ Finished drawing all DTR pages (20-30)`);
  } catch (error) {
    console.error('❌ Error drawing Daily Time Record form:', error);
  }

  // Draw HTE Information on pages 16, 17, 18 (indices 15, 16, 17)
  // Always draw all 3 pages - if no HTE info, show "Waiting for the upcoming HTE" layout
  // Use hteInfoWithCompanyId which has the structure { hteInfo: HTEInformationData; companyId: string; companyName: string }
  const maxHtePages = 3;
  const htePagesToDraw = hteInfoWithCompanyId && hteInfoWithCompanyId.length > 0 
    ? hteInfoWithCompanyId.slice(0, maxHtePages) 
    : [];
  
  for (let i = 0; i < maxHtePages; i++) {
    const pageNumber = 16 + i; // Pages 16, 17, 18
    const pageIndex = 15 + i; // Indices 15, 16, 17
    const hteInfoEntry = htePagesToDraw[i];
    
    try {
      // Ensure the page exists
      let hteInfoPage;
      if (pageIndex < pdfDoc.getPageCount()) {
        hteInfoPage = pdfDoc.getPage(pageIndex);
      } else {
        // Create a new page if it doesn't exist
        const [templatePage] = pdfDoc.getPages();
        hteInfoPage = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
        console.log('📄 Created new page', pageNumber, 'for HTE information');
      }
      
      if (hteInfoEntry) {
        // Draw actual HTE information
        // hteInfoEntry is of type { hteInfo: HTEInformationData; companyId: string; companyName: string }
        const hteInfoData = hteInfoEntry.hteInfo;
        console.log('📋 Drawing HTE information on page', pageNumber);
        
        // Embed HTE photo if available
        if (hteInfoData.htePhotoUrl) {
          try {
            console.log('📷 Attempting to embed HTE photo for page', pageNumber, ':', hteInfoData.htePhotoUrl);
            
            const imageResponse = await fetch(hteInfoData.htePhotoUrl, {
              mode: 'cors',
              cache: 'no-cache',
            });
            
            if (imageResponse.ok) {
              const imageBytes = await imageResponse.arrayBuffer();
              const contentType = imageResponse.headers.get('content-type') || '';
              
              let image;
              try {
                if (contentType.includes('png') || hteInfoData.htePhotoUrl.toLowerCase().endsWith('.png')) {
                  image = await pdfDoc.embedPng(imageBytes);
                } else {
                  image = await pdfDoc.embedJpg(imageBytes);
                }
              } catch (embedError) {
                if (contentType.includes('png') || hteInfoData.htePhotoUrl.toLowerCase().endsWith('.png')) {
                  image = await pdfDoc.embedJpg(imageBytes);
                } else {
                  image = await pdfDoc.embedPng(imageBytes);
                }
              }
              
              // HTE photo box dimensions - adjust based on template
              const htePhotoWidth = 350;
              const htePhotoHeight = 165;
              const htePhotoX = (615 - htePhotoWidth) / 2 + 18; // Center horizontally then shift right
              const htePhotoY = 510; // Position in the photo box area (moved up from 400)
              
              hteInfoPage.drawImage(image, {
                x: htePhotoX,
                y: htePhotoY,
                width: htePhotoWidth,
                height: htePhotoHeight,
              });
              
              console.log('✅ HTE photo embedded successfully on page', pageNumber);
            }
          } catch (error) {
            console.error('❌ Error embedding HTE photo for page', pageNumber, ':', error);
          }
        }
        
        await drawHTEInformationPage(hteInfoPage, hteInfoData, regularFont, boldFont, baseText, rgb);
        console.log('✅ HTE information drawn on page', pageNumber);
      } else {
        // Draw "Waiting for the upcoming HTE" layout (same structure as page 16)
        console.log('📋 Drawing "Waiting for upcoming HTE" layout on page', pageNumber);
        await drawWaitingHTELayout(hteInfoPage, regularFont, boldFont, baseText, rgb);
        console.log('✅ Waiting HTE layout drawn on page', pageNumber);
      }
    } catch (error) {
      console.error('❌ Error drawing HTE information on page', pageNumber, ':', error);
    }
  }

  const drawSectionHeader = (page: PDFPage, title: string) => {
    let cursorY = pageHeight - verticalMargin;
    page.drawText(title, {
      x: horizontalMargin,
      y: cursorY,
      size: 18,
      font: boldFont,
      color: accentColor,
    });

    cursorY -= 22;

    page.drawText(`Student: ${student.name}`, {
      x: horizontalMargin,
      y: cursorY,
      size: 11,
      font: regularFont,
      color: baseText,
    });

    page.drawText(`Email: ${student.email}`, {
      x: horizontalMargin + 250,
      y: cursorY,
      size: 11,
      font: regularFont,
      color: baseText,
    });

    cursorY -= 16;

    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: horizontalMargin,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: mutedText,
    });

    cursorY -= 20;

    page.drawLine({
      start: { x: horizontalMargin, y: cursorY },
      end: { x: pageWidth - horizontalMargin, y: cursorY },
      thickness: 1,
      color: accentColor,
    });

    // Return starting position with less margin for evidence cards to fit better
    return cursorY - 15;
  };

  const drawNoDataState = (page: PDFPage, cursorY: number, message: string) => {
    page.drawText(message, {
      x: horizontalMargin,
      y: cursorY,
      size: 12,
      font: regularFont,
      color: mutedText,
      maxWidth: pageWidth - horizontalMargin * 2,
    });
  };

  const drawAttendanceTable = (
    page: PDFPage,
    rows: AttendanceRecordEntry[],
    startY: number
  ) => {
    const columns: { label: string; width: number; accessor: (row: AttendanceRecordEntry) => string }[] = [
      { label: 'Date', width: 70, accessor: (row) => new Date(row.date).toLocaleDateString() },
      { label: 'Company', width: 135, accessor: (row) => row.companyName },
      { label: 'AM In', width: 55, accessor: (row) => row.amIn || '--:--' },
      { label: 'AM Out', width: 55, accessor: (row) => row.amOut || '--:--' },
      { label: 'PM In', width: 55, accessor: (row) => row.pmIn || '--:--' },
      { label: 'PM Out', width: 55, accessor: (row) => row.pmOut || '--:--' },
      {
        label: 'Hours',
        width: 55,
        accessor: (row) => (row.totalHours > 0 ? row.totalHours.toFixed(2) : '0.00'),
      },
      {
        label: 'Status',
        width: 100,
        accessor: (row) => row.status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      },
    ];

    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const headerHeight = 22;
    const rowHeight = 20;
    let cursorY = startY;

    page.drawRectangle({
      x: horizontalMargin,
      y: cursorY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: tableHeaderFill,
      borderColor: sectionBorderColor,
      borderWidth: 1,
    });

    let columnX = horizontalMargin;

    columns.forEach((column) => {
      page.drawText(column.label, {
        x: columnX + 4,
        y: cursorY - headerHeight + 6,
        size: 10,
        font: boldFont,
        color: baseText,
      });

      columnX += column.width;
    });

    cursorY -= headerHeight;

    rows.forEach((row) => {
      columnX = horizontalMargin;

      columns.forEach((column) => {
        page.drawLine({
          start: { x: columnX, y: cursorY },
          end: { x: columnX, y: cursorY - rowHeight },
          thickness: 0.5,
          color: sectionBorderColor,
        });

        const cellValue = column.accessor(row);
        page.drawText(cellValue, {
          x: columnX + 4,
          y: cursorY - rowHeight + 5,
          size: 9,
          font: regularFont,
          color: baseText,
          maxWidth: column.width - 8,
        });

        columnX += column.width;
      });

      page.drawLine({
        start: { x: horizontalMargin, y: cursorY - rowHeight },
        end: { x: horizontalMargin + tableWidth, y: cursorY - rowHeight },
        thickness: 0.5,
        color: sectionBorderColor,
      });

      cursorY -= rowHeight;

      if (row.notes) {
        const noteLines = wrapText(`Notes: ${row.notes}`, regularFont, 8, tableWidth - 10);
        noteLines.forEach((line, index) => {
          page.drawText(line, {
            x: horizontalMargin + 5,
            y: cursorY - 10 * index - 4,
            size: 8,
            font: regularFont,
            color: mutedText,
          });
        });

        cursorY -= noteLines.length * 10 + 6;
      }
    });

    return cursorY - 10;
  };

  const drawEvidenceCards = async (
    page: PDFPage,
    entries: EvidenceEntry[],
    startY: number,
    pdfDoc: any
  ) => {
    let cursorY = startY;
    // 2 columns layout: calculate card width to fit 2 cards side by side with spacing
    const gap = 20; // Gap between columns
    const cardWidth = (pageWidth - horizontalMargin * 2 - gap) / 2;
    // Reduced height to ensure all 6 cards (3 rows × 2 columns) fit on page without being cut off
    const cardHeight = 200;

    // Process entries in pairs (2 per row, 3 rows = 6 cards per page)
    for (let i = 0; i < entries.length; i += 2) {
      const leftEntry = entries[i];
      const rightEntry = entries[i + 1];
      
      // Draw left card
      if (leftEntry) {
        const leftX = horizontalMargin;
        await drawSingleEvidenceCard(page, leftEntry, leftX, cursorY, cardWidth, cardHeight, pdfDoc, regularFont, boldFont, baseText, accentColor, rgb);
      }
      
      // Draw right card
      if (rightEntry) {
        const rightX = horizontalMargin + cardWidth + gap;
        await drawSingleEvidenceCard(page, rightEntry, rightX, cursorY, cardWidth, cardHeight, pdfDoc, regularFont, boldFont, baseText, accentColor, rgb);
      }
      
      // Move to next row (reduced spacing to fit 3 rows)
      cursorY = cursorY - cardHeight - 10;
    }
  };

  const drawSingleEvidenceCard = async (
    page: PDFPage,
    entry: EvidenceEntry,
    cardX: number,
    cardY: number,
    cardWidth: number,
    cardHeight: number,
    pdfDoc: any,
    regularFont: PDFFont,
    boldFont: PDFFont,
    baseText: ReturnType<typeof import('pdf-lib').rgb>,
    accentColor: ReturnType<typeof import('pdf-lib').rgb>,
    rgbFn: typeof import('pdf-lib').rgb
  ) => {
    // Draw card background
    page.drawRectangle({
      x: cardX,
      y: cardY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      borderColor: accentColor,
      borderWidth: 1,
      color: rgbFn(0.99, 0.98, 0.95),
    });

    let textY = cardY - 28;

    // Title
    page.drawText(entry.title, {
      x: cardX + 12,
      y: textY,
      size: 12,
      font: boldFont,
      color: baseText,
      maxWidth: cardWidth - 24,
    });

    textY -= 14;

    // Company
    page.drawText(`Company: ${entry.companyName}`, {
      x: cardX + 12,
      y: textY,
      size: 9,
      font: regularFont,
      color: baseText,
      maxWidth: cardWidth - 24,
    });

    textY -= 12;

    // Submitted date
    page.drawText(`Submitted: ${new Date(entry.submittedAt).toLocaleString()}`, {
      x: cardX + 12,
      y: textY,
      size: 9,
      font: regularFont,
      color: baseText,
      maxWidth: cardWidth - 24,
    });

    textY -= 12;

    // Notes (limit to 1 line to save more space for image)
    const notesLines = wrapText(`Notes: ${entry.notes}`, regularFont, 9, cardWidth - 24);
    const notesToShow = notesLines.slice(0, 1); // Only show first line
    notesToShow.forEach((line) => {
      page.drawText(line, {
        x: cardX + 12,
        y: textY,
        size: 9,
        font: regularFont,
        color: baseText,
      });
      textY -= 10;
    });

    textY -= 4;

    // Embed and display the actual image if available
    if (entry.imageUrl) {
      try {
        console.log('📷 Fetching evidence image:', entry.imageUrl);
        const imageResponse = await fetch(entry.imageUrl, {
          mode: 'cors',
          cache: 'no-cache',
        });

        if (imageResponse.ok) {
          const imageBytes = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get('content-type') || '';

          let evidenceImage;
          try {
            if (contentType.includes('png') || entry.imageUrl.toLowerCase().endsWith('.png')) {
              evidenceImage = await pdfDoc.embedPng(imageBytes);
            } else {
              evidenceImage = await pdfDoc.embedJpg(imageBytes);
            }
          } catch (embedError) {
            // Try the other format if one fails
            if (contentType.includes('png') || entry.imageUrl.toLowerCase().endsWith('.png')) {
              evidenceImage = await pdfDoc.embedJpg(imageBytes);
            } else {
              evidenceImage = await pdfDoc.embedPng(imageBytes);
            }
          }

          // Calculate image dimensions to fit in the card (enlarged for 2 per row)
          const imageMaxWidth = cardWidth - 24; // Leave padding
          const imageMaxHeight = textY - (cardY - cardHeight) - 8; // Leave minimal space at bottom
            
          const imageDims = evidenceImage.scale(1);
          const imageAspectRatio = imageDims.width / imageDims.height;
          
          let imgWidth = imageMaxWidth;
          let imgHeight = imageMaxWidth / imageAspectRatio;
          
          // If height exceeds max, scale down
          if (imgHeight > imageMaxHeight) {
            imgHeight = imageMaxHeight;
            imgWidth = imgHeight * imageAspectRatio;
          }
          
          // Center the image horizontally within the card
          const imgX = cardX + (cardWidth - imgWidth) / 2;
          const imgY = textY - imgHeight - 5;
          
          // Draw the image
          page.drawImage(evidenceImage, {
            x: imgX,
            y: imgY,
            width: imgWidth,
            height: imgHeight,
          });
          
          console.log('✅ Evidence image embedded successfully');
        } else {
          console.error('❌ Failed to fetch evidence image:', imageResponse.status);
          // Fallback to text if image fetch fails
          page.drawText('Attachment: Image unavailable', {
            x: cardX + 12,
            y: textY,
            size: 9,
            font: regularFont,
            color: accentColor,
            maxWidth: cardWidth - 24,
          });
        }
      } catch (error) {
        console.error('❌ Error embedding evidence image:', error);
        // Fallback to text if image embedding fails
        page.drawText('Attachment: Image unavailable', {
          x: cardX + 12,
          y: textY,
          size: 9,
          font: regularFont,
          color: accentColor,
          maxWidth: cardWidth - 24,
        });
      }
    } else {
      // No image URL provided
      page.drawText('Attachment: No file provided', {
        x: cardX + 12,
        y: textY,
        size: 9,
        font: regularFont,
        color: accentColor,
        maxWidth: cardWidth - 24,
      });
    }
  };

  // Draw Attendance Record / DTR summary table in "Other Attachments" section
  // Separate by company - each company gets its own section
  if (companyDtrData.length === 0) {
    const attendancePage = pdfDoc.addPage([pageWidth, pageHeight]);
    const cursorY = drawSectionHeader(attendancePage, 'Attendance Record / DTR');
    drawNoDataState(attendancePage, cursorY, 'No attendance records have been submitted yet.');
  } else {
    // Iterate through each company and draw their attendance table separately
    for (const companyData of companyDtrData) {
      const { companyName, attendanceEntries } = companyData;
      
      // Filter to only show accepted attendance records
      const acceptedEntries = attendanceEntries.filter(entry => 
        entry.verification_status === 'accepted'
      );
      
      if (acceptedEntries.length === 0) {
        continue; // Skip companies with no accepted attendance entries
      }
      
      // Sort entries by date for this company
      const sortedEntries = [...acceptedEntries].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      const rowsPerPage = 10;
      const attendanceChunks = chunkArray(sortedEntries, rowsPerPage);

      attendanceChunks.forEach((chunk, index) => {
        const attendancePage = pdfDoc.addPage([pageWidth, pageHeight]);
        const sectionTitle = attendanceChunks.length > 1
          ? `Attendance Record / DTR - ${companyName} (Page ${index + 1} of ${attendanceChunks.length})`
          : `Attendance Record / DTR - ${companyName}`;
        const cursorY = drawSectionHeader(attendancePage, sectionTitle);

        drawAttendanceTable(attendancePage, chunk, cursorY);
      });
    }
  }

  if (evidenceEntries.length === 0) {
    const attachmentsPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const cursorY = drawSectionHeader(attachmentsPage, 'Other Attachments');
    drawNoDataState(attachmentsPage, cursorY, 'No evidence submissions have been uploaded yet.');
  } else {
    const cardsPerPage = 6; // 3 rows × 2 columns = 6 cards per page
    const evidenceChunks = chunkArray(evidenceEntries, cardsPerPage);

    for (let index = 0; index < evidenceChunks.length; index++) {
      const chunk = evidenceChunks[index];
      const attachmentsPage = pdfDoc.addPage([pageWidth, pageHeight]);
      const cursorY = drawSectionHeader(
        attachmentsPage,
        evidenceChunks.length > 1
          ? `Other Attachments (Page ${index + 1} of ${evidenceChunks.length})`
          : 'Other Attachments'
      );

      await drawEvidenceCards(attachmentsPage, chunk, cursorY, pdfDoc);
    }
  }

  // Draw Practicum Report Summary on page 31
  console.log('📋 Calling drawPracticumReportSummary with trainingSchedules:', {
    trainingSchedules,
    length: trainingSchedules?.length || 0,
    hasData: !!trainingSchedules && trainingSchedules.length > 0,
    firstEntry: trainingSchedules?.[0]
  });
  await drawPracticumReportSummary(
    pdfDoc,
    companyDtrData,
    hteInfoArray || [],
    regularFont,
    boldFont,
    baseText,
    rgb,
    evidenceEntries,
    trainingSchedules,
    studentSignatureUrl
  );

  // Draw Certificates on pages 45-46 (indices 44-45)
  // One certificate per page, full-size for readability
  const certificatePageNumbers = [45, 46]; // Pages 45 and 46
  const certificatePageIndices = [44, 45]; // Indices 44 and 45 (0-based)
  
  if (certificates && certificates.length > 0) {
    // Limit to 2 certificates (one per page)
    const certificatesToShow = certificates.slice(0, 2);
    
    console.log(`📋 Drawing ${certificatesToShow.length} certificate(s) on pages 45-46`);
    
    for (let i = 0; i < certificatesToShow.length; i++) {
      const certificate = certificatesToShow[i];
      const pageNumber = certificatePageNumbers[i];
      const pageIndex = certificatePageIndices[i];
      
      try {
        // Ensure the page exists
        let certificatePage;
        if (pageIndex < pdfDoc.getPageCount()) {
          certificatePage = pdfDoc.getPage(pageIndex);
        } else {
          // Create a new page if it doesn't exist
          const [templatePage] = pdfDoc.getPages();
          certificatePage = pdfDoc.addPage([templatePage.getWidth(), templatePage.getHeight()]);
          console.log(`📄 Created new page ${pageNumber} for certificate`);
        }
        
        console.log(`📋 Drawing certificate ${i + 1} on page ${pageNumber} for company: ${certificate.companyName}`);
        
        // Draw certificate image
        await drawCertificate(
          certificatePage,
          certificate,
          pdfDoc,
          regularFont,
          boldFont,
          baseText,
          mutedText,
          rgb,
          pageWidth,
          pageHeight,
          horizontalMargin
        );
        
        console.log(`✅ Certificate drawn successfully on page ${pageNumber}`);
      } catch (error) {
        console.error(`❌ Error drawing certificate on page ${pageNumber}:`, error);
      }
    }
    
    // If there are more than 2 certificates, log a warning
    if (certificates.length > 2) {
      console.log(`⚠️ Only showing first 2 certificates. Total certificates: ${certificates.length}`);
    }
  } else {
    // No certificates - leave pages 45-46 blank or show "No certificates available" message
    console.log('📋 No certificates to display on pages 45-46');
    
    // Optionally, you can draw a "No certificates available" message on page 45
    // For now, we'll leave the pages blank to match the template
  }

  // Draw Feedback Form on pages 34-35 (indices 33-34) - moved below certificates
  // Only draw if feedback form data exists
  await drawFeedbackForm(
    pdfDoc,
    studentName,
    hteInfoArray || [],
    regularFont,
    boldFont,
    baseText,
    rgb,
    pageWidth,
    pageHeight,
    horizontalMargin,
    studentSignatureUrl,
    feedbackFormDataArray,
    hteInfoWithCompanyId
  );

  // Draw Supervisor Evaluation Forms on pages 36-44 (indices 35-43)
  // Pages 36-38: First evaluation form (index 35-37)
  // Pages 39-41: Second evaluation form (index 38-40)
  // Pages 42-44: Third evaluation form (index 41-43)
  // Always draw forms (up to 3) - draw empty structure if no data
  const evaluationFormsToDraw = supervisorEvaluationFormsArray && supervisorEvaluationFormsArray.length > 0
    ? supervisorEvaluationFormsArray.slice(0, 3) // Max 3 evaluation forms
    : []; // Empty array if no data
  
  // Always ensure pages 36-44 exist and draw form structure
  // If we have data, fill it in; if not, draw empty forms
  const maxFormsToDraw = 3;
  
  console.log(`📋 Drawing supervisor evaluation forms on pages 36-44. Forms with data: ${evaluationFormsToDraw.length}`);
  
  for (let i = 0; i < maxFormsToDraw; i++) {
    const startPageIndex = 35 + (i * 3); // 35 for first (page 36), 38 for second (page 39), 41 for third (page 42)
    const pageNumbers = [36, 37, 38, 39, 40, 41, 42, 43, 44];
    const firstPageNumber = pageNumbers[i * 3];
    
    // Get evaluation data for this form, or create empty structure
    const evaluationData = evaluationFormsToDraw[i];
    
    try {
      console.log(`📋 Drawing supervisor evaluation form ${i + 1} starting on page ${firstPageNumber} (index ${startPageIndex})`);
      console.log(`📋 Has data: ${!!evaluationData}`);
      
      // If no data, create a minimal structure with empty values
      const formDataToDraw: SupervisorEvaluationFormData = evaluationData || {
        id: '',
        studentId: '',
        companyId: '',
        organizationCompanyName: '',
        address: '',
        city: '',
        zip: '',
        supervisorPosition: '',
        startDate: '',
        endDate: '',
        totalHours: 0,
        descriptionOfDuties: '',
        question1Performance: 'Good',
        question2SkillsCareer: true,
        question3FulltimeCandidate: true,
        question4InterestOtherTrainees: true,
        supervisorName: undefined,
        supervisorSignatureUrl: undefined,
        companySignatureUrl: undefined,
        evaluationDate: new Date().toISOString().split('T')[0],
        createdAt: '',
        updatedAt: '',
      };
      
      await drawSupervisorEvaluationForm(
        pdfDoc,
        formDataToDraw,
        studentName,
        startPageIndex,
        regularFont,
        boldFont,
        baseText,
        rgb,
        pageWidth,
        pageHeight,
        horizontalMargin
      );
      
      console.log(`✅ Supervisor evaluation form ${i + 1} drawn successfully on pages ${firstPageNumber}-${firstPageNumber + 2}`);
    } catch (error) {
      console.error(`❌ Error drawing supervisor evaluation form ${i + 1} on pages ${firstPageNumber}-${firstPageNumber + 2}:`, error);
    }
  }

  const pdfBytes = await pdfDoc.save();

  if (Platform.OS === 'web') {
    const pdfBlobData = Uint8Array.from(pdfBytes);
    const blob = new Blob([pdfBlobData], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }

  const documentDirectory = FileSystem.documentDirectory;

  if (!documentDirectory) {
    throw new Error('Document directory is not accessible on this device.');
  }

  const destinationUri = `${documentDirectory}OJT_Journal_${Date.now()}.pdf`;

  await FileSystem.writeAsStringAsync(destinationUri, fromByteArray(pdfBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return destinationUri;
};

export const openGeneratedJournal = async (journalUri: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const newTab = window.open(journalUri, '_blank');
      if (!newTab) {
        Alert.alert('Action Required', 'Please allow pop-ups to view the OJT Journal.');
      }
    } else {
      Alert.alert('Download Complete', 'Journal generated. Please download it from your browser.');
    }
    return;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(journalUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share OJT Journal',
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Download Complete', 'OJT Journal saved to your documents directory.');
  }
};

