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
  
  // Remove query string from path first
  const cleanPath = path.split('?')[0];
  const pathParts = cleanPath.split('/').filter(p => p);
  const resourceId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
  
  // Helper to parse resourceId - returns number if numeric, string otherwise (for UUIDs, etc.)
  const parseResourceId = (id: string | null): number | string | null => {
    if (!id || id.trim() === '') return null;
    const num = Number(id);
    // Return number if it's a valid numeric ID, otherwise keep as string (for UUIDs, file paths, etc.)
    return !isNaN(num) && !id.includes('-') && !id.includes('/') ? num : id;
  };
  
  try {
    switch (true) {
      // Students - POST exact, then SPECIFIC nested routes, then GENERIC
      case method === 'POST' && path === '/api/students':
        return await supabaseDb.createStudent({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/students/'):
        const updateStudentId = parseResourceId(resourceId);
        if (!updateStudentId) return null;
        return await supabaseDb.updateStudent(updateStudentId as number, body);
      case method === 'DELETE' && path.startsWith('/api/students/'):
        const deleteStudentId = parseResourceId(resourceId);
        if (!deleteStudentId) return null;
        return await supabaseDb.deleteStudent(deleteStudentId as number);
        
      // Teachers
      case method === 'POST' && path === '/api/teachers':
        return await supabaseDb.createTeacher({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/teachers/'):
        const updateTeacherId = parseResourceId(resourceId) as number;
        if (!updateTeacherId) return null;
        return await supabaseDb.updateTeacher(updateTeacherId, body);
      case method === 'DELETE' && path.startsWith('/api/teachers/'):
        const deleteTeacherId = parseResourceId(resourceId) as number;
        if (!deleteTeacherId) return null;
        return await supabaseDb.deleteTeacher(deleteTeacherId);
        
      // Staff
      case method === 'POST' && path === '/api/staff':
        return await supabaseDb.createStaff({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/staff/'):
        const updateStaffId = parseResourceId(resourceId) as number;
        if (!updateStaffId) return null;
        return await supabaseDb.updateStaff(updateStaffId, body);
      case method === 'DELETE' && path.startsWith('/api/staff/'):
        const deleteStaffId = parseResourceId(resourceId) as number;
        if (!deleteStaffId) return null;
        return await supabaseDb.deleteStaff(deleteStaffId);
        
      // Parents
      case method === 'POST' && path === '/api/parents':
        return await supabaseDb.createParent({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/parents/'):
        const updateParentId = parseResourceId(resourceId) as number;
        if (!updateParentId) return null;
        return await supabaseDb.updateParent(updateParentId, body);
      case method === 'DELETE' && path.startsWith('/api/parents/'):
        const deleteParentId = parseResourceId(resourceId) as number;
        if (!deleteParentId) return null;
        return await supabaseDb.deleteParent(deleteParentId);
        
      // Library
      case method === 'POST' && path === '/api/library/books':
        return await supabaseDb.createLibraryBook({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/library/books/'):
        const updateLibraryId = parseResourceId(resourceId) as number;
        if (!updateLibraryId) return null;
        return await supabaseDb.updateLibraryBook(updateLibraryId, body);
      case method === 'DELETE' && path.startsWith('/api/library/books/'):
        const deleteLibraryId = parseResourceId(resourceId) as number;
        if (!deleteLibraryId) return null;
        return await supabaseDb.deleteLibraryBook(deleteLibraryId);
        
      // Inventory
      case method === 'POST' && path === '/api/inventory/items':
        return await supabaseDb.createInventoryItem({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/inventory/items/'):
        const updateInventoryId = parseResourceId(resourceId) as number;
        if (!updateInventoryId) return null;
        return await supabaseDb.updateInventoryItem(updateInventoryId, body);
      case method === 'DELETE' && path.startsWith('/api/inventory/items/'):
        const deleteInventoryId = parseResourceId(resourceId) as number;
        if (!deleteInventoryId) return null;
        return await supabaseDb.deleteInventoryItem(deleteInventoryId);
      case method === 'POST' && path === '/api/inventory/movements':
        return await supabaseDb.createInventoryMovement({ ...body, school_id: schoolId });
        
      // Calendar Events
      case method === 'POST' && path === '/api/calendar/events':
        return await supabaseDb.createCalendarEvent({ ...body, school_id: schoolId });
        
      // Document Templates
      case method === 'POST' && path === '/api/document-templates':
      case method === 'POST' && path === '/api/documents/templates':
        return await supabaseDb.createDocumentTemplate({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/document-templates/'):
      case method === 'PUT' && path.startsWith('/api/documents/templates/'):
        const updateTemplateId = parseResourceId(resourceId) as number;
        if (!updateTemplateId) return null;
        return await supabaseDb.updateDocumentTemplate(updateTemplateId, body);
      case method === 'DELETE' && path.startsWith('/api/document-templates/'):
      case method === 'DELETE' && path.startsWith('/api/documents/templates/'):
        const deleteTemplateId = parseResourceId(resourceId) as number;
        if (!deleteTemplateId) return null;
        return await supabaseDb.deleteDocumentTemplate(deleteTemplateId);
        
      // Transport
      case method === 'POST' && path === '/api/transport/routes':
        return await supabaseDb.createTransportRoute({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/routes/'):
        const updateRouteId = parseResourceId(resourceId) as number;
        if (!updateRouteId) return null;
        return await supabaseDb.updateTransportRoute(updateRouteId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/routes/'):
        const deleteRouteId = parseResourceId(resourceId) as number;
        if (!deleteRouteId) return null;
        return await supabaseDb.deleteTransportRoute(deleteRouteId);
      case method === 'POST' && path === '/api/transport/vehicles':
        return await supabaseDb.createTransportVehicle({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/vehicles/'):
        const updateVehicleId = parseResourceId(resourceId) as number;
        if (!updateVehicleId) return null;
        return await supabaseDb.updateTransportVehicle(updateVehicleId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/vehicles/'):
        const deleteVehicleId = parseResourceId(resourceId) as number;
        if (!deleteVehicleId) return null;
        return await supabaseDb.deleteTransportVehicle(deleteVehicleId);
      case method === 'POST' && path === '/api/transport/assignments':
        return await supabaseDb.createTransportAssignment({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/transport/assignments/'):
        const updateAssignmentId = parseResourceId(resourceId) as number;
        if (!updateAssignmentId) return null;
        return await supabaseDb.updateTransportAssignment(updateAssignmentId, body);
      case method === 'DELETE' && path.startsWith('/api/transport/assignments/'):
        const deleteAssignmentId = parseResourceId(resourceId) as number;
        if (!deleteAssignmentId) return null;
        return await supabaseDb.deleteTransportAssignment(deleteAssignmentId);
        
      // Admit Cards
      case method === 'POST' && path === '/api/admit-cards/templates':
        return await supabaseDb.createAdmitCardTemplate({ ...body, schoolId });
        
      // Financial
      case method === 'POST' && path === '/api/financial/transactions':
        return await supabaseDb.createFinancialTransaction({ ...body, school_id: schoolId });
      case method === 'POST' && path === '/api/fee-receipts':
        return await supabaseDb.createFeeReceipt(body, body.feeItems || []);
      case method === 'PUT' && path.startsWith('/api/fee-receipts/'):
        const updateFeeReceiptId = parseResourceId(resourceId) as number;
        if (!updateFeeReceiptId) return null;
        return await supabaseDb.updateFeeReceipt(updateFeeReceiptId, body);
      case method === 'DELETE' && path.startsWith('/api/fee-receipts/'):
        const deleteFeeReceiptId = parseResourceId(resourceId) as number;
        if (!deleteFeeReceiptId) return null;
        return await supabaseDb.deleteFeeReceipt(deleteFeeReceiptId);
        
      // Meetings
      case method === 'POST' && path === '/api/meetings':
        return await supabaseDb.createMeeting({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/meetings/') && path.includes('/status'):
        const meetingStatusId = parseResourceId(pathParts[2]) as number;
        if (!meetingStatusId) return null;
        return await supabaseDb.updateMeetingStatus(meetingStatusId, body.status);
        
      // Exams
      case method === 'POST' && path === '/api/exams':
        return await supabaseDb.createExam({ ...body, school_id: schoolId });
      case method === 'PUT' && path.startsWith('/api/exams/'):
        const updateExamId = parseResourceId(resourceId) as number;
        if (!updateExamId) return null;
        return await supabaseDb.updateExam(updateExamId, body);
      case method === 'DELETE' && path.startsWith('/api/exams/'):
        const deleteExamId = parseResourceId(resourceId) as number;
        if (!deleteExamId) return null;
        return await supabaseDb.deleteExam(deleteExamId);
        
      // Users
      case method === 'POST' && path === '/api/users':
        return await supabaseDb.createUser({ ...body, schoolId });
      case method === 'PUT' && path.startsWith('/api/users/') && path.includes('/status'):
        // User ID can be numeric or string (UUID)
        const userStatusId = parseResourceId(pathParts[2]);
        if (!userStatusId) return null;
        return await supabaseDb.updateUserStatus(userStatusId, body.status);
      case method === 'DELETE' && path.startsWith('/api/users/'):
        const deleteUserId = parseResourceId(resourceId) as number;
        if (!deleteUserId) return null;
        return await supabaseDb.deleteUser(deleteUserId);
        
      // School Settings - SPECIFIC nested routes FIRST (using path.includes), then GENERIC
      case method === 'PUT' && path === '/api/school-settings':
        return await supabaseDb.updateSchoolSettings(schoolId, body);
      case method === 'POST' && path === '/api/schools':
        return await supabaseDb.createSchool(body);
      case method === 'PUT' && path.startsWith('/api/schools/') && path.includes('/supabase-config'):
        const configSchoolId = parseResourceId(pathParts[2]) as number;
        if (!configSchoolId) return null;
        return await supabaseDb.updateSchoolSupabaseConfig(configSchoolId, body);
        
      // File Operations (file paths are strings, not numbers)
      case method === 'DELETE' && path.startsWith('/api/files/'):
        const filePath = pathParts.slice(2).join('/');
        if (!filePath) return null;
        return await supabaseDb.deleteFile(filePath);
        
      default:
        console.warn(`⚠️ [HTTP FALLBACK] Supabase mutation not implemented for ${method} ${path}`, {
          method,
          path,
          hasResourceId: !!resourceId,
          resourceId: resourceId || 'none',
          timestamp: new Date().toISOString()
        });
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
    // Remove query string from path first
    const cleanPath = path.split('?')[0];
    const pathParts = cleanPath.split('/').filter(p => p);
    const resourceId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
    
    // Helper to convert resourceId to number if it's numeric, otherwise keep as string
    const parseResourceId = (id: string | null): number | string | null => {
      if (!id) return null;
      const num = Number(id);
      return !isNaN(num) && id.trim() !== '' ? num : id;
    };
    
    switch (true) {
      // Dashboard
      case path === '/api/dashboard/stats':
        return await supabaseDb.getDashboardStats(schoolId);
      case path === '/api/dashboard/activities':
        return await supabaseDb.getDashboardActivities(schoolId);
      case path === '/api/dashboard/recent-documents':
        return await supabaseDb.getRecentDocuments(schoolId);
        
      // Students - SPECIFIC routes FIRST, then generic
      case path === '/api/students':
        return await supabaseDb.getStudents(schoolId);
      case path.startsWith('/api/students/') && path.includes('/files'):
        const fileStudentId = parseResourceId(pathParts[2]);
        return await supabaseDb.getStudentFiles(fileStudentId);
      case path.startsWith('/api/students/') && resourceId:
        return await supabaseDb.getStudentById(parseResourceId(resourceId));
        
      // Teachers - SPECIFIC routes FIRST, then generic
      case path === '/api/teachers':
        return await supabaseDb.getTeachers(schoolId);
      case path === '/api/teachers/stats':
        return await supabaseDb.getTeacherStats(schoolId);
      case path.startsWith('/api/teachers/') && resourceId:
        return await supabaseDb.getTeacherById(parseResourceId(resourceId));
        
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
      case path.startsWith('/api/documents/templates/') && resourceId:
      case path.startsWith('/api/document-templates/') && resourceId:
        return await supabaseDb.getDocumentTemplateById(parseResourceId(resourceId));
        
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
      case path.startsWith('/api/exams/') && resourceId:
        return await supabaseDb.getExamSchedules(parseResourceId(resourceId));
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
      case path.startsWith('/api/fee-receipts/') && resourceId:
        return await supabaseDb.getFeeReceiptById(parseResourceId(resourceId));
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
        
      // Schools - SPECIFIC routes FIRST, then generic
      case path === '/api/schools':
        return await supabaseDb.getSchools();
      case path.startsWith('/api/schools/') && path.includes('/supabase-config'):
        const configSchoolId = parseResourceId(pathParts[2]) as number;
        return await supabaseDb.getSchoolSupabaseConfig(configSchoolId);
      case path.startsWith('/api/schools/') && resourceId:
        return await supabaseDb.getSchoolById(parseResourceId(resourceId));
        
      // Fallback for routes not yet implemented
      default:
        console.warn(`⚠️ [HTTP FALLBACK] Supabase route not implemented: ${path}`, {
          path,
          hasResourceId: !!resourceId,
          resourceId: resourceId || 'none',
          schoolId,
          timestamp: new Date().toISOString()
        });
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
