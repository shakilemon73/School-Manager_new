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

// Direct Database Query Functions (replacing Express API calls)
export const db = {
  // Dashboard Stats
  async getDashboardStats(schoolId: number = 1) {
    const [studentsCount, teachersCount, booksCount, inventoryCount, notificationsCount] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId), 
      supabase.from('library_books').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_read', false)
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
  async getStudents(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getStudentById(id: number) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createStudent(student: Database['public']['Tables']['students']['Insert']) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStudent(id: number, updates: Database['public']['Tables']['students']['Update']) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
  async getTeachers(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getTeacherById(id: number) {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
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
  async getLibraryBooks(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('library_books')
      .select('*')
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
  async getInventoryItems(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
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
  async getCalendarEvents(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
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
  async getNotifications(schoolId: number = 1, userId?: number) {
    let query = supabase
      .from('notifications')
      .select('*')
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
  async getDocumentTemplates(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Transport
  async getTransportRoutes(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('transport_routes')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getTransportVehicles(schoolId: number = 1) {
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
  async getAcademicYears(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getCurrentAcademicYear(schoolId: number = 1) {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single();
    
    if (error) throw error;
    return data;
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