import { useSupabaseDirectAuth } from './use-supabase-direct-auth';

/**
 * 🔒 SECURITY: Multi-Tenant Isolation Hook
 * 
 * This hook ensures that all queries are scoped to the current user's school.
 * It throws an error if no school ID is available, preventing cross-school data access.
 * 
 * Usage:
 * ```typescript
 * const schoolId = useRequireSchoolId();
 * 
 * const { data } = useQuery({
 *   queryFn: async () => {
 *     const { data } = await supabase
 *       .from('students')
 *       .select('*')
 *       .eq('school_id', schoolId); // ✅ REQUIRED
 *     return data;
 *   }
 * });
 * ```
 */
export function useRequireSchoolId(): number {
  const { schoolId } = useSupabaseDirectAuth();

  if (schoolId === null || schoolId === undefined) {
    throw new Error(
      '🚨 SECURITY ERROR: No school_id available. User must be assigned to a school to access this data.'
    );
  }

  return schoolId;
}

/**
 * 🔒 SECURITY: Get School ID (Safe Version)
 * 
 * Returns school ID or null if not available.
 * Use this for optional school filtering or when you need to check availability.
 */
export function useSchoolId(): number | null {
  const { schoolId } = useSupabaseDirectAuth();
  return schoolId;
}

/**
 * 🔒 SECURITY: School-Scoped Query Builder Helpers
 * 
 * These helpers ensure all queries include school_id filtering.
 */
export const schoolScopedQuery = {
  /**
   * Add school_id filter to a Supabase query
   */
  withSchoolId: <T>(query: any, schoolId: number | null) => {
    if (schoolId === null) {
      throw new Error('🚨 SECURITY: Cannot query without school_id');
    }
    return query.eq('school_id', schoolId) as T;
  },

  /**
   * Add school_id to insert data
   */
  withSchoolIdData: <T extends Record<string, any>>(data: T, schoolId: number | null): T & { school_id: number } => {
    if (schoolId === null) {
      throw new Error('🚨 SECURITY: Cannot insert without school_id');
    }
    return { ...data, school_id: schoolId };
  },

  /**
   * Add school_id to multiple insert records
   */
  withSchoolIdBatch: <T extends Record<string, any>>(records: T[], schoolId: number | null): (T & { school_id: number })[] => {
    if (schoolId === null) {
      throw new Error('🚨 SECURITY: Cannot insert batch without school_id');
    }
    return records.map(record => ({ ...record, school_id: schoolId }));
  },
};
