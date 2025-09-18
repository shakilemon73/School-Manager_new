import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSupabaseSettings } from './use-supabase-settings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
  
  // Get school settings from Supabase
  const { schoolSettings } = useSupabaseSettings();
  
  // Get current academic year
  const { data: currentAcademicYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: async () => {
      console.log('🎓 Fetching current academic year');
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_current', true)
        .single();
      
      if (error) {
        console.error('Current academic year fetch error:', error);
        // If no current year, get the most recent active year
        const { data: fallbackData } = await supabase
          .from('academic_years')
          .select('*')
          .eq('is_active', true)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();
        
        return fallbackData;
      }
      
      return data;
    }
  });
  
  // Get current academic term
  const { data: currentAcademicTerm } = useQuery({
    queryKey: ['current-academic-term', currentAcademicYear?.id],
    queryFn: async () => {
      if (!currentAcademicYear?.id) return null;
      
      console.log('📚 Fetching current academic term');
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('academic_year_id', currentAcademicYear.id)
        .eq('status', 'ongoing')
        .single();
      
      if (error) {
        console.error('Current academic term fetch error:', error);
        // Fallback to most recent term in the year
        const { data: fallbackData } = await supabase
          .from('academic_terms')
          .select('*')
          .eq('academic_year_id', currentAcademicYear.id)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();
        
        return fallbackData;
      }
      
      return data;
    },
    enabled: !!currentAcademicYear?.id
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
    console.log('Setting current academic year:', yearId);
    // Update current year in database
    await supabase
      .from('academic_years')
      .update({ is_current: false });
    
    await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', yearId);
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