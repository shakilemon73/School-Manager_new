import { ReactNode } from 'react';
import { Permission, PermissionContext } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission?: Permission;
  anyPermissions?: Permission[];
  allPermissions?: Permission[];
  context?: PermissionContext;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * Usage:
 * ```tsx
 * // Basic permission check
 * <PermissionGate permission={PERMISSIONS.EDIT_GRADES}>
 *   <EditButton />
 * </PermissionGate>
 * 
 * // Check any of multiple permissions
 * <PermissionGate anyPermissions={[PERMISSIONS.EDIT_GRADES, PERMISSIONS.VIEW_AUDIT_TRAIL]}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // Contextual permission check for teachers
 * <PermissionGate 
 *   permission={PERMISSIONS.EDIT_GRADES} 
 *   context={{ classId: 5, subjectId: 10 }}
 * >
 *   <EditGradeButton />
 * </PermissionGate>
 * ```
 * 
 * NOTE: Only one of permission/anyPermissions/allPermissions should be provided.
 * If multiple are provided, permission takes precedence.
 */
export function PermissionGate({
  permission,
  anyPermissions,
  allPermissions,
  context,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Validate props - warn if multiple are provided
  if (process.env.NODE_ENV === 'development') {
    const propsProvided = [permission, anyPermissions, allPermissions].filter(Boolean).length;
    if (propsProvided > 1) {
      console.warn(
        'PermissionGate: Multiple permission props provided. Only one of permission/anyPermissions/allPermissions should be used. ' +
        'Using permission prop with precedence: permission > anyPermissions > allPermissions'
      );
    }
    if (propsProvided === 0) {
      console.warn('PermissionGate: No permission prop provided. Component will always render fallback.');
    }
  }

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  // Priority: permission > anyPermissions > allPermissions
  if (permission) {
    hasAccess = hasPermission(permission, context);
  } else if (anyPermissions) {
    hasAccess = hasAnyPermission(anyPermissions, context);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(allPermissions, context);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
