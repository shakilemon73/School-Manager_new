/**
 * Data Adapter Pattern for Express → Supabase Migration
 * 
 * This adapter allows module-by-module migration with feature flags.
 * Each module can be toggled between Express API and direct Supabase calls.
 */

import { supabase, db } from './supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';

// Normalized response interfaces for consistent data types
interface DashboardStats {
  students: number;
  teachers: number;
  books: number;
  inventory_items: number;
  pending_fees: number;
  total_revenue: number;
  active_notifications: number;
  upcoming_events: number;
}

interface DashboardActivity {
  id: number;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  details?: any;
}

interface RecentDocument {
  id: number;
  name: string;
  type: string;
  category: string;
  created_at: string;
  created_by?: string;
  url?: string;
}

// Feature flags for module-by-module migration
const FEATURE_FLAGS = {
  SUPABASE_DASHBOARD: true, // Force enable for dashboard stats
  SUPABASE_NOTIFICATIONS: true, // Enable for direct Supabase notifications
  SUPABASE_CALENDAR: import.meta.env.VITE_FEATURE_SUPABASE_CALENDAR === 'true',
  SUPABASE_STUDENTS: true, // Enable for direct Supabase students
  SUPABASE_TEACHERS: import.meta.env.VITE_FEATURE_SUPABASE_TEACHERS === 'true',
  SUPABASE_LIBRARY: import.meta.env.VITE_FEATURE_SUPABASE_LIBRARY === 'true',
  SUPABASE_INVENTORY: import.meta.env.VITE_FEATURE_SUPABASE_INVENTORY === 'true',
  SUPABASE_TRANSPORT: import.meta.env.VITE_FEATURE_SUPABASE_TRANSPORT === 'true',
};

// Helper function for legacy API calls
async function legacyApiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Get current school ID from authenticated user context (SECURITY CRITICAL)
async function getCurrentSchoolId(): Promise<number> {
  try {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) {
      throw new Error('User school ID not found - user may not be properly authenticated');
    }
    return schoolId;
  } catch (error) {
    console.error('❌ Failed to get user school ID:', error);
    throw new Error('Authentication required: Cannot determine user school context');
  }
}

/**
 * Dashboard Data Adapter
 */
export const dashboardAdapter = {
  async getStats(): Promise<DashboardStats> {
    if (FEATURE_FLAGS.SUPABASE_DASHBOARD) {
      console.log('🔄 Using Supabase for dashboard stats');
      const schoolId = await getCurrentSchoolId();
      return await db.getDashboardStats(schoolId);
    } else {
      console.log('🔄 Using Express API for dashboard stats');
      return await legacyApiCall('/dashboard/stats');
    }
  },

  async getActivities(): Promise<DashboardActivity[]> {
    if (FEATURE_FLAGS.SUPABASE_DASHBOARD) {
      console.log('🔄 Using Supabase for dashboard activities');
      const schoolId = await getCurrentSchoolId();
      return await db.getDashboardActivities(schoolId);
    } else {
      console.log('🔄 Using Express API for dashboard activities');
      return await legacyApiCall('/dashboard/activities');
    }
  },

  async getRecentDocuments(): Promise<RecentDocument[]> {
    if (FEATURE_FLAGS.SUPABASE_DASHBOARD) {
      console.log('🔄 Using Supabase for recent documents');
      const schoolId = await getCurrentSchoolId();
      return await db.getRecentDocuments(schoolId);
    } else {
      console.log('🔄 Using Express API for recent documents');
      return await legacyApiCall('/dashboard/documents');
    }
  }
};

/**
 * Notifications Data Adapter
 */
export const notificationsAdapter = {
  async getNotifications() {
    if (FEATURE_FLAGS.SUPABASE_NOTIFICATIONS) {
      console.log('🔄 Using Supabase for notifications');
      const schoolId = await getCurrentSchoolId();
      return await db.getNotifications(schoolId);
    } else {
      console.log('🔄 Using Express API for notifications');
      return await legacyApiCall('/notifications');
    }
  },

  async markAsRead(id: number) {
    if (FEATURE_FLAGS.SUPABASE_NOTIFICATIONS) {
      console.log('🔄 Using Supabase to mark notification as read');
      return await db.markNotificationAsRead(id);
    } else {
      console.log('🔄 Using Express API to mark notification as read');
      return await legacyApiCall(`/notifications/${id}/read`, { method: 'PATCH' });
    }
  },

  async sendNotification(notificationData: any) {
    if (FEATURE_FLAGS.SUPABASE_NOTIFICATIONS) {
      console.log('🔄 Using Supabase to send notification');
      const schoolId = await getCurrentSchoolId();
      return await db.sendNotification({
        ...notificationData,
        school_id: schoolId,
        created_at: new Date().toISOString()
      });
    } else {
      console.log('🔄 Using Express API to send notification');
      return await legacyApiCall('/notifications/send', { 
        method: 'POST',
        body: JSON.stringify(notificationData)
      });
    }
  }
};

/**
 * Calendar Data Adapter
 */
export const calendarAdapter = {
  async getEvents() {
    if (FEATURE_FLAGS.SUPABASE_CALENDAR) {
      console.log('🔄 Using Supabase for calendar events');
      const schoolId = await getCurrentSchoolId();
      return await db.getCalendarEvents(schoolId);
    } else {
      console.log('🔄 Using Express API for calendar events');
      return await legacyApiCall('/calendar/events');
    }
  }
};

/**
 * Students Data Adapter
 */
export const studentsAdapter = {
  async getStudents() {
    if (FEATURE_FLAGS.SUPABASE_STUDENTS) {
      console.log('🔄 Using Supabase for students');
      const schoolId = await getCurrentSchoolId();
      return await db.getStudents(schoolId);
    } else {
      console.log('🔄 Using Express API for students');
      return await legacyApiCall('/students');
    }
  },

  async getStudentById(id: number) {
    if (FEATURE_FLAGS.SUPABASE_STUDENTS) {
      console.log('🔄 Using Supabase for student by ID');
      return await db.getStudentById(id);
    } else {
      console.log('🔄 Using Express API for student by ID');
      return await legacyApiCall(`/students/${id}`);
    }
  },

  async createStudent(studentData: any) {
    if (FEATURE_FLAGS.SUPABASE_STUDENTS) {
      console.log('🔄 Using Supabase to create student');
      const schoolId = await getCurrentSchoolId();
      // Ensure school ID is set for tenant scoping
      const studentWithSchool = { ...studentData, school_id: schoolId };
      return await db.createStudent(studentWithSchool);
    } else {
      console.log('🔄 Using Express API to create student');
      return await legacyApiCall('/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });
    }
  },

  async updateStudent(id: number, updates: any) {
    if (FEATURE_FLAGS.SUPABASE_STUDENTS) {
      console.log('🔄 Using Supabase to update student');
      return await db.updateStudent(id, updates);
    } else {
      console.log('🔄 Using Express API to update student');
      return await legacyApiCall(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }
  },

  async deleteStudent(id: number) {
    if (FEATURE_FLAGS.SUPABASE_STUDENTS) {
      console.log('🔄 Using Supabase to delete student');
      return await db.deleteStudent(id);
    } else {
      console.log('🔄 Using Express API to delete student');
      return await legacyApiCall(`/students/${id}`, { method: 'DELETE' });
    }
  }
};

/**
 * Teachers Data Adapter
 */
export const teachersAdapter = {
  async getTeachers() {
    if (FEATURE_FLAGS.SUPABASE_TEACHERS) {
      console.log('🔄 Using Supabase for teachers');
      const schoolId = await getCurrentSchoolId();
      return await db.getTeachers(schoolId);
    } else {
      console.log('🔄 Using Express API for teachers');
      return await legacyApiCall('/teachers');
    }
  }
};

/**
 * Library Data Adapter
 */
export const libraryAdapter = {
  async getBooks() {
    if (FEATURE_FLAGS.SUPABASE_LIBRARY) {
      console.log('🔄 Using Supabase for library books');
      const schoolId = await getCurrentSchoolId();
      return await db.getLibraryBooks(schoolId);
    } else {
      console.log('🔄 Using Express API for library books');
      return await legacyApiCall('/library/books');
    }
  }
};

/**
 * Inventory Data Adapter
 */
export const inventoryAdapter = {
  async getItems() {
    if (FEATURE_FLAGS.SUPABASE_INVENTORY) {
      console.log('🔄 Using Supabase for inventory items');
      const schoolId = await getCurrentSchoolId();
      return await db.getInventoryItems(schoolId);
    } else {
      console.log('🔄 Using Express API for inventory items');
      return await legacyApiCall('/inventory/items');
    }
  }
};

/**
 * Document Templates Data Adapter
 */
export const documentTemplatesAdapter = {
  async getTemplates() {
    if (FEATURE_FLAGS.SUPABASE_DASHBOARD) { // Using dashboard flag for templates
      console.log('🔄 Using Supabase for document templates');
      const schoolId = await getCurrentSchoolId();
      return await db.getDocumentTemplates(schoolId);
    } else {
      console.log('🔄 Using Express API for document templates');
      return await legacyApiCall('/documents/templates');
    }
  }
};

// Export feature flags for debugging
export { FEATURE_FLAGS };

// Helper function to log current feature flag status
export function logFeatureFlags() {
  console.log('🏁 Current Feature Flags:', FEATURE_FLAGS);
}