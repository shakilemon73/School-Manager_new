/**
 * Permission System for School Management System
 * Based on role-based access control (RBAC) with contextual checks
 * 
 * SECURITY NOTE: This is client-side permission checking for UI rendering only.
 * ALL mutations MUST be validated server-side with Supabase RLS policies.
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
 * Context for permission checking
 * Used to verify teacher assignments to specific classes/subjects
 */
export interface PermissionContext {
  classId?: number;
  subjectId?: number;
  studentId?: number;
  teacherId?: string;
  teacherClassSubjects?: Array<{
    teacherId: string;
    classId: number;
    subjectId: number;
  }>;
}

/**
 * Role-based permission mapping
 * Defines base permissions for each role (without context)
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
    PERMISSIONS.EDIT_GRADES, // Requires context: only assigned classes
    PERMISSIONS.VIEW_RESULTS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MARK_ATTENDANCE, // Requires context: only assigned classes
    PERMISSIONS.EDIT_ATTENDANCE, // Requires context: only assigned classes
    PERMISSIONS.VIEW_ASSIGNMENTS,
    PERMISSIONS.CREATE_ASSIGNMENTS, // Requires context: only assigned classes
    PERMISSIONS.EDIT_ASSIGNMENTS, // Requires context: only own assignments
    PERMISSIONS.DELETE_ASSIGNMENTS, // Requires context: only own assignments
    PERMISSIONS.GRADE_ASSIGNMENTS, // Requires context: only assigned classes
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
 * Check if a role has a specific base permission
 * NOTE: This does NOT check contextual permissions (e.g., teacher→class assignment)
 */
export function hasBasePermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check contextual permission for teachers
 * Verifies that a teacher is assigned to the specific class/subject
 */
export function hasTeacherContextPermission(
  permission: Permission,
  context: PermissionContext
): boolean {
  if (!context.teacherClassSubjects || !context.classId) {
    return false;
  }

  // Check if teacher is assigned to this class
  const isAssigned = context.teacherClassSubjects.some(
    assignment =>
      assignment.teacherId === context.teacherId &&
      assignment.classId === context.classId &&
      (context.subjectId ? assignment.subjectId === context.subjectId : true)
  );

  return isAssigned;
}

/**
 * Main permission check with context support
 * 
 * WARNING: This is CLIENT-SIDE ONLY. Server-side validation is required!
 * All mutations must be protected with Supabase RLS policies.
 */
export function hasPermission(
  role: UserRole,
  permission: Permission,
  context?: PermissionContext
): boolean {
  // Check base permission first
  if (!hasBasePermission(role, permission)) {
    return false;
  }

  // If teacher role and context provided, check contextual permissions
  if (role === 'teacher' && context) {
    const contextualPermissions: Permission[] = [
      PERMISSIONS.EDIT_GRADES,
      PERMISSIONS.MARK_ATTENDANCE,
      PERMISSIONS.EDIT_ATTENDANCE,
      PERMISSIONS.CREATE_ASSIGNMENTS,
      PERMISSIONS.EDIT_ASSIGNMENTS,
      PERMISSIONS.DELETE_ASSIGNMENTS,
      PERMISSIONS.GRADE_ASSIGNMENTS,
    ];

    if (contextualPermissions.includes(permission)) {
      return hasTeacherContextPermission(permission, context);
    }
  }

  return true;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.some(permission => hasPermission(role, permission, context));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.every(permission => hasPermission(role, permission, context));
}
