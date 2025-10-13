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

// Route mutation operations (POST/PUT/DELETE) to Supabase db methods
async function routeSupabaseMutation(method: string, path: string, body: any): Promise<any> {
  const { db: supabaseDb, userProfile } = await import('./supabase');
  
  // Get schoolId from user or body
  let schoolId = body?.schoolId || body?.school_id;
  if (!schoolId) {
    try {
      schoolId = await userProfile.getCurrentUserSchoolId();
    } catch (e) {
      schoolId = 1;
    }
  }
  
  const pathParts = path.split('/').filter(p => p);
  const lastPart = pathParts[pathParts.length - 1];
  const resourceId = (pathParts.length > 2 && !isNaN(Number(lastPart))) ? parseInt(lastPart) : null;
  
  try {
    switch (true) {
      // Students
      case method === 'POST' && path === '/api/students':
        return await supabaseDb.createStudent({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/students/') && resourceId !== null:
        return await supabaseDb.updateStudent(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/students/') && resourceId !== null:
        return await supabaseDb.deleteStudent(resourceId);
        
      // Teachers
      case method === 'POST' && path === '/api/teachers':
        return await supabaseDb.createTeacher({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/teachers/') && resourceId !== null:
        return await supabaseDb.updateTeacher(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/teachers/') && resourceId !== null:
        return await supabaseDb.deleteTeacher(resourceId);
        
      // Staff
      case method === 'POST' && path === '/api/staff':
        return await supabaseDb.createStaff({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/staff/') && resourceId !== null:
        return await supabaseDb.updateStaff(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/staff/') && resourceId !== null:
        return await supabaseDb.deleteStaff(resourceId);
        
      // Parents
      case method === 'POST' && path === '/api/parents':
        return await supabaseDb.createParent({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/parents/') && resourceId !== null:
        return await supabaseDb.updateParent(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/parents/') && resourceId !== null:
        return await supabaseDb.deleteParent(resourceId);
        
      // Library
      case method === 'POST' && path === '/api/library/books':
        return await supabaseDb.createLibraryBook({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/library/books/') && resourceId !== null:
        return await supabaseDb.updateLibraryBook(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/library/books/') && resourceId !== null:
        return await supabaseDb.deleteLibraryBook(resourceId);
        
      // Inventory
      case method === 'POST' && path === '/api/inventory/items':
        return await supabaseDb.createInventoryItem({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/inventory/items/') && resourceId !== null:
        return await supabaseDb.updateInventoryItem(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/inventory/items/') && resourceId !== null:
        return await supabaseDb.deleteInventoryItem(resourceId);
      case method === 'POST' && path === '/api/inventory/movements':
        return await supabaseDb.createInventoryMovement({ ...body, school_id: schoolId });
        
      // Calendar Events
      case method === 'POST' && path === '/api/calendar/events':
        return await supabaseDb.createCalendarEvent({ ...body, school_id: schoolId });
        
      // Document Templates
      case method === 'POST' && path === '/api/document-templates':
      case method === 'POST' && path === '/api/documents/templates':
        return await supabaseDb.createDocumentTemplate({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/document-templates/') && resourceId !== null:
      case method === 'PUT' && path.startsWith('/api/documents/templates/') && resourceId !== null:
        return await supabaseDb.updateDocumentTemplate(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/document-templates/') && resourceId !== null:
      case method === 'DELETE' && path.startsWith('/api/documents/templates/') && resourceId !== null:
        return await supabaseDb.deleteDocumentTemplate(resourceId);
        
      // Transport
      case method === 'POST' && path === '/api/transport/routes':
        return await supabaseDb.createTransportRoute({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/routes/') && resourceId !== null:
        return await supabaseDb.updateTransportRoute(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/routes/') && resourceId !== null:
        return await supabaseDb.deleteTransportRoute(resourceId);
      case method === 'POST' && path === '/api/transport/vehicles':
        return await supabaseDb.createTransportVehicle({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/vehicles/') && resourceId !== null:
        return await supabaseDb.updateTransportVehicle(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/vehicles/') && resourceId !== null:
        return await supabaseDb.deleteTransportVehicle(resourceId);
      case method === 'POST' && path === '/api/transport/assignments':
        return await supabaseDb.createTransportAssignment({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/assignments/') && resourceId !== null:
        return await supabaseDb.updateTransportAssignment(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/assignments/') && resourceId !== null:
        return await supabaseDb.deleteTransportAssignment(resourceId);
        
      // Admit Cards
      case method === 'POST' && path === '/api/admit-cards/templates':
        return await supabaseDb.createAdmitCardTemplate({ ...body, schoolId });
        
      // Financial
      case method === 'POST' && path === '/api/financial/transactions':
        return await supabaseDb.createFinancialTransaction({ ...body, school_id: schoolId });
      case method === 'POST' && path === '/api/fee-receipts':
        return await supabaseDb.createFeeReceipt(body, body.feeItems || []);
      case method === 'PUT' && path.startsWith('/api/fee-receipts/') && resourceId !== null:
        return await supabaseDb.updateFeeReceipt(resourceId, body);
      case method === 'DELETE' && path.startsWith('/api/fee-receipts/') && resourceId !== null:
        return await supabaseDb.deleteFeeReceipt(resourceId);
        
      // Meetings
      case method === 'POST' && path === '/api/meetings':
        return await supabaseDb.createMeeting({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/meetings/') && resourceId !== null && path.includes('/status'):
        return await supabaseDb.updateMeetingStatus(resourceId, body.status);
        
      // Users
      case method === 'POST' && path === '/api/users':
        return await supabaseDb.createUser({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/users/') && resourceId !== null && path.includes('/status'):
        return await supabaseDb.updateUserStatus(resourceId, body.status);
      case method === 'DELETE' && path.startsWith('/api/users/') && resourceId !== null:
        return await supabaseDb.deleteUser(resourceId);
        
      // School Settings
      case method === 'PUT' && path === '/api/school-settings':
        return await supabaseDb.updateSchoolSettings(schoolId, body);
      case method === 'POST' && path === '/api/schools':
        return await supabaseDb.createSchool(body);
      case method === 'PUT' && path.startsWith('/api/schools/') && resourceId !== null && path.includes('/supabase-config'):
        return await supabaseDb.updateSchoolSupabaseConfig(resourceId, body);
        
      // File Operations
      case method === 'DELETE' && path.startsWith('/api/files/'):
        const filePath = pathParts.slice(2).join('/');
        return await supabaseDb.deleteFile(filePath);
        
      default:
        console.warn(`⚠️ Supabase mutation not implemented for ${method} ${path}, falling back to HTTP`);
        return null; // Return null to trigger HTTP fallback
    }
  } catch (error) {
    console.error(`❌ Supabase mutation failed for ${method} ${path}:`, error);
    throw error;
  }
}

export async function apiRequest(
  url: string,
  requestOptions?: {
    method?: string;
    body?: any;
  }
): Promise<Response> {
  const method = requestOptions?.method || 'GET';
  const body = requestOptions?.body;
  
  // Try Supabase mutation routing first for POST/PUT/DELETE
  if (method !== 'GET' && url.startsWith('/api/')) {
    try {
      const result = await routeSupabaseMutation(method, url, body);
      
      // If we got a result from Supabase, return it as a Response-like object
      if (result !== null) {
        return {
          ok: true,
          status: 200,
          json: async () => result,
          text: async () => JSON.stringify(result),
        } as Response;
      }
    } catch (error) {
      // If Supabase mutation fails, log and fall through to HTTP
      console.error('Supabase mutation error, falling back to HTTP:', error);
    }
  }
  
  // Fallback to HTTP request (for non-Supabase routes or if Supabase fails)
  const { data: { session } } = await supabase.auth.getSession();
  
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (session?.access_token) {
    baseHeaders.Authorization = `Bearer ${session.access_token}`;
  }

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
  const { db: supabaseDb, userProfile } = await import('./supabase');
  
  // Extract schoolId from queryKey - try multiple locations
  let schoolId: number = 1; // default
  
  // Try to get schoolId from queryKey
  if (queryKey[1]) {
    if (typeof queryKey[1] === 'object' && queryKey[1].schoolId) {
      schoolId = queryKey[1].schoolId;
    } else if (typeof queryKey[1] === 'number') {
      schoolId = queryKey[1];
    }
  }
  
  // If no schoolId in queryKey, try to get from current user
  if (!schoolId || schoolId === 1) {
    try {
      schoolId = await userProfile.getCurrentUserSchoolId();
    } catch (e) {
      console.warn('Could not get user school ID, using default:', schoolId);
    }
  }
  
  try {
    // Parse path parameters
    const pathParts = path.split('/').filter(p => p);
    const resourceId = pathParts.length > 2 ? parseInt(pathParts[pathParts.length - 1]) : null;
    
    switch (true) {
      // Dashboard
      case path === '/api/dashboard/stats':
        return await supabaseDb.getDashboardStats(schoolId);
      case path === '/api/dashboard/activities':
        return await supabaseDb.getDashboardActivities(schoolId);
      case path === '/api/dashboard/recent-documents':
        return await supabaseDb.getRecentDocuments(schoolId);
        
      // Students
      case path === '/api/students':
        return await supabaseDb.getStudents(schoolId);
      case path.startsWith('/api/students/') && resourceId !== null:
        return await supabaseDb.getStudentById(resourceId);
        
      // Teachers
      case path === '/api/teachers':
        return await supabaseDb.getTeachers(schoolId);
      case path === '/api/teachers/stats':
        return await supabaseDb.getTeacherStats(schoolId);
      case path.startsWith('/api/teachers/') && resourceId !== null:
        return await supabaseDb.getTeacherById(resourceId);
        
      // Staff
      case path === '/api/staff':
        return await supabaseDb.getStaff(schoolId);
        
      // Parents
      case path === '/api/parents':
        return await supabaseDb.getParents(schoolId);
      case path === '/api/parent/children':
        // For parent portal - get children for current parent
        return await supabaseDb.getStudents(schoolId); // TODO: Filter by parent
      case path.startsWith('/api/parent/progress'):
        return []; // TODO: Implement progress data
      case path === '/api/parent/notifications':
        return await supabaseDb.getNotifications(schoolId);
        
      // Library
      case path === '/api/library/books':
        return await supabaseDb.getLibraryBooks(schoolId);
      case path === '/api/library/borrowed':
        return await supabaseDb.getBorrowedBooks(schoolId);
      case path === '/api/library/stats':
        return await supabaseDb.getLibraryStats(schoolId);
        
      // Inventory
      case path === '/api/inventory/items':
        return await supabaseDb.getInventoryItems(schoolId);
      case path === '/api/inventory/movements':
        return await supabaseDb.getInventoryMovements(schoolId);
      case path === '/api/inventory/stats':
        return await supabaseDb.getInventoryStats(schoolId);
        
      // Notifications
      case path === '/api/notifications':
        return await supabaseDb.getNotifications(schoolId);
      case path === '/api/notifications/unread-count':
        return await supabaseDb.getUnreadNotificationsCount(schoolId);
        
      // Calendar & Events
      case path === '/api/calendar/events':
        return await supabaseDb.getCalendarEvents(schoolId);
        
      // Documents & Templates
      case path === '/api/documents/templates':
      case path === '/api/document-templates':
        const category = queryKey[1]?.category;
        return await supabaseDb.getDocumentTemplates(schoolId, category);
      case path.startsWith('/api/documents/templates/') && resourceId !== null:
      case path.startsWith('/api/document-templates/') && resourceId !== null:
        return await supabaseDb.getDocumentTemplateById(resourceId);
        
      // Transport
      case path === '/api/transport/routes':
        return await supabaseDb.getTransportRoutes(schoolId);
      case path === '/api/transport/vehicles':
        return await supabaseDb.getTransportVehicles(schoolId);
      case path === '/api/transport/assignments':
        return await supabaseDb.getTransportAssignments(schoolId);
      case path === '/api/transport/stats':
        return await supabaseDb.getTransportStats(schoolId);
      case path === '/api/transport/routes/public':
        return await supabaseDb.getPublicTransportRoutes();
        
      // Academic
      case path === '/api/academic-years':
        return await supabaseDb.getAcademicYears(schoolId);
      case path === '/api/academic-years/current':
        return await supabaseDb.getCurrentAcademicYear(schoolId);
      case path === '/api/exams':
        return await supabaseDb.getExams(schoolId);
      case path.startsWith('/api/exams/') && resourceId !== null:
        return await supabaseDb.getExamSchedules(resourceId);
      case path === '/api/class-routines':
        return await supabaseDb.getClassRoutines(schoolId);
        
      // Admit Cards
      case path === '/api/admit-cards':
        return await supabaseDb.getAdmitCards(schoolId);
      case path === '/api/admit-cards/templates':
        return await supabaseDb.getAdmitCardTemplates(schoolId);
      case path === '/api/admit-cards/stats':
        return await supabaseDb.getAdmitCardStats(schoolId);
      case path === '/api/admit-cards/history':
        return await supabaseDb.getAdmitCardHistory(schoolId);
        
      // ID Cards
      case path === '/api/id-cards/stats':
        return await supabaseDb.getIdCardStats(schoolId);
      case path === '/api/id-cards/recent':
        const limit = queryKey[1]?.limit || 10;
        return await supabaseDb.getRecentIdCards(schoolId, limit);
        
      // Financial
      case path === '/api/financial/transactions':
        return await supabaseDb.getFinancialTransactions(schoolId);
      case path === '/api/financial/stats':
        return await supabaseDb.getFinancialStats(schoolId);
      case path === '/api/fee-receipts':
        return await supabaseDb.getFeeReceipts(schoolId);
      case path.startsWith('/api/fee-receipts/') && resourceId !== null:
        return await supabaseDb.getFeeReceiptById(resourceId);
      case path.startsWith('/api/fee-items'):
        const receiptId = queryKey[1]?.receiptId;
        return await supabaseDb.getFeeItems(receiptId);
        
      // Meetings
      case path === '/api/meetings':
        return await supabaseDb.getMeetings(schoolId);
      case path === '/api/meetings/stats':
        return await supabaseDb.getMeetingStats(schoolId);
        
      // Users & Admin
      case path === '/api/users':
        return await supabaseDb.getUsers(schoolId);
      case path === '/api/users/stats':
        return await supabaseDb.getUserStats();
      case path === '/api/school-settings':
        return await supabaseDb.getSchoolSettings(schoolId);
      case path === '/api/admin/stats':
        return await supabaseDb.getAdminStats(schoolId);
      case path === '/api/admin/overview':
        return await supabaseDb.getAdminOverview();
      case path === '/api/system-health':
        return await supabaseDb.getSystemHealthStatus();
        
      // Schools
      case path === '/api/schools':
        return await supabaseDb.getSchools();
      case path.startsWith('/api/schools/') && resourceId !== null:
        return await supabaseDb.getSchoolById(resourceId);
      case path.startsWith('/api/schools/') && path.includes('/supabase-config'):
        const configSchoolId = parseInt(pathParts[2]);
        return await supabaseDb.getSchoolSupabaseConfig(configSchoolId);
        
      // Student Files
      case path.startsWith('/api/students/') && path.includes('/files'):
        const studentFileId = pathParts[2];
        return await supabaseDb.getStudentFiles(studentFileId);
        
      // Fallback for routes not yet implemented
      default:
        console.warn(`⚠️ Supabase route not implemented: ${path}, falling back to HTTP`);
        return await makeHttpRequest(path);
    }
  } catch (error) {
    console.error(`❌ Supabase call failed for ${path}:`, error);
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
