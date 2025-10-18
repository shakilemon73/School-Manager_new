import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useDesignSystem } from '@/hooks/use-design-system';
import { designClasses } from '@/lib/design-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import type { Student, Class, Subject } from '@shared/schema';
import {
  Users,
  UserCheck,
  UserX,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Save,
  RotateCcw,
  Eye,
  Edit
} from 'lucide-react';

// UX-Enhanced Components
const UXCard = ({ children, interactive = false, ...props }: any) => {
  const baseClasses = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200";
  const interactiveClasses = interactive ? "hover:scale-[1.02] cursor-pointer hover:border-slate-300 dark:hover:border-slate-600" : "";
  
  return (
    <Card className={cn(baseClasses, interactiveClasses)} {...props}>
      {children}
    </Card>
  );
};

const UXButton = ({ children, variant = "primary", size = "default", ...props }: any) => {
  const variantClass = (designClasses.button as Record<string, string>)[variant] || designClasses.button.primary;
  const sizeClasses = size === "sm" ? "px-3 py-2 text-sm min-h-[40px]" : "px-4 py-2.5 min-h-[44px]";
  
  return (
    <Button className={cn(variantClass, sizeClasses)} {...props}>
      {children}
    </Button>
  );
};

const AttendanceStatsCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <UXCard>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
          color === "red" && "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
          color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </UXCard>
);

export default function AttendanceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isModified, setIsModified] = useState(false);

  // Initialize UX design system
  useDesignSystem();

  // Fetch classes for teacher
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ['/api/teachers/classes'],
    staleTime: 300000,
  });

  // Fetch subjects for teacher
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/teachers/subjects'],
    staleTime: 300000,
  });

  // Fetch students for selected class
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students', { class: selectedClass }],
    enabled: !!selectedClass,
    staleTime: 60000,
  });

  // Migrated to direct Supabase: Attendance CRUD
  // Fetch attendance data
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['attendance', { 
      date: format(selectedDate, 'yyyy-MM-dd'),
      class: selectedClass,
      subject: selectedSubject
    }],
    queryFn: async () => {
      let query = supabase.from('attendance').select('*').eq('school_id', schoolId);
      
      if (selectedDate) {
        query = query.eq('date', format(selectedDate, 'yyyy-MM-dd'));
      }
      
      // Get student IDs for the selected class if class is selected
      if (selectedClass) {
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', schoolId)
          .eq('class', selectedClass);
        
        if (classStudents && classStudents.length > 0) {
          const studentIds = classStudents.map(s => s.id);
          query = query.in('student_id', studentIds);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Convert snake_case to camelCase for UI
      return (data || []).map((record: any) => ({
        id: record.id,
        studentId: record.student_id,
        classId: record.class_id,
        date: record.date,
        status: record.status,
        remarks: record.remarks,
        schoolId: record.school_id,
        createdAt: record.created_at
      }));
    },
    enabled: !!selectedClass && !!selectedSubject,
    staleTime: 30000,
  });

  // Fetch attendance statistics
  const { data: stats } = useQuery({
    queryKey: ['attendance-stats', { class: selectedClass }],
    queryFn: async () => {
      if (!selectedClass) return null;
      
      // Get student IDs for the selected class
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class', selectedClass);
      
      if (!classStudents || classStudents.length === 0) {
        return { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };
      }
      
      const studentIds = classStudents.map(s => s.id);
      
      // Get all attendance records for these students
      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', studentIds);
      
      if (error) throw error;
      
      const records = attendanceRecords || [];
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const total = records.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return { total, present, absent, late, percentage };
    },
    enabled: !!selectedClass,
    staleTime: 60000,
  });

  // Save attendance mutation
  const saveAttendance = useMutation({
    mutationFn: async (attendanceData: any) => {
      // Get class ID from class name
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', selectedClass)
        .single();
      
      const classId = classData?.id || null;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get student IDs from attendance data
      const studentIds = attendanceData.map((record: any) => record.studentId);
      
      // Delete existing attendance records for these students on this date
      await supabase
        .from('attendance')
        .delete()
        .eq('school_id', schoolId)
        .eq('date', dateStr)
        .in('student_id', studentIds);
      
      // Transform attendance data to database format (snake_case)
      const attendanceRecords = attendanceData.map((record: any) => ({
        student_id: record.studentId,
        class_id: classId,
        date: dateStr,
        status: record.status,
        remarks: record.remarks || null,
        school_id: schoolId,
      }));
      
      // Insert new attendance records
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendanceRecords)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "উপস্থিতি সংরক্ষিত হয়েছে",
      });
      setIsModified(false);
    },
    onError: (error) => {
      console.error('Attendance save error:', error);
      toast({
        title: "ত্রুটি!",
        description: "উপস্থিতি সংরক্ষণে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Initialize attendance data when students change
  useEffect(() => {
    if (students.length > 0) {
      const initialData = students.map((student: any) => {
        const existing = existingAttendance.find((att: any) => att.studentId === student.id);
        return {
          studentId: student.id,
          studentName: student.name,
          studentNameBn: student.nameInBangla,
          rollNumber: student.rollNumber,
          status: existing?.status || 'present',
          remarks: existing?.remarks || ''
        };
      });
      setAttendanceData(initialData);
    }
  }, [students, existingAttendance]);

  const handleAttendanceChange = (studentId: number, status: string, remarks?: string) => {
    setAttendanceData(prev => prev.map(item => 
      item.studentId === studentId 
        ? { ...item, status, remarks: remarks !== undefined ? remarks : item.remarks }
        : item
    ));
    setIsModified(true);
  };

  const handleBulkAttendance = (status: string) => {
    setAttendanceData(prev => prev.map(item => ({ ...item, status })));
    setIsModified(true);
  };

  const filteredStudents = attendanceData.filter(student =>
    student.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentNameBn?.includes(searchQuery) ||
    student.rollNumber?.toString().includes(searchQuery)
  );

  const attendanceStats = {
    present: attendanceData.filter(s => s.status === 'present').length,
    absent: attendanceData.filter(s => s.status === 'absent').length,
    late: attendanceData.filter(s => s.status === 'late').length,
    total: attendanceData.length
  };

  const attendancePercentage = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              উপস্থিতি ব্যবস্থাপনা
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              ছাত্রছাত্রীদের উপস্থিতি নিন এবং রেকর্ড রাখুন
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UXButton variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              রিপোর্ট ডাউনলোড
            </UXButton>
            <UXButton 
              variant="primary" 
              size="sm"
              onClick={() => saveAttendance.mutate(attendanceData)}
              disabled={!isModified || saveAttendance.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAttendance.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </UXButton>
          </div>
        </div>

        {/* Filters */}
        <UXCard>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">তারিখ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <UXButton variant="secondary" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(selectedDate, 'dd/MM/yyyy')}
                    </UXButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">শ্রেণী</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">বিষয়</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.name}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">খুঁজুন</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="নাম বা রোল নং"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </UXCard>

        {selectedClass && selectedSubject && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <AttendanceStatsCard
                title="উপস্থিত"
                value={attendanceStats.present}
                subtitle={`${attendancePercentage}% মোট`}
                icon={UserCheck}
                color="green"
              />
              <AttendanceStatsCard
                title="অনুপস্থিত"
                value={attendanceStats.absent}
                subtitle={`${Math.round((attendanceStats.absent / attendanceStats.total) * 100)}% মোট`}
                icon={UserX}
                color="red"
              />
              <AttendanceStatsCard
                title="দেরি"
                value={attendanceStats.late}
                subtitle={`${Math.round((attendanceStats.late / attendanceStats.total) * 100)}% মোট`}
                icon={Clock}
                color="orange"
              />
              <AttendanceStatsCard
                title="মোট ছাত্র"
                value={attendanceStats.total}
                subtitle="সব মিলিয়ে"
                icon={Users}
                color="blue"
              />
            </div>

            {/* Bulk Actions */}
            <UXCard>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    সবার উপস্থিতি একসাথে নির্ধারণ করুন
                  </h3>
                  <div className="flex items-center gap-3">
                    <UXButton 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleBulkAttendance('present')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      সবাই উপস্থিত
                    </UXButton>
                    <UXButton 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleBulkAttendance('absent')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      সবাই অনুপস্থিত
                    </UXButton>
                    <UXButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const initialData = students.map((student: any) => ({
                          studentId: student.id,
                          studentName: student.name,
                          studentNameBn: student.nameInBangla,
                          rollNumber: student.rollNumber,
                          status: 'present',
                          remarks: ''
                        }));
                        setAttendanceData(initialData);
                        setIsModified(false);
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      রিসেট করুন
                    </UXButton>
                  </div>
                </div>
              </CardContent>
            </UXCard>

            {/* Attendance Table */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  ছাত্রছাত্রীদের তালিকা ({filteredStudents.length} জন)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">রোল</TableHead>
                          <TableHead>নাম</TableHead>
                          <TableHead>বাংলা নাম</TableHead>
                          <TableHead className="text-center">উপস্থিতি</TableHead>
                          <TableHead>মন্তব্য</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.studentId}>
                            <TableCell className="font-medium">
                              {student.rollNumber}
                            </TableCell>
                            <TableCell>{student.studentName}</TableCell>
                            <TableCell>{student.studentNameBn}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center space-x-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`attendance-${student.studentId}`}
                                    value="present"
                                    checked={student.status === 'present'}
                                    onChange={() => handleAttendanceChange(student.studentId, 'present')}
                                    className="text-green-600"
                                  />
                                  <span className="text-sm text-green-600">উপস্থিত</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`attendance-${student.studentId}`}
                                    value="absent"
                                    checked={student.status === 'absent'}
                                    onChange={() => handleAttendanceChange(student.studentId, 'absent')}
                                    className="text-red-600"
                                  />
                                  <span className="text-sm text-red-600">অনুপস্থিত</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`attendance-${student.studentId}`}
                                    value="late"
                                    checked={student.status === 'late'}
                                    onChange={() => handleAttendanceChange(student.studentId, 'late')}
                                    className="text-orange-600"
                                  />
                                  <span className="text-sm text-orange-600">দেরি</span>
                                </label>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="মন্তব্য (ঐচ্ছিক)"
                                value={student.remarks}
                                onChange={(e) => handleAttendanceChange(student.studentId, student.status, e.target.value)}
                                className="w-40"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </UXCard>

            {/* Modified indicator */}
            {isModified && (
              <div className="fixed bottom-6 right-6 bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      পরিবর্তন সংরক্ষিত হয়নি
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      সংরক্ষণ করতে উপরের বোতাম ব্যবহার করুন
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedClass && (
          <UXCard>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                শ্রেণী ও বিষয় নির্বাচন করুন
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                উপস্থিতি নেওয়ার জন্য প্রথমে শ্রেণী এবং বিষয় নির্বাচন করুন
              </p>
            </CardContent>
          </UXCard>
        )}
      </div>
    </AppShell>
  );
}