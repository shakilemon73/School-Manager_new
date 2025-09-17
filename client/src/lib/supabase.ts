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

// Convert snake_case student object from database to camelCase for UI
function fromDbStudent(dbStudent: Database['public']['Tables']['students']['Row']): any {
  if (!dbStudent) return null;
  
  const camelStudent: any = {};
  
  // Create reverse mapping
  const reverseMapping: { [key: string]: string } = {};
  Object.entries(studentFieldMapping).forEach(([camelKey, dbKey]) => {
    reverseMapping[dbKey] = camelKey;
  });
  
  // Map snake_case fields to camelCase, preserving all fields from database
  Object.entries(dbStudent).forEach(([dbKey, value]) => {
    const camelKey = reverseMapping[dbKey] || dbKey;
    // Preserve all fields including id and created_at for UI display
    camelStudent[camelKey] = value;
  });
  
  return camelStudent;
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
      // Recent student registrations
      supabase
        .from('students')
        .select('id, name, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent notifications
      supabase
        .from('notifications')
        .select('id, title, type, created_at, sender')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent calendar events
      supabase
        .from('calendar_events')
        .select('id, title, type, start_date, created_at')
        .eq('school_id', schoolId)
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

  // Students
  async getStudents(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch students');
    }
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
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

  // Teachers
  async getTeachers(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch teachers');
    }
    const { data, error } = await supabase
      .from('teachers')
      .select('id, teacher_id, name, qualification, subject, date_of_birth, gender, address, phone, email, school_id, status, created_at')
      .eq('school_id', schoolId)
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

  // Library Books
  async getLibraryBooks(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch library books');
    }
    const { data, error } = await supabase
      .from('library_books')
      .select('id, title, title_bn, author, isbn, category, publisher, publish_year, total_copies, available_copies, location, description, school_id, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createLibraryBook(book: Database['public']['Tables']['library_books']['Insert']) {
    const { data, error } = await supabase
      .from('library_books')
      .insert(book)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateLibraryBook(id: number, updates: Database['public']['Tables']['library_books']['Update']) {
    const { data, error } = await supabase
      .from('library_books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Inventory Items
  async getInventoryItems(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch inventory items');
    }
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, name_bn, category, subcategory, brand, model, serial_number, unit_price, current_quantity, minimum_threshold, unit, supplier, location, condition, description, school_id, created_at, updated_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createInventoryItem(item: Database['public']['Tables']['inventory_items']['Insert']) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Calendar Events
  async getCalendarEvents(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch calendar events');
    }
    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, title_bn, description, description_bn, start_date, end_date, start_time, end_time, type, is_active, is_public, location, organizer, school_id, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    
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
    return data;
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
    return data;
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

  // Staff Management (replacing 4 Express routes)
  async getStaff(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch staff');
    }
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createStaff(staff: Database['public']['Tables']['staff']['Insert']) {
    if (!staff.school_id) {
      throw new Error('School ID is required to create staff member');
    }
    const { data, error } = await supabase
      .from('staff')
      .insert(staff)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStaff(id: number, updates: Database['public']['Tables']['staff']['Update']) {
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteStaff(id: number) {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
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
    return data;
  },

  async createParent(parent: Database['public']['Tables']['parents']['Insert']) {
    if (!parent.school_id) {
      throw new Error('School ID is required to create parent');
    }
    const { data, error } = await supabase
      .from('parents')
      .insert(parent)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateParent(id: number, updates: Database['public']['Tables']['parents']['Update']) {
    const { data, error } = await supabase
      .from('parents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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

  async getBorrowedBooks(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch borrowed books');
    }
    const { data, error } = await supabase
      .from('library_borrowed_books')
      .select(`
        *,
        library_books!inner(title, author),
        students!inner(name, student_id)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'borrowed')
      .order('borrowed_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getLibraryStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to get library stats');
    }
    const [totalBooks, borrowedBooks, availableBooks] = await Promise.all([
      supabase.from('library_books').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('library_borrowed_books').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'borrowed'),
      supabase.from('library_books').select('available_copies').eq('school_id', schoolId)
    ]);
    
    return {
      total_books: totalBooks.count || 0,
      borrowed_books: borrowedBooks.count || 0,
      available_books: availableBooks.data?.reduce((sum, book) => sum + (book.available_copies || 0), 0) || 0
    };
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
  async updateInventoryItem(id: number, updates: Database['public']['Tables']['inventory_items']['Update']) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

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

  async createTransportRoute(route: any) {
    const { data, error } = await supabase
      .from('transport_routes')
      .insert(route)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTransportRoute(id: number, updates: any) {
    const { data, error } = await supabase
      .from('transport_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTransportRoute(id: number) {
    const { error } = await supabase
      .from('transport_routes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async createTransportVehicle(vehicle: any) {
    const { data, error } = await supabase
      .from('transport_vehicles')
      .insert(vehicle)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    return data;
  },

  async createTransportAssignment(assignment: any) {
    const { data, error } = await supabase
      .from('transport_student_assignments')
      .insert(assignment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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

  async getExamResults(studentId?: number, examId?: number) {
    let query = supabase.from('exam_results').select(`
      *,
      students!inner(name, student_id),
      exams!inner(name)
    `);
    
    if (studentId) query = query.eq('student_id', studentId);
    if (examId) query = query.eq('exam_id', examId);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createExam(exam: any) {
    const { data, error } = await supabase
      .from('exams')
      .insert(exam)
      .select()
      .single();
    
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

  // User Management (replacing 7 Express routes)
  async getUsers(schoolId?: number) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getUserStats() {
    const [total, active, inactive] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'inactive')
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
    
    if (schoolId) {
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

  async getUserCreditStats(userId: string, schoolId: number = 1) {
    try {
      const { data: transactions, error } = await supabase
        .from('credit_transactions')
        .select('amount, type, created_at')
        .eq('school_instance_id', schoolId);

      if (error) {
        console.warn('Error fetching credit transactions:', error);
        return { currentBalance: 500, totalEarned: 500, totalSpent: 0 };
      }

      const totalEarned = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 500;
      const totalSpent = Math.abs(transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0);
      const currentBalance = totalEarned - totalSpent;

      return {
        currentBalance: Math.max(0, currentBalance),
        totalEarned,
        totalSpent
      };
    } catch (error) {
      console.error('Error getting credit stats:', error);
      return { currentBalance: 500, totalEarned: 500, totalSpent: 0 };
    }
  },

  async getDocumentCosts() {
    // Return static document costs - this could be stored in database if needed
    return {
      'student-id-cards': 1,
      'teacher-id-cards': 1,
      'admit-cards': 1,
      'fee-receipts': 1,
      'marksheets': 2,
      'class-routines': 2,
      'teacher-routines': 2,
      'testimonials': 3,
      'transfer-certificates': 3,
      'result-sheets': 2,
      'default': 1
    };
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

  async generateDocument(documentData: { templateId: number; documentType: string; studentIds: number[]; schoolId?: number }) {
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

      // Check user's available credits
      const creditStats = await this.getUserCreditStats('current_user', schoolId);
      
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

      // Update template usage count
      await supabase
        .from('document_templates')
        .update({ usage_count: supabase.sql`usage_count + 1` })
        .eq('id', documentData.templateId);

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
  }
};

// Helper functions for Bengali translations and metadata
function getBengaliName(type: string): string {
  const names: Record<string, string> = {
    'student-id-cards': 'শিক্ষার্থী আইডি কার্ড',
    'admit-cards': 'এডমিট কার্ড',
    'fee-receipts': 'ফি রসিদ',
    'marksheets': 'মার্কশীট',
    'teacher-id-cards': 'শিক্ষক আইডি কার্ড',
    'class-routines': 'ক্লাস রুটিন',
    'testimonials': 'প্রশংসাপত্র',
    'result-sheets': 'রেজাল্ট শিট',
    'transfer-certificates': 'স্থানান্তর সনদপত্র'
  };
  return names[type] || type;
}

function getBengaliDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'student-id-cards': 'পেশাদার শিক্ষার্থী পরিচয়পত্র তৈরি করুন',
    'admit-cards': 'পরীক্ষার প্রবেশপত্র তৈরি করুন',
    'fee-receipts': 'শিক্ষার্থীদের ফি রসিদ তৈরি করুন',
    'marksheets': 'একাডেমিক মার্কশীট তৈরি করুন',
    'teacher-id-cards': 'পেশাদার শিক্ষক পরিচয়পত্র তৈরি করুন',
    'class-routines': 'ক্লাসের সময়সূচী তৈরি করুন'
  };
  return descriptions[type] || 'ডকুমেন্ট তৈরি করুন';
}

function getDocumentIcon(type: string): string {
  const icons: Record<string, string> = {
    'student-id-cards': '🪪',
    'admit-cards': '🎫',
    'fee-receipts': '🧾',
    'marksheets': '📊',
    'teacher-id-cards': '👨‍🏫',
    'class-routines': '📅'
  };
  return icons[type] || '📄';
}

function getDifficulty(type: string): string {
  const difficulties: Record<string, string> = {
    'student-id-cards': 'easy',
    'admit-cards': 'easy',
    'fee-receipts': 'easy',
    'marksheets': 'medium',
    'teacher-id-cards': 'easy',
    'class-routines': 'medium'
  };
  return difficulties[type] || 'medium';
}

function getEstimatedTime(type: string): string {
  const times: Record<string, string> = {
    'student-id-cards': '২-৩ মিনিট',
    'admit-cards': '১-২ মিনিট',
    'fee-receipts': '১ মিনিট',
    'marksheets': '৩-৫ মিনিট',
    'teacher-id-cards': '২-৩ মিনিট',
    'class-routines': '৫-৭ মিনিট'
  };
  return times[type] || '২-৩ মিনিট';
}