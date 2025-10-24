/**
 * Permission System for School Management System
 * Based on role-based access control (RBAC)
 */

export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

export const PERMISSIONS = {
  // Gradebook permissions
  VIEW_GRADEBOOK: 'view_gradebook',
  EDIT_GRADES: 'edit_grades',
  DELETE_GRADES: 'delete_grades',
  VIEW_AUDIT_TRAIL: 'view_audit_trail',
  
  // Results permissions
  VIEW_RESULTS: 'view_results',
  EDIT_RESULTS: 'edit_results',
  PUBLISH_RESULTS: 'publish_results',
  VIEW_ALL_RESULTS: 'view_all_results',
  
  // Attendance permissions
  VIEW_ATTENDANCE: 'view_attendance',
  MARK_ATTENDANCE: 'mark_attendance',
  EDIT_ATTENDANCE: 'edit_attendance',
  VIEW_ALL_ATTENDANCE: 'view_all_attendance',
  
  // Assignment permissions
  VIEW_ASSIGNMENTS: 'view_assignments',
  CREATE_ASSIGNMENTS: 'create_assignments',
  EDIT_ASSIGNMENTS: 'edit_assignments',
  DELETE_ASSIGNMENTS: 'delete_assignments',
  GRADE_ASSIGNMENTS: 'grade_assignments',
  SUBMIT_ASSIGNMENTS: 'submit_assignments',
  
  // Timetable permissions
  VIEW_TIMETABLE: 'view_timetable',
  EDIT_TIMETABLE: 'edit_timetable',
  CREATE_SUBSTITUTION: 'create_substitution',
  
  // Student data permissions
  VIEW_OWN_DATA: 'view_own_data',
  VIEW_CHILD_DATA: 'view_child_data',
  
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_SCHOOL_SETTINGS: 'manage_school_settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role-based permission mapping
 * Defines what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS), // All permissions
  
  school_admin: [
    PERMISSIONS.VIEW_GRADEBOOK,
    PERMISSIONS.EDIT_GRADES,
    PERMISSIONS.VIEW_AUDIT_TRAIL,
    PERMISSIONS.VIEW_RESULTS,
    PERMISSIONS.EDIT_RESULTS,
    PERMISSIONS.PUBLISH_RESULTS,
    PERMISSIONS.VIEW_ALL_RESULTS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MARK_ATTENDANCE,
    PERMISSIONS.EDIT_ATTENDANCE,
    PERMISSIONS.VIEW_ALL_ATTENDANCE,
    PERMISSIONS.VIEW_ASSIGNMENTS,
    PERMISSIONS.CREATE_ASSIGNMENTS,
    PERMISSIONS.EDIT_ASSIGNMENTS,
    PERMISSIONS.DELETE_ASSIGNMENTS,
    PERMISSIONS.GRADE_ASSIGNMENTS,
    PERMISSIONS.VIEW_TIMETABLE,
    PERMISSIONS.EDIT_TIMETABLE,
    PERMISSIONS.CREATE_SUBSTITUTION,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SCHOOL_SETTINGS,
  ],
  
  teacher: [
    PERMISSIONS.VIEW_GRADEBOOK,
    PERMISSIONS.EDIT_GRADES, // Only for assigned classes
    PERMISSIONS.VIEW_RESULTS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MARK_ATTENDANCE, // Only for assigned classes
    PERMISSIONS.EDIT_ATTENDANCE, // Only for assigned classes
    PERMISSIONS.VIEW_ASSIGNMENTS,
    PERMISSIONS.CREATE_ASSIGNMENTS, // Only for assigned classes
    PERMISSIONS.EDIT_ASSIGNMENTS, // Only for own assignments
    PERMISSIONS.DELETE_ASSIGNMENTS, // Only for own assignments
    PERMISSIONS.GRADE_ASSIGNMENTS, // Only for assigned classes
    PERMISSIONS.VIEW_TIMETABLE,
  ],
  
  student: [
    PERMISSIONS.VIEW_OWN_DATA,
    PERMISSIONS.VIEW_RESULTS, // Only own results
    PERMISSIONS.VIEW_ASSIGNMENTS, // Only own assignments
    PERMISSIONS.SUBMIT_ASSIGNMENTS,
    PERMISSIONS.VIEW_ATTENDANCE, // Only own attendance
    PERMISSIONS.VIEW_TIMETABLE, // Only own timetable
  ],
  
  parent: [
    PERMISSIONS.VIEW_CHILD_DATA,
    PERMISSIONS.VIEW_RESULTS, // Only child's results
    PERMISSIONS.VIEW_ASSIGNMENTS, // Only child's assignments
    PERMISSIONS.VIEW_ATTENDANCE, // Only child's attendance
    PERMISSIONS.VIEW_TIMETABLE, // Only child's timetable
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get user's role from local storage or context
 * This is a helper function to be used with the actual auth system
 */
export function getCurrentUserRole(): UserRole | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user.role as UserRole || null;
  } catch {
    return null;
  }
}

/**
 * Permission check for UI components
 */
export function canAccess(permission: Permission): boolean {
  const role = getCurrentUserRole();
  if (!role) return false;
  return hasPermission(role, permission);
}
