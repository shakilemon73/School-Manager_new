import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        // Try to parse JSON error message
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch (textError) {
      console.warn('Failed to read error response body:', textError);
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  url: string,
  requestOptions?: {
    method?: string;
    body?: any;
  }
): Promise<Response> {
  // Get current Supabase session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add Supabase authorization header if session exists
  if (session?.access_token) {
    baseHeaders.Authorization = `Bearer ${session.access_token}`;
  }

  const method = requestOptions?.method || 'GET';
  const body = requestOptions?.body;

  const fetchOptions: RequestInit = {
    method,
    credentials: "include",
    headers: baseHeaders,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const queryPath = queryKey[0] as string;
      
      // Route Supabase-direct calls (no HTTP requests needed!)
      if (queryPath.startsWith('/api/')) {
        return await routeSupabaseCall(queryPath, queryKey);
      }
      
      // Legacy HTTP calls (fallback for remaining endpoints)
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(queryPath, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      return data;
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('401'))) {
        console.error(`API Error for ${queryKey[0]}:`, error);
      }
      throw error;
    }
  };

// Route API calls to direct Supabase functions (no Express server needed!)
async function routeSupabaseCall(path: string, queryKey: readonly any[]): Promise<any> {
  const { db: supabaseDb } = await import('./supabase');
  
  // Extract schoolId from queryKey if available
  const schoolId = queryKey[1]?.schoolId || 1;
  
  try {
    switch (true) {
      case path === '/api/dashboard/stats':
        return await supabaseDb.getDashboardStats(schoolId);
        
      case path === '/api/students':
        return await supabaseDb.getStudents(schoolId);
        
      case path === '/api/teachers':
        return await supabaseDb.getTeachers(schoolId);
        
      case path === '/api/library/books':
        return await supabaseDb.getLibraryBooks(schoolId);
        
      case path === '/api/inventory/items':
        return await supabaseDb.getInventoryItems(schoolId);
        
      case path === '/api/notifications':
        return await supabaseDb.getNotifications(schoolId);
        
      case path === '/api/calendar/events':
        return await supabaseDb.getCalendarEvents(schoolId);
        
      case path.startsWith('/api/students/'):
        const studentId = parseInt(path.split('/')[3]);
        return await supabaseDb.getStudentById(studentId);
        
      case path.startsWith('/api/teachers/'):
        const teacherId = parseInt(path.split('/')[3]);
        return await supabaseDb.getTeacherById(teacherId);
        
      // Fallback for routes not yet implemented
      default:
        console.warn(`Supabase route not implemented: ${path}, falling back to HTTP`);
        return await makeHttpRequest(path);
    }
  } catch (error) {
    console.error(`Supabase call failed for ${path}:`, error);
    throw error;
  }
}

// Fallback HTTP request for routes not yet migrated to Supabase
async function makeHttpRequest(path: string): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  const res = await fetch(path, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return await res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
