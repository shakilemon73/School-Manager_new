// Migrated to direct Supabase: Timetable using routine_periods and periods tables
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
import { Calendar, Clock, Plus, Edit2, Save, X, AlertCircle, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

export default function TimetablePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const { hasPermission, teacherClassSubjects, userRole } = usePermissions();
  
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
  });
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

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

  // Fetch routine periods (actual timetable data) for class view
  const { data: routinePeriods = [], isLoading } = useQuery({
    queryKey: ['routine-periods', schoolId, selectedClass, selectedSection],
    queryFn: async () => {
      const { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
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
    enabled: viewMode === 'class',
  });

  // Fetch all routine periods for teacher view
  const { data: allRoutinePeriods = [] } = useQuery({
    queryKey: ['all-routine-periods', schoolId],
    queryFn: async () => {
      // First get all routines
      const { data: routines } = await supabase
        .from('class_routines')
        .select('id, class_name, section')
        .eq('school_id', schoolId);

      if (!routines || routines.length === 0) return [];

      // Get all routine periods
      const { data, error } = await supabase
        .from('routine_periods')
        .select('*')
        .in('routine_id', routines.map(r => r.id))
        .order('day_of_week')
        .order('period_number');
      
      if (error) throw error;

      // Attach class info to each period
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
    enabled: viewMode === 'teacher',
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
    if (viewMode === 'teacher' && userRole === 'teacher' && !selectedTeacher) {
      // Get teacher name from permissions or set first available
      if (availableTeachers.length > 0) {
        setSelectedTeacher(availableTeachers[0]);
      }
    }
  }, [viewMode, userRole, availableTeachers, selectedTeacher]);

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

    // Get all routines
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

    // Check for class conflicts (same class having multiple subjects at the same time)
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
      // Check for conflicts before saving
      const detectedConflicts = await checkConflicts(day, periodNum, data.teacher_name, data.room_number);
      
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        throw new Error('সংঘাত সনাক্ত করা হয়েছে। সংরক্ষণ করা হয়নি।');
      }

      // First ensure routine exists
      let { data: routine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_name', `Class ${selectedClass}`)
        .eq('section', selectedSection)
        .single();

      if (!routine) {
        // Create routine
        const { data: newRoutine } = await supabase
          .from('class_routines')
          .insert([{
            class_name: `Class ${selectedClass}`,
            section: selectedSection,
            academic_year: new Date().getFullYear().toString(),
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

      // Check if period exists
      const existing = routinePeriods.find(p => p.day_of_week === day && p.period_number === periodNum);

      // Verify routine belongs to this school before modifying
      const { data: verifiedRoutine } = await supabase
        .from('class_routines')
        .select('id')
        .eq('id', routine.id)
        .eq('school_id', schoolId)
        .single();

      if (!verifiedRoutine) throw new Error('Unauthorized: routine does not belong to this school');

      if (existing) {
        // Update
        const { error } = await supabase
          .from('routine_periods')
          .update(data)
          .eq('id', existing.id)
          .eq('routine_id', routine.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('routine_periods')
          .insert([{
            routine_id: routine.id,
            day_of_week: day,
            period_number: periodNum,
            ...data,
            period_type: 'regular',
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-periods'] });
      queryClient.invalidateQueries({ queryKey: ['all-routine-periods'] });
      toast({ title: 'সফল', description: 'সময়সূচী আপডেট হয়েছে' });
      setEditingSlot(null);
      setPeriodForm({ subject: '', subject_bn: '', teacher_name: '', room_number: '', start_time: '', end_time: '' });
      setConflicts([]);
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
    const slot = getSlotForDayAndPeriod(day, periodNum);
    if (slot) {
      setPeriodForm({
        subject: slot.subject,
        subject_bn: slot.subject_bn || '',
        teacher_name: slot.teacher_name,
        room_number: slot.room_number || '',
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
    }
    setEditingSlot({ day, periodNum });
    setConflicts([]); // Clear previous conflicts
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
                      const slot = getSlotForDayAndPeriod(dayIndex, period.period_number);
                      const isEditing = editingSlot?.day === dayIndex && editingSlot?.periodNum === period.period_number;

                      return (
                        <td key={dayIndex} className="border p-2 text-center">
                          {isEditing ? (
                            <PermissionGate permission={PERMISSIONS.EDIT_TIMETABLE}>
                              <div className="space-y-2 p-2">
                                <Input
                                  placeholder="বিষয়"
                                  value={periodForm.subject}
                                  onChange={(e) => setPeriodForm({ ...periodForm, subject: e.target.value })}
                                  size={1}
                                  data-testid="input-subject"
                                />
                                <Input
                                  placeholder="শিক্ষক"
                                  value={periodForm.teacher_name}
                                  onChange={(e) => setPeriodForm({ ...periodForm, teacher_name: e.target.value })}
                                  size={1}
                                  data-testid="input-teacher"
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
                                    disabled={savePeriodMutation.isPending}
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
                                className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded"
                                data-testid={`slot-${dayIndex}-${period.period_number}`}
                              >
                                <div className="font-medium text-sm">{slot.subject_bn || slot.subject}</div>
                                {slot.teacher_name && (
                                  <div className="text-xs text-gray-600 mt-1">{slot.teacher_name}</div>
                                )}
                                {slot.room_number && (
                                  <div className="text-xs text-gray-500">রুম: {slot.room_number}</div>
                                )}
                              </div>
                            }>
                              <div
                                className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                                onClick={() => handleEditSlot(dayIndex, period.period_number)}
                                data-testid={`slot-${dayIndex}-${period.period_number}`}
                              >
                                <div className="font-medium text-sm">{slot.subject_bn || slot.subject}</div>
                                {slot.teacher_name && (
                                  <div className="text-xs text-gray-600 mt-1">{slot.teacher_name}</div>
                                )}
                                {slot.room_number && (
                                  <div className="text-xs text-gray-500">রুম: {slot.room_number}</div>
                                )}
                              </div>
                            </PermissionGate>
                          ) : (
                            <PermissionGate permission={PERMISSIONS.EDIT_TIMETABLE} fallback={
                              <div className="w-full h-full min-h-[60px]"></div>
                            }>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-full min-h-[60px]"
                                onClick={() => handleEditSlot(dayIndex, period.period_number)}
                                data-testid={`button-add-${dayIndex}-${period.period_number}`}
                              >
                                <Plus className="w-4 h-4 text-gray-400" />
                              </Button>
                            </PermissionGate>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
            <p className="text-gray-600 mt-1">ইন্টারঅ্যাক্টিভ সময়সূচী ব্যবস্থাপনা</p>
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
