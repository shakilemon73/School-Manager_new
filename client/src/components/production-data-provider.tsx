import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { db } from '@/lib/supabase';

interface ProductionDataContextType {
  students: any[];
  teachers: any[];
  books: any[];
  inventoryItems: any[];
  events: any[];
  notifications: any[];
  dashboardStats: any;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const ProductionDataContext = createContext<ProductionDataContextType | undefined>(undefined);

export function ProductionDataProvider({ children }: { children: React.ReactNode }) {
  const { user, schoolId } = useSupabaseDirectAuth();

  // Real students data from database using Supabase direct
  const studentsQuery = useQuery({
    queryKey: ['students', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getStudents(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real teachers data from database using Supabase direct
  const teachersQuery = useQuery({
    queryKey: ['teachers', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getTeachers(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real library books data from database using Supabase direct
  const booksQuery = useQuery({
    queryKey: ['library-books', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getLibraryBooks(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real inventory items data from database using Supabase direct
  const inventoryQuery = useQuery({
    queryKey: ['inventory-items', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getInventoryItems(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real calendar events data from database using Supabase direct
  const eventsQuery = useQuery({
    queryKey: ['calendar-events', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getCalendarEvents(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real notifications data from database using Supabase direct
  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await db.getNotifications(schoolId);
    },
    enabled: !!schoolId,
  });

  // Real dashboard statistics from database using Supabase direct
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-stats', user?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return {};
      return await db.getDashboardStats(schoolId);
    },
    enabled: !!schoolId,
  });

  const isLoading = studentsQuery.isLoading || teachersQuery.isLoading || 
                   booksQuery.isLoading || inventoryQuery.isLoading ||
                   eventsQuery.isLoading || notificationsQuery.isLoading ||
                   dashboardQuery.isLoading;

  const error = studentsQuery.error?.message || 
                teachersQuery.error?.message || 
                booksQuery.error?.message || 
                inventoryQuery.error?.message ||
                eventsQuery.error?.message || 
                notificationsQuery.error?.message ||
                dashboardQuery.error?.message || 
                null;

  const refetch = () => {
    studentsQuery.refetch();
    teachersQuery.refetch();
    booksQuery.refetch();
    inventoryQuery.refetch();
    eventsQuery.refetch();
    notificationsQuery.refetch();
    dashboardQuery.refetch();
  };

  const value = {
    students: studentsQuery.data || [],
    teachers: teachersQuery.data || [],
    books: booksQuery.data || [],
    inventoryItems: inventoryQuery.data || [],
    events: eventsQuery.data || [],
    notifications: notificationsQuery.data || [],
    dashboardStats: dashboardQuery.data || {},
    isLoading,
    error,
    refetch
  };

  return (
    <ProductionDataContext.Provider value={value}>
      {children}
    </ProductionDataContext.Provider>
  );
}

export function useProductionData() {
  const context = useContext(ProductionDataContext);
  if (context === undefined) {
    throw new Error('useProductionData must be used within a ProductionDataProvider');
  }
  return context;
}

// Real data hooks for specific entities
export function useRealStudents() {
  const { students, isLoading, error } = useProductionData();
  return { students, isLoading, error };
}

export function useRealTeachers() {
  const { teachers, isLoading, error } = useProductionData();
  return { teachers, isLoading, error };
}

export function useRealBooks() {
  const { books, isLoading, error } = useProductionData();
  return { books, isLoading, error };
}

export function useRealInventory() {
  const { inventoryItems, isLoading, error } = useProductionData();
  return { inventoryItems, isLoading, error };
}

export function useRealEvents() {
  const { events, isLoading, error } = useProductionData();
  return { events, isLoading, error };
}

export function useRealNotifications() {
  const { notifications, isLoading, error } = useProductionData();
  return { notifications, isLoading, error };
}

export function useRealDashboardStats() {
  const { dashboardStats, isLoading, error } = useProductionData();
  return { dashboardStats, isLoading, error };
}