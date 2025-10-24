import { useQuery } from '@tanstack/react-query';

export function useAuthorization() {
  return useQuery({
    queryKey: ['/api/auth/me'],
  });
}

export function useHasRole(requiredRole: string | string[]) {
  const { data: user } = useAuthorization();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return user?.roles?.some((r: string) => roles.includes(r)) || false;
}
