import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../client/src/lib/supabase-types'

// Lazy initialization of Supabase client
let clientInstance: SupabaseClient<Database> | null = null;

function createFallbackClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: new Error('Supabase connection unavailable') 
      }),
      signOut: () => Promise.resolve({ error: null })
    },
    channel: (name: string) => ({
      on: () => ({ 
        subscribe: () => ({ unsubscribe: () => {} })
      })
    }),
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ 
          data: null, 
          error: new Error('Storage unavailable - Supabase connection failed') 
        }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        download: () => Promise.resolve({
          data: null,
          error: new Error('Storage unavailable - Supabase connection failed')
        }),
        remove: () => Promise.resolve({
          data: null,
          error: new Error('Storage unavailable - Supabase connection failed')
        }),
        list: () => Promise.resolve({
          data: [],
          error: new Error('Storage unavailable - Supabase connection failed')
        })
      }),
      listBuckets: () => Promise.resolve({ 
        data: [], 
        error: new Error('Storage unavailable - Supabase connection failed') 
      })
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: () => ({
          single: () => Promise.resolve({ 
            data: null, 
            error: new Error('Database unavailable - Supabase connection failed') 
          }),
          order: () => ({
            limit: () => Promise.resolve({ 
              data: [], 
              error: new Error('Database unavailable - Supabase connection failed') 
            })
          })
        }),
        order: () => ({
          limit: () => Promise.resolve({ 
            data: [], 
            error: new Error('Database unavailable - Supabase connection failed') 
          })
        }),
        then: () => Promise.resolve({ 
          data: [], 
          error: new Error('Database unavailable - Supabase connection failed') 
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: null, 
            error: new Error('Database unavailable - Supabase connection failed') 
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: null, 
              error: new Error('Database unavailable - Supabase connection failed') 
            })
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => Promise.resolve({ 
          data: null, 
          error: new Error('Database unavailable - Supabase connection failed') 
        })
      })
    })
  };
}

function initializeSupabaseClient() {
  if (clientInstance) return clientInstance;
  
  // Extract Supabase URL and key from environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

  console.log('Loading Supabase with URL:', supabaseUrl ? 'Found' : 'Not found');
  console.log('Loading Supabase with Key:', supabaseAnonKey ? 'Found' : 'Not found');

  // Only create client if both URL and key are available
  if (supabaseUrl && supabaseAnonKey) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'x-client-info': 'school-management-system'
          }
        }
      });
      console.log('✓ Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      clientInstance = createFallbackClient() as SupabaseClient<Database>;
    }
  } else {
    console.warn('Supabase environment variables not found. Using fallback client.');
    clientInstance = createFallbackClient() as SupabaseClient<Database>;
  }
  
  return clientInstance as SupabaseClient<Database>;
}

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    const client = initializeSupabaseClient();
    if (client && prop in client) {
      return (client as any)[prop];
    }
    return undefined;
  }
}) as SupabaseClient<Database>;

// Enhanced features for your school management system
export const supabaseFeatures = {
  // Real-time attendance updates
  subscribeToAttendance: (callback: (payload: any) => void) => {
    return supabase
      .channel('attendance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, callback)
      .subscribe()
  },

  // Real-time notifications for parents and teachers
  subscribeToNotifications: (userId: number, callback: (payload: any) => void) => {
    return supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  // File storage for student documents, photos, certificates
  uploadStudentFile: async (file: File, studentId: string, folder: string = 'documents') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${studentId}/${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('school-files')
      .upload(fileName, file)
    
    if (error) throw error
    return data
  },

  // Get public URL for uploaded files
  getFileUrl: (path: string) => {
    const { data } = supabase.storage
      .from('school-files')
      .getPublicUrl(path)
    return data.publicUrl
  }
}