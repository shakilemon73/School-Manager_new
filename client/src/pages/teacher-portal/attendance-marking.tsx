import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { CheckCircle, XCircle, Save, Users, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function AttendanceMarking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});

  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const getCurrentTeacherId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', user?.email)
      .single();
    
    if (error || !data) throw new Error('Teacher ID not found');
    return data.id;
  };

  const { data: students, isLoading } = useQuery({
    queryKey: ['class-students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class', selectedClass)
        .order('roll_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-records', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass || !selectedDate) return [];
      
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', schoolId)
        .eq('date', selectedDate);
      
      if (error) throw error;
      
      const attendanceMap: Record<number, 'present' | 'absent'> = {};
      data?.forEach(record => {
        attendanceMap[record.student_id] = record.status as 'present' | 'absent';
      });
      
      setAttendance(attendanceMap);
      return data || [];
    },
    enabled: !!selectedClass && !!selectedDate
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceData: any[]) => {
      const schoolId = await getCurrentSchoolId();
      const teacherId = await getCurrentTeacherId();
      
      const { error } = await supabase
        .from('attendance_records')
        .upsert(attendanceData.map(record => ({
          ...record,
          school_id: schoolId,
          teacher_id: teacherId,
          date: selectedDate
        })), { onConflict: 'student_id, date' });
      
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: teacherId,
        user_type: 'teacher',
        action: 'attendance_marked',
        entity_type: 'attendance',
        entity_id: 0,
        description: `Marked attendance for ${attendanceData.length} students in class ${selectedClass}`,
        metadata: {
          class: selectedClass,
          date: selectedDate,
          student_count: attendanceData.length,
          present_count: attendanceData.filter(a => a.status === 'present').length
        },
        school_id: schoolId
      });
    },
    onSuccess: () => {
      toast({
        title: 'উপস্থিতি সংরক্ষিত হয়েছে',
        description: 'উপস্থিতি রেকর্ড সফলভাবে সংরক্ষণ করা হয়েছে',
      });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
    onError: () => {
      toast({
        title: 'ত্রুটি',
        description: 'উপস্থিতি সংরক্ষণে সমস্যা হয়েছে',
        variant: 'destructive'
      });
    }
  });

  const handleAttendanceToggle = (studentId: number, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = () => {
    const attendanceData = students?.map(student => ({
      student_id: student.id,
      status: attendance[student.id] || 'absent'
    })).filter(record => attendance[record.student_id]);

    if (attendanceData && attendanceData.length > 0) {
      saveAttendanceMutation.mutate(attendanceData);
    }
  };

  const markAllPresent = () => {
    const allPresent: Record<number, 'present'> = {};
    students?.forEach(student => {
      allPresent[student.id] = 'present';
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent: Record<number, 'absent'> = {};
    students?.forEach(student => {
      allAbsent[student.id] = 'absent';
    });
    setAttendance(allAbsent);
  };

  const getAttendanceStats = () => {
    const total = students?.length || 0;
    const marked = Object.keys(attendance).length;
    const present = Object.values(attendance).filter(status => status === 'present').length;
    const absent = Object.values(attendance).filter(status => status === 'absent').length;
    
    return { total, marked, present, absent };
  };

  const stats = getAttendanceStats();

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/teacher">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              শিক্ষক ড্যাশবোর্ডে ফিরে যান
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">উপস্থিতি নিন</CardTitle>
            <CardDescription>ছাত্রছাত্রীদের উপস্থিতি রেকর্ড করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">তারিখ</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">শ্রেণী</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="শ্রেণী বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {['৬', '৭', '৮', '৯', '১০'].map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllPresent}
                  disabled={!students || students.length === 0}
                  className="flex-1"
                >
                  সবাই উপস্থিত
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAbsent}
                  disabled={!students || students.length === 0}
                  className="flex-1"
                >
                  সবাই অনুপস্থিত
                </Button>
              </div>
            </div>

            {selectedClass && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-blue-700">মোট ছাত্র</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  <p className="text-sm text-green-700">উপস্থিত</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-sm text-red-700">অনুপস্থিত</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{stats.total - stats.marked}</p>
                  <p className="text-sm text-gray-700">অচিহ্নিত</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClass && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  ছাত্রছাত্রী তালিকা ({students?.length || 0} জন)
                </CardTitle>
                <Button
                  onClick={handleSaveAttendance}
                  disabled={saveAttendanceMutation.isPending || Object.keys(attendance).length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  উপস্থিতি সংরক্ষণ করুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">লোড হচ্ছে...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students?.map((student) => (
                    <div
                      key={student.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        attendance[student.id] === 'present'
                          ? 'border-green-500 bg-green-50'
                          : attendance[student.id] === 'absent'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">রোল: {student.roll_number}</p>
                        </div>
                        {attendance[student.id] && (
                          <Badge className={
                            attendance[student.id] === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }>
                            {attendance[student.id] === 'present' ? 'উপস্থিত' : 'অনুপস্থিত'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAttendanceToggle(student.id, 'present')}
                          className={attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          উপস্থিত
                        </Button>
                        <Button
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAttendanceToggle(student.id, 'absent')}
                          className={attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          অনুপস্থিত
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
