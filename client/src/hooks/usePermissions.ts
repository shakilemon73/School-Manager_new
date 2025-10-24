import { useState, useEffect } from 'react';
import { 
  UserRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  getCurrentUserRole
} from '@/lib/permissions';

interface UsePermissionsReturn {
  role: UserRole | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isLoading: boolean;
}

/**
 * React hook for checking user permissions
 * 
 * Usage:
 * ```tsx
 * const { hasPermission, role } = usePermissions();
 * 
 * if (hasPermission(PERMISSIONS.EDIT_GRADES)) {
 *   return <EditGradeButton />;
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentRole = getCurrentUserRole();
    setRole(currentRole);
    setIsLoading(false);
  }, []);

  return {
    role,
    hasPermission: (permission: Permission) => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    hasAnyPermission: (permissions: Permission[]) => {
      if (!role) return false;
      return hasAnyPermission(role, permissions);
    },
    hasAllPermissions: (permissions: Permission[]) => {
      if (!role) return false;
      return hasAllPermissions(role, permissions);
    },
    isLoading,
  };
}

/**
 * Hook to check a single permission
 * Returns true/false
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to get current user's role
 */
export function useUserRole(): UserRole | null {
  const { role } = usePermissions();
  return role;
}
