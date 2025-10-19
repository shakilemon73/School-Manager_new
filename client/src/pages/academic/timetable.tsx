// Migrated to direct Supabase: Timetable using routine_periods and periods tables
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { Calendar, Clock, Plus, Edit2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';

const DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
}

export default function TimetablePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [selectedClass, setSelectedClass] = useState('6');
  const [selectedSection, setSelectedSection] = useState('A');
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
      
      // If no periods exist, create default ones for each day
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
        
        // Create periods for all days (0-5 = Sunday-Friday)
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

  // Fetch routine periods (actual timetable data)
  const { data: routinePeriods = [], isLoading } = useQuery({
    queryKey: ['routine-periods', schoolId, selectedClass, selectedSection],
    queryFn: async () => {
      // First check if a routine exists for this class
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

  // Create or update routine period mutation
  const savePeriodMutation = useMutation({
    mutationFn: async ({ day, periodNum, data }: { day: number; periodNum: number; data: any }) => {
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
      toast({ title: 'সফল', description: 'সময়সূচী আপডেট হয়েছে' });
      setEditingSlot(null);
      setPeriodForm({ subject: '', subject_bn: '', teacher_name: '', room_number: '', start_time: '', end_time: '' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const getSlotForDayAndPeriod = (day: number, periodNum: number) => {
    return routinePeriods.find(s => s.day_of_week === day && s.period_number === periodNum);
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
  };

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
        </div>

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
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveSlot(dayIndex, period.period_number)}
                                    data-testid="button-save"
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingSlot(null)}
                                    data-testid="button-cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : slot ? (
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
                            ) : (
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
      </div>
    </AppShell>
  );
}
