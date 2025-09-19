import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSupabaseSettings } from './use-supabase-settings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { userProfile } from './use-supabase-direct-auth';

// School Settings Context Type
interface SchoolContextType {
  // School Information
  schoolName: string;
  schoolNameBn: string;
  schoolLogo?: string;
  schoolColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  
  // Current Academic Year
  currentAcademicYear?: {
    id: string;
    name: string;
    nameBn: string;
    startDate: string;
    endDate: string;
  };
  
  // Current Academic Term
  currentAcademicTerm?: {
    id: string;
    name: string;
    nameBn: string;
    academicYearId: string;
  };
  
  // Loading states
  loading: boolean;
  
  // Settings update functions
  updateSchoolSettings: (settings: any) => void;
  setCurrentAcademicYear: (yearId: string) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  
  // Get current school ID first
  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const id = await userProfile.getCurrentUserSchoolId();
        setSchoolId(id);
      } catch (error) {
        console.error('Failed to get school ID:', error);
        setSchoolId(null);
      }
    };
    getSchoolId();
  }, []);
  
  // Get school settings from Supabase
  const { schoolSettings } = useSupabaseSettings();
  
  // Get current academic year - SCOPED BY SCHOOL ID
  const { data: currentAcademicYear } = useQuery({
    queryKey: ['current-academic-year', schoolId],
    queryFn: async () => {
      console.log('🎓 Fetching current academic year for school:', schoolId);
      
      // First try to get current year for this school
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows
      
      if (data) {
        return data;
      }
      
      // If no current year, get the most recent active year for this school
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows
      
      if (fallbackError) {
        console.warn('No academic years found for school:', schoolId);
        return null;
      }
      
      return fallbackData;
    },
    enabled: !!schoolId // Only run when school ID is available
  });
  
  // Get current academic term - SCOPED BY SCHOOL AND ACADEMIC YEAR
  const { data: currentAcademicTerm } = useQuery({
    queryKey: ['current-academic-term', schoolId, currentAcademicYear?.id],
    queryFn: async () => {
      if (!currentAcademicYear?.id || !schoolId) return null;
      
      console.log('📚 Fetching current academic term for school:', schoolId, 'year:', currentAcademicYear.id);
      
      // Try to get ongoing term for this school and academic year
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('academic_year_id', currentAcademicYear.id)
        .eq('status', 'ongoing')
        .maybeSingle(); // Use maybeSingle to avoid error when no rows
      
      if (data) {
        return data;
      }
      
      // Fallback to most recent term in the year for this school
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('academic_year_id', currentAcademicYear.id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows
      
      if (fallbackError) {
        console.warn('No academic terms found for school:', schoolId, 'year:', currentAcademicYear.id);
        return null;
      }
      
      return fallbackData;
    },
    enabled: !!schoolId && !!currentAcademicYear?.id // Only run when both are available
  });

  useEffect(() => {
    if (schoolSettings !== undefined && currentAcademicYear !== undefined) {
      setLoading(false);
    }
  }, [schoolSettings, currentAcademicYear]);

  // Apply school branding to CSS variables
  useEffect(() => {
    if (schoolSettings) {
      const root = document.documentElement;
      
      // Apply school colors to CSS custom properties
      root.style.setProperty('--school-primary', schoolSettings.primaryColor || '#3B82F6');
      root.style.setProperty('--school-secondary', schoolSettings.secondaryColor || '#10B981');
      root.style.setProperty('--school-accent', schoolSettings.accentColor || '#F59E0B');
      
      // Update page title with school name
      document.title = schoolSettings.name || 'School Management System';
    }
  }, [schoolSettings]);

  const updateSchoolSettings = async (settings: any) => {
    // This would trigger a refetch of school settings
    console.log('Updating school settings:', settings);
  };

  const setCurrentAcademicYear = async (yearId: string) => {
    if (!schoolId) {
      throw new Error('School ID not available for updating academic year');
    }
    
    console.log('Setting current academic year:', yearId, 'for school:', schoolId);
    
    // CRITICAL SECURITY FIX: Scope updates by school_id to prevent cross-tenant data corruption
    // First, set all years for THIS SCHOOL to not current
    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('school_id', schoolId); // MUST scope by school_id
    
    // Then set the selected year as current for THIS SCHOOL
    await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', yearId)
      .eq('school_id', schoolId); // MUST scope by school_id for security
  };

  const value: SchoolContextType = {
    // School Information
    schoolName: schoolSettings?.name || '',
    schoolNameBn: schoolSettings?.nameInBangla || '',
    schoolLogo: schoolSettings?.logoUrl,
    schoolColors: {
      primary: schoolSettings?.primaryColor || '#3B82F6',
      secondary: schoolSettings?.secondaryColor || '#10B981',
      accent: schoolSettings?.accentColor || '#F59E0B',
    },
    
    // Academic Year & Term
    currentAcademicYear,
    currentAcademicTerm,
    
    // Loading state
    loading,
    
    // Update functions
    updateSchoolSettings,
    setCurrentAcademicYear,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}

// Hook to use school context
export function useSchoolContext() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchoolContext must be used within a SchoolProvider');
  }
  return context;
}

// Hook specifically for current academic year filtering
export function useCurrentAcademicYear() {
  const { currentAcademicYear, loading } = useSchoolContext();
  return { currentAcademicYear, loading };
}

// Hook specifically for school branding
export function useSchoolBranding() {
  const { schoolName, schoolNameBn, schoolLogo, schoolColors, loading } = useSchoolContext();
  return { schoolName, schoolNameBn, schoolLogo, schoolColors, loading };
}