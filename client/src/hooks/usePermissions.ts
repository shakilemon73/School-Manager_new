import { useState, useEffect } from 'react';
import { 
  UserRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  PermissionContext
} from '@/lib/permissions';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';

interface UsePermissionsReturn {
  role: UserRole | null;
  hasPermission: (permission: Permission, context?: PermissionContext) => boolean;
  hasAnyPermission: (permissions: Permission[], context?: PermissionContext) => boolean;
  hasAllPermissions: (permissions: Permission[], context?: PermissionContext) => boolean;
  isLoading: boolean;
  teacherClassSubjects: PermissionContext['teacherClassSubjects'];
}

/**
 * React hook for checking user permissions
 * Integrates with Supabase auth for secure role retrieval
 * Fetches teacher assignments for contextual permission checks
 * 
 * Usage:
 * ```tsx
 * const { hasPermission, role } = usePermissions();
 * 
 * // Basic permission check
 * if (hasPermission(PERMISSIONS.VIEW_GRADEBOOK)) {
 *   return <GradebookView />;
 * }
 * 
 * // Contextual permission check for teachers
 * if (hasPermission(PERMISSIONS.EDIT_GRADES, { 
 *   classId: 5, 
 *   subjectId: 10,
 *   teacherId: user.id,
 *   teacherClassSubjects 
 * })) {
 *   return <EditGradeButton />;
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<PermissionContext['teacherClassSubjects']>([]);
  const { user } = useSupabaseDirectAuth();
  const schoolId = useRequireSchoolId();

  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user role from role_assignments table
        const { data: roleAssignment, error } = await supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', user.id)
          .eq('school_id', schoolId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else if (roleAssignment) {
          setRole(roleAssignment.role as UserRole);

          // If user is a teacher, fetch their class/subject assignments
          if (roleAssignment.role === 'teacher') {
            const { data: assignments, error: assignmentsError } = await supabase
              .from('teacher_class_subjects')
              .select('teacher_id, class_id, subject_id')
              .eq('teacher_id', user.id);

            if (assignmentsError) {
              console.error('Error fetching teacher assignments:', assignmentsError);
            } else {
              setTeacherClassSubjects(assignments.map(a => ({
                teacherId: a.teacher_id,
                classId: a.class_id,
                subjectId: a.subject_id,
              })));
            }
          }
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRole();
  }, [user?.id, schoolId]);

  return {
    role,
    hasPermission: (permission: Permission, context?: PermissionContext) => {
      if (!role) return false;
      
      // Automatically inject teacherClassSubjects for teachers
      const fullContext = role === 'teacher' 
        ? { ...context, teacherId: user?.id, teacherClassSubjects }
        : context;
      
      return hasPermission(role, permission, fullContext);
    },
    hasAnyPermission: (permissions: Permission[], context?: PermissionContext) => {
      if (!role) return false;
      
      const fullContext = role === 'teacher'
        ? { ...context, teacherId: user?.id, teacherClassSubjects }
        : context;
      
      return hasAnyPermission(role, permissions, fullContext);
    },
    hasAllPermissions: (permissions: Permission[], context?: PermissionContext) => {
      if (!role) return false;
      
      const fullContext = role === 'teacher'
        ? { ...context, teacherId: user?.id, teacherClassSubjects }
        : context;
      
      return hasAllPermissions(role, permissions, fullContext);
    },
    isLoading,
    teacherClassSubjects,
  };
}

/**
 * Hook to check a single permission
 * Returns true/false
 */
export function useHasPermission(permission: Permission, context?: PermissionContext): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission, context);
}

/**
 * Hook to get current user's role
 */
export function useUserRole(): UserRole | null {
  const { role } = usePermissions();
  return role;
}
