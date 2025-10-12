import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { Calendar, Clock, Plus, Edit2 } from 'lucide-react';
import { TimetableSlot, Period, Subject } from '@/lib/new-features-types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('Class 6');
  const [selectedSection, setSelectedSection] = useState('A');

  const getCurrentSchoolId = async (): Promise<number> => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  // Fetch periods
  const { data: periods } = useQuery({
    queryKey: ['/api/periods'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('school_id', schoolId)
        .order('period_number');
      
      if (error) throw error;
      return data as Period[];
    }
  });

  // Fetch timetable slots
  const { data: slots, isLoading } = useQuery({
    queryKey: ['/api/timetable', selectedClass, selectedSection],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          subjects (subject_name),
          teachers (name)
        `)
        .eq('school_id', schoolId)
        .eq('class', selectedClass)
        .eq('section', selectedSection);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch subjects for assignment
  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as Subject[];
    }
  });

  const getSlotForDayAndPeriod = (day: number, periodId: number) => {
    return slots?.find(s => s.day_of_week === day && s.period_id === periodId);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Class Timetable</h1>
          <p className="text-gray-600 mt-1">Interactive timetable management</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Class & Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger data-testid="select-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 
                    'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
                <tr className="bg-gray-50">
                  <th className="border p-3 text-left font-semibold">Period / Day</th>
                  {DAYS.slice(0, 6).map((day) => (
                    <th key={day} className="border p-3 text-center font-semibold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods?.map((period) => (
                  <tr key={period.id}>
                    <td className="border p-3 bg-gray-50">
                      <div className="font-medium">{period.period_name}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {period.start_time} - {period.end_time}
                      </div>
                    </td>
                    {DAYS.slice(0, 6).map((_, dayIndex) => {
                      const slot = getSlotForDayAndPeriod(dayIndex, period.id);
                      return (
                        <td key={dayIndex} className="border p-2 text-center">
                          {slot ? (
                            <div className="bg-blue-50 p-2 rounded hover:bg-blue-100 transition-colors">
                              <div className="font-medium text-sm" data-testid={`slot-subject-${slot.id}`}>
                                {slot.subjects?.subject_name || 'No Subject'}
                              </div>
                              {slot.teachers && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {slot.teachers.name}
                                </div>
                              )}
                              {slot.room_number && (
                                <div className="text-xs text-gray-500">
                                  Room: {slot.room_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
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
                <p className="text-lg font-medium">No periods configured</p>
                <p className="text-sm">Configure class periods first to create the timetable</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
