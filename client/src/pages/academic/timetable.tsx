// Migrated to direct Supabase: Enhanced Timetable with ALL 7 features
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { Calendar, Clock, Plus, Edit2, Save, X, AlertCircle, User, Copy, Trash2, FileDown, Upload, Download, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const CLASS_COLORS = [
  'bg-blue-100 dark:bg-blue-900/30 border-blue-300',
  'bg-green-100 dark:bg-green-900/30 border-green-300',
  'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
  'bg-orange-100 dark:bg-orange-900/30 border-orange-300',
  'bg-pink-100 dark:bg-pink-900/30 border-pink-300',
  'bg-teal-100 dark:bg-teal-900/30 border-teal-300',
  'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300',
  'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300',
];

// Feature 5: Period Type Colors
const PERIOD_TYPE_COLORS: Record<string, string> = {
  regular: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300',
  practical: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300',
  sports: 'bg-green-50 dark:bg-green-900/20 border-green-300',
  assembly: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300',
  break: 'bg-gray-100 dark:bg-gray-800/50 border-gray-400',
};

const PERIOD_TYPES = [
  { value: 'regular', label: 'নিয়মিত', labelEn: 'Regular' },
  { value: 'practical', label: 'ব্যবহারিক', labelEn: 'Practical' },
  { value: 'sports', label: 'খেলাধুলা', labelEn: 'Sports' },
  { value: 'assembly', label: 'সমাবেশ', labelEn: 'Assembly' },
  { value: 'break', label: 'বিরতি', labelEn: 'Break' },
];

interface Period {
  id: number;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  school_id: number;
}

interface RoutinePeriod {
  id: number;
  routine_id: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  subject_bn: string;
  teacher_name: string;
  room_number: string;
  period_type: string;
  school_id: number;
  class_name?: string;
  section?: string;
}

interface Conflict {
  type: 'teacher' | 'class' | 'room';
  message: string;
  details: string;
}

interface TimetableTemplate {
  id: number;
  name: string;
  name_bn: string;
  description: string;
  template_type: string;
  target_class: string;
  target_section: string;
  template_data: any;
  created_at: string;
}

interface Substitution {
  id: number;
  routine_period_id: number;
  original_teacher_id: number;
  substitute_teacher_id: number;
  date: string;
  reason: string;
  reason_bn: string;
  status: string;
  created_at: string;
}

export default function TimetablePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const { hasPermission, teacherClassSubjects, role } = usePermissions();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  
  // Class view states
  const [selectedClass, setSelectedClass] = useState('6');
  const [selectedSection, setSelectedSection] = useState('A');
  
  // Teacher view states
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  
  // Editing states
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: number; periodNum: number } | null>(null);
  const [periodForm, setPeriodForm] = useState({
    subject: '',
    subject_bn: '',
    teacher_name: '',
    room_number: '',
    start_time: '',
    end_time: '',
    period_type: 'regular' as string,
  });
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // Feature 2: Template states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyTargetClass, setCopyTargetClass] = useState('');
  const [copyTargetSection, setCopyTargetSection] = useState('');

  // Feature 6: Academic Year states
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | null>(null);

  // Feature 7: Substitution states
  const [isSubstitutionDialogOpen, setIsSubstitutionDialogOpen] = useState(false);
  const [substitutionForm, setSubstitutionForm] = useState({
    periodId: 0,
    substituteTeacherId: 0,
    date: '',
    reason: '',
  });

  // Fetch academic years (Feature 6)
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('is_current', { ascending: false })
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      // Auto-select current year
      if (data && data.length > 0 && !selectedAcademicYear) {
        const currentYear = data.find(y => y.is_current);
        if (currentYear) {
          setSelectedAcademicYear(currentYear.id);
        }
      }
      
      return data || [];
    }
  });

  // Fetch periods configuration
  const { data: periods = [] } = useQuery({
    queryKey: ['periods-config', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('school_id', schoolId)
        .order('period_number');
      
      if (error) throw error;
      
      // If no periods exist, create default ones
      if (!data || data.length === 0) {
        const defaultPeriodsPerDay = [
          { period_number: 1, name: 'First Period', start_time: '08:00', end_time: '08:45' },
          { period_number: 2, name: 'Second Period', start_time: '08:45', end_time: '09:30' },
          { period_number: 3, name: 'Third Period', start_time: '09:30', end_time: '10:15' },
          { period_number: 4, name: 'Break', start_time: '10:15', end_time: '10:30' },
          { period_number: 5, name: 'Fourth Period', start_time: '10:30', end_time: '11:15' },
          { period_number: 6, name: 'Fifth Period', start_time: '11:15', end_time: '12:00' },
          { period_number: 7, name: 'Sixth Period', start_time: '12:00', end_time: '12:45' },
        ];
        
        const allPeriods = [];
        for (let day = 0; day < 6; day++) {
          for (const period of defaultPeriodsPerDay) {
            allPeriods.push({
              ...period,
              day_of_week: day,
              school_id: schoolId,
            });
          }
        }
        
        const { data: created } = await supabase
          .from('periods')
          .insert(allPeriods)
          .select();
        
        return created || [];
      }
      
      return data as Period[];
    }
  });

  // Feature 1: Detect break periods
  const isBreakPeriod = (periodNum: number) => {
    const period = periods.find(p => p.period_number === periodNum);
    if (!period) return false;
    return period.name.toLowerCase().includes('break') || 
           period.name.toLowerCase().includes('বিরতি');
  };

  // Fetch routine periods (actual timetable data) for class view
  const { data: routinePeriods = [], isLoading } = useQuery({
    queryKey: ['routine-periods', schoolId, selectedClass, selectedSection, selectedAcademicYear],
    queryFn: async () => {
      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .eq('academic_year_id', selectedAcademicYear || 0)
        .single();

      if (!routine) return [];

      const { data, error } = await supabase
        .from('routine_periods')
        .select('*')
        .eq('routine_id', routine.id)
        .order('day_of_week')
        .order('period_number');
      
      if (error) throw error;
      return data as RoutinePeriod[];
    },
    enabled: viewMode === 'class' && selectedAcademicYear !== null,
  });

  // Fetch all routine periods for teacher view
  const { data: allRoutinePeriods = [] } = useQuery({
    queryKey: ['all-routine-periods', schoolId, selectedAcademicYear],
    queryFn: async () => {
      const { data: routines } = await supabase
        .from('class_routines')
        .select('id, class_name, section')
        .eq('school_id', schoolId)
        .eq('academic_year_id', selectedAcademicYear || 0);

      if (!routines || routines.length === 0) return [];

      const { data, error } = await supabase
        .from('routine_periods')
        .select('*')
        .in('routine_id', routines.map(r => r.id))
        .order('day_of_week')
        .order('period_number');
      
      if (error) throw error;

      const periodsWithClass = data?.map(period => {
        const routine = routines.find(r => r.id === period.routine_id);
        return {
          ...period,
          class_name: routine?.class_name,
          section: routine?.section,
        };
      }) || [];

      return periodsWithClass as RoutinePeriod[];
    },
    enabled: viewMode === 'teacher' && selectedAcademicYear !== null,
  });

  // Feature 2: Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['timetable-templates', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TimetableTemplate[];
    }
  });

  // Feature 7: Fetch substitutions
  const { data: substitutions = [] } = useQuery({
    queryKey: ['substitutions', schoolId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('routine_substitutions')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .gte('date', today)
        .order('date');
      
      if (error) throw error;
      return data as Substitution[];
    }
  });

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Get unique teachers from all routine periods for teacher selector
  const availableTeachers = useMemo(() => {
    const teacherSet = new Set(allRoutinePeriods.map(p => p.teacher_name).filter(Boolean));
    return Array.from(teacherSet).sort();
  }, [allRoutinePeriods]);

  // Auto-select teacher if user is a teacher
  useMemo(() => {
    if (viewMode === 'teacher' && role === 'teacher' && !selectedTeacher) {
      if (availableTeachers.length > 0) {
        setSelectedTeacher(availableTeachers[0]);
      }
    }
  }, [viewMode, role, availableTeachers, selectedTeacher]);

  // Filter teacher's schedule
  const teacherSchedule = useMemo(() => {
    if (!selectedTeacher) return [];
    return allRoutinePeriods.filter(p => p.teacher_name === selectedTeacher);
  }, [selectedTeacher, allRoutinePeriods]);

  // Get unique classes for color coding
  const uniqueClasses = useMemo(() => {
    const classes = new Set(teacherSchedule.map(p => `${p.class_name}-${p.section}`));
    return Array.from(classes);
  }, [teacherSchedule]);

  const getClassColor = (className: string, section: string) => {
    const classKey = `${className}-${section}`;
    const index = uniqueClasses.indexOf(classKey);
    return CLASS_COLORS[index % CLASS_COLORS.length];
  };

  // Conflict detection function
  const checkConflicts = async (day: number, periodNum: number, teacherName: string, roomNumber: string): Promise<Conflict[]> => {
    const detectedConflicts: Conflict[] = [];

    if (!teacherName) return detectedConflicts;

    const { data: allRoutines } = await supabase
      .from('class_routines')
      .select('id, class_name, section')
      .eq('school_id', schoolId);

    if (!allRoutines) return detectedConflicts;

    // Check for teacher conflicts
    const { data: teacherPeriods } = await supabase
      .from('routine_periods')
      .select('*, routine_id')
      .eq('day_of_week', day)
      .eq('period_number', periodNum)
      .eq('teacher_name', teacherName)
      .in('routine_id', allRoutines.map(r => r.id));

    if (teacherPeriods && teacherPeriods.length > 0) {
      const conflictingClasses = teacherPeriods.map(p => {
        const routine = allRoutines.find(r => r.id === p.routine_id);
        return `${routine?.class_name} ${routine?.section}`;
      });

      detectedConflicts.push({
        type: 'teacher',
        message: 'শিক্ষক দ্বন্দ্ব সনাক্ত',
        details: `${teacherName} ইতিমধ্যে এই সময়ে ${conflictingClasses.join(', ')} এ পড়াচ্ছেন।`,
      });
    }

    // Check for room conflicts if room number is provided
    if (roomNumber) {
      const { data: roomPeriods } = await supabase
        .from('routine_periods')
        .select('*, routine_id')
        .eq('day_of_week', day)
        .eq('period_number', periodNum)
        .eq('room_number', roomNumber)
        .in('routine_id', allRoutines.map(r => r.id));

      if (roomPeriods && roomPeriods.length > 0) {
        const conflictingClasses = roomPeriods.map(p => {
          const routine = allRoutines.find(r => r.id === p.routine_id);
          return `${routine?.class_name} ${routine?.section}`;
        });

        detectedConflicts.push({
          type: 'room',
          message: 'রুম দ্বন্দ্ব সনাক্ত',
          details: `রুম ${roomNumber} ইতিমধ্যে ${conflictingClasses.join(', ')} দ্বারা ব্যবহৃত হচ্ছে।`,
        });
      }
    }

    // Check for class conflicts
    const { data: routine } = await supabase
      .from('class_routines')
      .select('id')
      .eq('school_id', schoolId)
      .eq('class_name', `Class ${selectedClass}`)
      .eq('section', selectedSection)
      .single();

    if (routine) {
      const { data: classPeriods } = await supabase
        .from('routine_periods')
        .select('*')
        .eq('routine_id', routine.id)
        .eq('day_of_week', day)
        .eq('period_number', periodNum);

      if (classPeriods && classPeriods.length > 0) {
        detectedConflicts.push({
          type: 'class',
          message: 'ক্লাস দ্বন্দ্ব সনাক্ত',
          details: `এই ক্লাস ইতিমধ্যে এই সময়ে ${classPeriods[0].subject} বিষয় আছে।`,
        });
      }
    }

    return detectedConflicts;
  };

  // Create or update routine period mutation
  const savePeriodMutation = useMutation({
    mutationFn: async ({ day, periodNum, data }: { day: number; periodNum: number; data: any }) => {
      // Feature 1: Prevent saving if it's a break period
      if (isBreakPeriod(periodNum) && data.period_type !== 'break') {
        throw new Error('বিরতির সময় ক্লাস নির্ধারণ করা যাবে না।');
      }

      // Check for conflicts before saving
      const detectedConflicts = await checkConflicts(day, periodNum, data.teacher_name, data.room_number);
      
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        throw new Error('সংঘাত সনাক্ত করা হয়েছে। সংরক্ষণ করা হয়নি।');
      }

      let { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .eq('academic_year_id', selectedAcademicYear || 0)
        .single();

      if (!routine) {
        const { data: newRoutine } = await supabase
          .from('class_routines')
          .insert([{
            class_name: `Class ${selectedClass}`,
            section: selectedSection,
            academic_year: academicYears.find(y => y.id === selectedAcademicYear)?.name || new Date().getFullYear().toString(),
            academic_year_id: selectedAcademicYear,
            institute_name: 'School',
            class_teacher: 'Teacher',
            effective_date: new Date().toISOString().split('T')[0],
            school_id: schoolId,
          }])
          .select()
          .single();
        
        routine = newRoutine;
      }

      if (!routine) throw new Error('Could not create routine');

      const existing = routinePeriods.find(p => p.day_of_week === day && p.period_number === periodNum);

      const { data: verifiedRoutine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('id', routine.id)
        .eq('school_id', schoolId)
        .single();

      if (!verifiedRoutine) throw new Error('Unauthorized: routine does not belong to this school');

      if (existing) {
        const { error } = await supabase
          .from('routine_periods')
          .update(data)
          .eq('id', existing.id)
          .eq('routine_id', routine.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('routine_periods')
          .insert([{
            routine_id: routine.id,
            day_of_week: day,
            period_number: periodNum,
            ...data,
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      queryClient.invalidateQueries({ queryKey: ['all-routine-periods'] });
      toast({ title: 'সফল', description: 'সময়সূচী আপডেট হয়েছে' });
      setEditingSlot(null);
      setPeriodForm({ subject: '', subject_bn: '', teacher_name: '', room_number: '', start_time: '', end_time: '', period_type: 'regular' });
      setConflicts([]);
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 2: Save as template
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateName) {
        throw new Error('টেমপ্লেটের নাম প্রয়োজন');
      }

      const templateData = {
        periods: routinePeriods,
        class: selectedClass,
        section: selectedSection,
      };

      const { error } = await supabase
        .from('timetable_templates')
        .insert([{
          name: templateName,
          name_bn: templateName,
          description: templateDescription,
          template_type: 'class_specific',
          target_class: `Class ${selectedClass}`,
          target_section: selectedSection,
          template_data: templateData,
          created_by: 'user',
          school_id: schoolId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-templates'] });
      toast({ title: 'সফল', description: 'টেমপ্লেট সংরক্ষিত হয়েছে' });
      setIsTemplateDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 2: Load template
  const loadTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('টেমপ্লেট পাওয়া যায়নি');

      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .single();

      if (!routine) throw new Error('রুটিন পাওয়া যায়নি');

      const periods = template.template_data.periods || [];
      const periodsToInsert = periods.map((p: any) => ({
        ...p,
        routine_id: routine.id,
        id: undefined,
      }));

      const { error } = await supabase
        .from('routine_periods')
        .insert(periodsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      toast({ title: 'সফল', description: 'টেমপ্লেট লোড হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 2: Copy Monday to other days
  const copyMondayMutation = useMutation({
    mutationFn: async () => {
      const mondayPeriods = routinePeriods.filter(p => p.day_of_week === 1);
      if (mondayPeriods.length === 0) {
        throw new Error('সোমবারের কোন পিরিয়ড নেই');
      }

      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .single();

      if (!routine) throw new Error('রুটিন পাওয়া যায়নি');

      const periodsToInsert = [];
      for (let day = 2; day < 6; day++) {
        for (const period of mondayPeriods) {
          periodsToInsert.push({
            routine_id: routine.id,
            day_of_week: day,
            period_number: period.period_number,
            start_time: period.start_time,
            end_time: period.end_time,
            subject: period.subject,
            subject_bn: period.subject_bn,
            teacher_name: period.teacher_name,
            room_number: period.room_number,
            period_type: period.period_type,
          });
        }
      }

      const { error } = await supabase
        .from('routine_periods')
        .insert(periodsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      toast({ title: 'সফল', description: 'সোমবারের সময়সূচী অন্যান্য দিনে কপি হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 2: Copy to another class
  const copyToClassMutation = useMutation({
    mutationFn: async () => {
      if (!copyTargetClass || !copyTargetSection) {
        throw new Error('লক্ষ্য ক্লাস এবং শাখা নির্বাচন করুন');
      }

      let { data: targetRoutine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${copyTargetClass}`)
        .eq('section', copyTargetSection)
        .single();

      if (!targetRoutine) {
        const { data: newRoutine } = await supabase
          .from('class_routines')
          .insert([{
            class_name: `Class ${copyTargetClass}`,
            section: copyTargetSection,
            academic_year: new Date().getFullYear().toString(),
            academic_year_id: selectedAcademicYear,
            institute_name: 'School',
            class_teacher: 'Teacher',
            effective_date: new Date().toISOString().split('T')[0],
            school_id: schoolId,
          }])
          .select()
          .single();
        
        targetRoutine = newRoutine;
      }

      if (!targetRoutine) throw new Error('Could not create target routine');

      const periodsToInsert = routinePeriods.map(p => ({
        routine_id: targetRoutine.id,
        day_of_week: p.day_of_week,
        period_number: p.period_number,
        start_time: p.start_time,
        end_time: p.end_time,
        subject: p.subject,
        subject_bn: p.subject_bn,
        teacher_name: p.teacher_name,
        room_number: p.room_number,
        period_type: p.period_type,
      }));

      const { error } = await supabase
        .from('routine_periods')
        .insert(periodsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'সফল', description: 'সময়সূচী কপি হয়েছে' });
      setIsCopyDialogOpen(false);
      setCopyTargetClass('');
      setCopyTargetSection('');
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 3: Clear day
  const clearDayMutation = useMutation({
    mutationFn: async (day: number) => {
      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .single();

      if (!routine) throw new Error('রুটিন পাওয়া যায়নি');

      const { error } = await supabase
        .from('routine_periods')
        .delete()
        .eq('routine_id', routine.id)
        .eq('day_of_week', day);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      toast({ title: 'সফল', description: 'দিনের সময়সূচী মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 3: Clear week
  const clearWeekMutation = useMutation({
    mutationFn: async () => {
      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .single();

      if (!routine) throw new Error('রুটিন পাওয়া যায়নি');

      const { error } = await supabase
        .from('routine_periods')
        .delete()
        .eq('routine_id', routine.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      toast({ title: 'সফল', description: 'সম্পূর্ণ সময়সূচী মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 4: PDF Export
  const exportPDF = async () => {
    try {
      const doc = new jsPDF('landscape');
      
      // Fetch school info
      const { data: schoolSettings } = await supabase
        .from('school_settings')
        .select('*')
        .eq('id', schoolId)
        .single();

      const schoolName = schoolSettings?.name || 'School';
      
      // Header
      doc.setFontSize(18);
      doc.text(schoolName, doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`Class ${selectedClass} - Section ${selectedSection}`, doc.internal.pageSize.width / 2, 25, { align: 'center' });
      doc.text('Weekly Timetable', doc.internal.pageSize.width / 2, 32, { align: 'center' });

      // Table data
      const tableData: any[] = [];
      const uniquePeriods = Array.from(new Set(periods.map(p => p.period_number))).slice(0, 7);

      uniquePeriods.forEach(periodNum => {
        const period = periods.find(p => p.period_number === periodNum);
        const row: any[] = [
          period?.name || `Period ${periodNum}`,
          `${period?.start_time || ''} - ${period?.end_time || ''}`
        ];

        DAYS_EN.forEach((_, dayIndex) => {
          const slot = routinePeriods.find(s => s.day_of_week === dayIndex && s.period_number === periodNum);
          row.push(slot ? `${slot.subject}\n${slot.teacher_name}` : '-');
        });

        tableData.push(row);
      });

      (doc as any).autoTable({
        head: [['Period', 'Time', ...DAYS_EN]],
        body: tableData,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      });

      doc.save(`timetable-class-${selectedClass}-${selectedSection}.pdf`);
      toast({ title: 'সফল', description: 'পিডিএফ ডাউনলোড হয়েছে' });
    } catch (error: any) {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  };

  // Feature 6: Copy from previous year
  const copyFromPreviousYearMutation = useMutation({
    mutationFn: async (previousYearId: number) => {
      const { data: previousRoutines } = await supabase
        .from('class_routines')
        .select('id, class_name, section')
        .eq('school_id', schoolId)
        .eq('academic_year_id', previousYearId);

      if (!previousRoutines || previousRoutines.length === 0) {
        throw new Error('পূর্ববর্তী বছরের কোন রুটিন পাওয়া যায়নি');
      }

      for (const prevRoutine of previousRoutines) {
        const { data: periods } = await supabase
          .from('routine_periods')
          .select('*')
          .eq('routine_id', prevRoutine.id);

        if (!periods || periods.length === 0) continue;

        let { data: newRoutine } = await supabase
          .from('class_routines')
          .select('id')
          .eq('school_id', schoolId)
          .eq('class_name', prevRoutine.class_name)
          .eq('section', prevRoutine.section)
          .eq('academic_year_id', selectedAcademicYear || 0)
          .single();

        if (!newRoutine) {
          const { data: created } = await supabase
            .from('class_routines')
            .insert([{
              class_name: prevRoutine.class_name,
              section: prevRoutine.section,
              academic_year: academicYears.find(y => y.id === selectedAcademicYear)?.name || '',
              academic_year_id: selectedAcademicYear,
              institute_name: 'School',
              class_teacher: 'Teacher',
              effective_date: new Date().toISOString().split('T')[0],
              school_id: schoolId,
            }])
            .select()
            .single();
          
          newRoutine = created;
        }

        if (newRoutine) {
          const periodsToInsert = periods.map(p => ({
            routine_id: newRoutine.id,
            day_of_week: p.day_of_week,
            period_number: p.period_number,
            start_time: p.start_time,
            end_time: p.end_time,
            subject: p.subject,
            subject_bn: p.subject_bn,
            teacher_name: p.teacher_name,
            room_number: p.room_number,
            period_type: p.period_type,
          }));

          await supabase
            .from('routine_periods')
            .insert(periodsToInsert);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      toast({ title: 'সফল', description: 'পূর্ববর্তী বছরের রুটিন কপি হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Feature 7: Add substitution
  const addSubstitutionMutation = useMutation({
    mutationFn: async () => {
      if (!substitutionForm.periodId || !substitutionForm.substituteTeacherId || !substitutionForm.date) {
        throw new Error('সকল তথ্য পূরণ করুন');
      }

      const { error } = await supabase
        .from('routine_substitutions')
        .insert([{
          routine_period_id: substitutionForm.periodId,
          substitute_teacher_id: substitutionForm.substituteTeacherId,
          date: substitutionForm.date,
          reason: substitutionForm.reason,
          reason_bn: substitutionForm.reason,
          created_by: 'user',
          school_id: schoolId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
      toast({ title: 'সফল', description: 'বিকল্প শিক্ষক নির্ধারিত হয়েছে' });
      setIsSubstitutionDialogOpen(false);
      setSubstitutionForm({ periodId: 0, substituteTeacherId: 0, date: '', reason: '' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const getSlotForDayAndPeriod = (day: number, periodNum: number) => {
    return routinePeriods.find(s => s.day_of_week === day && s.period_number === periodNum);
  };

  const getTeacherSlotForDayAndPeriod = (day: number, periodNum: number) => {
    return teacherSchedule.find(s => s.day_of_week === day && s.period_number === periodNum);
  };

  const handleSaveSlot = (day: number, periodNum: number) => {
    const period = periods.find(p => p.period_number === periodNum);
    if (!period) return;

    savePeriodMutation.mutate({
      day,
      periodNum,
      data: {
        ...periodForm,
        start_time: periodForm.start_time || period.start_time,
        end_time: periodForm.end_time || period.end_time,
      }
    });
  };

  const handleEditSlot = (day: number, periodNum: number) => {
    // Feature 1: Check if it's a break period
    if (isBreakPeriod(periodNum)) {
      toast({ 
        title: 'সতর্কতা', 
        description: 'বিরতির সময় ক্লাস নির্ধারণ করা যাবে না।', 
        variant: 'destructive' 
      });
      return;
    }

    const slot = getSlotForDayAndPeriod(day, periodNum);
    if (slot) {
      setPeriodForm({
        subject: slot.subject,
        subject_bn: slot.subject_bn || '',
        teacher_name: slot.teacher_name,
        room_number: slot.room_number || '',
        start_time: slot.start_time,
        end_time: slot.end_time,
        period_type: slot.period_type || 'regular',
      });
    }
    setEditingSlot({ day, periodNum });
    setConflicts([]);
  };

  // Render class view
  const renderClassView = () => (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>শ্রেণী ও শাখা নির্বাচন করুন</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger data-testid="select-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((c) => (
                    <SelectItem key={c} value={c}>ক্লাস {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger data-testid="select-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map((s) => (
                    <SelectItem key={s} value={s}>শাখা {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature 6: Academic Year Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>শিক্ষাবর্ষ নির্বাচন করুন</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Select 
              value={selectedAcademicYear?.toString() || ''} 
              onValueChange={(v) => setSelectedAcademicYear(parseInt(v))}
            >
              <SelectTrigger data-testid="select-academic-year">
                <SelectValue placeholder="শিক্ষাবর্ষ নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id.toString()}>
                    {year.name_bn || year.name} {year.is_current && '(চলতি)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {academicYears.length > 1 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-copy-previous-year">
                    <Upload className="w-4 h-4 mr-2" />
                    পূর্ববর্তী বছর থেকে কপি
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>পূর্ববর্তী বছর থেকে কপি করুন</DialogTitle>
                    <DialogDescription>
                      যে বছর থেকে রুটিন কপি করতে চান তা নির্বাচন করুন
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select onValueChange={(v) => copyFromPreviousYearMutation.mutate(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="বছর নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears
                          .filter(y => y.id !== selectedAcademicYear)
                          .map((year) => (
                            <SelectItem key={year.id} value={year.id.toString()}>
                              {year.name_bn || year.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature 2 & 3: Action Buttons */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-save-template">
                  <Save className="w-4 h-4 mr-2" />
                  টেমপ্লেট হিসেবে সংরক্ষণ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>টেমপ্লেট সংরক্ষণ করুন</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>টেমপ্লেটের নাম</Label>
                    <Input 
                      value={templateName} 
                      onChange={(e) => setTemplateName(e.target.value)} 
                      placeholder="যেমন: ক্লাস ৬ মানসম্পন্ন রুটিন"
                      data-testid="input-template-name"
                    />
                  </div>
                  <div>
                    <Label>বিবরণ (ঐচ্ছিক)</Label>
                    <Input 
                      value={templateDescription} 
                      onChange={(e) => setTemplateDescription(e.target.value)} 
                      placeholder="টেমপ্লেট সম্পর্কে বিস্তারিত"
                      data-testid="input-template-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => saveTemplateMutation.mutate()} data-testid="button-confirm-save-template">
                    সংরক্ষণ করুন
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {templates.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-load-template">
                    <Download className="w-4 h-4 mr-2" />
                    টেমপ্লেট লোড করুন
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>টেমপ্লেট লোড করুন</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Card key={template.id} className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => loadTemplateMutation.mutate(template.id)}>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(template.created_at).toLocaleDateString('bn-BD')}
                        </div>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="outline" size="sm" onClick={() => copyMondayMutation.mutate()} data-testid="button-copy-monday">
              <Copy className="w-4 h-4 mr-2" />
              সোমবার অন্যান্য দিনে কপি
            </Button>

            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-copy-to-class">
                  <Copy className="w-4 h-4 mr-2" />
                  অন্য ক্লাসে কপি করুন
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>অন্য ক্লাসে কপি করুন</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>লক্ষ্য ক্লাস</Label>
                    <Select value={copyTargetClass} onValueChange={setCopyTargetClass}>
                      <SelectTrigger data-testid="select-copy-target-class">
                        <SelectValue placeholder="ক্লাস নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((c) => (
                          <SelectItem key={c} value={c}>ক্লাস {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>লক্ষ্য শাখা</Label>
                    <Select value={copyTargetSection} onValueChange={setCopyTargetSection}>
                      <SelectTrigger data-testid="select-copy-target-section">
                        <SelectValue placeholder="শাখা নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A', 'B', 'C', 'D'].map((s) => (
                          <SelectItem key={s} value={s}>শাখা {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => copyToClassMutation.mutate()} data-testid="button-confirm-copy">
                    কপি করুন
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-clear-week">
                  <Trash2 className="w-4 h-4 mr-2" />
                  সপ্তাহ মুছুন
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
                  <AlertDialogDescription>
                    এটি সম্পূর্ণ সপ্তাহের সময়সূচী মুছে ফেলবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-clear-week">বাতিল</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearWeekMutation.mutate()} data-testid="button-confirm-clear-week">
                    মুছে ফেলুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Feature 4: PDF Export */}
            <Button variant="outline" size="sm" onClick={exportPDF} data-testid="button-export-pdf">
              <FileDown className="w-4 h-4 mr-2" />
              পিডিএফ ডাউনলোড
            </Button>
          </div>
        </CardContent>
      </Card>

      {conflicts.length > 0 && (
        <Alert variant="destructive" className="mb-6" data-testid="alert-conflicts">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">সংঘাত সনাক্ত করা হয়েছে:</div>
            {conflicts.map((conflict, index) => (
              <div key={index} className="mb-2" data-testid={`conflict-${index}`}>
                <div className="font-medium">{conflict.message}</div>
                <div className="text-sm">{conflict.details}</div>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Feature 7: Upcoming Substitutions */}
      {substitutions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              আসন্ন বিকল্প শিক্ষক
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {substitutions.slice(0, 3).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <div>
                    <div className="font-medium">তারিখ: {new Date(sub.date).toLocaleDateString('bn-BD')}</div>
                    <div className="text-sm text-gray-600">{sub.reason_bn || sub.reason}</div>
                  </div>
                  <Badge variant="secondary">বিকল্প</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border p-3 text-left font-semibold min-w-[120px]">পিরিয়ড / দিন</th>
                  {DAYS.map((day, index) => (
                    <th key={day} className="border p-3 text-center font-semibold min-w-[150px]">
                      {day}
                      <div className="text-xs text-gray-500 font-normal">{DAYS_EN[index]}</div>
                      {/* Feature 3: Clear Day */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-1" data-testid={`button-clear-day-${index}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>দিন মুছুন?</AlertDialogTitle>
                            <AlertDialogDescription>
                              এটি {day} দিনের সকল পিরিয়ড মুছে ফেলবে।
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>বাতিল</AlertDialogCancel>
                            <AlertDialogAction onClick={() => clearDayMutation.mutate(index)}>
                              মুছে ফেলুন
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.filter(p => p.period_number <= 7).map((period) => {
                  const isBreak = isBreakPeriod(period.period_number);
                  
                  return (
                    <tr key={period.id}>
                      <td className="border p-3 bg-gray-50 dark:bg-gray-800">
                        <div className="font-medium">
                          {period.name}
                          {isBreak && <Badge variant="secondary" className="ml-2">বিরতি</Badge>}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {period.start_time} - {period.end_time}
                        </div>
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const slot = getSlotForDayAndPeriod(dayIndex, period.period_number);
                        const isEditing = editingSlot?.day === dayIndex && editingSlot?.periodNum === period.period_number;

                        return (
                          <td key={dayIndex} className="border p-2 text-center">
                            {isEditing ? (
                              <PermissionGate permission={PERMISSIONS.EDIT_TIMETABLE}>
                                <div className="space-y-2 p-2">
                                  {/* Feature 5: Period Type Dropdown */}
                                  <Select 
                                    value={periodForm.period_type} 
                                    onValueChange={(v) => setPeriodForm({ ...periodForm, period_type: v })}
                                    disabled={isBreak}
                                  >
                                    <SelectTrigger data-testid="select-period-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PERIOD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label} ({type.labelEn})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  {/* Feature 1: Disable fields for break periods */}
                                  <Input
                                    placeholder="বিষয়"
                                    value={periodForm.subject}
                                    onChange={(e) => setPeriodForm({ ...periodForm, subject: e.target.value })}
                                    size={1}
                                    data-testid="input-subject"
                                    disabled={isBreak || periodForm.period_type === 'break'}
                                  />
                                  <Input
                                    placeholder="শিক্ষক"
                                    value={periodForm.teacher_name}
                                    onChange={(e) => setPeriodForm({ ...periodForm, teacher_name: e.target.value })}
                                    size={1}
                                    data-testid="input-teacher"
                                    disabled={isBreak || periodForm.period_type === 'break'}
                                  />
                                  <Input
                                    placeholder="রুম নম্বর"
                                    value={periodForm.room_number}
                                    onChange={(e) => setPeriodForm({ ...periodForm, room_number: e.target.value })}
                                    size={1}
                                    data-testid="input-room"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveSlot(dayIndex, period.period_number)}
                                      data-testid="button-save"
                                      disabled={savePeriodMutation.isPending || (isBreak && periodForm.period_type !== 'break')}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingSlot(null);
                                        setConflicts([]);
                                      }}
                                      data-testid="button-cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </PermissionGate>
                            ) : slot ? (
                              <PermissionGate permission={PERMISSIONS.EDIT_TIMETABLE} fallback={
                                <div
                                  className={`p-2 rounded ${PERIOD_TYPE_COLORS[slot.period_type] || PERIOD_TYPE_COLORS.regular}`}
                                  data-testid={`slot-${dayIndex}-${period.period_number}`}
                                >
                                  <div className="font-medium text-sm">{slot.subject_bn || slot.subject}</div>
                                  {slot.teacher_name && (
                                    <div className="text-xs text-gray-600 mt-1">{slot.teacher_name}</div>
                                  )}
                                  {slot.room_number && (
                                    <div className="text-xs text-gray-500">রুম: {slot.room_number}</div>
                                  )}
                                  {/* Feature 5: Period Type Badge */}
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {PERIOD_TYPES.find(t => t.value === slot.period_type)?.label || 'নিয়মিত'}
                                  </Badge>
                                </div>
                              }>
                                <div
                                  className={`p-2 rounded hover:opacity-80 transition-colors cursor-pointer ${PERIOD_TYPE_COLORS[slot.period_type] || PERIOD_TYPE_COLORS.regular}`}
                                  onClick={() => !isBreak && handleEditSlot(dayIndex, period.period_number)}
                                  data-testid={`slot-${dayIndex}-${period.period_number}`}
                                >
                                  <div className="font-medium text-sm">{slot.subject_bn || slot.subject}</div>
                                  {slot.teacher_name && (
                                    <div className="text-xs text-gray-600 mt-1">{slot.teacher_name}</div>
                                  )}
                                  {slot.room_number && (
                                    <div className="text-xs text-gray-500">রুম: {slot.room_number}</div>
                                  )}
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {PERIOD_TYPES.find(t => t.value === slot.period_type)?.label || 'নিয়মিত'}
                                  </Badge>
                                </div>
                              </PermissionGate>
                            ) : (
                              <PermissionGate permission={PERMISSIONS.EDIT_TIMETABLE} fallback={
                                <div className="w-full h-full min-h-[60px]"></div>
                              }>
                                {!isBreak && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-full min-h-[60px]"
                                    onClick={() => handleEditSlot(dayIndex, period.period_number)}
                                    data-testid={`button-add-${dayIndex}-${period.period_number}`}
                                  >
                                    <Plus className="w-4 h-4 text-gray-400" />
                                  </Button>
                                )}
                              </PermissionGate>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!periods || periods.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">কোন পিরিয়ড কনফিগার করা হয়নি</p>
                <p className="text-sm">টাইমটেবিল তৈরি করতে প্রথমে ক্লাস পিরিয়ড কনফিগার করুন</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );

  // Render teacher view
  const renderTeacherView = () => (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>শিক্ষক নির্বাচন করুন</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger data-testid="select-teacher">
              <SelectValue placeholder="একজন শিক্ষক নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {availableTeachers.map((teacher) => (
                <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTeacher && (
        <>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5" />
                <span className="font-semibold">{selectedTeacher} এর সাপ্তাহিক সময়সূচী</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueClasses.map((classKey, index) => (
                  <Badge 
                    key={classKey} 
                    variant="outline" 
                    className={`${CLASS_COLORS[index % CLASS_COLORS.length]} border-2`}
                    data-testid={`badge-class-${index}`}
                  >
                    {classKey}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="border p-3 text-left font-semibold min-w-[120px]">পিরিয়ড / দিন</th>
                      {DAYS.map((day, index) => (
                        <th key={day} className="border p-3 text-center font-semibold min-w-[150px]">
                          {day}
                          <div className="text-xs text-gray-500 font-normal">{DAYS_EN[index]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.filter(p => p.period_number <= 7).map((period) => (
                      <tr key={period.id}>
                        <td className="border p-3 bg-gray-50 dark:bg-gray-800">
                          <div className="font-medium">{period.name}</div>
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {period.start_time} - {period.end_time}
                          </div>
                        </td>
                        {DAYS.map((_, dayIndex) => {
                          const slot = getTeacherSlotForDayAndPeriod(dayIndex, period.period_number);

                          return (
                            <td key={dayIndex} className="border p-2 text-center" data-testid={`teacher-slot-${dayIndex}-${period.period_number}`}>
                              {slot ? (
                                <div
                                  className={`p-2 rounded border-2 ${getClassColor(slot.class_name || '', slot.section || '')}`}
                                >
                                  <div className="font-medium text-sm">{slot.subject_bn || slot.subject}</div>
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                    {slot.class_name} {slot.section}
                                  </div>
                                  {slot.room_number && (
                                    <div className="text-xs text-gray-600">রুম: {slot.room_number}</div>
                                  )}
                                  {/* Feature 5: Period Type in Teacher View */}
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {PERIOD_TYPES.find(t => t.value === slot.period_type)?.label || 'নিয়মিত'}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="w-full h-full min-h-[60px] bg-gray-50 dark:bg-gray-900/20 rounded flex items-center justify-center text-gray-400">
                                  <span className="text-xs">ফাঁকা</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {teacherSchedule.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">কোন সময়সূচী পাওয়া যায়নি</p>
                    <p className="text-sm">এই শিক্ষকের জন্য কোন ক্লাস নির্ধারিত নেই</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedTeacher && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">একজন শিক্ষক নির্বাচন করুন</p>
            <p className="text-sm">তাদের সাপ্তাহিক সময়সূচী দেখতে উপরের ড্রপডাউন থেকে একজন শিক্ষক নির্বাচন করুন</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <AppShell>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Calendar className="w-8 h-8" />
              ক্লাস টাইমটেবিল
            </h1>
            <p className="text-gray-600 mt-1">সম্পূর্ণ ফিচার সহ সময়সূচী ব্যবস্থাপনা</p>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'class' ? 'default' : 'outline'}
              onClick={() => setViewMode('class')}
              data-testid="button-view-class"
            >
              <Calendar className="w-4 h-4 mr-2" />
              ক্লাস ভিউ
            </Button>
            <Button
              variant={viewMode === 'teacher' ? 'default' : 'outline'}
              onClick={() => setViewMode('teacher')}
              data-testid="button-view-teacher"
            >
              <User className="w-4 h-4 mr-2" />
              শিক্ষক ভিউ
            </Button>
          </div>
        </div>

        {viewMode === 'class' ? renderClassView() : renderTeacherView()}
      </div>
    </AppShell>
  );
}
