import { ReactNode } from 'react';
import { Permission } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission?: Permission;
  anyPermissions?: Permission[];
  allPermissions?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * Usage:
 * ```tsx
 * <PermissionGate permission={PERMISSIONS.EDIT_GRADES}>
 *   <EditButton />
 * </PermissionGate>
 * 
 * <PermissionGate anyPermissions={[PERMISSIONS.EDIT_GRADES, PERMISSIONS.VIEW_AUDIT_TRAIL]}>
 *   <AdminPanel />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  anyPermissions,
  allPermissions,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermissions) {
    hasAccess = hasAnyPermission(anyPermissions);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(allPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
