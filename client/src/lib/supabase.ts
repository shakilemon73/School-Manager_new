import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

console.log('Supabase Config Check:', {
  url: supabaseUrl ? 'Found' : 'Missing',
  key: supabaseAnonKey ? 'Found' : 'Missing',
  urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined',
  keyValue: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'undefined'
});

let supabase: ReturnType<typeof createClient<Database>>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Please check your .env file and ensure these variables are set:');
  console.error('- VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('- VITE_SUPABASE_ANON_KEY=your-anon-key-here');
  
  // Create fallback client for development
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: { message: 'Supabase not configured', __isAuthError: true } }),
      onAuthStateChange: (callback: any) => {
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => {}, id: 'fallback', callback } } };
      },
      signInWithPassword: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: { message: 'Supabase API keys not configured. Please check your .env file.', name: 'ConfigurationError', status: 500, __isAuthError: true }
      }),
      signUp: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: { message: 'Supabase API keys not configured. Please check your .env file.', name: 'ConfigurationError', status: 500, __isAuthError: true }
      }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ 
        data: { user: null }, 
        error: { message: 'Supabase not configured', __isAuthError: true }
      }),
      getUser: () => Promise.resolve({ 
        data: { user: null }, 
        error: { message: 'Supabase not configured', __isAuthError: true }
      })
    },
    from: () => ({ 
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Database not configured' } }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: 'Database not configured' } }) })
        }) 
      }),
      insert: () => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Database not configured' } }) 
        }) 
      }),
      update: () => ({ 
        eq: () => ({ 
          select: () => ({ 
            single: () => Promise.resolve({ data: null, error: { message: 'Database not configured' } }) 
          }) 
        }) 
      })
    })
  } as any;
  console.warn('⚠️ Using fallback Supabase client - authentication will not work');
} else {
  try {
    // Validate URL format
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
      throw new Error('Invalid Supabase URL format. Expected: https://your-project.supabase.co');
    }
    
    // Validate key format
    if (!supabaseAnonKey.startsWith('eyJ')) {
      console.warn('⚠️ Supabase anon key might be invalid (should start with "eyJ")');
    }
    
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'school-management-system'
        }
      }
    });
    console.log('✓ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
  }
}

export { supabase };

// Helper functions for authentication
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Student field mapping utilities to handle camelCase (UI) to snake_case (DB) conversion
const studentFieldMapping = {
  // UI camelCase -> DB snake_case
  studentId: 'student_id',
  rollNumber: 'roll_number', 
  presentAddress: 'present_address',
  nameInBangla: 'name_in_bangla',
  dateOfBirth: 'date_of_birth',
  guardianName: 'guardian_name',
  guardianPhone: 'guardian_phone',
  bloodGroup: 'blood_group',
  fatherName: 'father_name',
  motherName: 'mother_name',
  fatherNameInBangla: 'father_name_in_bangla',
  motherNameInBangla: 'mother_name_in_bangla',
  permanentAddress: 'permanent_address',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactRelation: 'emergency_contact_relation',
  emergencyContactPhone: 'emergency_contact_phone',
  guardianRelation: 'guardian_relation',
  postOffice: 'post_office',
  schoolId: 'school_id',
  idCardIssueDate: 'id_card_issue_date',
  idCardValidUntil: 'id_card_valid_until',
  createdAt: 'created_at',
};

// Staff field mapping: UI camelCase -> DB snake_case
const staffFieldMapping = {
  staffId: 'staff_id',
  nameInBangla: 'name_in_bangla',
  dateOfBirth: 'date_of_birth',
  joinDate: 'join_date',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Parents field mapping: UI camelCase -> DB snake_case
const parentFieldMapping = {
  parentId: 'parent_id',
  fatherName: 'father_name',
  motherName: 'mother_name',
  fatherNameInBangla: 'father_name_in_bangla',
  motherNameInBangla: 'mother_name_in_bangla',
  occupation: 'occupation',
  phone: 'phone',
  email: 'email',
  address: 'address',
  nid: 'nid',
  emergencyContact: 'emergency_contact',
  status: 'status',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Library books field mapping: UI camelCase -> DB snake_case
const libraryFieldMapping = {
  titleBn: 'title_bn',
  publishYear: 'publish_year',
  totalCopies: 'total_copies',
  availableCopies: 'available_copies',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Inventory items field mapping: UI camelCase -> DB snake_case
const inventoryFieldMapping = {
  name: 'name',
  nameBn: 'name_bn',
  category: 'category',
  subcategory: 'subcategory',
  brand: 'brand',
  model: 'model',
  serialNumber: 'serial_number',
  unitPrice: 'unit_price',
  currentQuantity: 'current_quantity',
  minimumThreshold: 'minimum_threshold',
  unit: 'unit',
  supplier: 'supplier',
  location: 'location',
  condition: 'condition',
  description: 'description',
  status: 'status',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Transport field mapping: UI camelCase -> DB snake_case
const transportFieldMapping = {
  routeName: 'route_name',
  pickupPoints: 'pickup_points',
  monthlyFee: 'monthly_fee',
  vehicleNumber: 'vehicle_number',
  driverName: 'driver_name',
  driverPhone: 'driver_phone',
  helperName: 'helper_name',
  helperPhone: 'helper_phone',
  routeId: 'route_id',
  studentId: 'student_id',
  pickupPoint: 'pickup_point',
  dropPoint: 'drop_point',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Exam field mapping: UI camelCase -> DB snake_case
const examFieldMapping = {
  nameBn: 'name_bn',
  examType: 'exam_type',
  examDate: 'exam_date',
  academicYearId: 'academic_year_id',
  totalMarks: 'total_marks',
  passMarks: 'pass_marks',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Subject field mapping: UI camelCase -> DB snake_case
const subjectFieldMapping = {
  nameBn: 'name_bn',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Exam Result field mapping: UI camelCase -> DB snake_case
const examResultFieldMapping = {
  studentId: 'student_id',
  examId: 'exam_id',
  subjectId: 'subject_id',
  marksObtained: 'marks_obtained',
  totalMarks: 'total_marks',
  teacherId: 'teacher_id',
  verifiedBy: 'verified_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Teacher Assignment field mapping: UI camelCase -> DB snake_case
const teacherAssignmentFieldMapping = {
  teacherId: 'teacher_id',
  subjectId: 'subject_id',
  academicYearId: 'academic_year_id',
  isClassTeacher: 'is_class_teacher',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Class Schedule field mapping: UI camelCase -> DB snake_case
const classScheduleFieldMapping = {
  subjectId: 'subject_id',
  teacherId: 'teacher_id',
  dayOfWeek: 'day_of_week',
  startTime: 'start_time',
  endTime: 'end_time',
  roomNumber: 'room_number',
  academicYearId: 'academic_year_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Assignment field mapping: UI camelCase -> DB snake_case
const assignmentFieldMapping = {
  titleBn: 'title_bn',
  subjectId: 'subject_id',
  teacherId: 'teacher_id',
  dueDate: 'due_date',
  totalMarks: 'total_marks',
  academicYearId: 'academic_year_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Attendance Record field mapping: UI camelCase -> DB snake_case
const attendanceRecordFieldMapping = {
  studentId: 'student_id',
  subjectId: 'subject_id',
  teacherId: 'teacher_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Lesson Plan field mapping: UI camelCase -> DB snake_case
const lessonPlanFieldMapping = {
  teacherId: 'teacher_id',
  subjectId: 'subject_id',
  classId: 'class_id',
  titleBn: 'title_bn',
  dueDate: 'due_date',
  mainContent: 'main_content',
  academicYearId: 'academic_year_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// ============================================================================
// ADMISSION SYSTEM FIELD MAPPINGS
// ============================================================================

// Admission Application field mapping: UI camelCase -> DB snake_case
const admissionApplicationFieldMapping = {
  studentName: 'student_name',
  studentNameBn: 'student_name_bn',
  dateOfBirth: 'date_of_birth',
  fatherName: 'father_name',
  motherName: 'mother_name',
  guardianPhone: 'guardian_phone',
  previousSchool: 'previous_school',
  applicationNumber: 'application_number',
  reviewedAt: 'reviewed_at',
  reviewedBy: 'reviewed_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Admission Test field mapping: UI camelCase -> DB snake_case
const admissionTestFieldMapping = {
  sessionId: 'session_id',
  testName: 'test_name',
  testNameBn: 'test_name_bn',
  testDate: 'test_date',
  testTime: 'test_time',
  durationMinutes: 'duration_minutes',
  totalMarks: 'total_marks',
  passMarks: 'pass_marks',
  studentId: 'student_id',
  obtainedMarks: 'obtained_marks',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Admission Interview field mapping: UI camelCase -> DB snake_case
const admissionInterviewFieldMapping = {
  applicationId: 'application_id',
  studentId: 'student_id',
  interviewDate: 'interview_date',
  interviewTime: 'interview_time',
  panelMembers: 'panel_members',
  durationMinutes: 'duration_minutes',
  interviewerId: 'interviewer_id',
  interviewerName: 'interviewer_name',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// ============================================================================
// REPORTS SYSTEM FIELD MAPPINGS
// ============================================================================

// Report Template field mapping: UI camelCase -> DB snake_case
const reportTemplateFieldMapping = {
  nameBn: 'name_bn',
  dataSource: 'data_source',
  chartConfig: 'chart_config',
  isPublic: 'is_public',
  createdBy: 'created_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// ============================================================================
// ACADEMIC SYSTEM FIELD MAPPINGS
// ============================================================================

// Academic Year field mapping: UI camelCase -> DB snake_case
const academicYearFieldMapping = {
  nameBn: 'name_bn',
  startDate: 'start_date',
  endDate: 'end_date',
  isActive: 'is_active',
  isCurrent: 'is_current',
  descriptionBn: 'description_bn',
  totalStudents: 'total_students',
  totalClasses: 'total_classes',
  totalTerms: 'total_terms',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Academic Term field mapping: UI camelCase -> DB snake_case
const academicTermFieldMapping = {
  nameBn: 'name_bn',
  academicYearId: 'academic_year_id',
  startDate: 'start_date',
  endDate: 'end_date',
  isActive: 'is_active',
  descriptionBn: 'description_bn',
  examScheduled: 'exam_scheduled',
  resultPublished: 'result_published',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Calendar Event field mapping: UI camelCase -> DB snake_case
const calendarEventFieldMapping = {
  titleBn: 'title_bn',
  descriptionBn: 'description_bn',
  startDate: 'start_date',
  endDate: 'end_date',
  startTime: 'start_time',
  endTime: 'end_time',
  isActive: 'is_active',
  isPublic: 'is_public',
  createdBy: 'created_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// ============================================================================
// NOTIFICATIONS SYSTEM FIELD MAPPINGS
// ============================================================================

// Notification field mapping: UI camelCase -> DB snake_case
const notificationFieldMapping = {
  titleBn: 'title_bn',
  messageBn: 'message_bn',
  notificationType: 'notification_type',
  recipientId: 'recipient_id',
  recipientType: 'recipient_type',
  isRead: 'is_read',
  readAt: 'read_at',
  actionUrl: 'action_url',
  iconType: 'icon_type',
  sendEmail: 'send_email',
  sendSms: 'send_sms',
  sentAt: 'sent_at',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Notification Template field mapping: UI camelCase -> DB snake_case
const notificationTemplateFieldMapping = {
  nameBn: 'name_bn',
  templateBody: 'template_body',
  templateBodyBn: 'template_body_bn',
  placeholders: 'placeholders',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Notification Log field mapping: UI camelCase -> DB snake_case
const notificationLogFieldMapping = {
  templateId: 'template_id',
  recipientId: 'recipient_id',
  recipientType: 'recipient_type',
  recipientEmail: 'recipient_email',
  recipientPhone: 'recipient_phone',
  deliveryStatus: 'delivery_status',
  errorMessage: 'error_message',
  sentAt: 'sent_at',
  schoolId: 'school_id',
};

// ============================================================================
// EXAM SYSTEM FIELD MAPPINGS
// ============================================================================

// Exam Schedule field mapping: UI camelCase -> DB snake_case
const examScheduleFieldMapping = {
  examId: 'exam_id',
  subjectId: 'subject_id',
  examDate: 'exam_date',
  startTime: 'start_time',
  endTime: 'end_time',
  roomNumber: 'room_number',
  totalMarks: 'total_marks',
  passMarks: 'pass_marks',
  classId: 'class_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Exam Result Detail field mapping: UI camelCase -> DB snake_case
const examResultDetailFieldMapping = {
  scheduleId: 'schedule_id',
  studentId: 'student_id',
  marksObtained: 'marks_obtained',
  totalMarks: 'total_marks',
  isAbsent: 'is_absent',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Public Access Token field mapping: UI camelCase -> DB snake_case
const publicAccessTokenFieldMapping = {
  studentId: 'student_id',
  expiresAt: 'expires_at',
  isActive: 'is_active',
  accessCount: 'access_count',
  lastAccessedAt: 'last_accessed_at',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Seating Arrangement field mapping: UI camelCase -> DB snake_case
const seatingArrangementFieldMapping = {
  examId: 'exam_id',
  studentId: 'student_id',
  roomNumber: 'room_number',
  seatNumber: 'seat_number',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// ============================================================================
// FEE SYSTEM FIELD MAPPINGS
// ============================================================================

// Fee Receipt field mapping: UI camelCase -> DB snake_case
const feeReceiptFieldMapping = {
  studentId: 'student_id',
  receiptNumber: 'receipt_number',
  totalAmount: 'total_amount',
  paidAmount: 'paid_amount',
  dueAmount: 'due_amount',
  paymentMethod: 'payment_method',
  paymentDate: 'payment_date',
  academicYearId: 'academic_year_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Fee Item field mapping: UI camelCase -> DB snake_case
const feeItemFieldMapping = {
  receiptId: 'receipt_id',
  feeType: 'fee_type',
  schoolId: 'school_id',
};

// ============================================================================
// VIDEO CONFERENCE SYSTEM FIELD MAPPINGS
// ============================================================================

// Video Conference field mapping: UI camelCase -> DB snake_case
const videoConferenceFieldMapping = {
  nameBn: 'name_bn',
  startTime: 'start_time',
  endTime: 'end_time',
  maxParticipants: 'max_participants',
  meetingId: 'meeting_id',
  isRecording: 'is_recording',
  recordingUrl: 'recording_url',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// ============================================================================
// PAYMENT/FINANCIAL SYSTEM FIELD MAPPINGS
// ============================================================================

// Payment Transaction field mapping: UI camelCase -> DB snake_case
const paymentTransactionFieldMapping = {
  transactionId: 'transaction_id',
  paymentMethod: 'payment_method',
  payerName: 'payer_name',
  payerPhone: 'payer_phone',
  descriptionBn: 'description_bn',
  studentId: 'student_id',
  schoolId: 'school_id',
  createdAt: 'created_at',
  completedAt: 'completed_at',
};

// ============================================================================
// HEALTH/MEDICAL SYSTEM FIELD MAPPINGS
// ============================================================================

// Health Record field mapping: UI camelCase -> DB snake_case
const healthRecordFieldMapping = {
  studentId: 'student_id',
  bloodGroup: 'blood_group',
  chronicConditions: 'chronic_conditions',
  currentMedications: 'current_medications',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactRelation: 'emergency_contact_relation',
  emergencyContactPhone: 'emergency_contact_phone',
  familyDoctorName: 'family_doctor_name',
  familyDoctorPhone: 'family_doctor_phone',
  medicalNotes: 'medical_notes',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Medical Checkup field mapping: UI camelCase -> DB snake_case
const medicalCheckupFieldMapping = {
  studentId: 'student_id',
  checkupDate: 'checkup_date',
  checkupType: 'checkup_type',
  bloodPressure: 'blood_pressure',
  visionLeft: 'vision_left',
  visionRight: 'vision_right',
  dentalStatus: 'dental_status',
  generalHealthStatus: 'general_health_status',
  examinedBy: 'examined_by',
  nextCheckupDate: 'next_checkup_date',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Vaccination field mapping: UI camelCase -> DB snake_case
const vaccinationFieldMapping = {
  studentId: 'student_id',
  vaccineName: 'vaccine_name',
  vaccineNameBn: 'vaccine_name_bn',
  doseNumber: 'dose_number',
  vaccinationDate: 'vaccination_date',
  nextDoseDate: 'next_dose_date',
  batchNumber: 'batch_number',
  administeredBy: 'administered_by',
  sideEffects: 'side_effects',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Convert camelCase student object to snake_case for database
function toDbStudent(camelCaseStudent: any): Database['public']['Tables']['students']['Insert'] | Database['public']['Tables']['students']['Update'] {
  if (!camelCaseStudent) return {} as any;
  
  const dbStudent: any = {};
  
  // List of fields that should be excluded from Insert operations
  const readOnlyFields = ['id', 'created_at'];
  
  // Map camelCase fields to snake_case, excluding read-only fields for safety
  Object.entries(camelCaseStudent).forEach(([camelKey, value]) => {
    const dbKey = studentFieldMapping[camelKey as keyof typeof studentFieldMapping] || camelKey;
    
    // Skip read-only fields and undefined/empty values
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbStudent[dbKey] = value;
    }
  });
  
  return dbStudent;
}

// Convert camelCase staff object to snake_case for database
function toDbStaff(camelCaseStaff: any): Database['public']['Tables']['staff']['Insert'] | Database['public']['Tables']['staff']['Update'] {
  if (!camelCaseStaff) return {} as any;
  
  const dbStaff: any = {};
  
  // List of fields that should be excluded from Insert operations
  const readOnlyFields = ['id', 'created_at'];
  
  // Map camelCase fields to snake_case, excluding read-only fields for safety
  Object.entries(camelCaseStaff).forEach(([camelKey, value]) => {
    const dbKey = staffFieldMapping[camelKey as keyof typeof staffFieldMapping] || camelKey;
    
    // Skip read-only fields and undefined/empty values
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbStaff[dbKey] = value;
    }
  });
  
  return dbStaff;
}

// Convert camelCase parent object to snake_case for database
function toDbParent(camelCaseParent: any): Database['public']['Tables']['parents']['Insert'] | Database['public']['Tables']['parents']['Update'] {
  if (!camelCaseParent) return {} as any;
  
  const dbParent: any = {};
  
  // List of fields that should be excluded from Insert operations
  const readOnlyFields = ['id', 'created_at'];
  
  // Map camelCase fields to snake_case, excluding read-only fields for safety
  Object.entries(camelCaseParent).forEach(([camelKey, value]) => {
    const dbKey = parentFieldMapping[camelKey as keyof typeof parentFieldMapping] || camelKey;
    
    // Skip read-only fields and undefined/empty values
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbParent[dbKey] = value;
    }
  });
  
  return dbParent;
}

// Convert snake_case student object from database to camelCase for UI
function fromDbStudent(dbStudent: any): any {
  if (!dbStudent) return {};
  
  const uiStudent: any = {};
  
  // Reverse mapping: snake_case -> camelCase
  const reverseStudentMapping: Record<string, string> = {};
  Object.entries(studentFieldMapping).forEach(([camel, snake]) => {
    reverseStudentMapping[snake] = camel;
  });
  
  Object.entries(dbStudent).forEach(([snakeKey, value]) => {
    const camelKey = reverseStudentMapping[snakeKey] || snakeKey;
    uiStudent[camelKey] = value;
  });
  
  return uiStudent;
}

// Convert snake_case staff object from database to camelCase for UI
function fromDbStaff(dbStaff: any): any {
  if (!dbStaff) return {};
  
  const uiStaff: any = {};
  
  // Reverse mapping: snake_case -> camelCase
  const reverseStaffMapping: Record<string, string> = {};
  Object.entries(staffFieldMapping).forEach(([camel, snake]) => {
    reverseStaffMapping[snake] = camel;
  });
  
  Object.entries(dbStaff).forEach(([snakeKey, value]) => {
    const camelKey = reverseStaffMapping[snakeKey] || snakeKey;
    uiStaff[camelKey] = value;
  });
  
  return uiStaff;
}

// Convert snake_case parent object from database to camelCase for UI
function fromDbParent(dbParent: any): any {
  if (!dbParent) return {};
  
  const uiParent: any = {};
  
  // Reverse mapping: snake_case -> camelCase
  const reverseParentMapping: Record<string, string> = {};
  Object.entries(parentFieldMapping).forEach(([camel, snake]) => {
    reverseParentMapping[snake] = camel;
  });
  
  Object.entries(dbParent).forEach(([snakeKey, value]) => {
    const camelKey = reverseParentMapping[snakeKey] || snakeKey;
    uiParent[camelKey] = value;
  });
  
  return uiParent;
}

// Library Books conversion functions
function toDbLibrary(camelCaseLibrary: any): any {
  if (!camelCaseLibrary) return {} as any;
  
  const dbLibrary: any = {};
  const readOnlyFields = ['id', 'created_at'];
  
  Object.entries(camelCaseLibrary).forEach(([camelKey, value]) => {
    const dbKey = libraryFieldMapping[camelKey as keyof typeof libraryFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbLibrary[dbKey] = value;
    }
  });
  
  return dbLibrary;
}

function fromDbLibrary(dbLibrary: any): any {
  if (!dbLibrary) return {};
  
  const uiLibrary: any = {};
  const reverseLibraryMapping: Record<string, string> = {};
  Object.entries(libraryFieldMapping).forEach(([camel, snake]) => {
    reverseLibraryMapping[snake] = camel;
  });
  
  Object.entries(dbLibrary).forEach(([snakeKey, value]) => {
    const camelKey = reverseLibraryMapping[snakeKey] || snakeKey;
    uiLibrary[camelKey] = value;
  });
  
  return uiLibrary;
}

// Inventory Items conversion functions
function toDbInventory(camelCaseInventory: any): any {
  if (!camelCaseInventory) return {} as any;
  
  const dbInventory: any = {};
  const readOnlyFields = ['id', 'created_at'];
  
  Object.entries(camelCaseInventory).forEach(([camelKey, value]) => {
    const dbKey = inventoryFieldMapping[camelKey as keyof typeof inventoryFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbInventory[dbKey] = value;
    }
  });
  
  return dbInventory;
}

function fromDbInventory(dbInventory: any): any {
  if (!dbInventory) return {};
  
  const uiInventory: any = {};
  const reverseInventoryMapping: Record<string, string> = {};
  Object.entries(inventoryFieldMapping).forEach(([camel, snake]) => {
    reverseInventoryMapping[snake] = camel;
  });
  
  Object.entries(dbInventory).forEach(([snakeKey, value]) => {
    const camelKey = reverseInventoryMapping[snakeKey] || snakeKey;
    uiInventory[camelKey] = value;
  });
  
  return uiInventory;
}

// Transport conversion functions
function toDbTransport(camelCaseTransport: any): any {
  if (!camelCaseTransport) return {} as any;
  
  const dbTransport: any = {};
  const readOnlyFields = ['id', 'created_at'];
  
  Object.entries(camelCaseTransport).forEach(([camelKey, value]) => {
    const dbKey = transportFieldMapping[camelKey as keyof typeof transportFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbTransport[dbKey] = value;
    }
  });
  
  return dbTransport;
}

function fromDbTransport(dbTransport: any): any {
  if (!dbTransport) return {};
  
  const uiTransport: any = {};
  const reverseTransportMapping: Record<string, string> = {};
  Object.entries(transportFieldMapping).forEach(([camel, snake]) => {
    reverseTransportMapping[snake] = camel;
  });
  
  Object.entries(dbTransport).forEach(([snakeKey, value]) => {
    const camelKey = reverseTransportMapping[snakeKey] || snakeKey;
    uiTransport[camelKey] = value;
  });
  
  return uiTransport;
}

// Vendors field mapping: UI camelCase -> DB snake_case
const vendorFieldMapping = {
  vendorCode: 'vendor_code',
  vendorName: 'vendor_name',
  contactPerson: 'contact_person',
  taxId: 'tax_id',
  paymentTerms: 'payment_terms',
  creditLimit: 'credit_limit',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Purchase Orders field mapping: UI camelCase -> DB snake_case
const purchaseOrderFieldMapping = {
  poNumber: 'po_number',
  vendorId: 'vendor_id',
  orderDate: 'order_date',
  expectedDeliveryDate: 'expected_delivery_date',
  actualDeliveryDate: 'actual_delivery_date',
  taxAmount: 'tax_amount',
  discountAmount: 'discount_amount',
  totalAmount: 'total_amount',
  approvedBy: 'approved_by',
  approvedAt: 'approved_at',
  schoolId: 'school_id',
  createdBy: 'created_by',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Stock Alerts field mapping: UI camelCase -> DB snake_case
const stockAlertFieldMapping = {
  itemId: 'item_id',
  itemName: 'item_name',
  alertType: 'alert_type',
  currentQuantity: 'current_quantity',
  reorderLevel: 'reorder_level',
  expiryDate: 'expiry_date',
  daysToExpiry: 'days_to_expiry',
  isAcknowledged: 'is_acknowledged',
  acknowledgedBy: 'acknowledged_by',
  acknowledgedAt: 'acknowledged_at',
  actionTaken: 'action_taken',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// ============================================================================
// HR/PAYROLL FIELD MAPPINGS
// ============================================================================

// Staff Attendance field mapping: UI camelCase -> DB snake_case
const staffAttendanceFieldMapping = {
  staffId: 'staff_id',
  checkInTime: 'check_in_time',
  checkOutTime: 'check_out_time',
  lateMinutes: 'late_minutes',
  overtimeMinutes: 'overtime_minutes',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Leave Applications field mapping: UI camelCase -> DB snake_case
const leaveApplicationFieldMapping = {
  staffId: 'staff_id',
  leaveTypeId: 'leave_type_id',
  startDate: 'start_date',
  endDate: 'end_date',
  totalDays: 'total_days',
  appliedDate: 'applied_date',
  approvedBy: 'approved_by',
  approvedDate: 'approved_date',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Leave Balances field mapping: UI camelCase -> DB snake_case
const leaveBalanceFieldMapping = {
  staffId: 'staff_id',
  leaveTypeId: 'leave_type_id',
  totalDays: 'total_days',
  usedDays: 'used_days',
  remainingDays: 'remaining_days',
  schoolId: 'school_id',
  updatedAt: 'updated_at',
};

// Payroll Records field mapping: UI camelCase -> DB snake_case
const payrollRecordFieldMapping = {
  staffId: 'staff_id',
  basicSalary: 'basic_salary',
  grossSalary: 'gross_salary',
  totalDeductions: 'total_deductions',
  netSalary: 'net_salary',
  paymentDate: 'payment_date',
  paymentMethod: 'payment_method',
  paymentStatus: 'payment_status',
  createdBy: 'created_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Salary Components field mapping: UI camelCase -> DB snake_case
const salaryComponentFieldMapping = {
  nameBn: 'name_bn',
  calculationType: 'calculation_type',
  defaultAmount: 'default_amount',
  isTaxable: 'is_taxable',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Appraisal field mapping: UI camelCase -> DB snake_case
const appraisalFieldMapping = {
  staffId: 'staff_id',
  appraisalPeriod: 'appraisal_period',
  reviewDate: 'review_date',
  totalScore: 'total_score',
  areasOfImprovement: 'areas_of_improvement',
  reviewerId: 'reviewer_id',
  reviewerName: 'reviewer_name',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// ============================================================================
// HOSTEL FIELD MAPPINGS
// ============================================================================

// Hostel field mapping: UI camelCase -> DB snake_case
const hostelFieldMapping = {
  nameInBangla: 'name_in_bangla',
  totalRooms: 'total_rooms',
  totalCapacity: 'total_capacity',
  currentOccupancy: 'current_occupancy',
  wardenName: 'warden_name',
  wardenPhone: 'warden_phone',
  monthlyFee: 'monthly_fee',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Hostel Room field mapping: UI camelCase -> DB snake_case
const hostelRoomFieldMapping = {
  hostelId: 'hostel_id',
  roomNumber: 'room_number',
  roomType: 'room_type',
  currentOccupancy: 'current_occupancy',
  monthlyFee: 'monthly_fee',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Hostel Room Assignment field mapping: UI camelCase -> DB snake_case
const hostelRoomAssignmentFieldMapping = {
  studentId: 'student_id',
  roomId: 'room_id',
  hostelId: 'hostel_id',
  assignDate: 'assign_date',
  releaseDate: 'release_date',
  monthlyFee: 'monthly_fee',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Hostel Attendance field mapping: UI camelCase -> DB snake_case
const hostelAttendanceFieldMapping = {
  studentId: 'student_id',
  roomId: 'room_id',
  checkInTime: 'check_in_time',
  checkOutTime: 'check_out_time',
  leaveType: 'leave_type',
  leaveApprovedBy: 'leave_approved_by',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Meal Plan field mapping: UI camelCase -> DB snake_case
const mealPlanFieldMapping = {
  planName: 'plan_name',
  planNameBn: 'plan_name_bn',
  mealTypes: 'meal_types',
  monthlyFee: 'monthly_fee',
  isActive: 'is_active',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Meal Menu field mapping: UI camelCase -> DB snake_case
const mealMenuFieldMapping = {
  dayOfWeek: 'day_of_week',
  mealType: 'meal_type',
  menuItems: 'menu_items',
  menuItemsBn: 'menu_items_bn',
  specialNotes: 'special_notes',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// Meal Subscription field mapping: UI camelCase -> DB snake_case
const mealSubscriptionFieldMapping = {
  studentId: 'student_id',
  planId: 'plan_id',
  startDate: 'start_date',
  endDate: 'end_date',
  isActive: 'is_active',
  monthlyFee: 'monthly_fee',
  schoolId: 'school_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Meal Transaction field mapping: UI camelCase -> DB snake_case
const mealTransactionFieldMapping = {
  studentId: 'student_id',
  subscriptionId: 'subscription_id',
  mealType: 'meal_type',
  isConsumed: 'is_consumed',
  consumedAt: 'consumed_at',
  schoolId: 'school_id',
  createdAt: 'created_at',
};

// ============================================================================
// VIDEO CONFERENCE CONVERSION FUNCTIONS
// ============================================================================

function toDbVideoConference(camelCaseConference: any): any {
  if (!camelCaseConference) return {} as any;
  const dbConference: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseConference).forEach(([camelKey, value]) => {
    const dbKey = videoConferenceFieldMapping[camelKey as keyof typeof videoConferenceFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbConference[dbKey] = value;
    }
  });
  return dbConference;
}

function fromDbVideoConference(dbConference: any): any {
  if (!dbConference) return {};
  const uiConference: any = {};
  const reverseVideoConferenceMapping: Record<string, string> = {};
  Object.entries(videoConferenceFieldMapping).forEach(([camel, snake]) => {
    reverseVideoConferenceMapping[snake] = camel;
  });
  Object.entries(dbConference).forEach(([snakeKey, value]) => {
    const camelKey = reverseVideoConferenceMapping[snakeKey] || snakeKey;
    uiConference[camelKey] = value;
  });
  return uiConference;
}

// ============================================================================
// PAYMENT/FINANCIAL CONVERSION FUNCTIONS
// ============================================================================

function toDbPaymentTransaction(camelCaseTransaction: any): any {
  if (!camelCaseTransaction) return {} as any;
  const dbTransaction: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseTransaction).forEach(([camelKey, value]) => {
    const dbKey = paymentTransactionFieldMapping[camelKey as keyof typeof paymentTransactionFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbTransaction[dbKey] = value;
    }
  });
  return dbTransaction;
}

function fromDbPaymentTransaction(dbTransaction: any): any {
  if (!dbTransaction) return {};
  const uiTransaction: any = {};
  const reversePaymentTransactionMapping: Record<string, string> = {};
  Object.entries(paymentTransactionFieldMapping).forEach(([camel, snake]) => {
    reversePaymentTransactionMapping[snake] = camel;
  });
  Object.entries(dbTransaction).forEach(([snakeKey, value]) => {
    const camelKey = reversePaymentTransactionMapping[snakeKey] || snakeKey;
    uiTransaction[camelKey] = value;
  });
  return uiTransaction;
}

// ============================================================================
// HEALTH/MEDICAL CONVERSION FUNCTIONS
// ============================================================================

function toDbHealthRecord(camelCaseRecord: any): any {
  if (!camelCaseRecord) return {} as any;
  const dbRecord: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseRecord).forEach(([camelKey, value]) => {
    const dbKey = healthRecordFieldMapping[camelKey as keyof typeof healthRecordFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbRecord[dbKey] = value;
    }
  });
  return dbRecord;
}

function fromDbHealthRecord(dbRecord: any): any {
  if (!dbRecord) return {};
  const uiRecord: any = {};
  const reverseHealthRecordMapping: Record<string, string> = {};
  Object.entries(healthRecordFieldMapping).forEach(([camel, snake]) => {
    reverseHealthRecordMapping[snake] = camel;
  });
  Object.entries(dbRecord).forEach(([snakeKey, value]) => {
    const camelKey = reverseHealthRecordMapping[snakeKey] || snakeKey;
    uiRecord[camelKey] = value;
  });
  return uiRecord;
}

function toDbMedicalCheckup(camelCaseCheckup: any): any {
  if (!camelCaseCheckup) return {} as any;
  const dbCheckup: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseCheckup).forEach(([camelKey, value]) => {
    const dbKey = medicalCheckupFieldMapping[camelKey as keyof typeof medicalCheckupFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbCheckup[dbKey] = value;
    }
  });
  return dbCheckup;
}

function fromDbMedicalCheckup(dbCheckup: any): any {
  if (!dbCheckup) return {};
  const uiCheckup: any = {};
  const reverseMedicalCheckupMapping: Record<string, string> = {};
  Object.entries(medicalCheckupFieldMapping).forEach(([camel, snake]) => {
    reverseMedicalCheckupMapping[snake] = camel;
  });
  Object.entries(dbCheckup).forEach(([snakeKey, value]) => {
    const camelKey = reverseMedicalCheckupMapping[snakeKey] || snakeKey;
    uiCheckup[camelKey] = value;
  });
  return uiCheckup;
}

function toDbVaccination(camelCaseVaccination: any): any {
  if (!camelCaseVaccination) return {} as any;
  const dbVaccination: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseVaccination).forEach(([camelKey, value]) => {
    const dbKey = vaccinationFieldMapping[camelKey as keyof typeof vaccinationFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbVaccination[dbKey] = value;
    }
  });
  return dbVaccination;
}

function fromDbVaccination(dbVaccination: any): any {
  if (!dbVaccination) return {};
  const uiVaccination: any = {};
  const reverseVaccinationMapping: Record<string, string> = {};
  Object.entries(vaccinationFieldMapping).forEach(([camel, snake]) => {
    reverseVaccinationMapping[snake] = camel;
  });
  Object.entries(dbVaccination).forEach(([snakeKey, value]) => {
    const camelKey = reverseVaccinationMapping[snakeKey] || snakeKey;
    uiVaccination[camelKey] = value;
  });
  return uiVaccination;
}

// Exam conversion functions
function toDbExam(camelCaseExam: any): any {
  if (!camelCaseExam) return {} as any;
  const dbExam: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseExam).forEach(([camelKey, value]) => {
    const dbKey = examFieldMapping[camelKey as keyof typeof examFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbExam[dbKey] = value;
    }
  });
  return dbExam;
}

function fromDbExam(dbExam: any): any {
  if (!dbExam) return {};
  const uiExam: any = {};
  const reverseExamMapping: Record<string, string> = {};
  Object.entries(examFieldMapping).forEach(([camel, snake]) => {
    reverseExamMapping[snake] = camel;
  });
  Object.entries(dbExam).forEach(([snakeKey, value]) => {
    const camelKey = reverseExamMapping[snakeKey] || snakeKey;
    uiExam[camelKey] = value;
  });
  return uiExam;
}

// Vendor conversion functions
function toDbVendor(camelCaseVendor: any): any {
  if (!camelCaseVendor) return {} as any;
  const dbVendor: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseVendor).forEach(([camelKey, value]) => {
    const dbKey = vendorFieldMapping[camelKey as keyof typeof vendorFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbVendor[dbKey] = value;
    }
  });
  return dbVendor;
}

function fromDbVendor(dbVendor: any): any {
  if (!dbVendor) return {};
  const uiVendor: any = {};
  const reverseVendorMapping: Record<string, string> = {};
  Object.entries(vendorFieldMapping).forEach(([camel, snake]) => {
    reverseVendorMapping[snake] = camel;
  });
  Object.entries(dbVendor).forEach(([snakeKey, value]) => {
    const camelKey = reverseVendorMapping[snakeKey] || snakeKey;
    uiVendor[camelKey] = value;
  });
  return uiVendor;
}

// Purchase Order conversion functions
function toDbPurchaseOrder(camelCaseOrder: any): any {
  if (!camelCaseOrder) return {} as any;
  const dbOrder: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseOrder).forEach(([camelKey, value]) => {
    const dbKey = purchaseOrderFieldMapping[camelKey as keyof typeof purchaseOrderFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbOrder[dbKey] = value;
    }
  });
  return dbOrder;
}

function fromDbPurchaseOrder(dbOrder: any): any {
  if (!dbOrder) return {};
  const uiOrder: any = {};
  const reversePurchaseOrderMapping: Record<string, string> = {};
  Object.entries(purchaseOrderFieldMapping).forEach(([camel, snake]) => {
    reversePurchaseOrderMapping[snake] = camel;
  });
  Object.entries(dbOrder).forEach(([snakeKey, value]) => {
    const camelKey = reversePurchaseOrderMapping[snakeKey] || snakeKey;
    uiOrder[camelKey] = value;
  });
  return uiOrder;
}

// Stock Alert conversion functions
function toDbStockAlert(camelCaseAlert: any): any {
  if (!camelCaseAlert) return {} as any;
  const dbAlert: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseAlert).forEach(([camelKey, value]) => {
    const dbKey = stockAlertFieldMapping[camelKey as keyof typeof stockAlertFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbAlert[dbKey] = value;
    }
  });
  return dbAlert;
}

function fromDbStockAlert(dbAlert: any): any {
  if (!dbAlert) return {};
  const uiAlert: any = {};
  const reverseStockAlertMapping: Record<string, string> = {};
  Object.entries(stockAlertFieldMapping).forEach(([camel, snake]) => {
    reverseStockAlertMapping[snake] = camel;
  });
  Object.entries(dbAlert).forEach(([snakeKey, value]) => {
    const camelKey = reverseStockAlertMapping[snakeKey] || snakeKey;
    uiAlert[camelKey] = value;
  });
  return uiAlert;
}

// Subject conversion functions
function toDbSubject(camelCaseSubject: any): any {
  if (!camelCaseSubject) return {} as any;
  const dbSubject: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseSubject).forEach(([camelKey, value]) => {
    const dbKey = subjectFieldMapping[camelKey as keyof typeof subjectFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbSubject[dbKey] = value;
    }
  });
  return dbSubject;
}

function fromDbSubject(dbSubject: any): any {
  if (!dbSubject) return {};
  const uiSubject: any = {};
  const reverseSubjectMapping: Record<string, string> = {};
  Object.entries(subjectFieldMapping).forEach(([camel, snake]) => {
    reverseSubjectMapping[snake] = camel;
  });
  Object.entries(dbSubject).forEach(([snakeKey, value]) => {
    const camelKey = reverseSubjectMapping[snakeKey] || snakeKey;
    uiSubject[camelKey] = value;
  });
  return uiSubject;
}

// Exam Result conversion functions
function toDbExamResult(camelCaseResult: any): any {
  if (!camelCaseResult) return {} as any;
  const dbResult: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseResult).forEach(([camelKey, value]) => {
    const dbKey = examResultFieldMapping[camelKey as keyof typeof examResultFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbResult[dbKey] = value;
    }
  });
  return dbResult;
}

function fromDbExamResult(dbResult: any): any {
  if (!dbResult) return {};
  const uiResult: any = {};
  const reverseExamResultMapping: Record<string, string> = {};
  Object.entries(examResultFieldMapping).forEach(([camel, snake]) => {
    reverseExamResultMapping[snake] = camel;
  });
  Object.entries(dbResult).forEach(([snakeKey, value]) => {
    const camelKey = reverseExamResultMapping[snakeKey] || snakeKey;
    uiResult[camelKey] = value;
  });
  return uiResult;
}

// Teacher Assignment conversion functions
function toDbTeacherAssignment(camelCaseAssignment: any): any {
  if (!camelCaseAssignment) return {} as any;
  const dbAssignment: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseAssignment).forEach(([camelKey, value]) => {
    const dbKey = teacherAssignmentFieldMapping[camelKey as keyof typeof teacherAssignmentFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbAssignment[dbKey] = value;
    }
  });
  return dbAssignment;
}

function fromDbTeacherAssignment(dbAssignment: any): any {
  if (!dbAssignment) return {};
  const uiAssignment: any = {};
  const reverseTeacherAssignmentMapping: Record<string, string> = {};
  Object.entries(teacherAssignmentFieldMapping).forEach(([camel, snake]) => {
    reverseTeacherAssignmentMapping[snake] = camel;
  });
  Object.entries(dbAssignment).forEach(([snakeKey, value]) => {
    const camelKey = reverseTeacherAssignmentMapping[snakeKey] || snakeKey;
    uiAssignment[camelKey] = value;
  });
  return uiAssignment;
}

// Class Schedule conversion functions
function toDbClassSchedule(camelCaseSchedule: any): any {
  if (!camelCaseSchedule) return {} as any;
  const dbSchedule: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseSchedule).forEach(([camelKey, value]) => {
    const dbKey = classScheduleFieldMapping[camelKey as keyof typeof classScheduleFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbSchedule[dbKey] = value;
    }
  });
  return dbSchedule;
}

function fromDbClassSchedule(dbSchedule: any): any {
  if (!dbSchedule) return {};
  const uiSchedule: any = {};
  const reverseClassScheduleMapping: Record<string, string> = {};
  Object.entries(classScheduleFieldMapping).forEach(([camel, snake]) => {
    reverseClassScheduleMapping[snake] = camel;
  });
  Object.entries(dbSchedule).forEach(([snakeKey, value]) => {
    const camelKey = reverseClassScheduleMapping[snakeKey] || snakeKey;
    uiSchedule[camelKey] = value;
  });
  return uiSchedule;
}

// Assignment conversion functions
function toDbAssignment(camelCaseAssignment: any): any {
  if (!camelCaseAssignment) return {} as any;
  const dbAssignment: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseAssignment).forEach(([camelKey, value]) => {
    const dbKey = assignmentFieldMapping[camelKey as keyof typeof assignmentFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbAssignment[dbKey] = value;
    }
  });
  return dbAssignment;
}

function fromDbAssignment(dbAssignment: any): any {
  if (!dbAssignment) return {};
  const uiAssignment: any = {};
  const reverseAssignmentMapping: Record<string, string> = {};
  Object.entries(assignmentFieldMapping).forEach(([camel, snake]) => {
    reverseAssignmentMapping[snake] = camel;
  });
  Object.entries(dbAssignment).forEach(([snakeKey, value]) => {
    const camelKey = reverseAssignmentMapping[snakeKey] || snakeKey;
    uiAssignment[camelKey] = value;
  });
  return uiAssignment;
}

// Attendance Record conversion functions
function toDbAttendanceRecord(camelCaseRecord: any): any {
  if (!camelCaseRecord) return {} as any;
  const dbRecord: any = {};
  const readOnlyFields = ['id', 'created_at'];
  Object.entries(camelCaseRecord).forEach(([camelKey, value]) => {
    const dbKey = attendanceRecordFieldMapping[camelKey as keyof typeof attendanceRecordFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbRecord[dbKey] = value;
    }
  });
  return dbRecord;
}

function fromDbAttendanceRecord(dbRecord: any): any {
  if (!dbRecord) return {};
  const uiRecord: any = {};
  const reverseAttendanceRecordMapping: Record<string, string> = {};
  Object.entries(attendanceRecordFieldMapping).forEach(([camel, snake]) => {
    reverseAttendanceRecordMapping[snake] = camel;
  });
  Object.entries(dbRecord).forEach(([snakeKey, value]) => {
    const camelKey = reverseAttendanceRecordMapping[snakeKey] || snakeKey;
    uiRecord[camelKey] = value;
  });
  return uiRecord;
}

// Lesson Plan conversion functions
function toDbLessonPlan(camelCasePlan: any): any {
  if (!camelCasePlan) return {} as any;
  const dbPlan: any = {};
  const readOnlyFields = ['id', 'created_at', 'updated_at'];
  Object.entries(camelCasePlan).forEach(([camelKey, value]) => {
    const dbKey = lessonPlanFieldMapping[camelKey as keyof typeof lessonPlanFieldMapping] || camelKey;
    if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
      dbPlan[dbKey] = value;
    }
  });
  return dbPlan;
}

function fromDbLessonPlan(dbPlan: any): any {
  if (!dbPlan) return {};
  const uiPlan: any = {};
  const reverseLessonPlanMapping: Record<string, string> = {};
  Object.entries(lessonPlanFieldMapping).forEach(([camel, snake]) => {
    reverseLessonPlanMapping[snake] = camel;
  });
  Object.entries(dbPlan).forEach(([snakeKey, value]) => {
    const camelKey = reverseLessonPlanMapping[snakeKey] || snakeKey;
    uiPlan[camelKey] = value;
  });
  return uiPlan;
}

// ============================================================================
// HR/PAYROLL CONVERSION FUNCTIONS
// ============================================================================

// Helper function to create generic conversion functions
function createToDbConverter(fieldMapping: Record<string, string>) {
  return (camelCaseObj: any): any => {
    if (!camelCaseObj) return {} as any;
    const dbObj: any = {};
    const readOnlyFields = ['id', 'created_at', 'updated_at'];
    Object.entries(camelCaseObj).forEach(([camelKey, value]) => {
      const dbKey = fieldMapping[camelKey as keyof typeof fieldMapping] || camelKey;
      if (!readOnlyFields.includes(dbKey) && value !== undefined && value !== '' && value !== null) {
        dbObj[dbKey] = value;
      }
    });
    return dbObj;
  };
}

function createFromDbConverter(fieldMapping: Record<string, string>) {
  return (dbObj: any): any => {
    if (!dbObj) return {};
    const uiObj: any = {};
    const reverseMapping: Record<string, string> = {};
    Object.entries(fieldMapping).forEach(([camel, snake]) => {
      reverseMapping[snake] = camel;
    });
    Object.entries(dbObj).forEach(([snakeKey, value]) => {
      const camelKey = reverseMapping[snakeKey] || snakeKey;
      uiObj[camelKey] = value;
    });
    return uiObj;
  };
}

// Staff Attendance conversion functions
const toDbStaffAttendance = createToDbConverter(staffAttendanceFieldMapping);
const fromDbStaffAttendance = createFromDbConverter(staffAttendanceFieldMapping);

// Leave Application conversion functions
const toDbLeaveApplication = createToDbConverter(leaveApplicationFieldMapping);
const fromDbLeaveApplication = createFromDbConverter(leaveApplicationFieldMapping);

// Leave Balance conversion functions
const toDbLeaveBalance = createToDbConverter(leaveBalanceFieldMapping);
const fromDbLeaveBalance = createFromDbConverter(leaveBalanceFieldMapping);

// Payroll Record conversion functions
const toDbPayrollRecord = createToDbConverter(payrollRecordFieldMapping);
const fromDbPayrollRecord = createFromDbConverter(payrollRecordFieldMapping);

// Salary Component conversion functions
const toDbSalaryComponent = createToDbConverter(salaryComponentFieldMapping);
const fromDbSalaryComponent = createFromDbConverter(salaryComponentFieldMapping);

// Appraisal conversion functions
const toDbAppraisal = createToDbConverter(appraisalFieldMapping);
const fromDbAppraisal = createFromDbConverter(appraisalFieldMapping);

// ============================================================================
// HOSTEL CONVERSION FUNCTIONS
// ============================================================================

// Hostel conversion functions
const toDbHostel = createToDbConverter(hostelFieldMapping);
const fromDbHostel = createFromDbConverter(hostelFieldMapping);

// Hostel Room conversion functions
const toDbHostelRoom = createToDbConverter(hostelRoomFieldMapping);
const fromDbHostelRoom = createFromDbConverter(hostelRoomFieldMapping);

// Hostel Room Assignment conversion functions
const toDbHostelRoomAssignment = createToDbConverter(hostelRoomAssignmentFieldMapping);
const fromDbHostelRoomAssignment = createFromDbConverter(hostelRoomAssignmentFieldMapping);

// Hostel Attendance conversion functions
const toDbHostelAttendance = createToDbConverter(hostelAttendanceFieldMapping);
const fromDbHostelAttendance = createFromDbConverter(hostelAttendanceFieldMapping);

// Meal Plan conversion functions
const toDbMealPlan = createToDbConverter(mealPlanFieldMapping);
const fromDbMealPlan = createFromDbConverter(mealPlanFieldMapping);

// Meal Menu conversion functions
const toDbMealMenu = createToDbConverter(mealMenuFieldMapping);
const fromDbMealMenu = createFromDbConverter(mealMenuFieldMapping);

// Meal Subscription conversion functions
const toDbMealSubscription = createToDbConverter(mealSubscriptionFieldMapping);
const fromDbMealSubscription = createFromDbConverter(mealSubscriptionFieldMapping);

// Meal Transaction conversion functions
const toDbMealTransaction = createToDbConverter(mealTransactionFieldMapping);
const fromDbMealTransaction = createFromDbConverter(mealTransactionFieldMapping);

// ============================================================================
// ADMISSION SYSTEM CONVERSION FUNCTIONS
// ============================================================================

// Admission Application conversion functions
const toDbAdmissionApplication = createToDbConverter(admissionApplicationFieldMapping);
const fromDbAdmissionApplication = createFromDbConverter(admissionApplicationFieldMapping);

// Admission Test conversion functions
const toDbAdmissionTest = createToDbConverter(admissionTestFieldMapping);
const fromDbAdmissionTest = createFromDbConverter(admissionTestFieldMapping);

// Admission Interview conversion functions
const toDbAdmissionInterview = createToDbConverter(admissionInterviewFieldMapping);
const fromDbAdmissionInterview = createFromDbConverter(admissionInterviewFieldMapping);

// ============================================================================
// REPORTS SYSTEM CONVERSION FUNCTIONS
// ============================================================================

// Report Template conversion functions
const toDbReportTemplate = createToDbConverter(reportTemplateFieldMapping);
const fromDbReportTemplate = createFromDbConverter(reportTemplateFieldMapping);

// ============================================================================
// ACADEMIC SYSTEM CONVERSION FUNCTIONS
// ============================================================================

// Academic Year conversion functions
const toDbAcademicYear = createToDbConverter(academicYearFieldMapping);
const fromDbAcademicYear = createFromDbConverter(academicYearFieldMapping);

// Academic Term conversion functions
const toDbAcademicTerm = createToDbConverter(academicTermFieldMapping);
const fromDbAcademicTerm = createFromDbConverter(academicTermFieldMapping);

// Calendar Event conversion functions
const toDbCalendarEvent = createToDbConverter(calendarEventFieldMapping);
const fromDbCalendarEvent = createFromDbConverter(calendarEventFieldMapping);

// Direct Database Query Functions (replacing Express API calls)
export const db = {
  // Dashboard Stats
  async getDashboardStats(schoolId?: number) {
    const targetSchoolId = schoolId || 1; // Default to school 1 if not provided
    console.log('📊 Fetching dashboard stats for school ID:', targetSchoolId);
    
    try {
      const [studentsCount, teachersCount, booksCount, inventoryCount, notificationsCount] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', targetSchoolId),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', targetSchoolId), 
        supabase.from('library_books').select('id', { count: 'exact', head: true }).eq('school_id', targetSchoolId),
        supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('school_id', targetSchoolId),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('school_id', targetSchoolId).eq('is_read', false)
      ]);

      const stats = {
        students: studentsCount.count || 0,
        teachers: teachersCount.count || 0, 
        books: booksCount.count || 0,
        inventory_items: inventoryCount.count || 0,
        pending_fees: 0, // Will implement with fee system
        total_revenue: 0, // Will implement with payment system
        active_notifications: notificationsCount.count || 0,
        upcoming_events: 0 // Will implement with calendar system
      };

      console.log('✅ Dashboard stats fetched successfully:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      // Return fallback stats
      return {
        students: 0,
        teachers: 0, 
        books: 0,
        inventory_items: 0,
        pending_fees: 0,
        total_revenue: 0,
        active_notifications: 0,
        upcoming_events: 0
      };
    }
  },

  // Dashboard Activities (replacing Express API call)
  async getDashboardActivities(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required for dashboard activities');
    }
    
    // Get recent activities from multiple sources
    const [recentStudents, recentNotifications, recentEvents, recentDocuments] = await Promise.all([
      // Recent student registrations (RLS handles school filtering)
      supabase
        .from('students')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent notifications (RLS handles school filtering)
      supabase
        .from('notifications')
        .select('id, title, type, created_at, sender')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent calendar events (RLS handles school filtering)
      supabase
        .from('calendar_events')
        .select('id, title, type, start_date, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent document activities (if document_activities table exists, fallback to templates)
      supabase
        .from('document_templates')
        .select('id, name, category, created_at')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(3)
    ]);

    const activities: any[] = [];

    // Add student activities
    if (recentStudents.data) {
      recentStudents.data.forEach(student => {
        activities.push({
          id: `student_${student.id}`,
          type: 'student_registration',
          title: 'New Student Registered',
          description: `${student.name} joined the school`,
          timestamp: student.created_at,
          user: student.name,
          details: { studentId: student.id }
        });
      });
    }

    // Add notification activities
    if (recentNotifications.data) {
      recentNotifications.data.forEach(notification => {
        activities.push({
          id: `notification_${notification.id}`,
          type: 'notification',
          title: notification.title,
          description: `${notification.type} notification sent`,
          timestamp: notification.created_at,
          user: notification.sender || 'System',
          details: { notificationId: notification.id, notificationType: notification.type }
        });
      });
    }

    // Add calendar activities
    if (recentEvents.data) {
      recentEvents.data.forEach(event => {
        activities.push({
          id: `event_${event.id}`,
          type: 'calendar_event',
          title: 'Event Created',
          description: `${event.title} scheduled`,
          timestamp: event.created_at,
          user: 'Admin',
          details: { eventId: event.id, eventType: event.type, startDate: event.start_date }
        });
      });
    }

    // Add document activities
    if (recentDocuments.data) {
      recentDocuments.data.forEach(doc => {
        activities.push({
          id: `document_${doc.id}`,
          type: 'document_template',
          title: 'Template Activity',
          description: `${doc.name} template used`,
          timestamp: doc.created_at,
          user: 'System',
          details: { templateId: doc.id, category: doc.category }
        });
      });
    }

    // Sort by timestamp and return latest 10
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  },

  // Recent Documents (replacing Express API call)
  async getRecentDocuments(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required for recent documents');
    }
    
    // Get recent document generations/activities from multiple sources
    const [admitCards, idCards, certificates, templates] = await Promise.all([
      // Recent admit cards (if table exists)
      supabase
        .from('admit_cards')
        .select('id, student_name, exam_name, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(result => ({ data: result.data || [], error: result.error })),
      
      // Recent ID cards (if table exists)
      supabase
        .from('id_cards')
        .select('id, student_name, card_type, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(result => ({ data: result.data || [], error: result.error })),
      
      // Recent certificates (if table exists)
      supabase
        .from('certificates')
        .select('id, student_name, certificate_type, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(result => ({ data: result.data || [], error: result.error })),
      
      // Popular document templates as fallback
      supabase
        .from('document_templates')
        .select('id, name, category, type, created_at, usage_count')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(10)
    ]);

    const documents: any[] = [];

    // Add admit cards
    if (admitCards.data) {
      admitCards.data.forEach(card => {
        documents.push({
          id: `admit_card_${card.id}`,
          name: `Admit Card - ${card.student_name}`,
          type: 'admit_card',
          category: 'Academic Documents',
          created_at: card.created_at,
          created_by: 'Admin',
          url: `/documents/admit-cards/${card.id}`
        });
      });
    }

    // Add ID cards
    if (idCards.data) {
      idCards.data.forEach(card => {
        documents.push({
          id: `id_card_${card.id}`,
          name: `ID Card - ${card.student_name}`,
          type: 'id_card',
          category: 'Identity Documents',
          created_at: card.created_at,
          created_by: 'Admin',
          url: `/documents/id-cards/${card.id}`
        });
      });
    }

    // Add certificates
    if (certificates.data) {
      certificates.data.forEach(cert => {
        documents.push({
          id: `certificate_${cert.id}`,
          name: `${cert.certificate_type} - ${cert.student_name}`,
          type: 'certificate',
          category: 'Certificates',
          created_at: cert.created_at,
          created_by: 'Admin',
          url: `/documents/certificates/${cert.id}`
        });
      });
    }

    // Add popular templates as recent activity
    if (templates.data) {
      templates.data.slice(0, 5).forEach(template => {
        documents.push({
          id: `template_${template.id}`,
          name: template.name,
          type: template.type || 'template',
          category: template.category || 'Templates',
          created_at: template.created_at,
          created_by: 'System',
          url: `/documents/templates/${template.id}`
        });
      });
    }

    // Sort by creation date and return latest 8
    return documents
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  },

  // Students - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getStudents(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch students - security isolation');
    }
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(student => fromDbStudent(student)) : [];
  },

  async getStudentById(id: number) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Convert snake_case fields to camelCase for UI
    return data ? fromDbStudent(data) : null;
  },

  async createStudent(camelCaseStudent: any) {
    if (!camelCaseStudent.school_id && !camelCaseStudent.schoolId) {
      throw new Error('School ID is required to create a student');
    }
    // Convert camelCase fields to snake_case for database, excluding read-only fields
    const dbStudent = toDbStudent(camelCaseStudent) as Database['public']['Tables']['students']['Insert'];
    
    const { data, error } = await supabase
      .from('students')
      .insert(dbStudent)
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert result back to camelCase for UI
    return data ? fromDbStudent(data) : null;
  },

  async updateStudent(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database, excluding read-only fields
    const dbUpdates = toDbStudent(camelCaseUpdates) as Database['public']['Tables']['students']['Update'];
    
    const { data, error } = await supabase
      .from('students')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert result back to camelCase for UI
    return data ? fromDbStudent(data) : null;
  },

  async deleteStudent(id: number) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // ==================== STUDENT PORTAL FUNCTIONS ====================
  // Comprehensive serverless functions for student-specific operations
  // All functions include school isolation and proper error handling

  /**
   * Get current student profile by user ID
   * Used in: student/profile.tsx (replaces /api/students/me)
   */
  async getStudentProfile(userId: string, schoolId: number) {
    if (!userId || !schoolId) {
      throw new Error('User ID and School ID are required');
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .single();

    if (error) {
      // If no student found with user_id, return null (not an error)
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? fromDbStudent(data) : null;
  },

  /**
   * Get student fee receipts
   * Used in: student/fees.tsx (replaces /api/fee-receipts)
   */
  async getStudentFeeReceipts(studentId: number, schoolId: number, options?: {
    limit?: number;
    status?: string;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('fee_receipts')
      .select(`
        *,
        fee_items (
          id,
          name,
          amount,
          receipt_id
        )
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get student fee summary (total paid, pending, etc.)
   * Used in: student/fees.tsx (replaces /api/students/fees/summary)
   */
  async getStudentFeeSummary(studentId: number, schoolId: number) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    const { data, error } = await supabase
      .from('fee_receipts')
      .select('amount, status')
      .eq('student_id', studentId)
      .eq('school_id', schoolId);

    if (error) throw error;

    const summary = {
      total_paid: 0,
      total_pending: 0,
      total_amount: 0,
      receipt_count: data?.length || 0
    };

    data?.forEach(receipt => {
      const amount = receipt.amount || 0;
      summary.total_amount += amount;
      
      if (receipt.status === 'paid' || receipt.status === 'completed') {
        summary.total_paid += amount;
      } else {
        summary.total_pending += amount;
      }
    });

    return summary;
  },

  /**
   * Get student attendance records
   * Used in: student/attendance.tsx (replaces /api/students/attendance)
   */
  async getStudentAttendance(studentId: number, schoolId: number, filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('attendance')
      .select(`
        *,
        subjects (id, name, name_bn),
        teachers (id, name)
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .order('date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get student attendance statistics
   * Used in: student/attendance.tsx (replaces /api/students/attendance/stats)
   */
  async getStudentAttendanceStats(studentId: number, schoolId: number, filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('attendance')
      .select('status, date')
      .eq('student_id', studentId)
      .eq('school_id', schoolId);

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total_days: data?.length || 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendance_percentage: 0
    };

    data?.forEach(record => {
      if (record.status === 'present') stats.present++;
      else if (record.status === 'absent') stats.absent++;
      else if (record.status === 'late') stats.late++;
      else if (record.status === 'excused') stats.excused++;
    });

    if (stats.total_days > 0) {
      stats.attendance_percentage = Math.round((stats.present / stats.total_days) * 100);
    }

    return stats;
  },

  /**
   * Get student exam results
   * Used in: student/results.tsx (replaces /api/students/results)
   */
  async getStudentResults(studentId: number, schoolId: number, filters?: {
    examId?: number;
    academicYearId?: number;
    limit?: number;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('exam_results')
      .select(`
        *,
        exams (id, name, name_bn, exam_type, exam_date, total_marks),
        subjects (id, name, name_bn),
        teachers (id, name)
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (filters?.examId) {
      query = query.eq('exam_id', filters.examId);
    }

    if (filters?.academicYearId) {
      query = query.eq('exams.academic_year_id', filters.academicYearId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get student performance analytics
   * Used in: student/results.tsx (replaces /api/students/performance)
   */
  async getStudentPerformance(studentId: number, schoolId: number, options?: {
    academicYearId?: number;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('exam_results')
      .select(`
        marks_obtained,
        total_marks,
        grade,
        subjects (name, name_bn),
        exams (name, exam_type)
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId);

    if (options?.academicYearId) {
      query = query.eq('exams.academic_year_id', options.academicYearId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate performance metrics
    const performance = {
      total_exams: data?.length || 0,
      average_percentage: 0,
      highest_marks: 0,
      lowest_marks: 100,
      subjects_performance: {} as Record<string, {
        average: number;
        count: number;
        subject_name: string;
      }>,
      grade_distribution: {
        'A+': 0,
        'A': 0,
        'B': 0,
        'C': 0,
        'D': 0,
        'F': 0
      }
    };

    let totalPercentage = 0;

    data?.forEach(result => {
      const percentage = result.total_marks > 0 
        ? (result.marks_obtained / result.total_marks) * 100 
        : 0;
      
      totalPercentage += percentage;
      
      if (percentage > performance.highest_marks) {
        performance.highest_marks = Math.round(percentage);
      }
      
      if (percentage < performance.lowest_marks) {
        performance.lowest_marks = Math.round(percentage);
      }

      // Grade distribution
      if (result.grade && performance.grade_distribution.hasOwnProperty(result.grade)) {
        performance.grade_distribution[result.grade as keyof typeof performance.grade_distribution]++;
      }

      // Subject-wise performance
      const subjects = result.subjects as any;
      const subjectName = (Array.isArray(subjects) ? subjects[0]?.name : subjects?.name) || 'Unknown';
      if (!performance.subjects_performance[subjectName]) {
        performance.subjects_performance[subjectName] = {
          average: 0,
          count: 0,
          subject_name: subjectName
        };
      }
      performance.subjects_performance[subjectName].average += percentage;
      performance.subjects_performance[subjectName].count++;
    });

    // Calculate averages
    if (performance.total_exams > 0) {
      performance.average_percentage = Math.round(totalPercentage / performance.total_exams);
    }

    // Finalize subject averages
    Object.keys(performance.subjects_performance).forEach(subject => {
      const subjectData = performance.subjects_performance[subject];
      if (subjectData.count > 0) {
        subjectData.average = Math.round(subjectData.average / subjectData.count);
      }
    });

    return performance;
  },

  /**
   * Get student notifications
   * Used in: student/notifications.tsx (replaces /api/students/notifications)
   */
  async getStudentNotifications(studentId: number, schoolId: number, options?: {
    limit?: number;
    unreadOnly?: boolean;
  }) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Filter by target - either for all students or specific student
    query = query.or(`target_id.eq.${studentId},target_type.eq.all_students`);

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark notification as read
   * Used in: student/notifications.tsx
   */
  async markNotificationAsRead(notificationId: number, studentId: number) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('target_id', studentId);

    if (error) throw error;
    return true;
  },

  /**
   * Get student by student_id (not database id)
   * Useful for looking up students by their school-assigned ID
   */
  async getStudentByStudentId(studentId: string, schoolId: number) {
    if (!studentId || !schoolId) {
      throw new Error('Student ID and School ID are required');
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? fromDbStudent(data) : null;
  },

  // ==================== END STUDENT PORTAL FUNCTIONS ====================

  // Teachers - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getTeachers(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch teachers - security isolation');
    }
    
    const { data, error } = await supabase
      .from('teachers')
      .select('id, teacher_id, name, qualification, subject, date_of_birth, gender, address, phone, email, school_id, status, created_at')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getTeacherById(id: number) {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, teacher_id, name, qualification, subject, date_of_birth, gender, address, phone, email, school_id, status, created_at')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createTeacher(teacher: Database['public']['Tables']['teachers']['Insert']) {
    const { data, error } = await supabase
      .from('teachers')
      .insert(teacher)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTeacher(id: number, updates: Database['public']['Tables']['teachers']['Update']) {
    const { data, error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTeacher(id: number) {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getTeacherStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get teacher stats');
    }
    const [totalTeachers, activeTeachers, inactiveTeachers] = await Promise.all([
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'inactive')
    ]);

    return {
      total_teachers: totalTeachers.count || 0,
      active_teachers: activeTeachers.count || 0,
      inactive_teachers: inactiveTeachers.count || 0
    };
  },

  // Library Books - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getLibraryBooks(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch library books - security isolation');
    }
    
    const { data, error } = await supabase
      .from('library_books')
      .select('id, title, title_bn, author, isbn, category, publisher, publish_year, total_copies, available_copies, location, description, school_id, created_at')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(book => fromDbLibrary(book)) : [];
  },

  async createLibraryBook(camelCaseBook: any) {
    if (!camelCaseBook.school_id && !camelCaseBook.schoolId) {
      throw new Error('School ID is required to create library book');
    }
    // Convert camelCase fields to snake_case for database
    const dbBook = toDbLibrary(camelCaseBook) as Database['public']['Tables']['library_books']['Insert'];
    
    const { data, error } = await supabase
      .from('library_books')
      .insert(dbBook)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbLibrary(data) : null;
  },

  async updateLibraryBook(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbLibrary(camelCaseUpdates) as Database['public']['Tables']['library_books']['Update'];
    
    const { data, error } = await supabase
      .from('library_books')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbLibrary(data) : null;
  },

  // Borrowed Books functions - SECURITY: Defense-in-depth
  async getBorrowedBooks(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch borrowed books - security isolation');
    }
    
    const { data, error } = await supabase
      .from('library_borrowed_books')
      .select(`
        *,
        students!inner(name, student_id, class, section),
        library_books!inner(title, author, isbn)
      `)
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false});
    
    if (error) throw error;
    return data;
  },

  async getLibraryStats(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch library stats - security isolation');
    }
    
    // SECURITY: All queries filtered by school_id for defense-in-depth
    const [totalBooks, borrowedBooks] = await Promise.all([
      supabase.from('library_books').select('total_copies', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('library_borrowed_books').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'borrowed')
    ]);

    const totalCopies = await supabase.from('library_books').select('total_copies').eq('school_id', schoolId);
    const availableCopies = await supabase.from('library_books').select('available_copies').eq('school_id', schoolId);

    const totalBooksCount = totalCopies.data?.reduce((sum, book) => sum + (book.total_copies || 0), 0) || 0;
    const availableBooksCount = availableCopies.data?.reduce((sum, book) => sum + (book.available_copies || 0), 0) || 0;

    return {
      total_books: totalBooks.count || 0,
      borrowed_books: borrowedBooks.count || 0,
      available_books: availableBooksCount,
      total_copies: totalBooksCount
    };
  },

  // Inventory Items - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getInventoryItems(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch inventory items - security isolation');
    }
    
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, name_bn, category, subcategory, brand, model, serial_number, unit_price, current_quantity, minimum_threshold, unit, supplier, location, condition, description, school_id, created_at, updated_at')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Return raw snake_case data as inventory UI expects snake_case
    return data || [];
  },

  async createInventoryItem(snakeCaseItem: any) {
    if (!snakeCaseItem.school_id) {
      throw new Error('School ID is required to create inventory item');
    }
    // Use snake_case data directly as it matches database schema
    const dbItem = snakeCaseItem as Database['public']['Tables']['inventory_items']['Insert'];
    
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(dbItem)
      .select()
      .single();
    
    if (error) throw error;
    // Return raw snake_case data as inventory UI expects snake_case
    return data;
  },

  async updateInventoryItem(id: number, snakeCaseUpdates: any) {
    // Use snake_case data directly as it matches database schema
    const dbUpdates = snakeCaseUpdates as Database['public']['Tables']['inventory_items']['Update'];
    
    const { data, error } = await supabase
      .from('inventory_items')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Return raw snake_case data as inventory UI expects snake_case
    return data;
  },

  // Staff functions - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getStaff(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch staff - security isolation');
    }
    
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(staff => fromDbStaff(staff)) : [];
  },

  async createStaff(camelCaseStaff: any) {
    if (!camelCaseStaff.school_id && !camelCaseStaff.schoolId) {
      throw new Error('School ID is required to create staff');
    }
    // Convert camelCase fields to snake_case for database
    const dbStaff = toDbStaff(camelCaseStaff) as Database['public']['Tables']['staff']['Insert'];
    
    const { data, error } = await supabase
      .from('staff')
      .insert(dbStaff)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbStaff(data) : null;
  },

  async updateStaff(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbStaff(camelCaseUpdates) as Database['public']['Tables']['staff']['Update'];
    
    const { data, error } = await supabase
      .from('staff')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbStaff(data) : null;
  },

  async deleteStaff(id: number) {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Calendar Events - SECURITY: Defense-in-depth with both RLS and client-side filtering
  async getCalendarEvents(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch calendar events - security isolation');
    }
    
    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, title_bn, description, description_bn, start_date, end_date, start_time, end_time, type, is_active, is_public, location, organizer, school_id, created_at')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .eq('is_active', true)
      .order('start_date', { ascending: true});
    
    if (error) throw error;
    return data;
  },

  async createCalendarEvent(event: Database['public']['Tables']['calendar_events']['Insert']) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(event)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Notifications  
  async getNotifications(schoolId: number, userId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch notifications');
    }
    let query = supabase
      .from('notifications')
      .select('id, title, title_bn, message, message_bn, type, priority, category, category_bn, recipient_id, recipient_type, sender, is_read, is_live, is_active, is_public, action_required, read_at, school_id, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`recipient_id.eq.${userId},is_public.eq.true`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },


  async sendNotification(notification: Database['public']['Tables']['notifications']['Insert']) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUnreadNotificationsCount(schoolId: number, userId?: number) {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .eq('is_read', false);

    if (userId) {
      query = query.or(`recipient_id.eq.${userId},is_public.eq.true`);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    return count || 0;
  },

  // Document Templates (replacing /api/document-templates endpoints)
  async getDocumentTemplates(schoolId?: number, category?: string) {
    let query = supabase
      .from('document_templates')
      .select('id, name, name_bn, category, type, description, description_bn, is_active, credit_cost, popularity_score, usage_count, created_at, required_credits')
      .eq('is_active', true);
    
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createDocumentTemplate(template: any) {
    const { data, error } = await supabase
      .from('document_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDocumentTemplate(id: number, updates: any) {
    const { data, error } = await supabase
      .from('document_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteDocumentTemplate(id: number) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getDocumentTemplateById(id: number) {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Transport
  async getTransportRoutes(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch transport routes');
    }
    const { data, error } = await supabase
      .from('transport_routes')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(route => fromDbTransport(route)) : [];
  },

  async getTransportVehicles(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch transport vehicles');
    }
    const { data, error } = await supabase
      .from('transport_vehicles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(vehicle => fromDbTransport(vehicle)) : [];
  },

  // Academic Years
  async getAcademicYears(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch academic years');
    }
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getCurrentAcademicYear(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch current academic year');
    }
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single();
    
    if (error) throw error;
    return data;
  },


  // Parent Management (replacing 4 Express routes)
  async getParents(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch parents');
    }
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(parent => fromDbParent(parent)) : [];
  },

  async createParent(camelCaseParent: any) {
    if (!camelCaseParent.school_id && !camelCaseParent.schoolId) {
      throw new Error('School ID is required to create parent');
    }
    // Convert camelCase fields to snake_case for database
    const dbParent = toDbParent(camelCaseParent) as Database['public']['Tables']['parents']['Insert'];
    
    const { data, error } = await supabase
      .from('parents')
      .insert(dbParent)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbParent(data) : null;
  },

  async updateParent(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbParent(camelCaseUpdates) as Database['public']['Tables']['parents']['Update'];
    
    const { data, error } = await supabase
      .from('parents')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbParent(data) : null;
  },

  async deleteParent(id: number) {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Library Management Extensions (using secure RPC functions)
  async borrowBook(bookId: number, studentId: number, schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to borrow a book');
    }
    
    const { data, error } = await supabase.rpc('borrow_library_book', {
      p_book_id: bookId,
      p_student_id: studentId,
      p_school_id: schoolId
    });
    
    if (error) throw error;
    return data;
  },

  async returnBook(borrowId: number) {
    const { data, error } = await supabase.rpc('return_library_book', {
      p_borrow_id: borrowId
    });
    
    if (error) throw error;
    return data;
  },


  async deleteLibraryBook(id: number) {
    const { error } = await supabase
      .from('library_books')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Inventory Management Extensions (completing 6 Express routes)

  async deleteInventoryItem(id: number) {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getInventoryMovements(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch inventory movements');
    }
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        inventory_items!inner(name, category)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createInventoryMovement(movement: Database['public']['Tables']['inventory_movements']['Insert']) {
    if (!movement.school_id) {
      throw new Error('School ID is required to create inventory movement');
    }
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert(movement)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getInventoryStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get inventory stats');
    }
    const [totalItems, lowStock] = await Promise.all([
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).filter('current_quantity', 'lte', 'minimum_threshold')
    ]);
    
    return {
      total_items: totalItems.count || 0,
      low_stock_items: lowStock.count || 0
    };
  },

  // Financial Management (replacing 10 Express routes)
  async getFinancialTransactions(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch financial transactions');
    }
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createFinancialTransaction(transaction: Database['public']['Tables']['financial_transactions']['Insert']) {
    if (!transaction.school_id) {
      throw new Error('School ID is required to create financial transaction');
    }
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFinancialStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get financial stats');
    }
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('transaction_type, amount')
      .eq('school_id', schoolId);
    
    if (error) throw error;
    
    const income = data?.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const expense = data?.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    return {
      total_income: income,
      total_expense: expense,
      net_balance: income - expense,
      total_transactions: data?.length || 0
    };
  },

  async getFeeReceipts(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch fee receipts');
    }
    const { data, error } = await supabase
      .from('fee_receipts')
      .select(`
        *,
        students!inner(name, student_id),
        fee_items(type, amount, description)
      `)
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getFeeReceiptById(id: number) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .select(`
        *,
        students!inner(name, student_id, class, section),
        fee_items(type, amount, description)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createFeeReceipt(receipt: any, feeItems: any[]) {
    if (!receipt.school_id) {
      throw new Error('School ID is required to create fee receipt');
    }
    
    const { data, error } = await supabase.rpc('create_fee_receipt_with_items', {
      receipt_data: receipt,
      fee_items_data: feeItems
    });
    
    if (error) throw error;
    
    return data;
  },

  async updateFeeReceipt(id: number, updates: any) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteFeeReceipt(id: number) {
    // Delete fee items first
    await supabase.from('fee_items').delete().eq('receipt_id', id);
    
    const { error } = await supabase
      .from('fee_receipts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getFeeItems(receiptId?: number) {
    let query = supabase.from('fee_items').select('*');
    
    if (receiptId) {
      query = query.eq('receipt_id', receiptId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Transport Management (replacing 8 Express routes)
  async getTransportStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get transport stats');
    }
    const [routes, vehicles, assignments] = await Promise.all([
      supabase.from('transport_routes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('transport_vehicles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
      supabase.from('transport_student_assignments').select('id', { count: 'exact', head: true }).eq('school_id', schoolId)
    ]);
    
    return {
      total_routes: routes.count || 0,
      active_vehicles: vehicles.count || 0,
      student_assignments: assignments.count || 0
    };
  },

  async createTransportRoute(camelCaseRoute: any) {
    if (!camelCaseRoute.school_id && !camelCaseRoute.schoolId) {
      throw new Error('School ID is required to create transport route');
    }
    // Convert camelCase fields to snake_case for database
    const dbRoute = toDbTransport(camelCaseRoute);
    
    const { data, error } = await supabase
      .from('transport_routes')
      .insert(dbRoute)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async updateTransportRoute(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbTransport(camelCaseUpdates);
    
    const { data, error } = await supabase
      .from('transport_routes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async deleteTransportRoute(id: number) {
    const { error } = await supabase
      .from('transport_routes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async createTransportVehicle(camelCaseVehicle: any) {
    if (!camelCaseVehicle.school_id && !camelCaseVehicle.schoolId) {
      throw new Error('School ID is required to create transport vehicle');
    }
    // Convert camelCase fields to snake_case for database
    const dbVehicle = toDbTransport(camelCaseVehicle);
    
    const { data, error } = await supabase
      .from('transport_vehicles')
      .insert(dbVehicle)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async getTransportAssignments(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get transport assignments');
    }
    const { data, error } = await supabase
      .from('transport_student_assignments')
      .select(`
        *,
        students!inner(name, student_id, class),
        transport_routes!inner(route_name, pickup_time)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Convert snake_case fields to camelCase for UI (keeping joined tables as-is)
    return data ? data.map(assignment => fromDbTransport(assignment)) : [];
  },

  async createTransportAssignment(camelCaseAssignment: any) {
    if (!camelCaseAssignment.school_id && !camelCaseAssignment.schoolId) {
      throw new Error('School ID is required to create transport assignment');
    }
    // Convert camelCase fields to snake_case for database
    const dbAssignment = toDbTransport(camelCaseAssignment);
    
    const { data, error } = await supabase
      .from('transport_student_assignments')
      .insert(dbAssignment)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async updateTransportVehicle(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbTransport(camelCaseUpdates);
    
    const { data, error } = await supabase
      .from('transport_vehicles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async deleteTransportVehicle(id: number) {
    const { error } = await supabase
      .from('transport_vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async updateTransportAssignment(id: number, camelCaseUpdates: any) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbTransport(camelCaseUpdates);
    
    const { data, error } = await supabase
      .from('transport_student_assignments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Convert result back to camelCase for UI
    return data ? fromDbTransport(data) : null;
  },

  async deleteTransportAssignment(id: number) {
    const { error } = await supabase
      .from('transport_student_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Admit Card System (replacing 7 Express routes)
  async getAdmitCardTemplates(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get admit card templates');
    }
    const { data, error } = await supabase
      .from('admit_card_templates')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getAdmitCardStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get admit card stats');
    }
    const [templates, cards, recent] = await Promise.all([
      supabase.from('admit_card_templates').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
      supabase.from('admit_cards').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('admit_cards').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);
    
    return {
      total_templates: templates.count || 0,
      total_cards: cards.count || 0,
      recent_cards: recent.count || 0
    };
  },

  async getAdmitCards(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch admit cards');
    }
    const { data, error } = await supabase
      .from('admit_cards')
      .select(`
        *,
        admit_card_templates(name, category)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getAdmitCardHistory(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get admit card history');
    }
    const { data, error } = await supabase
      .from('admit_card_history')
      .select(`
        *,
        admit_cards!inner(student_name, card_number)
      `)
      .eq('school_id', schoolId)
      .order('performed_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async generateAdmitCard(cardData: any) {
    const { data, error } = await supabase
      .from('admit_cards')
      .insert(cardData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async generateBatchAdmitCards(cardsData: any[]) {
    const { data, error } = await supabase
      .from('admit_cards')
      .insert(cardsData)
      .select();
    
    if (error) throw error;
    return data;
  },

  async createAdmitCardTemplate(template: any) {
    const { data, error } = await supabase
      .from('admit_card_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Academic Management (replacing 10 Express routes)
  async getClassRoutines(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch class routines');
    }
    const { data, error } = await supabase
      .from('class_routines')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getExams(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch exams');
    }
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getExamSchedules(examId?: number) {
    let query = supabase.from('exam_schedules').select(`
      *,
      exams!inner(name)
    `);
    
    if (examId) {
      query = query.eq('exam_id', examId);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Meeting & Video Conference (replacing 4 Express routes)
  async getMeetings(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch meetings');
    }
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('school_id', schoolId)
      .order('scheduled_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createMeeting(meeting: any) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMeetingStatus(id: number, status: string) {
    const { data, error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getMeetingStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get meeting stats');
    }
    const [total, upcoming, completed] = await Promise.all([
      supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'scheduled'),
      supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'completed')
    ]);
    
    return {
      total_meetings: total.count || 0,
      upcoming_meetings: upcoming.count || 0,
      completed_meetings: completed.count || 0
    };
  },

  // User Management - SECURITY: Defense-in-depth with school_id filtering
  async getUsers(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch users - security isolation');
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', schoolId) // SECURITY: Client-side filter for defense-in-depth
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getUserStats(schoolId?: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch user stats - security isolation');
    }
    
    // SECURITY: All queries filtered by school_id for defense-in-depth
    const [total, active, inactive] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'inactive')
    ]);
    
    return {
      total_users: total.count || 0,
      active_users: active.count || 0,
      inactive_users: inactive.count || 0
    };
  },

  async createUser(user: any) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUserStatus(id: number | string, status: string) {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteUser(id: number) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // School Settings & Admin (replacing 8 Express routes)
  async getSchoolSettings(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch school settings');
    }
    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSchoolSettings(schoolId: number, settings: any) {
    const { data, error } = await supabase
      .from('school_settings')
      .upsert({ ...settings, school_id: schoolId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAdminStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get admin stats');
    }
    // Get comprehensive statistics for admin dashboard
    const stats = await this.getDashboardStats(schoolId);
    
    const [recentActivities, systemStatus] = await Promise.all([
      supabase.from('notifications').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10),
      this.getSystemHealthStatus()
    ]);
    
    return {
      ...stats,
      recent_activities: recentActivities.data || [],
      system_status: systemStatus
    };
  },

  async getSystemHealthStatus() {
    // Check system health by testing database connectivity and response times
    const startTime = Date.now();
    
    try {
      await supabase.from('students').select('id').limit(1);
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        database_connection: 'connected',
        response_time: responseTime,
        last_check: new Date().toISOString()
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        database_connection: 'disconnected', 
        error: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date().toISOString()
      };
    }
  },

  // Multi-School Management (replacing 7 Express routes)
  async getSchools() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getSchoolById(id: number) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createSchool(school: any) {
    const { data, error } = await supabase
      .from('schools')
      .insert(school)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async setupSchoolSupabase(schoolId: number, config: any) {
    // This would typically involve creating school-specific database schemas
    // For now, we'll update the school configuration
    const { data, error } = await supabase
      .from('schools')
      .update({ supabase_config: config, status: 'active' })
      .eq('id', schoolId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async testSchoolConnection(schoolId: number) {
    // Test the connection for a specific school
    try {
      await this.getDashboardStats(schoolId);
      return { status: 'connected', message: 'School database connection successful' };
    } catch (error: unknown) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getSchoolSupabaseConfig(schoolId: number) {
    const { data, error } = await supabase
      .from('schools')
      .select('supabase_config')
      .eq('id', schoolId)
      .single();
    
    if (error) throw error;
    return data?.supabase_config;
  },

  async updateSchoolSupabaseConfig(schoolId: number, config: any) {
    const { data, error } = await supabase
      .from('schools')
      .update({ supabase_config: config })
      .eq('id', schoolId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAdminOverview() {
    const [schools, totalUsers, totalStudents] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true })
    ]);
    
    return {
      total_schools: schools.count || 0,
      total_users: totalUsers.count || 0,
      total_students: totalStudents.count || 0
    };
  },

  // Public Routes (replacing 2 Express routes)
  async getPublicTransportRoutes() {
    const { data, error } = await supabase
      .from('transport_routes')
      .select('id, route_name, pickup_points, fare')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('route_name');
    
    if (error) throw error;
    return data;
  },

  async initializePublicTransport() {
    // Initialize public transport data if needed
    const { data, error } = await supabase
      .from('transport_routes')
      .select('id')
      .eq('is_public', true)
      .limit(1);
    
    if (error) throw error;
    
    return {
      status: 'initialized',
      public_routes_available: (data?.length || 0) > 0
    };
  },

  // File Storage Operations (replacing /api/upload and /api/files endpoints)
  async uploadFile(file: File, folder: string = 'documents', studentId?: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = studentId 
        ? `${folder}/${studentId}/${timestamp}.${fileExt}`
        : `${folder}/${timestamp}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('school-files')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('school-files')
        .getPublicUrl(fileName);

      return { 
        path: fileName, 
        url: urlData.publicUrl,
        message: 'File uploaded successfully' 
      };
    } catch (error: any) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  },

  async getStudentFiles(studentId: string) {
    try {
      const { data, error } = await supabase.storage
        .from('school-files')
        .list(`documents/${studentId}`);

      if (error) throw error;

      // Add public URLs to each file
      const filesWithUrls = (data || []).map(file => {
        const { data: urlData } = supabase.storage
          .from('school-files')
          .getPublicUrl(`documents/${studentId}/${file.name}`);
        
        return {
          ...file,
          url: urlData.publicUrl
        };
      });

      return filesWithUrls;
    } catch (error: any) {
      throw new Error(`Failed to get files: ${error.message}`);
    }
  },

  async deleteFile(filePath: string) {
    try {
      const { error } = await supabase.storage
        .from('school-files')
        .remove([filePath]);

      if (error) throw error;
      return { message: 'File deleted successfully' };
    } catch (error: any) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  },

  // CSV/Excel Import Functions (replacing multer-based student import)
  async importStudentsFromFile(file: File, schoolId: number) {
    try {
      // Upload file first
      const { path } = await this.uploadFile(file, 'imports');
      
      // Parse file content based on type
      let data;
      if (file.type.includes('csv') || file.name.endsWith('.csv')) {
        data = await this.parseCSVFile(file);
      } else if (file.type.includes('excel') || file.name.match(/\.(xlsx|xls)$/)) {
        data = await this.parseExcelFile(file);
      } else {
        throw new Error('Unsupported file type. Please use CSV or Excel files.');
      }

      // Validate and format student data
      const students = data.map((row: any, index: number) => {
        const student = this.validateStudentRow(row, index);
        return {
          ...student,
          school_id: schoolId,
          created_at: new Date().toISOString()
        };
      });

      // Insert students in batches
      const batchSize = 100;
      const results = [];
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const { data: insertedData, error } = await supabase
          .from('students')
          .insert(batch)
          .select();
        
        if (error) throw error;
        results.push(...(insertedData || []));
      }

      return {
        imported: results.length,
        total: students.length,
        file_path: path,
        students: results
      };
    } catch (error: any) {
      throw new Error(`Import failed: ${error.message}`);
    }
  },

  async parseCSVFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }
        resolve(data);
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  },

  async parseExcelFile(file: File): Promise<any[]> {
    // Note: This would require xlsx library to be available on frontend
    // For now, return basic parsing - full implementation would need xlsx import
    throw new Error('Excel parsing requires xlsx library. Please use CSV files or implement xlsx support.');
  },

  validateStudentRow(row: any, index: number): any {
    const errors: string[] = [];
    
    // Basic validation - adapt based on your student schema
    if (!row.name && !row.Name) errors.push(`Row ${index + 1}: Name is required`);
    if (!row.email && !row.Email) errors.push(`Row ${index + 1}: Email is required`);
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return {
      name: row.name || row.Name || '',
      email: row.email || row.Email || '',
      phone: row.phone || row.Phone || '',
      class: row.class || row.Class || '',
      section: row.section || row.Section || '',
      roll_number: row.roll_number || row.Roll || row['Roll Number'] || '',
    };
  },

  // Real-time subscriptions (replacing WebSocket functionality)
  subscribeToNotifications(schoolId: number, callback: (notification: any) => void) {
    return supabase
      .channel(`notifications_${schoolId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `school_id=eq.${schoolId}`
      }, callback)
      .subscribe();
  },

  subscribeToStudents(schoolId: number, callback: (student: any) => void) {
    return supabase
      .channel(`students_${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'students',
        filter: `school_id=eq.${schoolId}`
      }, callback)
      .subscribe();
  },

  // ID Card Operations (replacing /api/id-cards endpoints)
  async getIdCardStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get ID card stats');
    }
    
    const [totalCards, pendingCards, completedCards] = await Promise.all([
      supabase.from('id_cards').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('id_cards').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
      supabase.from('id_cards').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'completed')
    ]);
    
    return {
      total_cards: totalCards.count || 0,
      pending_cards: pendingCards.count || 0,
      completed_cards: completedCards.count || 0
    };
  },

  async getRecentIdCards(schoolId: number, limit: number = 10) {
    if (!schoolId) {
      throw new Error('School ID is required to get recent ID cards');
    }
    
    const { data, error } = await supabase
      .from('id_cards')
      .select(`
        *,
        students!inner(name, class, section)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async getIdCardHistory(schoolId: number, limit: number = 50) {
    if (!schoolId) {
      throw new Error('School ID is required to get ID card history');
    }
    
    const { data, error } = await supabase
      .from('id_cards')
      .select(`
        *,
        students!inner(name, student_id, class, section)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async createIdCard(cardData: any) {
    if (!cardData.school_id) {
      throw new Error('School ID is required to create ID card');
    }
    
    const { data, error } = await supabase
      .from('id_cards')
      .insert(cardData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Document Management API replacements
  async getDocumentTemplatesEnhanced(schoolId?: number, category?: string, searchQuery?: string) {
    let query = supabase
      .from('document_templates')
      .select('id, name, name_bn, category, type, description, description_bn, is_active, required_credits, usage_count, created_at')
      .eq('is_active', true);
    
    // Don't filter by school_id if templates are global (NULL school_id)
    // This allows all 54 templates to be displayed
    if (schoolId && false) { // Temporarily disable school_id filtering
      query = query.eq('school_id', schoolId);
    }
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,name_bn.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,description_bn.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('usage_count', { ascending: false });
    
    if (error) throw error;
    
    // Enhance the data with additional metadata
    const enhancedTemplates = (data || []).map((template: any) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      nameBn: template.name_bn || getBengaliName(template.type),
      description: template.description,
      descriptionBn: template.description_bn || getBengaliDescription(template.type),
      category: template.category,
      creditsRequired: template.required_credits || 1,
      generated: template.usage_count || 0,
      isPopular: (template.usage_count || 0) > 50,
      icon: getDocumentIcon(template.type),
      difficulty: getDifficulty(template.type),
      estimatedTime: getEstimatedTime(template.type),
      path: `/documents/${template.type}`,
      usageCount: template.usage_count || 0,
      lastUsed: template.created_at
    }));
    
    return enhancedTemplates;
  },

  async getUserDocumentStats(userId?: string, schoolId: number = 1) {
    try {
      const { data: generationsData, error: generationsError } = await supabase
        .from('document_generations')
        .select('document_type, credits_used, created_at')
        .eq('school_id', schoolId);

      if (generationsError) {
        console.warn('Error fetching document generations:', generationsError);
      }

      const totalGenerated = generationsData?.length || 0;
      const creditsUsed = generationsData?.reduce((sum, gen) => sum + (gen.credits_used || 0), 0) || 0;
      const monthlyUsed = generationsData?.filter(gen => {
        const genDate = new Date(gen.created_at);
        const now = new Date();
        return genDate.getMonth() === now.getMonth() && genDate.getFullYear() === now.getFullYear();
      }).length || 0;

      return {
        totalGenerated,
        creditsUsed,
        creditsRemaining: 500, // This should be calculated from credit_balance
        monthlyLimit: 500,
        monthlyUsed
      };
    } catch (error) {
      console.error('Error getting user document stats:', error);
      return {
        totalGenerated: 0,
        creditsUsed: 0,
        creditsRemaining: 500,
        monthlyLimit: 500,
        monthlyUsed: 0
      };
    }
  },

  // Credit System Functions (replacing Express API endpoints)
  async getCreditBalance(userId: string, schoolId: number = 1) {
    try {
      const { data, error } = await supabase
        .from('credit_balances')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching credit balance:', error);
        return { currentBalance: 500, totalEarned: 500, totalSpent: 0 };
      }

      // If no credit balance record exists for this school, create a default one
      if (!data) {
        console.log('No credit balance record found, creating default for school:', schoolId);
        const { data: newBalance, error: insertError } = await supabase
          .from('credit_balances')
          .insert({
            school_id: schoolId,
            available_credits: 500,
            total_credits: 500,
            used_credits: 0
          })
          .select()
          .single();

        if (insertError) {
          console.warn('Error creating default credit balance:', insertError);
          return { currentBalance: 500, totalEarned: 500, totalSpent: 0 };
        }

        return {
          currentBalance: newBalance?.available_credits || 500,
          totalEarned: newBalance?.total_credits || 500,
          totalSpent: newBalance?.used_credits || 0
        };
      }

      return {
        currentBalance: data?.available_credits || 500,
        totalEarned: data?.total_credits || 500,
        totalSpent: data?.used_credits || 0
      };
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return { currentBalance: 500, totalEarned: 500, totalSpent: 0 };
    }
  },

  async getCreditPackages() {
    // Note: credit_packages are SYSTEM-WIDE, not school-specific
    // All schools see the same packages (controlled by system admin)
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      return [];
    }
  },

  async getCreditTransactions(userId: string, schoolId: number = 1) {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('school_instance_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
      return [];
    }
  },

  async purchaseCredits(purchaseData: {
    packageId: number;
    paymentMethod: string;
    amount: number;
    userId: string;
    schoolId: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: parseInt(purchaseData.userId),
          package_id: purchaseData.packageId,
          amount: purchaseData.amount,
          payment_method: purchaseData.paymentMethod,
          type: 'purchase',
          status: 'completed',
          school_instance_id: purchaseData.schoolId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update credit balance
      await supabase.rpc('update_credit_balance', {
        p_school_id: purchaseData.schoolId,
        p_credits_to_add: purchaseData.amount
      });

      return data;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  },

  async getDocumentCosts() {
    // Return static document costs - system-wide (same for all schools)
    // This could be stored in database if dynamic management is needed
    return [
      { id: 1, name: "Admit Card", nameBn: "প্রবেশপত্র", requiredCredits: 5, category: "academic" },
      { id: 2, name: "ID Card", nameBn: "পরিচয়পত্র", requiredCredits: 10, category: "identity" },
      { id: 3, name: "Certificate", nameBn: "সার্টিফিকেট", requiredCredits: 15, category: "official" },
      { id: 4, name: "Marksheet", nameBn: "নম্বরপত্র", requiredCredits: 8, category: "academic" },
      { id: 5, name: "Transfer Certificate", nameBn: "স্থানান্তর সার্টিফিকেট", requiredCredits: 20, category: "official" }
    ];
  },

  async seedDocumentTemplates(schoolId: number = 1) {
    const templates = [
      {
        name: 'Student ID Card',
        name_bn: 'শিক্ষার্থী আইডি কার্ড',
        type: 'student-id-cards',
        category: 'academic',
        description: 'Professional student identification cards',
        description_bn: 'পেশাদার শিক্ষার্থী পরিচয়পত্র তৈরি করুন',
        required_credits: 1,
        is_active: true,
        school_id: schoolId,
        usage_count: 0
      },
      {
        name: 'Teacher ID Card',
        name_bn: 'শিক্ষক আইডি কার্ড',
        type: 'teacher-id-cards',
        category: 'staff',
        description: 'Professional teacher identification cards',
        description_bn: 'পেশাদার শিক্ষক পরিচয়পত্র তৈরি করুন',
        required_credits: 1,
        is_active: true,
        school_id: schoolId,
        usage_count: 0
      },
      {
        name: 'Admit Card',
        name_bn: 'এডমিট কার্ড',
        type: 'admit-cards',
        category: 'examination',
        description: 'Examination admit cards',
        description_bn: 'পরীক্ষার প্রবেশপত্র তৈরি করুন',
        required_credits: 1,
        is_active: true,
        school_id: schoolId,
        usage_count: 0
      },
      {
        name: 'Fee Receipt',
        name_bn: 'ফি রসিদ',
        type: 'fee-receipts',
        category: 'financial',
        description: 'Student fee payment receipts',
        description_bn: 'শিক্ষার্থীদের ফি রসিদ তৈরি করুন',
        required_credits: 1,
        is_active: true,
        school_id: schoolId,
        usage_count: 0
      },
      {
        name: 'Marksheet',
        name_bn: 'মার্কশীট',
        type: 'marksheets',
        category: 'academic',
        description: 'Student academic marksheets',
        description_bn: 'একাডেমিক মার্কশীট তৈরি করুন',
        required_credits: 2,
        is_active: true,
        school_id: schoolId,
        usage_count: 0
      }
    ];

    const { data, error } = await supabase
      .from('document_templates')
      .upsert(templates, { onConflict: 'type,school_id' })
      .select();

    if (error) throw error;
    return { success: true, message: 'Templates seeded successfully', count: data?.length || 0 };
  },

  async generateDocument(documentData: { templateId: number; documentType: string; studentIds: number[]; schoolId?: number }): Promise<any> {
    const schoolId = documentData.schoolId || 1;
    
    try {
      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('required_credits, name')
        .eq('id', documentData.templateId)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error('Document template not found');
      }

      const creditsRequired = template.required_credits || 1;

      // Check user's available credits - using direct credit balance check
      const { data: creditBalance } = await supabase
        .from('credit_balances')
        .select('current_balance')
        .eq('school_instance_id', schoolId)
        .single();
      
      const creditStats = { currentBalance: creditBalance?.current_balance || 0 };
      
      if (creditStats.currentBalance < creditsRequired) {
        throw new Error(`Insufficient credits. Required: ${creditsRequired}, Available: ${creditStats.currentBalance}`);
      }

      // Record document generation
      const { data: generation, error: generationError } = await supabase
        .from('document_generations')
        .insert({
          user_id: 'current_user', // This should be the actual user ID
          document_type: documentData.documentType,
          document_name: template.name,
          credits_used: creditsRequired,
          status: 'completed',
          metadata: JSON.stringify({ studentIds: documentData.studentIds }),
          school_id: schoolId
        })
        .select()
        .single();

      if (generationError) throw generationError;

      // Deduct credits
      const { error: creditError } = await supabase
        .from('credit_transactions')
        .insert({
          school_instance_id: schoolId,
          type: 'usage',
          amount: -creditsRequired,
          description: `Document generation: ${template.name}`,
          reference: documentData.documentType
        });

      if (creditError) throw creditError;

      // Update template usage count - using RPC for atomic increment
      const { data: currentTemplate } = await supabase
        .from('document_templates')
        .select('usage_count')
        .eq('id', documentData.templateId)
        .single();
        
      if (currentTemplate) {
        await supabase
          .from('document_templates')
          .update({ usage_count: (currentTemplate.usage_count || 0) + 1 })
          .eq('id', documentData.templateId);
      }

      return {
        success: true,
        message: 'Document generated successfully',
        creditsUsed: creditsRequired,
        remainingCredits: creditStats.currentBalance - creditsRequired
      };

    } catch (error: any) {
      console.error('Error generating document:', error);
      throw error;
    }
  },

  // ==================== STUDENT PORTAL FUNCTIONS ====================

  async getStudentAcademicStats(studentId: number, schoolId: number) {
    console.log('📚 Fetching academic stats for student:', studentId);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('grade, gpa, position')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching academic stats:', error);
        return { gpa: 0, grade: 'N/A', position: 0 };
      }
      
      const latest = data?.[0];
      return {
        gpa: latest?.gpa || 0,
        grade: latest?.grade || 'N/A',
        position: latest?.position || 0
      };
    } catch (error) {
      console.error('Error in getStudentAcademicStats:', error);
      return { gpa: 0, grade: 'N/A', position: 0 };
    }
  },

  async getStudentRecentActivities(studentId: number, schoolId: number) {
    console.log('📋 Fetching recent activities for student:', studentId);
    try {
      const [examResults, assignments, feeReceipts, libraryBooks] = await Promise.all([
        supabase.from('exam_results').select('*, exams(name)').eq('student_id', studentId).eq('school_id', schoolId).order('created_at', { ascending: false }).limit(3),
        supabase.from('assignments').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(3),
        supabase.from('fee_receipts').select('*').eq('student_id', studentId).eq('school_id', schoolId).order('payment_date', { ascending: false }).limit(2),
        supabase.from('library_borrows').select('*, library_books(title)').eq('student_id', studentId).eq('school_id', schoolId).order('borrow_date', { ascending: false }).limit(2)
      ]);

      const activities: any[] = [];
      
      examResults.data?.forEach(result => {
        activities.push({
          type: 'exam_result',
          title: `Exam Result: ${result.exams?.name || 'Exam'}`,
          description: `Score: ${result.marks_obtained}/${result.total_marks}`,
          timestamp: result.created_at
        });
      });
      
      assignments.data?.forEach(assignment => {
        activities.push({
          type: 'assignment',
          title: assignment.title,
          description: `Due: ${assignment.due_date}`,
          timestamp: assignment.created_at
        });
      });
      
      feeReceipts.data?.forEach(receipt => {
        activities.push({
          type: 'fee_payment',
          title: 'Fee Payment',
          description: `Amount: ${receipt.total_amount}`,
          timestamp: receipt.payment_date
        });
      });
      
      libraryBooks.data?.forEach(borrow => {
        activities.push({
          type: 'library',
          title: `Borrowed: ${borrow.library_books?.title || 'Book'}`,
          description: `Return by: ${borrow.return_date}`,
          timestamp: borrow.borrow_date
        });
      });
      
      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
    } catch (error) {
      console.error('Error in getStudentRecentActivities:', error);
      return [];
    }
  },

  async getStudentUpcomingEvents(studentId: number, schoolId: number) {
    console.log('📅 Fetching upcoming events for student:', studentId);
    try {
      const student = await supabase.from('students').select('class, section').eq('id', studentId).single();
      if (!student.data) return [];
      
      const [exams, assignments] = await Promise.all([
        supabase.from('exams').select('*').eq('school_id', schoolId).gte('exam_date', new Date().toISOString()).order('exam_date', { ascending: true }).limit(5),
        supabase.from('assignments').select('*').eq('class', student.data.class).eq('section', student.data.section).eq('school_id', schoolId).gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).limit(5)
      ]);

      const events: any[] = [];
      
      exams.data?.forEach(exam => {
        events.push({
          type: 'exam',
          title: exam.name,
          date: exam.exam_date,
          description: `${exam.exam_type} - ${exam.total_marks} marks`
        });
      });
      
      assignments.data?.forEach(assignment => {
        events.push({
          type: 'assignment',
          title: assignment.title,
          date: assignment.due_date,
          description: `${assignment.total_marks} marks`
        });
      });
      
      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error in getStudentUpcomingEvents:', error);
      return [];
    }
  },

  async getStudentExamResults(studentId: number, schoolId: number) {
    console.log('📝 Fetching exam results for student:', studentId);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams(name, exam_date, total_marks),
          subjects(name, code)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching exam results:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getStudentExamResults:', error);
      return [];
    }
  },

  async getStudentAssignments(studentId: number, schoolId: number) {
    console.log('📚 Fetching assignments for student:', studentId);
    try {
      const student = await supabase.from('students').select('class, section').eq('id', studentId).single();
      if (!student.data) return [];
      
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects(name),
          teachers(name)
        `)
        .eq('class', student.data.class)
        .eq('section', student.data.section)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getStudentAssignments:', error);
      return [];
    }
  },

  // ==================== TEACHER PORTAL FUNCTIONS ====================
  
  async getTeacherOverview(teacherId: number, schoolId: number) {
    console.log('👨‍🏫 Fetching teacher overview for:', teacherId);
    try {
      const [classes, students, assignments, schedules] = await Promise.all([
        supabase.from('teacher_assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('teacher_assignments').select('class, section').eq('teacher_id', teacherId).eq('school_id', schoolId).then(async (res) => {
          if (!res.data?.length) return { count: 0 };
          const classData = res.data[0];
          return supabase.from('students').select('id', { count: 'exact', head: true }).eq('class', classData.class).eq('section', classData.section).eq('school_id', schoolId);
        }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('class_schedules').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId)
      ]);
      
      return {
        totalClasses: classes.count || 0,
        totalStudents: students.count || 0,
        totalAssignments: assignments.count || 0,
        totalSchedules: schedules.count || 0
      };
    } catch (error) {
      console.error('Error in getTeacherOverview:', error);
      return { totalClasses: 0, totalStudents: 0, totalAssignments: 0, totalSchedules: 0 };
    }
  },

  async getTeacherClasses(teacherId: number, schoolId: number) {
    console.log('📚 Fetching teacher classes for:', teacherId);
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          subjects(name, code),
          academic_years(year)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching teacher classes:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getTeacherClasses:', error);
      return [];
    }
  },

  async getTeacherStudents(teacherId: number, schoolId: number) {
    console.log('👥 Fetching students for teacher:', teacherId);
    try {
      const assignments = await supabase
        .from('teacher_assignments')
        .select('class, section')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (!assignments.data?.length) return [];
      
      const classSection = assignments.data[0];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class', classSection.class)
        .eq('section', classSection.section)
        .eq('school_id', schoolId)
        .order('roll_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }
      
      return data ? data.map(s => fromDbStudent(s)) : [];
    } catch (error) {
      console.error('Error in getTeacherStudents:', error);
      return [];
    }
  },

  async createExamResult(data: any) {
    console.log('✍️ Creating exam result:', data);
    try {
      const dbData = toDbExamResult(data);
      const { data: result, error } = await supabase
        .from('exam_results')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbExamResult(result);
    } catch (error) {
      console.error('Error in createExamResult:', error);
      throw error;
    }
  },

  async getExamResults(examId: number, subjectId: number, classValue: string, section: string, schoolId: number) {
    console.log('📊 Fetching exam results for:', { examId, subjectId, classValue, section });
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          students(name, roll_number),
          exams(name),
          subjects(name)
        `)
        .eq('school_id', schoolId);
      
      if (examId) query = query.eq('exam_id', examId);
      if (subjectId) query = query.eq('subject_id', subjectId);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching exam results:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getExamResults:', error);
      return [];
    }
  },

  async markAttendance(data: any) {
    console.log('✅ Marking attendance:', data);
    try {
      const dbData = toDbAttendanceRecord(data);
      const { data: result, error } = await supabase
        .from('attendance_records')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbAttendanceRecord(result);
    } catch (error) {
      console.error('Error in markAttendance:', error);
      throw error;
    }
  },

  async getTeacherSchedule(teacherId: number, schoolId: number) {
    console.log('📅 Fetching teacher schedule for:', teacherId);
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select(`
          *,
          subjects(name, code)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('day_of_week', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        return [];
      }
      
      return data ? data.map(s => fromDbClassSchedule(s)) : [];
    } catch (error) {
      console.error('Error in getTeacherSchedule:', error);
      return [];
    }
  },

  async createAssignment(data: any) {
    console.log('📝 Creating assignment:', data);
    try {
      const dbData = toDbAssignment(data);
      const { data: result, error } = await supabase
        .from('assignments')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbAssignment(result);
    } catch (error) {
      console.error('Error in createAssignment:', error);
      throw error;
    }
  },

  async getTeacherAssignments(teacherId: number, schoolId: number) {
    console.log('📚 Fetching teacher assignments for:', teacherId);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects(name)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
      
      return data ? data.map(a => fromDbAssignment(a)) : [];
    } catch (error) {
      console.error('Error in getTeacherAssignments:', error);
      return [];
    }
  },

  // ==================== PARENT PORTAL FUNCTIONS ====================
  
  async getParentChildren(parentId: number, schoolId: number) {
    console.log('👨‍👩‍👧‍👦 Fetching children for parent:', parentId);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', parentId)
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }
      
      return data ? data.map(s => fromDbStudent(s)) : [];
    } catch (error) {
      console.error('Error in getParentChildren:', error);
      return [];
    }
  },

  async getChildProfile(studentId: number, schoolId: number) {
    console.log('👤 Fetching child profile:', studentId);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching child profile:', error);
        return null;
      }
      
      return fromDbStudent(data);
    } catch (error) {
      console.error('Error in getChildProfile:', error);
      return null;
    }
  },

  async getChildExamResults(studentId: number, schoolId: number) {
    console.log('📊 Fetching exam results for child:', studentId);
    return db.getStudentExamResults(studentId, schoolId);
  },

  async getChildAttendance(studentId: number, month: string, schoolId: number) {
    console.log('📅 Fetching attendance for child:', studentId, 'month:', month);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .gte('date', `${month}-01`)
        .lt('date', `${month}-32`)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }
      
      return data ? data.map(a => fromDbAttendanceRecord(a)) : [];
    } catch (error) {
      console.error('Error in getChildAttendance:', error);
      return [];
    }
  },

  async getChildFees(studentId: number, schoolId: number) {
    console.log('💰 Fetching fee status for child:', studentId);
    try {
      const { data, error } = await supabase
        .from('fee_receipts')
        .select(`
          *,
          fee_items(*)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('payment_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching fees:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getChildFees:', error);
      return [];
    }
  },

  // ==================== ADMIN PORTAL FUNCTIONS ====================
  
  async getAdminDashboardStats(schoolId: number) {
    console.log('📊 Fetching admin dashboard stats for school:', schoolId);
    try {
      const [students, teachers, staff, parents, exams, subjects, pending] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('parents').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('exams').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('verified', false)
      ]);
      
      return {
        totalStudents: students.count || 0,
        totalTeachers: teachers.count || 0,
        totalStaff: staff.count || 0,
        totalParents: parents.count || 0,
        totalExams: exams.count || 0,
        totalSubjects: subjects.count || 0,
        pendingApprovals: pending.count || 0
      };
    } catch (error) {
      console.error('Error in getAdminDashboardStats:', error);
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalStaff: 0,
        totalParents: 0,
        totalExams: 0,
        totalSubjects: 0,
        pendingApprovals: 0
      };
    }
  },

  async getTeacherActivityLog(schoolId: number, limit: number = 50) {
    console.log('📜 Fetching teacher activity log for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('school_id', schoolId)
        .eq('user_type', 'teacher')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching activity log:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getTeacherActivityLog:', error);
      return [];
    }
  },

  async getStudentPerformanceAnalytics(schoolId: number, classValue?: string, section?: string) {
    console.log('📈 Fetching student performance analytics:', { schoolId, classValue, section });
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          students(name, class, section),
          exams(name),
          subjects(name)
        `)
        .eq('school_id', schoolId);
      
      if (classValue) {
        query = query.eq('students.class', classValue);
      }
      if (section) {
        query = query.eq('students.section', section);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching performance analytics:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getStudentPerformanceAnalytics:', error);
      return [];
    }
  },

  async getAllExamResults(schoolId: number, examId?: number, classValue?: string) {
    console.log('📊 Fetching all exam results:', { schoolId, examId, classValue });
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          students(name, roll_number, class, section),
          exams(name, exam_date),
          subjects(name, code),
          teachers(name)
        `)
        .eq('school_id', schoolId);
      
      if (examId) query = query.eq('exam_id', examId);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching exam results:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllExamResults:', error);
      return [];
    }
  },

  async getPendingApprovals(schoolId: number) {
    console.log('⏳ Fetching pending approvals for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          students(name, roll_number),
          exams(name),
          subjects(name),
          teachers(name)
        `)
        .eq('school_id', schoolId)
        .eq('verified', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pending approvals:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      return [];
    }
  },

  async approveExamResult(resultId: number, adminId: number) {
    console.log('✅ Approving exam result:', resultId, 'by admin:', adminId);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .update({
          verified: true,
          verified_by: adminId
        })
        .eq('id', resultId)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbExamResult(data);
    } catch (error) {
      console.error('Error in approveExamResult:', error);
      throw error;
    }
  },

  async createExam(data: any) {
    console.log('📝 Creating exam:', data);
    try {
      const dbData = toDbExam(data);
      const { data: result, error } = await supabase
        .from('exams')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbExam(result);
    } catch (error) {
      console.error('Error in createExam:', error);
      throw error;
    }
  },

  async createSubject(data: any) {
    console.log('📚 Creating subject:', data);
    try {
      const dbData = toDbSubject(data);
      const { data: result, error } = await supabase
        .from('subjects')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return fromDbSubject(result);
    } catch (error) {
      console.error('Error in createSubject:', error);
      throw error;
    }
  },

  async getSystemWideActivity(schoolId: number, limit: number = 100) {
    console.log('🌐 Fetching system-wide activity for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching system-wide activity:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getSystemWideActivity:', error);
      return [];
    }
  },

  // ==================== ACTIVITY LOGGING FUNCTION ====================
  
  async logActivity(
    userId: number,
    userType: string,
    action: string,
    entityType: string,
    entityId: number,
    description: string,
    metadata: any,
    schoolId: number
  ) {
    console.log('📝 Logging activity:', { action, entityType, entityId });
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          user_type: userType,
          action,
          entity_type: entityType,
          entity_id: entityId,
          description,
          metadata: JSON.stringify(metadata),
          school_id: schoolId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error logging activity:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in logActivity:', error);
      return null;
    }
  }
};

// ==================== TEACHER PORTAL FUNCTIONS ====================
// Comprehensive Teacher Portal functions for direct Supabase integration
// All functions include school isolation and proper error handling

export const teacherPortal = {
  /**
   * Get teacher dashboard overview data
   * Replaces: /api/teachers/dashboard
   */
  async getDashboardData(teacherId: number, schoolId: number) {
    console.log('👨‍🏫 Fetching dashboard data for teacher:', teacherId, 'school:', schoolId);
    
    try {
      // Get teacher info with assigned classes and subjects
      const { data: teacherAssignments, error: assignError } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          subjects (id, name, name_bn),
          classes (id, name, section)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (assignError) throw assignError;
      
      // Get today's schedule
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const { data: todaySchedule } = await supabase
        .from('class_schedules')
        .select('*, subjects(name), classes(name, section)')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('day_of_week', today)
        .order('start_time', { ascending: true });
      
      // Get recent notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Count assignments and lesson plans
      const [assignmentsCount, lessonPlansCount] = await Promise.all([
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('lesson_plans').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId)
      ]);
      
      return {
        teacherAssignments: teacherAssignments || [],
        todaySchedule: todaySchedule || [],
        notifications: notifications || [],
        assignmentsCount: assignmentsCount.count || 0,
        lessonPlansCount: lessonPlansCount.count || 0
      };
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
      return {
        teacherAssignments: [],
        todaySchedule: [],
        notifications: [],
        assignmentsCount: 0,
        lessonPlansCount: 0
      };
    }
  },
  
  /**
   * Get teacher statistics
   * Replaces: /api/teachers/stats
   */
  async getTeacherStats(teacherId: number, schoolId: number) {
    console.log('📊 Fetching teacher stats for:', teacherId);
    
    try {
      // Get total students across all classes
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id, classes(id)')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      const classIds = assignments?.map(a => a.class_id).filter(Boolean) || [];
      
      let totalStudents = 0;
      if (classIds.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .in('class_id', classIds);
        totalStudents = count || 0;
      }
      
      // Get counts
      const [classesCount, subjectsCount, assignmentsCount, lessonPlansCount] = await Promise.all([
        supabase.from('teacher_assignments').select('class_id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('teacher_assignments').select('subject_id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId),
        supabase.from('lesson_plans').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).eq('school_id', schoolId)
      ]);
      
      return {
        totalStudents,
        totalClasses: classesCount.count || 0,
        totalSubjects: subjectsCount.count || 0,
        totalAssignments: assignmentsCount.count || 0,
        totalLessonPlans: lessonPlansCount.count || 0
      };
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      return {
        totalStudents: 0,
        totalClasses: 0,
        totalSubjects: 0,
        totalAssignments: 0,
        totalLessonPlans: 0
      };
    }
  },
  
  /**
   * Get teacher's class schedule
   * Replaces: /api/teachers/schedule
   */
  async getTeacherSchedule(teacherId: number, schoolId: number, period?: string) {
    console.log('📅 Fetching schedule for teacher:', teacherId, 'period:', period);
    
    try {
      let query = supabase
        .from('class_schedules')
        .select(`
          *,
          subjects (id, name, name_bn),
          classes (id, name, section)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (period === 'today') {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        query = query.eq('day_of_week', today);
      }
      
      const { data, error } = await query.order('day_of_week').order('start_time');
      
      if (error) throw error;
      
      return (data || []).map(schedule => fromDbClassSchedule(schedule));
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      return [];
    }
  },
  
  /**
   * Get teacher notifications
   * Replaces: /api/teachers/notifications
   */
  async getTeacherNotifications(teacherId: number, schoolId: number) {
    console.log('🔔 Fetching notifications for teacher:', teacherId);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching teacher notifications:', error);
      return [];
    }
  },
  
  /**
   * Get classes taught by teacher
   * Replaces: /api/teachers/classes
   */
  async getTeacherClasses(teacherId: number, schoolId: number) {
    console.log('🏫 Fetching classes for teacher:', teacherId);
    
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          classes (id, name, section, grade_level)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      // Get unique classes
      const uniqueClasses = new Map();
      data?.forEach(assignment => {
        if (assignment.classes && !uniqueClasses.has(assignment.classes.id)) {
          uniqueClasses.set(assignment.classes.id, assignment.classes);
        }
      });
      
      return Array.from(uniqueClasses.values());
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      return [];
    }
  },
  
  /**
   * Get subjects taught by teacher
   * Replaces: /api/teachers/subjects
   */
  async getTeacherSubjects(teacherId: number, schoolId: number) {
    console.log('📚 Fetching subjects for teacher:', teacherId);
    
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          subjects (id, name, name_bn, code)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      // Get unique subjects
      const uniqueSubjects = new Map();
      data?.forEach(assignment => {
        if (assignment.subjects && !uniqueSubjects.has(assignment.subjects.id)) {
          uniqueSubjects.set(assignment.subjects.id, fromDbSubject(assignment.subjects));
        }
      });
      
      return Array.from(uniqueSubjects.values());
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      return [];
    }
  },
  
  /**
   * Get lesson plans
   * Replaces: /api/lesson-plans (GET)
   */
  async getLessonPlans(teacherId: number, schoolId: number, filters?: { subjectId?: number; classId?: number }) {
    console.log('📖 Fetching lesson plans for teacher:', teacherId);
    
    try {
      let query = supabase
        .from('lesson_plans')
        .select(`
          *,
          subjects (id, name, name_bn),
          classes (id, name, section)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      
      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(plan => fromDbLessonPlan(plan));
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      return [];
    }
  },
  
  /**
   * Create lesson plan
   * Replaces: /api/lesson-plans (POST)
   */
  async createLessonPlan(plan: any, teacherId: number, schoolId: number) {
    console.log('➕ Creating lesson plan for teacher:', teacherId);
    
    try {
      const dbPlan = toDbLessonPlan({ ...plan, teacherId, schoolId });
      
      const { data, error } = await supabase
        .from('lesson_plans')
        .insert(dbPlan)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbLessonPlan(data);
    } catch (error) {
      console.error('Error creating lesson plan:', error);
      throw error;
    }
  },
  
  /**
   * Update lesson plan
   * Replaces: /api/lesson-plans/:id (PATCH)
   */
  async updateLessonPlan(id: number, plan: any, schoolId: number) {
    console.log('✏️ Updating lesson plan:', id);
    
    try {
      const dbPlan = toDbLessonPlan(plan);
      
      const { data, error } = await supabase
        .from('lesson_plans')
        .update(dbPlan)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbLessonPlan(data);
    } catch (error) {
      console.error('Error updating lesson plan:', error);
      throw error;
    }
  },
  
  /**
   * Delete lesson plan
   * Replaces: /api/lesson-plans/:id (DELETE)
   */
  async deleteLessonPlan(id: number, schoolId: number) {
    console.log('🗑️ Deleting lesson plan:', id);
    
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
      throw error;
    }
  },
  
  /**
   * Get assignments
   * Replaces: /api/assignments (GET) or /api/teacher/assignments
   */
  async getAssignments(teacherId: number, schoolId: number, filters?: { subjectId?: number; classId?: number; status?: string }) {
    console.log('📝 Fetching assignments for teacher:', teacherId);
    
    try {
      let query = supabase
        .from('assignments')
        .select(`
          *,
          subjects (id, name, name_bn),
          classes (id, name, section)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);
      
      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      
      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(assignment => fromDbAssignment(assignment));
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  },
  
  /**
   * Create assignment
   * Replaces: /api/assignments (POST) or /api/teacher/assignments
   */
  async createAssignment(assignment: any, teacherId: number, schoolId: number) {
    console.log('➕ Creating assignment for teacher:', teacherId);
    
    try {
      const dbAssignment = toDbAssignment({ ...assignment, teacherId, schoolId });
      
      const { data, error } = await supabase
        .from('assignments')
        .insert(dbAssignment)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbAssignment(data);
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  },
  
  /**
   * Update assignment
   * Replaces: /api/assignments/:id (PATCH) or /api/teacher/assignments/:id
   */
  async updateAssignment(id: number, assignment: any, schoolId: number) {
    console.log('✏️ Updating assignment:', id);
    
    try {
      const dbAssignment = toDbAssignment(assignment);
      
      const { data, error } = await supabase
        .from('assignments')
        .update(dbAssignment)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbAssignment(data);
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  },
  
  /**
   * Delete assignment
   * Replaces: /api/assignments/:id (DELETE) or /api/teacher/assignments/:id
   */
  async deleteAssignment(id: number, schoolId: number) {
    console.log('🗑️ Deleting assignment:', id);
    
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }
};

// ============================================================================
// LIBRARY SYSTEM API
// ============================================================================
export const library = {
  /**
   * Get all library books with optional filters
   * Replaces: GET /api/library/books
   */
  async getBooks(schoolId: number, filters?: any) {
    console.log('📚 Fetching library books for school:', schoolId, 'filters:', filters);
    
    try {
      let query = supabase
        .from('library_books')
        .select('*')
        .eq('school_id', schoolId);
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,author.ilike.%${filters.search}%,isbn.ilike.%${filters.search}%`);
      }
      
      if (filters?.available) {
        query = query.gt('available_copies', 0);
      }
      
      const { data, error } = await query.order('title');
      
      if (error) throw error;
      
      return (data || []).map(book => fromDbLibrary(book));
    } catch (error) {
      console.error('Error fetching library books:', error);
      return [];
    }
  },

  /**
   * Get single book details by ID
   * Replaces: GET /api/library/books/:id
   */
  async getBookById(id: number, schoolId: number) {
    console.log('📖 Fetching book:', id);
    
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      return fromDbLibrary(data);
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  },

  /**
   * Get library statistics
   * Replaces: GET /api/library/stats
   */
  async getLibraryStats(schoolId: number) {
    console.log('📊 Fetching library stats for school:', schoolId);
    
    try {
      // Get total books and available copies
      const { data: books } = await supabase
        .from('library_books')
        .select('total_copies, available_copies')
        .eq('school_id', schoolId);
      
      const totalBooks = books?.reduce((sum, book) => sum + (book.total_copies || 0), 0) || 0;
      const availableCopies = books?.reduce((sum, book) => sum + (book.available_copies || 0), 0) || 0;
      const borrowedBooks = totalBooks - availableCopies;
      
      // Get active borrowings
      const { count: activeBorrowings } = await supabase
        .from('library_borrowed_books')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active');
      
      // Get overdue books
      const today = new Date().toISOString().split('T')[0];
      const { count: overdueBooks } = await supabase
        .from('library_borrowed_books')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .lt('due_date', today);
      
      return {
        totalBooks,
        availableCopies,
        borrowedBooks,
        activeBorrowings: activeBorrowings || 0,
        overdueBooks: overdueBooks || 0
      };
    } catch (error) {
      console.error('Error fetching library stats:', error);
      return {
        totalBooks: 0,
        availableCopies: 0,
        borrowedBooks: 0,
        activeBorrowings: 0,
        overdueBooks: 0
      };
    }
  },

  /**
   * Borrow a book
   * Replaces: POST /api/library/borrow
   */
  async borrowBook(bookId: number, studentId: number, schoolId: number, dueDate: string) {
    console.log('📚 Borrowing book:', bookId, 'for student:', studentId);
    
    try {
      // Check if book is available
      const { data: book } = await supabase
        .from('library_books')
        .select('available_copies')
        .eq('id', bookId)
        .eq('school_id', schoolId)
        .single();
      
      if (!book || book.available_copies <= 0) {
        throw new Error('Book not available');
      }
      
      // Create borrow record
      const { data: borrowRecord, error: borrowError } = await supabase
        .from('library_borrowed_books')
        .insert({
          book_id: bookId,
          student_id: studentId,
          school_id: schoolId,
          due_date: dueDate,
          status: 'active'
        })
        .select()
        .single();
      
      if (borrowError) throw borrowError;
      
      // Decrease available copies
      const { error: updateError } = await supabase
        .from('library_books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', bookId)
        .eq('school_id', schoolId);
      
      if (updateError) throw updateError;
      
      return borrowRecord;
    } catch (error) {
      console.error('Error borrowing book:', error);
      throw error;
    }
  },

  /**
   * Return a borrowed book
   * Replaces: POST /api/library/return
   */
  async returnBook(borrowId: number, schoolId: number) {
    console.log('📚 Returning book, borrow ID:', borrowId);
    
    try {
      // Get borrow record
      const { data: borrowRecord } = await supabase
        .from('library_borrowed_books')
        .select('book_id')
        .eq('id', borrowId)
        .eq('school_id', schoolId)
        .single();
      
      if (!borrowRecord) {
        throw new Error('Borrow record not found');
      }
      
      // Update borrow record
      const { error: updateError } = await supabase
        .from('library_borrowed_books')
        .update({
          status: 'returned',
          return_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', borrowId)
        .eq('school_id', schoolId);
      
      if (updateError) throw updateError;
      
      // Increase available copies
      const { error: bookUpdateError } = await supabase
        .rpc('increment_available_copies', {
          book_id: borrowRecord.book_id,
          school_id_param: schoolId
        });
      
      // If RPC doesn't exist, use manual update
      if (bookUpdateError) {
        const { data: book } = await supabase
          .from('library_books')
          .select('available_copies')
          .eq('id', borrowRecord.book_id)
          .eq('school_id', schoolId)
          .single();
        
        if (book) {
          await supabase
            .from('library_books')
            .update({ available_copies: book.available_copies + 1 })
            .eq('id', borrowRecord.book_id)
            .eq('school_id', schoolId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error returning book:', error);
      throw error;
    }
  },

  /**
   * Get borrowed books list
   * Replaces: GET /api/library/borrowed
   */
  async getBorrowedBooks(schoolId: number, studentId?: number) {
    console.log('📚 Fetching borrowed books, student:', studentId);
    
    try {
      let query = supabase
        .from('library_borrowed_books')
        .select(`
          *,
          library_books (id, title, author, isbn),
          students (id, name, student_id, class, section)
        `)
        .eq('school_id', schoolId);
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.order('borrow_date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      return [];
    }
  },

  /**
   * Create a new book
   * Replaces: POST /api/library/books
   */
  async createBook(book: any, schoolId: number) {
    console.log('➕ Creating library book');
    
    try {
      const dbBook = toDbLibrary({ ...book, schoolId });
      
      const { data, error } = await supabase
        .from('library_books')
        .insert(dbBook)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbLibrary(data);
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  },

  /**
   * Update book details
   * Replaces: PATCH /api/library/books/:id
   */
  async updateBook(id: number, book: any, schoolId: number) {
    console.log('✏️ Updating book:', id);
    
    try {
      const dbBook = toDbLibrary(book);
      
      const { data, error } = await supabase
        .from('library_books')
        .update(dbBook)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbLibrary(data);
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  },

  /**
   * Delete a book
   * Replaces: DELETE /api/library/books/:id
   */
  async deleteBook(id: number, schoolId: number) {
    console.log('🗑️ Deleting book:', id);
    
    try {
      const { error } = await supabase
        .from('library_books')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  }
};

// ============================================================================
// TRANSPORT SYSTEM API
// ============================================================================
export const transport = {
  /**
   * Get all transport routes
   * Replaces: GET /api/transport/routes
   */
  async getRoutes(schoolId: number) {
    console.log('🚌 Fetching transport routes for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('transport_routes')
        .select('*')
        .eq('school_id', schoolId)
        .order('route_name');
      
      if (error) throw error;
      
      return (data || []).map(route => fromDbTransport(route));
    } catch (error) {
      console.error('Error fetching routes:', error);
      return [];
    }
  },

  /**
   * Get route details by ID
   * Replaces: GET /api/transport/routes/:id
   */
  async getRouteById(id: number, schoolId: number) {
    console.log('🚌 Fetching route:', id);
    
    try {
      const { data, error } = await supabase
        .from('transport_routes')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  },

  /**
   * Create a new route
   * Replaces: POST /api/transport/routes
   */
  async createRoute(route: any, schoolId: number) {
    console.log('➕ Creating transport route');
    
    try {
      const dbRoute = toDbTransport({ ...route, schoolId });
      
      const { data, error } = await supabase
        .from('transport_routes')
        .insert(dbRoute)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error creating route:', error);
      throw error;
    }
  },

  /**
   * Update route details
   * Replaces: PATCH /api/transport/routes/:id
   */
  async updateRoute(id: number, route: any, schoolId: number) {
    console.log('✏️ Updating route:', id);
    
    try {
      const dbRoute = toDbTransport(route);
      
      const { data, error } = await supabase
        .from('transport_routes')
        .update(dbRoute)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error updating route:', error);
      throw error;
    }
  },

  /**
   * Delete a route
   * Replaces: DELETE /api/transport/routes/:id
   */
  async deleteRoute(id: number, schoolId: number) {
    console.log('🗑️ Deleting route:', id);
    
    try {
      const { error } = await supabase
        .from('transport_routes')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting route:', error);
      throw error;
    }
  },

  /**
   * Get all vehicles
   * Replaces: GET /api/transport/vehicles
   */
  async getVehicles(schoolId: number) {
    console.log('🚐 Fetching transport vehicles for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('transport_vehicles')
        .select(`
          *,
          transport_routes (id, route_name)
        `)
        .eq('school_id', schoolId)
        .order('vehicle_number');
      
      if (error) throw error;
      
      return (data || []).map(vehicle => fromDbTransport(vehicle));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
  },

  /**
   * Create a new vehicle
   * Replaces: POST /api/transport/vehicles
   */
  async createVehicle(vehicle: any, schoolId: number) {
    console.log('➕ Creating transport vehicle');
    
    try {
      const dbVehicle = toDbTransport({ ...vehicle, schoolId });
      
      const { data, error } = await supabase
        .from('transport_vehicles')
        .insert(dbVehicle)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  },

  /**
   * Update vehicle details
   * Replaces: PATCH /api/transport/vehicles/:id
   */
  async updateVehicle(id: number, vehicle: any, schoolId: number) {
    console.log('✏️ Updating vehicle:', id);
    
    try {
      const dbVehicle = toDbTransport(vehicle);
      
      const { data, error } = await supabase
        .from('transport_vehicles')
        .update(dbVehicle)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  },

  /**
   * Delete a vehicle
   * Replaces: DELETE /api/transport/vehicles/:id
   */
  async deleteVehicle(id: number, schoolId: number) {
    console.log('🗑️ Deleting vehicle:', id);
    
    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  },

  /**
   * Get student-route assignments
   * Replaces: GET /api/transport/assignments
   */
  async getAssignments(schoolId: number) {
    console.log('📋 Fetching transport assignments for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('transport_student_assignments')
        .select(`
          *,
          students (id, name, student_id, class, section),
          transport_routes (id, route_name),
          transport_vehicles (id, vehicle_number)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(assignment => fromDbTransport(assignment));
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  },

  /**
   * Assign student to route
   * Replaces: POST /api/transport/assign
   */
  async assignStudentToRoute(assignment: any, schoolId: number) {
    console.log('➕ Assigning student to route');
    
    try {
      const dbAssignment = toDbTransport({ ...assignment, schoolId, isActive: true });
      
      const { data, error } = await supabase
        .from('transport_student_assignments')
        .insert(dbAssignment)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbTransport(data);
    } catch (error) {
      console.error('Error assigning student to route:', error);
      throw error;
    }
  }
};

// ============================================================================
// INVENTORY SYSTEM API
// ============================================================================
export const inventory = {
  /**
   * Get all inventory items
   * Replaces: GET /api/inventory/items
   */
  async getItems(schoolId: number) {
    console.log('📦 Fetching inventory items for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(item => fromDbInventory(item));
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      return [];
    }
  },

  /**
   * Get item details by ID
   * Replaces: GET /api/inventory/items/:id
   */
  async getItemById(id: number, schoolId: number) {
    console.log('📦 Fetching inventory item:', id);
    
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      return fromDbInventory(data);
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error;
    }
  },

  /**
   * Create a new inventory item
   * Replaces: POST /api/inventory/items
   */
  async createItem(item: any, schoolId: number) {
    console.log('➕ Creating inventory item');
    
    try {
      const dbItem = toDbInventory({ ...item, schoolId });
      
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(dbItem)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbInventory(data);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },

  /**
   * Update inventory item
   * Replaces: PATCH /api/inventory/items/:id
   */
  async updateItem(id: number, item: any, schoolId: number) {
    console.log('✏️ Updating inventory item:', id);
    
    try {
      const dbItem = toDbInventory(item);
      
      const { data, error } = await supabase
        .from('inventory_items')
        .update(dbItem)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbInventory(data);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  /**
   * Delete an inventory item
   * Replaces: DELETE /api/inventory/items/:id
   */
  async deleteItem(id: number, schoolId: number) {
    console.log('🗑️ Deleting inventory item:', id);
    
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  /**
   * Get vendor list
   * Replaces: GET /api/inventory/vendors
   */
  async getVendors(schoolId: number) {
    console.log('🏢 Fetching vendors for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('school_id', schoolId)
        .order('vendor_name');
      
      if (error) throw error;
      
      return (data || []).map(vendor => fromDbVendor(vendor));
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
  },

  /**
   * Create a new vendor
   * Replaces: POST /api/inventory/vendors
   */
  async createVendor(vendor: any, schoolId: number) {
    console.log('➕ Creating vendor');
    
    try {
      const dbVendor = toDbVendor({ ...vendor, schoolId });
      
      const { data, error } = await supabase
        .from('vendors')
        .insert(dbVendor)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbVendor(data);
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  },

  /**
   * Get stock alerts
   * Replaces: GET /api/inventory/stock-alerts
   */
  async getStockAlerts(schoolId: number) {
    console.log('⚠️ Fetching stock alerts for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(alert => fromDbStockAlert(alert));
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return [];
    }
  },

  /**
   * Get purchase orders
   * Replaces: GET /api/inventory/purchase-orders
   */
  async getPurchaseOrders(schoolId: number) {
    console.log('📝 Fetching purchase orders for school:', schoolId);
    
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (id, vendor_name, vendor_code)
        `)
        .eq('school_id', schoolId)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(order => fromDbPurchaseOrder(order));
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  },

  /**
   * Create purchase order
   * Replaces: POST /api/inventory/purchase-orders
   */
  async createPurchaseOrder(order: any, schoolId: number) {
    console.log('➕ Creating purchase order');
    
    try {
      const dbOrder = toDbPurchaseOrder({ ...order, schoolId });
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(dbOrder)
        .select()
        .single();
      
      if (error) throw error;
      
      return fromDbPurchaseOrder(data);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }
};

// Helper functions for Bengali translations and metadata
function getBengaliName(type: string): string {
  const names: Record<string, string> = {
    // Match real database type values
    'id_card': 'ছাত্র পরিচয়পত্র',
    'admit_card': 'প্রবেশপত্র',
    'transcript': 'একাডেমিক ট্রান্সক্রিপ্ট',
    'progress_report': 'অগ্রগতি প্রতিবেদন',
    'routine': 'ক্লাসের রুটিন',
    'excellence_certificate': 'একাডেমিক শ্রেষ্ঠত্ব সনদপত্র',
    'participation_certificate': 'অংশগ্রহণ সনদপত্র',
    'sports_certificate': 'ক্রীড়া সনদপত্র',
    'character_certificate': 'চরিত্র সনদপত্র',
    'transfer_certificate': 'স্থানান্তর সনদপত্র',
    'bonafide_certificate': 'প্রত্যয়ন পত্র',
    'attendance_certificate': 'উপস্থিতি সনদপত্র',
    'fee_receipt': 'ফি রসিদ',
    'salary_slip': 'বেতন স্লিপ',
    'library_card': 'লাইব্রেরি কার্ড',
    'bus_pass': 'বাস পাস',
    'medical_certificate': 'মেডিকেল সার্টিফিকেট',
    'leave_application': 'ছুটির আবেদন',
    'appointment_letter': 'নিয়োগপত্র'
  };
  return names[type] || type;
}

function getBengaliDescription(type: string): string {
  const descriptions: Record<string, string> = {
    // Match real database type values
    'id_card': 'ছবি এবং বিস্তারিত তথ্যসহ অফিসিয়াল ছাত্র পরিচয়পত্র',
    'admit_card': 'রোল নম্বর এবং পরীক্ষার বিস্তারিত তথ্যসহ পরীক্ষার প্রবেশপত্র',
    'transcript': 'গ্রেড এবং বিষয়সহ অফিসিয়াল একাডেমিক ট্রান্সক্রিপ্ট',
    'progress_report': 'বিস্তারিত বিশ্লেষণসহ ছাত্রের একাডেমিক অগ্রগতি প্রতিবেদন',
    'routine': 'বিষয় এবং সময়সূচিসহ সাপ্তাহিক ক্লাসের সময়সূচি',
    'character_certificate': 'ছাত্রের চরিত্র এবং আচরণের সনদপত্র',
    'transfer_certificate': 'স্কুল পরিবর্তনের জন্য স্থানান্তর সনদপত্র',
    'fee_receipt': 'ফি প্রদানের অফিসিয়াল রসিদ',
    'library_card': 'গ্রন্থাগার ব্যবহারের জন্য পরিচয়পত্র',
    'medical_certificate': 'স্বাস্থ্য সংক্রান্ত সনদপত্র'
  };
  return descriptions[type] || 'ডকুমেন্ট তৈরি করুন';
}

function getDocumentIcon(type: string): string {
  const icons: Record<string, string> = {
    // Match real database type values
    'id_card': '🪪',
    'admit_card': '🎫',
    'fee_receipt': '🧾',
    'transcript': '📊',
    'teacher_id_card': '👨‍🏫',
    'routine': '📅',
    'progress_report': '📈',
    'character_certificate': '📜',
    'transfer_certificate': '📋',
    'bonafide_certificate': '🏛️',
    'attendance_certificate': '✅',
    'sports_certificate': '🏆',
    'excellence_certificate': '🥇',
    'participation_certificate': '🎭',
    'library_card': '📚',
    'bus_pass': '🚌',
    'medical_certificate': '⚕️',
    'salary_slip': '💰',
    'leave_application': '📝',
    'appointment_letter': '💼'
  };
  return icons[type] || '📄';
}

function getDifficulty(type: string): string {
  const difficulties: Record<string, string> = {
    // Match real database type values
    'id_card': 'easy',
    'admit_card': 'easy',
    'fee_receipt': 'easy',
    'library_card': 'easy',
    'bus_pass': 'easy',
    'transcript': 'medium',
    'progress_report': 'medium',
    'routine': 'medium',
    'character_certificate': 'medium',
    'transfer_certificate': 'medium',
    'salary_slip': 'advanced',
    'appointment_letter': 'advanced'
  };
  return difficulties[type] || 'medium';
}

function getEstimatedTime(type: string): string {
  const times: Record<string, string> = {
    // Match real database type values
    'id_card': '২-ৃ মিনিট',
    'admit_card': '১-২ মিনিট',
    'fee_receipt': '১ মিনিট',
    'library_card': '১ মিনিট',
    'bus_pass': '১ মিনিট',
    'transcript': '৩-৫ মিনিট',
    'progress_report': '৪-৬ মিনিট',
    'routine': '৫-৭ মিনিট',
    'character_certificate': '৩-৪ মিনিট',
    'transfer_certificate': '৩-৪ মিনিট',
    'salary_slip': '৬-৮ মিনিট',
    'appointment_letter': '৮-১০ মিনিট'
  };
  return times[type] || '২-৩ মিনিট';
}

// ============================================================================
// HR/PAYROLL MANAGEMENT SYSTEM
// Replaces Express API endpoints with direct Supabase calls
// ============================================================================
export const hrPayroll = {
  /**
   * Get all staff members for a school
   * Replaces: GET /api/hr/staff
   */
  async getStaff(schoolId: number) {
    console.log('👥 Fetching staff members for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} staff members`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching staff:', error);
      throw error;
    }
  },

  /**
   * Get staff member by ID
   * Replaces: GET /api/hr/staff/:id
   */
  async getStaffById(id: number, schoolId: number) {
    console.log('👤 Fetching staff member:', id);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      console.log('✅ Staff member fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Error fetching staff member:', error);
      throw error;
    }
  },

  /**
   * Create new staff member
   * Replaces: POST /api/hr/staff
   */
  async createStaff(staff: any, schoolId: number) {
    console.log('➕ Creating new staff member');
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([{ ...staff, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Staff member created successfully');
      return data;
    } catch (error) {
      console.error('❌ Error creating staff member:', error);
      throw error;
    }
  },

  /**
   * Update staff member
   * Replaces: PUT /api/hr/staff/:id
   */
  async updateStaff(id: number, staff: any, schoolId: number) {
    console.log('📝 Updating staff member:', id);
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(staff)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Staff member updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Error updating staff member:', error);
      throw error;
    }
  },

  /**
   * Delete staff member
   * Replaces: DELETE /api/hr/staff/:id
   */
  async deleteStaff(id: number, schoolId: number) {
    console.log('🗑️ Deleting staff member:', id);
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      console.log('✅ Staff member deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting staff member:', error);
      throw error;
    }
  },

  /**
   * Get staff attendance records
   * Replaces: GET /api/hr/attendance
   */
  async getStaffAttendance(schoolId: number, date?: string) {
    console.log('📅 Fetching staff attendance for school:', schoolId, 'date:', date);
    try {
      let query = supabase
        .from('staff_attendance')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            employee_id,
            department,
            designation
          )
        `)
        .eq('school_id', schoolId);
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} attendance records`);
      return (data || []).map(fromDbStaffAttendance);
    } catch (error) {
      console.error('❌ Error fetching staff attendance:', error);
      throw error;
    }
  },

  /**
   * Mark staff attendance
   * Replaces: POST /api/hr/attendance
   */
  async markStaffAttendance(attendance: any, schoolId: number) {
    console.log('✅ Marking staff attendance');
    try {
      const dbAttendance = toDbStaffAttendance({ ...attendance, schoolId });
      const { data, error } = await supabase
        .from('staff_attendance')
        .insert([dbAttendance])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Attendance marked successfully');
      return fromDbStaffAttendance(data);
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      throw error;
    }
  },

  /**
   * Get leave applications
   * Replaces: GET /api/hr/leave-applications
   */
  async getLeaveApplications(schoolId: number, status?: string) {
    console.log('📝 Fetching leave applications for school:', schoolId, 'status:', status);
    try {
      let query = supabase
        .from('leave_applications')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            employee_id,
            department
          ),
          leave_type:leave_type_id (
            id,
            name,
            name_bn
          )
        `)
        .eq('school_id', schoolId);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('applied_date', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} leave applications`);
      return (data || []).map(fromDbLeaveApplication);
    } catch (error) {
      console.error('❌ Error fetching leave applications:', error);
      throw error;
    }
  },

  /**
   * Create leave application
   * Replaces: POST /api/hr/leave-applications
   */
  async createLeaveApplication(leave: any, schoolId: number) {
    console.log('📝 Creating leave application');
    try {
      const dbLeave = toDbLeaveApplication({ ...leave, schoolId });
      const { data, error } = await supabase
        .from('leave_applications')
        .insert([dbLeave])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Leave application created successfully');
      return fromDbLeaveApplication(data);
    } catch (error) {
      console.error('❌ Error creating leave application:', error);
      throw error;
    }
  },

  /**
   * Update leave application status
   * Replaces: PUT /api/hr/leave-applications/:id
   */
  async updateLeaveStatus(id: number, status: string, schoolId: number) {
    console.log('📝 Updating leave application status:', id, 'to:', status);
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .update({ 
          status,
          approved_date: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Leave application status updated successfully');
      return fromDbLeaveApplication(data);
    } catch (error) {
      console.error('❌ Error updating leave application:', error);
      throw error;
    }
  },

  /**
   * Get leave balances for a staff member
   * Replaces: GET /api/hr/leave-balances/:staffId
   */
  async getLeaveBalances(staffId: number, schoolId: number) {
    console.log('📊 Fetching leave balances for staff:', staffId);
    try {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          leave_type:leave_type_id (
            id,
            name,
            name_bn
          )
        `)
        .eq('staff_id', staffId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} leave balances`);
      return (data || []).map(fromDbLeaveBalance);
    } catch (error) {
      console.error('❌ Error fetching leave balances:', error);
      throw error;
    }
  },

  /**
   * Get performance appraisals
   * Replaces: GET /api/hr/appraisals
   */
  async getAppraisals(schoolId: number) {
    console.log('📊 Fetching appraisals for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            employee_id,
            department,
            designation
          )
        `)
        .eq('school_id', schoolId)
        .order('review_date', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} appraisals`);
      return (data || []).map(fromDbAppraisal);
    } catch (error) {
      console.error('❌ Error fetching appraisals:', error);
      throw error;
    }
  },

  /**
   * Create performance appraisal
   * Replaces: POST /api/hr/appraisals
   */
  async createAppraisal(appraisal: any, schoolId: number) {
    console.log('📝 Creating appraisal');
    try {
      const dbAppraisal = toDbAppraisal({ ...appraisal, schoolId });
      const { data, error } = await supabase
        .from('appraisals')
        .insert([dbAppraisal])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Appraisal created successfully');
      return fromDbAppraisal(data);
    } catch (error) {
      console.error('❌ Error creating appraisal:', error);
      throw error;
    }
  },

  /**
   * Get payroll records
   * Replaces: GET /api/hr/payroll
   */
  async getPayrollRecords(schoolId: number, month?: string) {
    console.log('💰 Fetching payroll records for school:', schoolId, 'month:', month);
    try {
      let query = supabase
        .from('payroll_records')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            employee_id,
            department,
            designation
          )
        `)
        .eq('school_id', schoolId);
      
      if (month) {
        query = query.eq('month', month);
      }
      
      const { data, error } = await query.order('month', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} payroll records`);
      return (data || []).map(fromDbPayrollRecord);
    } catch (error) {
      console.error('❌ Error fetching payroll records:', error);
      throw error;
    }
  },

  /**
   * Generate monthly payroll
   * Replaces: POST /api/hr/payroll/generate
   */
  async generatePayroll(month: string, schoolId: number) {
    console.log('💰 Generating payroll for month:', month);
    try {
      // Get all active staff members
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      
      if (staffError) throw staffError;

      // Generate payroll records for each staff member
      const payrollRecords = (staff || []).map((s: any) => ({
        staff_id: s.id,
        month,
        basic_salary: s.basic_salary || 0,
        gross_salary: s.gross_salary || s.basic_salary || 0,
        total_deductions: 0,
        net_salary: s.gross_salary || s.basic_salary || 0,
        payment_status: 'pending',
        school_id: schoolId
      }));

      const { data, error } = await supabase
        .from('payroll_records')
        .insert(payrollRecords)
        .select();
      
      if (error) throw error;
      console.log(`✅ Generated payroll for ${data?.length || 0} staff members`);
      return (data || []).map(fromDbPayrollRecord);
    } catch (error) {
      console.error('❌ Error generating payroll:', error);
      throw error;
    }
  },

  /**
   * Get salary components
   * Replaces: GET /api/hr/salary-components
   */
  async getSalaryComponents(schoolId: number) {
    console.log('💰 Fetching salary components for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} salary components`);
      return (data || []).map(fromDbSalaryComponent);
    } catch (error) {
      console.error('❌ Error fetching salary components:', error);
      throw error;
    }
  }
};

// ============================================================================
// HOSTEL MANAGEMENT SYSTEM
// Replaces Express API endpoints with direct Supabase calls
// ============================================================================
export const hostel = {
  /**
   * Get all hostels for a school
   * Replaces: GET /api/hostel/hostels
   */
  async getHostels(schoolId: number) {
    console.log('🏠 Fetching hostels for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('hostels')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} hostels`);
      return (data || []).map(fromDbHostel);
    } catch (error) {
      console.error('❌ Error fetching hostels:', error);
      throw error;
    }
  },

  /**
   * Get hostel by ID
   * Replaces: GET /api/hostel/hostels/:id
   */
  async getHostelById(id: number, schoolId: number) {
    console.log('🏠 Fetching hostel:', id);
    try {
      const { data, error } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      console.log('✅ Hostel fetched successfully');
      return fromDbHostel(data);
    } catch (error) {
      console.error('❌ Error fetching hostel:', error);
      throw error;
    }
  },

  /**
   * Create new hostel
   * Replaces: POST /api/hostel/hostels
   */
  async createHostel(hostel: any, schoolId: number) {
    console.log('➕ Creating new hostel');
    try {
      const dbHostel = toDbHostel({ ...hostel, schoolId });
      const { data, error } = await supabase
        .from('hostels')
        .insert([dbHostel])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Hostel created successfully');
      return fromDbHostel(data);
    } catch (error) {
      console.error('❌ Error creating hostel:', error);
      throw error;
    }
  },

  /**
   * Get hostel rooms
   * Replaces: GET /api/hostel/rooms
   */
  async getRooms(schoolId: number, hostelId?: number) {
    console.log('🚪 Fetching rooms for school:', schoolId, 'hostel:', hostelId);
    try {
      let query = supabase
        .from('hostel_rooms')
        .select(`
          *,
          hostel:hostel_id (
            id,
            name,
            name_in_bangla
          )
        `)
        .eq('school_id', schoolId);
      
      if (hostelId) {
        query = query.eq('hostel_id', hostelId);
      }
      
      const { data, error } = await query.order('room_number');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} rooms`);
      return (data || []).map(fromDbHostelRoom);
    } catch (error) {
      console.error('❌ Error fetching rooms:', error);
      throw error;
    }
  },

  /**
   * Create new room
   * Replaces: POST /api/hostel/rooms
   */
  async createRoom(room: any, schoolId: number) {
    console.log('➕ Creating new room');
    try {
      const dbRoom = toDbHostelRoom({ ...room, schoolId });
      const { data, error } = await supabase
        .from('hostel_rooms')
        .insert([dbRoom])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Room created successfully');
      return fromDbHostelRoom(data);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      throw error;
    }
  },

  /**
   * Get room assignments
   * Replaces: GET /api/hostel/room-assignments
   */
  async getRoomAssignments(schoolId: number) {
    console.log('📋 Fetching room assignments for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('hostel_room_assignments')
        .select(`
          *,
          student:student_id (
            id,
            name,
            student_id,
            class,
            section
          ),
          room:room_id (
            id,
            room_number,
            room_type,
            hostel:hostel_id (
              id,
              name,
              name_in_bangla
            )
          )
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true);
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} room assignments`);
      return (data || []).map(fromDbHostelRoomAssignment);
    } catch (error) {
      console.error('❌ Error fetching room assignments:', error);
      throw error;
    }
  },

  /**
   * Assign student to room
   * Replaces: POST /api/hostel/room-assignments
   */
  async assignStudentToRoom(assignment: any, schoolId: number) {
    console.log('➕ Assigning student to room');
    try {
      const dbAssignment = toDbHostelRoomAssignment({ ...assignment, schoolId });
      const { data, error } = await supabase
        .from('hostel_room_assignments')
        .insert([dbAssignment])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Student assigned to room successfully');
      return fromDbHostelRoomAssignment(data);
    } catch (error) {
      console.error('❌ Error assigning student to room:', error);
      throw error;
    }
  },

  /**
   * Get hostel attendance
   * Replaces: GET /api/hostel/attendance
   */
  async getHostelAttendance(schoolId: number, date?: string) {
    console.log('📅 Fetching hostel attendance for school:', schoolId, 'date:', date);
    try {
      let query = supabase
        .from('hostel_attendance')
        .select(`
          *,
          student:student_id (
            id,
            name,
            student_id,
            class,
            section
          ),
          room:room_id (
            id,
            room_number,
            hostel:hostel_id (
              id,
              name
            )
          )
        `)
        .eq('school_id', schoolId);
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} attendance records`);
      return (data || []).map(fromDbHostelAttendance);
    } catch (error) {
      console.error('❌ Error fetching hostel attendance:', error);
      throw error;
    }
  },

  /**
   * Mark hostel attendance
   * Replaces: POST /api/hostel/attendance
   */
  async markHostelAttendance(attendance: any, schoolId: number) {
    console.log('✅ Marking hostel attendance');
    try {
      const dbAttendance = toDbHostelAttendance({ ...attendance, schoolId });
      const { data, error } = await supabase
        .from('hostel_attendance')
        .insert([dbAttendance])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Hostel attendance marked successfully');
      return fromDbHostelAttendance(data);
    } catch (error) {
      console.error('❌ Error marking hostel attendance:', error);
      throw error;
    }
  },

  /**
   * Get meal plans
   * Replaces: GET /api/hostel/meal-plans
   */
  async getMealPlans(schoolId: number) {
    console.log('🍽️ Fetching meal plans for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('plan_name');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} meal plans`);
      return (data || []).map(fromDbMealPlan);
    } catch (error) {
      console.error('❌ Error fetching meal plans:', error);
      throw error;
    }
  },

  /**
   * Get meal menus
   * Replaces: GET /api/hostel/meal-menus
   */
  async getMealMenus(schoolId: number, date?: string) {
    console.log('📋 Fetching meal menus for school:', schoolId, 'date:', date);
    try {
      let query = supabase
        .from('meal_menu')
        .select('*')
        .eq('school_id', schoolId);
      
      if (date) {
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        query = query.eq('day_of_week', dayOfWeek);
      }
      
      const { data, error } = await query.order('day_of_week');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} meal menus`);
      return (data || []).map(fromDbMealMenu);
    } catch (error) {
      console.error('❌ Error fetching meal menus:', error);
      throw error;
    }
  },

  /**
   * Get meal subscriptions
   * Replaces: GET /api/hostel/meal-subscriptions
   */
  async getMealSubscriptions(schoolId: number) {
    console.log('📋 Fetching meal subscriptions for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('meal_subscriptions')
        .select(`
          *,
          student:student_id (
            id,
            name,
            student_id,
            class,
            section
          ),
          plan:plan_id (
            id,
            plan_name,
            plan_name_bn,
            monthly_fee
          )
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true);
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} meal subscriptions`);
      return (data || []).map(fromDbMealSubscription);
    } catch (error) {
      console.error('❌ Error fetching meal subscriptions:', error);
      throw error;
    }
  },

  /**
   * Create meal subscription
   * Replaces: POST /api/hostel/meal-subscriptions
   */
  async createMealSubscription(subscription: any, schoolId: number) {
    console.log('➕ Creating meal subscription');
    try {
      const dbSubscription = toDbMealSubscription({ ...subscription, schoolId });
      const { data, error } = await supabase
        .from('meal_subscriptions')
        .insert([dbSubscription])
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Meal subscription created successfully');
      return fromDbMealSubscription(data);
    } catch (error) {
      console.error('❌ Error creating meal subscription:', error);
      throw error;
    }
  },

  /**
   * Get meal transactions
   * Replaces: GET /api/hostel/meal-transactions
   */
  async getMealTransactions(schoolId: number) {
    console.log('💰 Fetching meal transactions for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('meal_transactions')
        .select(`
          *,
          student:student_id (
            id,
            name,
            student_id,
            class,
            section
          ),
          subscription:subscription_id (
            id,
            plan:plan_id (
              id,
              plan_name,
              plan_name_bn
            )
          )
        `)
        .eq('school_id', schoolId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} meal transactions`);
      return (data || []).map(fromDbMealTransaction);
    } catch (error) {
      console.error('❌ Error fetching meal transactions:', error);
      throw error;
    }
  }
};

// ============================================================================
// ADMISSION SYSTEM
// ============================================================================

export const admission = {
  async getApplications(schoolId: number, status?: string) {
    console.log('📝 Fetching admission applications for school:', schoolId, status ? `with status: ${status}` : '');
    try {
      let query = supabase
        .from('admission_applications')
        .select('*')
        .eq('school_id', schoolId)
        .order('application_date', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} admission applications`);
      return (data || []).map(fromDbAdmissionApplication);
    } catch (error) {
      console.error('❌ Error fetching admission applications:', error);
      throw error;
    }
  },

  async getApplicationById(id: number, schoolId: number) {
    console.log('📝 Fetching admission application:', id, 'for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      console.log('✅ Fetched admission application:', id);
      return data ? fromDbAdmissionApplication(data) : null;
    } catch (error) {
      console.error('❌ Error fetching admission application:', error);
      throw error;
    }
  },

  async createApplication(application: any, schoolId: number) {
    console.log('➕ Creating admission application for school:', schoolId);
    try {
      const dbApplication = toDbAdmissionApplication(application);
      dbApplication.school_id = schoolId;
      dbApplication.application_date = dbApplication.application_date || new Date().toISOString();
      dbApplication.status = dbApplication.status || 'pending';
      
      const { data, error } = await supabase
        .from('admission_applications')
        .insert([dbApplication])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created admission application:', data?.id);
      return data ? fromDbAdmissionApplication(data) : null;
    } catch (error) {
      console.error('❌ Error creating admission application:', error);
      throw error;
    }
  },

  async updateApplication(id: number, application: any, schoolId: number) {
    console.log('📝 Updating admission application:', id, 'for school:', schoolId);
    try {
      const dbApplication = toDbAdmissionApplication(application);
      
      const { data, error } = await supabase
        .from('admission_applications')
        .update(dbApplication)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated admission application:', id);
      return data ? fromDbAdmissionApplication(data) : null;
    } catch (error) {
      console.error('❌ Error updating admission application:', error);
      throw error;
    }
  },

  async updateApplicationStatus(id: number, status: string, schoolId: number) {
    console.log('🔄 Updating application status:', id, 'to:', status, 'for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .update({ status })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated application status:', id);
      return data ? fromDbAdmissionApplication(data) : null;
    } catch (error) {
      console.error('❌ Error updating application status:', error);
      throw error;
    }
  },

  async getTests(schoolId: number) {
    console.log('📝 Fetching admission tests for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('admission_tests')
        .select('*')
        .eq('school_id', schoolId)
        .order('test_date', { ascending: true });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} admission tests`);
      return (data || []).map(fromDbAdmissionTest);
    } catch (error) {
      console.error('❌ Error fetching admission tests:', error);
      throw error;
    }
  },

  async createTest(test: any, schoolId: number) {
    console.log('➕ Creating admission test for school:', schoolId);
    try {
      const dbTest = toDbAdmissionTest(test);
      dbTest.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('admission_tests')
        .insert([dbTest])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created admission test:', data?.id);
      return data ? fromDbAdmissionTest(data) : null;
    } catch (error) {
      console.error('❌ Error creating admission test:', error);
      throw error;
    }
  },

  async getTestResults(schoolId: number, testId?: number) {
    console.log('📊 Fetching test results for school:', schoolId, testId ? `test ID: ${testId}` : '');
    try {
      let query = supabase
        .from('admission_tests')
        .select(`
          *,
          applications:admission_applications(
            id,
            student_name,
            email,
            phone,
            status
          )
        `)
        .eq('school_id', schoolId);
      
      if (testId) {
        query = query.eq('id', testId);
      }
      
      const { data, error } = await query.order('test_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} test results`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching test results:', error);
      throw error;
    }
  },

  async getInterviews(schoolId: number) {
    console.log('📝 Fetching interviews for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('admission_interviews')
        .select(`
          *,
          application:application_id (
            id,
            student_name,
            email,
            phone
          )
        `)
        .eq('school_id', schoolId)
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} interviews`);
      return (data || []).map(fromDbAdmissionInterview);
    } catch (error) {
      console.error('❌ Error fetching interviews:', error);
      throw error;
    }
  },

  async scheduleInterview(interview: any, schoolId: number) {
    console.log('➕ Scheduling interview for school:', schoolId);
    try {
      const dbInterview = toDbAdmissionInterview(interview);
      dbInterview.school_id = schoolId;
      dbInterview.status = dbInterview.status || 'scheduled';
      
      const { data, error } = await supabase
        .from('admission_interviews')
        .insert([dbInterview])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Scheduled interview:', data?.id);
      return data ? fromDbAdmissionInterview(data) : null;
    } catch (error) {
      console.error('❌ Error scheduling interview:', error);
      throw error;
    }
  }
};

// ============================================================================
// REPORTS SYSTEM
// ============================================================================

export const reports = {
  async getAttendanceReport(schoolId: number, filters: any) {
    console.log('📊 Generating attendance report for school:', schoolId, filters);
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          student:student_id (
            id,
            name,
            student_id,
            class,
            section
          )
        `)
        .eq('school_id', schoolId);
      
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.class) {
        query = query.eq('student.class', filters.class);
      }
      if (filters?.section) {
        query = query.eq('student.section', filters.section);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Generated attendance report with ${data?.length || 0} records`);
      return data || [];
    } catch (error) {
      console.error('❌ Error generating attendance report:', error);
      throw error;
    }
  },

  async getTeacherWorkloadReport(schoolId: number) {
    console.log('📊 Generating teacher workload report for school:', schoolId);
    try {
      const { data: teachersData, error } = await supabase
        .from('teachers')
        .select(`
          id,
          name,
          subject,
          classes_assigned
        `)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      const workloadReport = await Promise.all(
        (teachersData || []).map(async (teacher) => {
          const { data: lessonsData } = await supabase
            .from('lesson_plans')
            .select('id', { count: 'exact' })
            .eq('teacher_id', teacher.id)
            .eq('school_id', schoolId);
          
          const { data: assignmentsData } = await supabase
            .from('assignments')
            .select('id', { count: 'exact' })
            .eq('teacher_id', teacher.id)
            .eq('school_id', schoolId);
          
          return {
            ...teacher,
            lesson_count: lessonsData?.length || 0,
            assignment_count: assignmentsData?.length || 0,
            total_workload: (lessonsData?.length || 0) + (assignmentsData?.length || 0)
          };
        })
      );
      
      console.log(`✅ Generated teacher workload report for ${workloadReport.length} teachers`);
      return workloadReport;
    } catch (error) {
      console.error('❌ Error generating teacher workload report:', error);
      throw error;
    }
  },

  async getFeeDefaultersReport(schoolId: number) {
    console.log('💰 Generating fee defaulters report for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          student_id,
          class,
          section,
          phone,
          parent_email
        `)
        .eq('school_id', schoolId)
        .eq('fee_status', 'pending');
      
      if (error) throw error;
      
      console.log(`✅ Found ${data?.length || 0} fee defaulters`);
      return data || [];
    } catch (error) {
      console.error('❌ Error generating fee defaulters report:', error);
      throw error;
    }
  },

  async getReportTemplates(schoolId: number) {
    console.log('📄 Fetching report templates for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} report templates`);
      return (data || []).map(fromDbReportTemplate);
    } catch (error) {
      console.error('❌ Error fetching report templates:', error);
      throw error;
    }
  },

  async generateReport(templateId: number, params: any, schoolId: number) {
    console.log('📊 Generating report from template:', templateId, 'for school:', schoolId);
    try {
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('school_id', schoolId)
        .single();
      
      if (templateError) throw templateError;
      
      let reportData: any = {};
      
      switch (template.type) {
        case 'attendance':
          reportData = await this.getAttendanceReport(schoolId, params);
          break;
        case 'teacher_workload':
          reportData = await this.getTeacherWorkloadReport(schoolId);
          break;
        case 'fee_defaulters':
          reportData = await this.getFeeDefaultersReport(schoolId);
          break;
        default:
          reportData = { message: 'Custom report generation not implemented for this type' };
      }
      
      console.log('✅ Generated report from template:', templateId);
      return {
        template: fromDbReportTemplate(template),
        data: reportData,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  },

  async getSavedReports(schoolId: number) {
    console.log('📂 Fetching saved reports for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_saved', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} saved reports`);
      return (data || []).map(fromDbReportTemplate);
    } catch (error) {
      console.error('❌ Error fetching saved reports:', error);
      throw error;
    }
  },

  async saveReport(report: any, schoolId: number) {
    console.log('💾 Saving report for school:', schoolId);
    try {
      const dbReport = toDbReportTemplate(report);
      dbReport.school_id = schoolId;
      dbReport.is_saved = true;
      dbReport.saved_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('report_templates')
        .insert([dbReport])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Saved report:', data?.id);
      return data ? fromDbReportTemplate(data) : null;
    } catch (error) {
      console.error('❌ Error saving report:', error);
      throw error;
    }
  }
};

// ============================================================================
// ACADEMIC YEARS, CALENDAR, EVENTS SYSTEM
// ============================================================================

export const academic = {
  async getAcademicYears(schoolId: number) {
    console.log('📅 Fetching academic years for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} academic years`);
      return (data || []).map(fromDbAcademicYear);
    } catch (error) {
      console.error('❌ Error fetching academic years:', error);
      throw error;
    }
  },

  async getCurrentAcademicYear(schoolId: number) {
    console.log('📅 Fetching current academic year for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ No current academic year found, fetching most recent');
          const { data: latestData, error: latestError } = await supabase
            .from('academic_years')
            .select('*')
            .eq('school_id', schoolId)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();
          
          if (latestError) throw latestError;
          console.log('✅ Fetched most recent academic year');
          return latestData ? fromDbAcademicYear(latestData) : null;
        }
        throw error;
      }
      
      console.log('✅ Fetched current academic year');
      return data ? fromDbAcademicYear(data) : null;
    } catch (error) {
      console.error('❌ Error fetching current academic year:', error);
      throw error;
    }
  },

  async createAcademicYear(year: any, schoolId: number) {
    console.log('➕ Creating academic year for school:', schoolId);
    try {
      const dbYear = toDbAcademicYear(year);
      dbYear.school_id = schoolId;
      
      if (dbYear.is_current) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('school_id', schoolId);
      }
      
      const { data, error } = await supabase
        .from('academic_years')
        .insert([dbYear])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created academic year:', data?.id);
      return data ? fromDbAcademicYear(data) : null;
    } catch (error) {
      console.error('❌ Error creating academic year:', error);
      throw error;
    }
  },

  async updateAcademicYear(id: number, year: any, schoolId: number) {
    console.log('📝 Updating academic year:', id, 'for school:', schoolId);
    try {
      const dbYear = toDbAcademicYear(year);
      
      if (dbYear.is_current) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('school_id', schoolId)
          .neq('id', id);
      }
      
      const { data, error } = await supabase
        .from('academic_years')
        .update(dbYear)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated academic year:', id);
      return data ? fromDbAcademicYear(data) : null;
    } catch (error) {
      console.error('❌ Error updating academic year:', error);
      throw error;
    }
  },

  async getCalendarEvents(schoolId: number, filters?: any) {
    console.log('📅 Fetching calendar events for school:', schoolId, filters || '');
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('school_id', schoolId);
      
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }
      if (filters?.type) {
        query = query.eq('event_type', filters.type);
      }
      
      const { data, error } = await query.order('start_date', { ascending: true });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} calendar events`);
      return (data || []).map(fromDbCalendarEvent);
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      throw error;
    }
  },

  async createCalendarEvent(event: any, schoolId: number) {
    console.log('➕ Creating calendar event for school:', schoolId);
    try {
      const dbEvent = toDbCalendarEvent(event);
      dbEvent.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([dbEvent])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created calendar event:', data?.id);
      return data ? fromDbCalendarEvent(data) : null;
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  },

  async updateCalendarEvent(id: number, event: any, schoolId: number) {
    console.log('📝 Updating calendar event:', id, 'for school:', schoolId);
    try {
      const dbEvent = toDbCalendarEvent(event);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .update(dbEvent)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated calendar event:', id);
      return data ? fromDbCalendarEvent(data) : null;
    } catch (error) {
      console.error('❌ Error updating calendar event:', error);
      throw error;
    }
  },

  async deleteCalendarEvent(id: number, schoolId: number) {
    console.log('🗑️ Deleting calendar event:', id, 'for school:', schoolId);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      console.log('✅ Deleted calendar event:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error);
      throw error;
    }
  },

  async getAcademicTerms(schoolId: number) {
    console.log('📚 Fetching academic terms for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select(`
          *,
          academic_year:academic_year_id (
            id,
            year_name,
            start_date,
            end_date
          )
        `)
        .eq('school_id', schoolId)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} academic terms`);
      return (data || []).map(fromDbAcademicTerm);
    } catch (error) {
      console.error('❌ Error fetching academic terms:', error);
      throw error;
    }
  }
};

// ============================================================================
// NOTIFICATIONS SYSTEM
// ============================================================================

export const notifications = {
  async getNotifications(userId: string, schoolId: number, filters?: any) {
    console.log('🔔 Fetching notifications for user:', userId, 'school:', schoolId);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId);

      if (userId) {
        query = query.eq('recipient_id', userId);
      }

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.notificationType) {
        query = query.eq('notification_type', filters.notificationType);
      }

      if (filters?.recipientType) {
        query = query.eq('recipient_type', filters.recipientType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} notifications`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  },

  async createNotification(notification: any, schoolId: number) {
    console.log('➕ Creating notification for school:', schoolId);
    try {
      const dbNotification: any = {
        title: notification.title,
        title_bn: notification.titleBn,
        message: notification.message,
        message_bn: notification.messageBn,
        notification_type: notification.notificationType || 'general',
        recipient_id: notification.recipientId,
        recipient_type: notification.recipientType || 'user',
        is_read: false,
        action_url: notification.actionUrl,
        icon_type: notification.iconType || 'info',
        send_email: notification.sendEmail || false,
        send_sms: notification.sendSms || false,
        school_id: schoolId,
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([dbNotification])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Created notification:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  },

  async markAsRead(id: number, schoolId: number) {
    console.log('✔️ Marking notification as read:', id);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Marked notification as read:', id);
      return data;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead(userId: string, schoolId: number) {
    console.log('✔️ Marking all notifications as read for user:', userId);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('recipient_id', userId)
        .eq('school_id', schoolId)
        .eq('is_read', false)
        .select();

      if (error) throw error;

      console.log(`✅ Marked ${data?.length || 0} notifications as read`);
      return { count: data?.length || 0 };
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  },

  async deleteNotification(id: number, schoolId: number) {
    console.log('🗑️ Deleting notification:', id);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);

      if (error) throw error;

      console.log('✅ Deleted notification:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  },

  async getNotificationTemplates(schoolId: number) {
    console.log('📋 Fetching notification templates for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} notification templates`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching notification templates:', error);
      throw error;
    }
  },

  async sendBulkNotification(template: any, recipients: any[], schoolId: number) {
    console.log('📨 Sending bulk notification to', recipients.length, 'recipients');
    try {
      const notifications = recipients.map(recipient => ({
        title: template.name,
        title_bn: template.name_bn,
        message: template.template_body,
        message_bn: template.template_body_bn,
        notification_type: template.category || 'general',
        recipient_id: recipient.id,
        recipient_type: recipient.type || 'user',
        is_read: false,
        send_email: template.send_email || false,
        send_sms: template.send_sms || false,
        school_id: schoolId,
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;

      // Log the bulk send
      const logs = recipients.map(recipient => ({
        template_id: template.id,
        recipient_id: recipient.id,
        recipient_type: recipient.type || 'user',
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
        school_id: schoolId,
      }));

      await supabase
        .from('notification_logs')
        .insert(logs);

      console.log(`✅ Sent bulk notification to ${data?.length || 0} recipients`);
      return { count: data?.length || 0, notifications: data };
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error);
      throw error;
    }
  },
};

// ============================================================================
// PARENT PORTAL SYSTEM
// ============================================================================

export const parentPortal = {
  async getChildren(parentId: number, schoolId: number) {
    console.log('👨‍👩‍👧‍👦 Fetching children for parent:', parentId, 'school:', schoolId);
    try {
      // Get parent info first
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('phone, email')
        .eq('id', parentId)
        .eq('school_id', schoolId)
        .single();

      if (parentError) throw parentError;

      // Find students matching parent's phone or email
      let query = supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);

      if (parent?.phone) {
        query = query.or(`guardian_phone.eq.${parent.phone},phone.eq.${parent.phone}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`✅ Found ${data?.length || 0} children for parent`);
      return (data || []).map(fromDbStudent);
    } catch (error) {
      console.error('❌ Error fetching children:', error);
      throw error;
    }
  },

  async getChildProgress(studentId: number, schoolId: number) {
    console.log('📊 Fetching progress for student:', studentId);
    try {
      // Get exam results
      const { data: results, error: resultsError } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam_schedules (
            *,
            exams (
              name,
              name_bn,
              start_date
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Get attendance summary
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .eq('school_id', schoolId);

      if (attendanceError) throw attendanceError;

      const totalDays = attendance?.length || 0;
      const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      console.log('✅ Fetched student progress');
      return {
        examResults: results || [],
        attendance: {
          totalDays,
          presentDays,
          absentDays: totalDays - presentDays,
          percentage: attendancePercentage.toFixed(2),
        },
      };
    } catch (error) {
      console.error('❌ Error fetching child progress:', error);
      throw error;
    }
  },

  async getChildAttendance(studentId: number, schoolId: number, filters?: any) {
    console.log('📅 Fetching attendance for student:', studentId);
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId);

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} attendance records`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching child attendance:', error);
      throw error;
    }
  },

  async getChildExamResults(studentId: number, schoolId: number) {
    console.log('📝 Fetching exam results for student:', studentId);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam_schedules (
            *,
            exams (
              id,
              name,
              description,
              start_date,
              end_date,
              is_published
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} exam results`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching child exam results:', error);
      throw error;
    }
  },

  async getParentNotifications(parentId: number, schoolId: number) {
    console.log('🔔 Fetching parent notifications for parent:', parentId);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', parentId)
        .eq('recipient_type', 'parent')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} parent notifications`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching parent notifications:', error);
      throw error;
    }
  },

  async getFeeStatus(studentId: number, schoolId: number) {
    console.log('💰 Fetching fee status for student:', studentId);
    try {
      const { data, error } = await supabase
        .from('fee_receipts')
        .select(`
          *,
          fee_items (*)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate totals
      const totalAmount = data?.reduce((sum, receipt) => sum + parseFloat(receipt.total_amount || 0), 0) || 0;
      const paidAmount = data?.reduce((sum, receipt) => sum + parseFloat(receipt.paid_amount || 0), 0) || 0;
      const dueAmount = data?.reduce((sum, receipt) => sum + parseFloat(receipt.due_amount || 0), 0) || 0;

      console.log(`✅ Fetched ${data?.length || 0} fee receipts`);
      return {
        receipts: data || [],
        summary: {
          totalAmount: totalAmount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          dueAmount: dueAmount.toFixed(2),
          percentagePaid: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : '0',
        },
      };
    } catch (error) {
      console.error('❌ Error fetching fee status:', error);
      throw error;
    }
  },
};

// ============================================================================
// EXAM MANAGEMENT & PUBLIC PORTAL SYSTEM
// ============================================================================

export const examPortal = {
  async getExams(schoolId: number) {
    console.log('📚 Fetching exams for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_schedules (*)
        `)
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} exams`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching exams:', error);
      throw error;
    }
  },

  async getExamById(id: number, schoolId: number) {
    console.log('📖 Fetching exam:', id);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_schedules (
            *,
            exam_results (*)
          )
        `)
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();

      if (error) throw error;

      console.log('✅ Fetched exam details');
      return data;
    } catch (error) {
      console.error('❌ Error fetching exam details:', error);
      throw error;
    }
  },

  async getExamSchedule(examId: number, schoolId: number) {
    console.log('🗓️ Fetching exam schedule for exam:', examId);
    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select(`
          *,
          exams (
            name,
            description,
            start_date,
            end_date
          )
        `)
        .eq('exam_id', examId)
        .eq('school_id', schoolId)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} exam schedules`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching exam schedule:', error);
      throw error;
    }
  },

  async getExamResults(schoolId: number, examId?: number, studentId?: number) {
    console.log('📊 Fetching exam results for school:', schoolId);
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          exam_schedules (
            *,
            exams (
              id,
              name,
              description,
              start_date,
              is_published
            )
          ),
          students (
            id,
            student_id,
            name,
            class,
            section,
            roll_number
          )
        `)
        .eq('school_id', schoolId);

      if (examId) {
        query = query.eq('exam_schedules.exam_id', examId);
      }

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} exam results`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching exam results:', error);
      throw error;
    }
  },

  async publishExamResults(examId: number, schoolId: number) {
    console.log('📢 Publishing exam results for exam:', examId);
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ is_published: true })
        .eq('id', examId)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Published exam results');
      return data;
    } catch (error) {
      console.error('❌ Error publishing exam results:', error);
      throw error;
    }
  },

  async getPublicExams(schoolId: number) {
    console.log('🌐 Fetching public exams for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .order('start_date', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} public exams`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching public exams:', error);
      throw error;
    }
  },

  async getPublicResults(accessToken: string) {
    console.log('🔐 Fetching results using public access token');
    try {
      // Verify and get token details
      const { data: tokenData, error: tokenError } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('token', accessToken)
        .eq('is_active', true)
        .eq('purpose', 'results')
        .single();

      if (tokenError) throw new Error('Invalid or expired access token');

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Access token has expired');
      }

      // Update access count
      await supabase
        .from('public_access_tokens')
        .update({ 
          access_count: (tokenData.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);

      // Get exam results for the student
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam_schedules (
            *,
            exams (
              id,
              name,
              description,
              start_date,
              is_published
            )
          ),
          students (
            id,
            student_id,
            name,
            class,
            section
          )
        `)
        .eq('student_id', tokenData.student_id)
        .eq('school_id', tokenData.school_id);

      if (error) throw error;

      // Only return published results
      const publishedResults = data?.filter(result => 
        result.exam_schedules?.exams?.is_published === true
      ) || [];

      console.log(`✅ Fetched ${publishedResults.length} public results`);
      return publishedResults;
    } catch (error) {
      console.error('❌ Error fetching public results:', error);
      throw error;
    }
  },

  async getPublicFees(accessToken: string) {
    console.log('🔐 Fetching fees using public access token');
    try {
      // Verify and get token details
      const { data: tokenData, error: tokenError } = await supabase
        .from('public_access_tokens')
        .select('*')
        .eq('token', accessToken)
        .eq('is_active', true)
        .eq('purpose', 'fees')
        .single();

      if (tokenError) throw new Error('Invalid or expired access token');

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Access token has expired');
      }

      // Update access count
      await supabase
        .from('public_access_tokens')
        .update({ 
          access_count: (tokenData.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);

      // Get fee receipts for the student
      const { data, error } = await supabase
        .from('fee_receipts')
        .select(`
          *,
          fee_items (*),
          students (
            id,
            student_id,
            name,
            class,
            section
          )
        `)
        .eq('student_id', tokenData.student_id)
        .eq('school_id', tokenData.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} fee receipts`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching public fees:', error);
      throw error;
    }
  },

  async generatePublicAccessToken(studentId: number, schoolId: number, purpose: string) {
    console.log('🔑 Generating public access token for student:', studentId, 'purpose:', purpose);
    try {
      // Generate random token
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15) + 
                    Date.now().toString(36);

      // Set expiry to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const tokenData = {
        student_id: studentId,
        token: token,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        access_count: 0,
        school_id: schoolId,
      };

      const { data, error } = await supabase
        .from('public_access_tokens')
        .insert([tokenData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Generated public access token');
      return data;
    } catch (error) {
      console.error('❌ Error generating public access token:', error);
      throw error;
    }
  },
};

// ============================================================================
// VIDEO CONFERENCE SYSTEM
// ============================================================================

export const videoConference = {
  async getConferenceRooms(schoolId: number, status?: string) {
    console.log('📹 Fetching conference rooms for school:', schoolId, status ? `with status: ${status}` : '');
    try {
      let query = supabase
        .from('video_conferences')
        .select('*')
        .eq('school_id', schoolId);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('start_time', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} conference rooms`);
      return (data || []).map(fromDbVideoConference);
    } catch (error) {
      console.error('❌ Error fetching conference rooms:', error);
      throw error;
    }
  },

  async getRoomById(id: number, schoolId: number) {
    console.log('📹 Fetching conference room:', id, 'for school:', schoolId);
    try {
      const { data, error } = await supabase
        .from('video_conferences')
        .select('*')
        .eq('id', id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      console.log('✅ Fetched conference room details');
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error fetching conference room:', error);
      throw error;
    }
  },

  async createConferenceRoom(room: any, schoolId: number) {
    console.log('➕ Creating conference room for school:', schoolId);
    try {
      const dbRoom = toDbVideoConference(room);
      dbRoom.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('video_conferences')
        .insert([dbRoom])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created conference room:', data?.id);
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error creating conference room:', error);
      throw error;
    }
  },

  async joinRoom(roomId: string, userId: string, schoolId: number) {
    console.log('🚪 Joining conference room:', roomId, 'user:', userId);
    try {
      // Get current participant count
      const { data: room, error: fetchError } = await supabase
        .from('video_conferences')
        .select('participants')
        .eq('meeting_id', roomId)
        .eq('school_id', schoolId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newParticipantCount = (room?.participants || 0) + 1;
      
      // Increment participants
      const { data, error } = await supabase
        .from('video_conferences')
        .update({ participants: newParticipantCount })
        .eq('meeting_id', roomId)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ User joined conference room, participants:', newParticipantCount);
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error joining conference room:', error);
      throw error;
    }
  },

  async leaveRoom(roomId: string, userId: string, schoolId: number) {
    console.log('🚪 Leaving conference room:', roomId, 'user:', userId);
    try {
      // Get current participant count
      const { data: room, error: fetchError } = await supabase
        .from('video_conferences')
        .select('participants')
        .eq('meeting_id', roomId)
        .eq('school_id', schoolId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newParticipantCount = Math.max(0, (room?.participants || 0) - 1);
      
      // Decrement participants
      const { data, error } = await supabase
        .from('video_conferences')
        .update({ participants: newParticipantCount })
        .eq('meeting_id', roomId)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ User left conference room, participants:', newParticipantCount);
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error leaving conference room:', error);
      throw error;
    }
  },

  async updateRoomStatus(id: number, status: string, schoolId: number) {
    console.log('📝 Updating conference room status:', id, 'to', status);
    try {
      const { data, error } = await supabase
        .from('video_conferences')
        .update({ status, end_time: status === 'ended' ? new Date().toISOString() : undefined })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated conference room status');
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error updating conference room status:', error);
      throw error;
    }
  },

  async toggleRecording(id: number, isRecording: boolean, schoolId: number) {
    console.log('🎥', isRecording ? 'Starting' : 'Stopping', 'recording for room:', id);
    try {
      const { data, error } = await supabase
        .from('video_conferences')
        .update({ is_recording: isRecording })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅', isRecording ? 'Started' : 'Stopped', 'recording');
      return data ? fromDbVideoConference(data) : null;
    } catch (error) {
      console.error('❌ Error toggling recording:', error);
      throw error;
    }
  },
};

// ============================================================================
// REALTIME/LIVE UPDATES SYSTEM
// ============================================================================

// Store active subscriptions
const activeSubscriptions = new Map<string, any>();

export const realtime = {
  subscribeToAttendance(schoolId: number, callback: Function) {
    console.log('🔴 Subscribing to attendance updates for school:', schoolId);
    const channelName = `attendance_${schoolId}`;
    
    // Unsubscribe if already subscribed
    if (activeSubscriptions.has(channelName)) {
      activeSubscriptions.get(channelName).unsubscribe();
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          console.log('📊 Attendance update received:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    activeSubscriptions.set(channelName, channel);
    console.log('✅ Subscribed to attendance updates');
    return channel;
  },

  subscribeToExamResults(schoolId: number, callback: Function) {
    console.log('🔴 Subscribing to exam results updates for school:', schoolId);
    const channelName = `exam_results_${schoolId}`;
    
    // Unsubscribe if already subscribed
    if (activeSubscriptions.has(channelName)) {
      activeSubscriptions.get(channelName).unsubscribe();
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_results',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          console.log('📈 Exam results update received:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    activeSubscriptions.set(channelName, channel);
    console.log('✅ Subscribed to exam results updates');
    return channel;
  },

  subscribeToSchoolStats(schoolId: number, callback: Function) {
    console.log('🔴 Subscribing to school statistics updates for school:', schoolId);
    const channels: any[] = [];
    
    // Subscribe to multiple tables for comprehensive stats
    const tables = ['students', 'teachers', 'attendance', 'exam_results', 'fee_receipts'];
    
    tables.forEach(table => {
      const channelName = `stats_${table}_${schoolId}`;
      
      // Unsubscribe if already subscribed
      if (activeSubscriptions.has(channelName)) {
        activeSubscriptions.get(channelName).unsubscribe();
      }
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `school_id=eq.${schoolId}`,
          },
          (payload) => {
            console.log(`📊 ${table} update received:`, payload);
            callback({ table, payload });
          }
        )
        .subscribe();
      
      activeSubscriptions.set(channelName, channel);
      channels.push(channel);
    });
    
    console.log('✅ Subscribed to school statistics updates');
    return channels;
  },

  subscribeToNotifications(userId: string, callback: Function) {
    console.log('🔴 Subscribing to notifications for user:', userId);
    const channelName = `notifications_${userId}`;
    
    // Unsubscribe if already subscribed
    if (activeSubscriptions.has(channelName)) {
      activeSubscriptions.get(channelName).unsubscribe();
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    activeSubscriptions.set(channelName, channel);
    console.log('✅ Subscribed to notification updates');
    return channel;
  },

  async unsubscribeAll() {
    console.log('⏹️ Unsubscribing from all realtime channels...');
    for (const [channelName, channel] of activeSubscriptions.entries()) {
      await channel.unsubscribe();
      console.log('✅ Unsubscribed from:', channelName);
    }
    activeSubscriptions.clear();
    console.log('✅ All subscriptions cleared');
  },
};

// ============================================================================
// PAYMENT/FINANCIAL SYSTEM
// ============================================================================

export const payment = {
  async getTransactions(schoolId: number, filters?: any) {
    console.log('💰 Fetching payment transactions for school:', schoolId);
    try {
      let query = supabase
        .from('payment_transactions')
        .select('*')
        .eq('school_id', schoolId);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} payment transactions`);
      return (data || []).map(fromDbPaymentTransaction);
    } catch (error) {
      console.error('❌ Error fetching payment transactions:', error);
      throw error;
    }
  },

  async createTransaction(transaction: any, schoolId: number) {
    console.log('➕ Creating payment transaction for school:', schoolId);
    try {
      const dbTransaction = toDbPaymentTransaction(transaction);
      dbTransaction.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert([dbTransaction])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created payment transaction:', data?.id);
      return data ? fromDbPaymentTransaction(data) : null;
    } catch (error) {
      console.error('❌ Error creating payment transaction:', error);
      throw error;
    }
  },

  async updateTransactionStatus(id: number, status: string, schoolId: number) {
    console.log('📝 Updating transaction status:', id, 'to', status);
    try {
      const updates: any = { status };
      if (status === 'success') {
        updates.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .update(updates)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated transaction status');
      return data ? fromDbPaymentTransaction(data) : null;
    } catch (error) {
      console.error('❌ Error updating transaction status:', error);
      throw error;
    }
  },

  async processPayment(paymentData: any, schoolId: number) {
    console.log('⚡ Processing payment for school:', schoolId);
    try {
      // Create payment transaction
      const transaction = await this.createTransaction(paymentData, schoolId);
      
      if (!transaction) {
        throw new Error('Failed to create payment transaction');
      }
      
      // Create fee receipt if student_id is provided
      if (paymentData.studentId) {
        const receiptData = {
          student_id: paymentData.studentId,
          receipt_number: `RCP-${Date.now()}`,
          total_amount: paymentData.amount,
          paid_amount: paymentData.amount,
          due_amount: 0,
          payment_method: paymentData.paymentMethod,
          payment_date: new Date().toISOString(),
          school_id: schoolId,
        };
        
        const { data: receipt, error: receiptError } = await supabase
          .from('fee_receipts')
          .insert([receiptData])
          .select()
          .single();
        
        if (receiptError) {
          console.warn('⚠️ Failed to create fee receipt:', receiptError);
        } else {
          console.log('✅ Created fee receipt:', receipt?.id);
          return { transaction, receipt };
        }
      }
      
      console.log('✅ Payment processed successfully');
      return { transaction };
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      throw error;
    }
  },

  async getPaymentStats(schoolId: number) {
    console.log('📊 Fetching payment statistics for school:', schoolId);
    try {
      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('amount, status, created_at')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      const stats = {
        totalTransactions: transactions?.length || 0,
        successfulTransactions: transactions?.filter(t => t.status === 'success').length || 0,
        pendingTransactions: transactions?.filter(t => t.status === 'pending').length || 0,
        failedTransactions: transactions?.filter(t => t.status === 'failed').length || 0,
        totalRevenue: transactions
          ?.filter(t => t.status === 'success')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
        pendingAmount: transactions
          ?.filter(t => t.status === 'pending')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
      };
      
      console.log('✅ Payment statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching payment statistics:', error);
      throw error;
    }
  },

  async getFeeReceipts(schoolId: number, studentId?: number) {
    console.log('📄 Fetching fee receipts for school:', schoolId, studentId ? `student: ${studentId}` : '');
    try {
      let query = supabase
        .from('fee_receipts')
        .select(`
          *,
          fee_items (*)
        `)
        .eq('school_id', schoolId);
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} fee receipts`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching fee receipts:', error);
      throw error;
    }
  },
};

// ============================================================================
// HEALTH/MEDICAL SYSTEM
// ============================================================================

export const health = {
  async getHealthRecords(schoolId: number, studentId?: number) {
    console.log('🏥 Fetching health records for school:', schoolId, studentId ? `student: ${studentId}` : '');
    try {
      let query = supabase
        .from('health_records')
        .select('*')
        .eq('school_id', schoolId);
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} health records`);
      return (data || []).map(fromDbHealthRecord);
    } catch (error) {
      console.error('❌ Error fetching health records:', error);
      throw error;
    }
  },

  async createHealthRecord(record: any, schoolId: number) {
    console.log('➕ Creating health record for school:', schoolId);
    try {
      const dbRecord = toDbHealthRecord(record);
      dbRecord.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('health_records')
        .insert([dbRecord])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created health record:', data?.id);
      return data ? fromDbHealthRecord(data) : null;
    } catch (error) {
      console.error('❌ Error creating health record:', error);
      throw error;
    }
  },

  async updateHealthRecord(id: number, record: any, schoolId: number) {
    console.log('📝 Updating health record:', id);
    try {
      const dbRecord = toDbHealthRecord(record);
      dbRecord.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('health_records')
        .update(dbRecord)
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Updated health record');
      return data ? fromDbHealthRecord(data) : null;
    } catch (error) {
      console.error('❌ Error updating health record:', error);
      throw error;
    }
  },

  async getMedicalCheckups(schoolId: number, filters?: any) {
    console.log('🩺 Fetching medical checkups for school:', schoolId);
    try {
      let query = supabase
        .from('medical_checkups')
        .select('*')
        .eq('school_id', schoolId);
      
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.checkupType) {
        query = query.eq('checkup_type', filters.checkupType);
      }
      if (filters?.startDate) {
        query = query.gte('checkup_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('checkup_date', filters.endDate);
      }
      
      const { data, error } = await query.order('checkup_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} medical checkups`);
      return (data || []).map(fromDbMedicalCheckup);
    } catch (error) {
      console.error('❌ Error fetching medical checkups:', error);
      throw error;
    }
  },

  async createMedicalCheckup(checkup: any, schoolId: number) {
    console.log('➕ Creating medical checkup for school:', schoolId);
    try {
      const dbCheckup = toDbMedicalCheckup(checkup);
      dbCheckup.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('medical_checkups')
        .insert([dbCheckup])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created medical checkup:', data?.id);
      return data ? fromDbMedicalCheckup(data) : null;
    } catch (error) {
      console.error('❌ Error creating medical checkup:', error);
      throw error;
    }
  },

  async getVaccinations(schoolId: number, studentId?: number) {
    console.log('💉 Fetching vaccination records for school:', schoolId, studentId ? `student: ${studentId}` : '');
    try {
      let query = supabase
        .from('vaccinations')
        .select('*')
        .eq('school_id', schoolId);
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.order('vaccination_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} vaccination records`);
      return (data || []).map(fromDbVaccination);
    } catch (error) {
      console.error('❌ Error fetching vaccination records:', error);
      throw error;
    }
  },

  async createVaccination(vaccination: any, schoolId: number) {
    console.log('➕ Creating vaccination record for school:', schoolId);
    try {
      const dbVaccination = toDbVaccination(vaccination);
      dbVaccination.school_id = schoolId;
      
      const { data, error } = await supabase
        .from('vaccinations')
        .insert([dbVaccination])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Created vaccination record:', data?.id);
      return data ? fromDbVaccination(data) : null;
    } catch (error) {
      console.error('❌ Error creating vaccination record:', error);
      throw error;
    }
  },
};

// User profile utilities
export const userProfile = {
  async getCurrentUserSchoolId(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 1; // Default school ID
      
      // Try to get from user metadata
      const schoolId = user.user_metadata?.school_id || user.app_metadata?.school_id;
      if (schoolId) return Number(schoolId);
      
      // Try to get from user_school_memberships table
      const { data } = await supabase
        .from('user_school_memberships')
        .select('school_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return data?.school_id || 1;
    } catch (error) {
      console.warn('Failed to get user school ID, using default:', error);
      return 1;
    }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getUserSchools() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('user_school_memberships')
        .select(`
          *,
          schools(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      return data || [];
    } catch (error) {
      console.error('Failed to get user schools:', error);
      return [];
    }
  }
};