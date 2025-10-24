import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useToast } from './use-toast';

// =======================
// OPTIMIZED SUPABASE HOOKS WITH REAL-TIME
// =======================

/**
 * Hook for students with real-time updates and optimistic mutations
 */
export function useStudents(schoolId: number) {
  const queryClient = useQueryClient();
  const queryKey = ['/api/students', schoolId];

  // Query with real-time subscription
  const query = useQuery({
    queryKey,
    queryFn: () => db.getStudents(schoolId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = db.subscribeToStudents(schoolId, () => {
      // Invalidate and refetch when changes occur
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [schoolId, queryClient]);

  return query;
}

/**
 * Hook for creating students with optimistic updates
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (student: any) => db.createStudent(student),
    onMutate: async (newStudent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/students'] });

      // Snapshot previous value
      const previousStudents = queryClient.getQueryData(['/api/students', newStudent.schoolId]);

      // Optimistically update
      queryClient.setQueryData(['/api/students', newStudent.schoolId], (old: any) => {
        return [...(old || []), { ...newStudent, id: 'temp-' + Date.now() }];
      });

      return { previousStudents };
    },
    onError: (err, newStudent, context) => {
      // Rollback on error
      if (context?.previousStudents) {
        queryClient.setQueryData(['/api/students', newStudent.schoolId], context.previousStudents);
      }
      toast({
        title: 'Error',
        description: 'Failed to create student',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Success',
        description: 'Student created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students', variables.schoolId] });
    },
  });
}

/**
 * Hook for updating students with optimistic updates
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => db.updateStudent(id, data),
    onMutate: async ({ id, data }) => {
      const schoolId = data.schoolId || data.school_id;
      await queryClient.cancelQueries({ queryKey: ['/api/students'] });

      const previousStudents = queryClient.getQueryData(['/api/students', schoolId]);

      queryClient.setQueryData(['/api/students', schoolId], (old: any) => {
        return old?.map((student: any) => 
          student.id === id ? { ...student, ...data } : student
        );
      });

      return { previousStudents, schoolId };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents && context?.schoolId) {
        queryClient.setQueryData(['/api/students', context.schoolId], context.previousStudents);
      }
      toast({
        title: 'Error',
        description: 'Failed to update student',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students', context?.schoolId] });
    },
  });
}

/**
 * Hook for deleting students with optimistic updates
 */
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, schoolId }: { id: number; schoolId: number }) => db.deleteStudent(id),
    onMutate: async ({ id, schoolId }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/students'] });

      const previousStudents = queryClient.getQueryData(['/api/students', schoolId]);

      queryClient.setQueryData(['/api/students', schoolId], (old: any) => {
        return old?.filter((student: any) => student.id !== id);
      });

      return { previousStudents, schoolId };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['/api/students', context.schoolId], context.previousStudents);
      }
      toast({
        title: 'Error',
        description: 'Failed to delete student',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students', context?.schoolId] });
    },
  });
}

// =======================
// TEACHERS HOOKS
// =======================

export function useTeachers(schoolId: number) {
  const queryClient = useQueryClient();
  const queryKey = ['/api/teachers', schoolId];

  return useQuery({
    queryKey,
    queryFn: () => db.getTeachers(schoolId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (teacher: any) => db.createTeacher(teacher),
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Teacher created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers', variables.school_id] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create teacher', variant: 'destructive' });
    },
  });
}

// =======================
// LIBRARY HOOKS
// =======================

export function useLibraryBooks(schoolId: number) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['/api/library/books', schoolId],
    queryFn: () => db.getLibraryBooks(schoolId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBorrowedBooks(schoolId: number) {
  return useQuery({
    queryKey: ['/api/library/borrowed', schoolId],
    queryFn: () => db.getBorrowedBooks(schoolId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useBorrowBook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ bookId, studentId, schoolId }: { bookId: number; studentId: number; schoolId: number }) =>
      db.borrowBook(bookId, studentId, schoolId),
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Book borrowed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/library/books', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['/api/library/borrowed', variables.schoolId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to borrow book', variant: 'destructive' });
    },
  });
}

// =======================
// NOTIFICATIONS HOOKS WITH REAL-TIME
// =======================

export function useNotifications(schoolId: number, userId?: number) {
  const queryClient = useQueryClient();
  const queryKey = ['/api/notifications', schoolId, userId];

  const query = useQuery({
    queryKey,
    queryFn: () => db.getNotifications(schoolId, userId),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = db.subscribeToNotifications(schoolId, () => {
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [schoolId, queryClient]);

  return query;
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, studentId }: { notificationId: number; studentId: number }) => 
      db.markNotificationAsRead(notificationId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
}

// =======================
// INVENTORY HOOKS
// =======================

export function useInventoryItems(schoolId: number) {
  return useQuery({
    queryKey: ['/api/inventory/items', schoolId],
    queryFn: () => db.getInventoryItems(schoolId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (item: any) => db.createInventoryItem(item),
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Inventory item created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items', variables.school_id] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create inventory item', variant: 'destructive' });
    },
  });
}

// =======================
// TRANSPORT HOOKS
// =======================

export function useTransportRoutes(schoolId: number) {
  return useQuery({
    queryKey: ['/api/transport/routes', schoolId],
    queryFn: () => db.getTransportRoutes(schoolId),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTransportVehicles(schoolId: number) {
  return useQuery({
    queryKey: ['/api/transport/vehicles', schoolId],
    queryFn: () => db.getTransportVehicles(schoolId),
    staleTime: 1000 * 60 * 10,
  });
}

// =======================
// DASHBOARD HOOKS
// =======================

export function useDashboardStats(schoolId: number) {
  return useQuery({
    queryKey: ['/api/dashboard/stats', schoolId],
    queryFn: () => db.getDashboardStats(schoolId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

export function useDashboardActivities(schoolId: number) {
  return useQuery({
    queryKey: ['/api/dashboard/activities', schoolId],
    queryFn: () => db.getDashboardActivities(schoolId),
    staleTime: 1000 * 60,
  });
}

// =======================
// ACADEMIC HOOKS
// =======================

export function useAcademicYears(schoolId: number) {
  return useQuery({
    queryKey: ['/api/academic-years', schoolId],
    queryFn: () => db.getAcademicYears(schoolId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useCurrentAcademicYear(schoolId: number) {
  return useQuery({
    queryKey: ['/api/academic-years/current', schoolId],
    queryFn: () => db.getCurrentAcademicYear(schoolId),
    staleTime: 1000 * 60 * 30,
  });
}

// =======================
// CALENDAR HOOKS
// =======================

export function useCalendarEvents(schoolId: number) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['/api/calendar/events', schoolId],
    queryFn: () => db.getCalendarEvents(schoolId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (event: any) => db.createCalendarEvent(event),
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Event created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events', variables.school_id] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    },
  });
}

// =======================
// PERFORMANCE MONITORING
// =======================

/**
 * Hook to monitor query performance
 */
export function useQueryPerformance(queryKey: any[]) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const query = cache.find({ queryKey });
    
    if (query) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log slow queries (>1s)
        if (duration > 1000) {
          console.warn(`Slow query detected: ${JSON.stringify(queryKey)} took ${duration}ms`);
        }
      };
    }
  }, [queryKey, queryClient]);
}
