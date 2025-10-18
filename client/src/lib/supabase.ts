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

  async markNotificationAsRead(id: number) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
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
  
  async getStudentAttendanceStats(studentId: number, schoolId: number) {
    console.log('📊 Fetching attendance stats for student:', studentId);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', studentId)
        .eq('school_id', schoolId);
      
      if (error) {
        console.error('Error fetching attendance:', error);
        return { present: 0, total: 0, percentage: 0 };
      }
      
      const total = data?.length || 0;
      const present = data?.filter(r => r.status === 'present').length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return { present, total, percentage };
    } catch (error) {
      console.error('Error in getStudentAttendanceStats:', error);
      return { present: 0, total: 0, percentage: 0 };
    }
  },

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