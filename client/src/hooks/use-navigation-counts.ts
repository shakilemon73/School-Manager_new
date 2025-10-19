import { useQuery } from '@tanstack/react-query';
import { useSupabaseDirectAuth } from './use-supabase-direct-auth';
import { supabase } from '@/lib/supabase';

interface NavigationCounts {
  students: number;
  teachers: number;
  staff: number;
  parents: number;
  library_books: number;
  inventory_items: number;
  notifications: number;
}

export function useNavigationCounts() {
  const { schoolId, authReady } = useSupabaseDirectAuth();

  const { data: counts, isLoading } = useQuery<NavigationCounts>({
    queryKey: ['navigation-counts', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error('School ID not available');
      }

      const [
        studentsResult,
        teachersResult,
        staffResult,
        parentsResult,
        booksResult,
        inventoryResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('staff').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('parents').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('library_books').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('inventory_items').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('notifications').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId).eq('is_active', true).eq('is_read', false)
      ]);

      return {
        students: studentsResult.count || 0,
        teachers: teachersResult.count || 0,
        staff: staffResult.count || 0,
        parents: parentsResult.count || 0,
        library_books: booksResult.count || 0,
        inventory_items: inventoryResult.count || 0,
        notifications: notificationsResult.count || 0
      };
    },
    enabled: authReady && !!schoolId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache the counts
    refetchOnMount: false, // Don't refetch on every mount to reduce load
  });

  return {
    counts: counts || {
      students: 0,
      teachers: 0,
      staff: 0,
      parents: 0,
      library_books: 0,
      inventory_items: 0,
      notifications: 0
    },
    isLoading
  };
}
