import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config Check:', {
  url: supabaseUrl ? 'Found' : 'Missing',
  key: supabaseAnonKey ? 'Found' : 'Missing'
});

let supabase: ReturnType<typeof createClient<Database>>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', { supabaseUrl, supabaseAnonKey });
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment');
  
  // Create fallback client for development
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => {}, id: 'fallback', callback } } };
      },
      signInWithPassword: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: { message: 'Supabase not configured', name: 'AuthError', status: 500, __isAuthError: true }
      }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) })
  } as any;
  console.warn('Using fallback Supabase client - authentication will not work');
} else {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('✓ Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
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
function toDbStudent(camelCaseStudent: Database['public']['Tables']['students']['Insert'] | Database['public']['Tables']['students']['Update']): Database['public']['Tables']['students']['Insert'] | Database['public']['Tables']['students']['Update'] {
  if (!camelCaseStudent) return null;
  
  const dbStudent: any = {};
  
  // Map camelCase fields to snake_case
  Object.entries(camelCaseStudent).forEach(([camelKey, value]) => {
    const dbKey = studentFieldMapping[camelKey as keyof typeof studentFieldMapping] || camelKey;
    if (value !== undefined && value !== '') {
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
  
  // Map snake_case fields to camelCase
  Object.entries(dbStudent).forEach(([dbKey, value]) => {
    const camelKey = reverseMapping[dbKey] || dbKey;
    camelStudent[camelKey] = value;
  });
  
  return camelStudent;
}

// Direct Database Query Functions (replacing Express API calls)
export const db = {
  // Dashboard Stats
  async getDashboardStats(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required for dashboard stats');
    }
    const [studentsCount, teachersCount, booksCount, inventoryCount, notificationsCount] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId), 
      supabase.from('library_books').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_read', false)
    ]);

    return {
      students: studentsCount.count || 0,
      teachers: teachersCount.count || 0, 
      books: booksCount.count || 0,
      inventory_items: inventoryCount.count || 0,
      pending_fees: 0, // Will implement with fee system
      total_revenue: 0, // Will implement with payment system
      active_notifications: notificationsCount.count || 0,
      upcoming_events: 0 // Will implement with calendar system
    };
  },

  // Students
  async getStudents(schoolId: number) {
    if (!schoolId) {
      throw new Error('School ID is required to fetch students');
    }
    const { data, error } = await supabase
      .from('students')
      .select('id, name, name_in_bangla, student_id, class, section, roll_number, date_of_birth, gender, blood_group, father_name, mother_name, guardian_name, guardian_phone, present_address, phone, email, school_id, status, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert snake_case fields to camelCase for UI
    return data ? data.map(student => fromDbStudent(student)) : [];
  },

  async getStudentById(id: number) {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, name_in_bangla, student_id, class, section, roll_number, date_of_birth, gender, blood_group, father_name, mother_name, guardian_name, guardian_phone, present_address, phone, email, school_id, status, created_at')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Convert snake_case fields to camelCase for UI
    return data ? fromDbStudent(data) : null;
  },

  async createStudent(camelCaseStudent: Database['public']['Tables']['students']['Insert']) {
    if (!camelCaseStudent.school_id) {
      throw new Error('School ID is required to create a student');
    }
    // Convert camelCase fields to snake_case for database
    const dbStudent = toDbStudent(camelCaseStudent);
    
    const { data, error } = await supabase
      .from('students')
      .insert(dbStudent)
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert result back to camelCase for UI
    return data ? fromDbStudent(data) : null;
  },

  async updateStudent(id: number, camelCaseUpdates: Database['public']['Tables']['students']['Update']) {
    // Convert camelCase fields to snake_case for database
    const dbUpdates = toDbStudent(camelCaseUpdates);
    
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

  // Document Templates
  async getDocumentTemplates(schoolId?: number) {
    const { data, error } = await supabase
      .from('document_templates')
      .select('id, name, name_bn, category, type, description, description_bn, is_active, credit_cost, popularity_score, usage_count, created_at, required_credits')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
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

  async updateUserStatus(id: number, status: string) {
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
    } catch (error) {
      return {
        status: 'error',
        database_connection: 'disconnected', 
        error: error.message,
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
    } catch (error) {
      return { status: 'error', message: error.message };
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
  }
};