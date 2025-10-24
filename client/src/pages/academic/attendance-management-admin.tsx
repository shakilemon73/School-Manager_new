import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { exportUtils } from '@/lib/export-utils';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { Link } from 'wouter';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  UserCheck,
  Download,
  Search,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  TrendingDown,
  Users,
  BookOpen,
  Edit,
  Trash2,
  Save,
  Plus,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InsertAttendance, InsertAttendancePeriod } from '@shared/schema';

export default function AttendanceManagementAdmin() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const { hasPermission, teacherClassSubjects } = usePermissions();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('daily');
  const [viewMode, setViewMode] = useState<'daily' | 'period'>('daily');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAttendance, setBulkAttendance] = useState<Record<number, string>>({});
  const [bulkPeriodAttendance, setBulkPeriodAttendance] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [periodEditDialogOpen, setPeriodEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', schoolId)
          .order('name');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-admin', schoolId, selectedClass, selectedSection, selectedDate],
    queryFn: async () => {
      try {
        let query = supabase
          .from('attendance')
          .select(`
            *,
            students!inner(id, name, student_id, class, section, school_id)
          `)
          .eq('students.school_id', schoolId);

        if (selectedClass && selectedClass !== 'all') {
          query = query.eq('students.class', selectedClass);
        }
        if (selectedSection && selectedSection !== 'all') {
          query = query.eq('students.section', selectedSection);
        }
        
        // Fetch last 30 days of data for trends
        const thirtyDaysAgo = subDays(new Date(), 30);
        query = query.gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'));

        const { data, error } = await query
          .order('date', { ascending: false })
          .limit(1000);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
        return [];
      }
    },
  });

  // Fetch students for statistics
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId, selectedClass, selectedSection],
    queryFn: async () => {
      try {
        let query = supabase
          .from('students')
          .select('*')
          .eq('school_id', schoolId)
          .eq('status', 'active');

        if (selectedClass && selectedClass !== 'all') {
          query = query.eq('class', selectedClass);
        }
        if (selectedSection && selectedSection !== 'all') {
          query = query.eq('section', selectedSection);
        }

        const { data, error } = await query.order('name');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch subjects for period-wise attendance
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', schoolId, selectedClass],
    queryFn: async () => {
      try {
        let query = supabase
          .from('subjects')
          .select('*')
          .eq('school_id', schoolId);

        if (selectedClass && selectedClass !== 'all') {
          query = query.eq('class_name', selectedClass);
        }

        const { data, error } = await query.order('name');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch period-wise attendance records
  const { data: periodAttendanceRecords = [], isLoading: periodAttendanceLoading } = useQuery({
    queryKey: ['attendance-periods', schoolId, selectedClass, selectedSection, selectedDate],
    queryFn: async () => {
      try {
        let query = supabase
          .from('attendance_periods')
          .select(`
            *,
            students!inner(id, name, student_id, class, section, school_id),
            subjects(id, name)
          `)
          .eq('students.school_id', schoolId)
          .eq('date', format(selectedDate, 'yyyy-MM-dd'));

        if (selectedClass && selectedClass !== 'all') {
          query = query.eq('students.class', selectedClass);
        }
        if (selectedSection && selectedSection !== 'all') {
          query = query.eq('students.section', selectedSection);
        }

        const { data, error } = await query.order('period_number');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Failed to fetch period attendance:', error);
        return [];
      }
    },
  });

  // Mark/Update attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (attendanceData: InsertAttendance) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          student_id: attendanceData.studentId,
          date: attendanceData.date,
          status: attendanceData.status,
          remarks: attendanceData.remarks,
          school_id: schoolId,
          class_id: attendanceData.classId,
        }, {
          onConflict: 'student_id,date',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-admin'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'উপস্থিতি সংরক্ষিত হয়েছে' : 'Attendance marked successfully',
      });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk mark attendance mutation
  const bulkMarkMutation = useMutation({
    mutationFn: async (attendanceList: InsertAttendance[]) => {
      const records = attendanceList.map(a => ({
        student_id: a.studentId,
        date: a.date,
        status: a.status,
        remarks: a.remarks,
        school_id: schoolId,
        class_id: a.classId,
      }));

      const { data, error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'student_id,date',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-admin'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'সকল উপস্থিতি সংরক্ষিত হয়েছে' : 'Bulk attendance marked successfully',
      });
      setBulkMode(false);
      setBulkAttendance({});
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete attendance mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, date }: { studentId: number; date: string }) => {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('student_id', studentId)
        .eq('date', date)
        .eq('school_id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-admin'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'উপস্থিতি মুছে ফেলা হয়েছে' : 'Attendance deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark/Update period-wise attendance mutation
  const markPeriodAttendanceMutation = useMutation({
    mutationFn: async (attendanceData: InsertAttendancePeriod) => {
      const { data, error } = await supabase
        .from('attendance_periods')
        .upsert({
          student_id: attendanceData.studentId,
          date: attendanceData.date,
          period_number: attendanceData.periodNumber,
          subject_id: attendanceData.subjectId,
          status: attendanceData.status,
          remarks: attendanceData.remarks,
          school_id: schoolId,
        }, {
          onConflict: 'student_id,date,period_number',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-periods'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'পিরিয়ড উপস্থিতি সংরক্ষিত হয়েছে' : 'Period attendance marked successfully',
      });
      setPeriodEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk mark period attendance mutation
  const bulkMarkPeriodMutation = useMutation({
    mutationFn: async (attendanceList: InsertAttendancePeriod[]) => {
      const records = attendanceList.map(a => ({
        student_id: a.studentId,
        date: a.date,
        period_number: a.periodNumber,
        subject_id: a.subjectId,
        status: a.status,
        remarks: a.remarks,
        school_id: schoolId,
      }));

      const { data, error } = await supabase
        .from('attendance_periods')
        .upsert(records, {
          onConflict: 'student_id,date,period_number',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-periods'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'সকল পিরিয়ড উপস্থিতি সংরক্ষিত হয়েছে' : 'Bulk period attendance marked successfully',
      });
      setBulkMode(false);
      setBulkPeriodAttendance({});
    },
    onError: (error: any) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper function to calculate attendance percentage
  const calculateAttendancePercentage = (studentId: number) => {
    const studentRecords = attendanceRecords.filter(r => r.student_id === studentId);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const totalCount = studentRecords.length;
    return totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
  };

  // Helper function to get attendance percentage color
  const getAttendancePercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Group period attendance by student and period
  const periodAttendanceMap = periodAttendanceRecords.reduce((acc, record) => {
    const key = `${record.student_id}-${record.period_number}`;
    acc[key] = record;
    return acc;
  }, {} as Record<string, any>);

  // Get unique periods from period attendance
  const uniquePeriods = Array.from(
    new Set(periodAttendanceRecords.map(r => r.period_number))
  ).sort((a, b) => a - b);

  // Calculate statistics
  const stats = {
    totalStudents: students.length,
    presentToday: attendanceRecords.filter(r => 
      r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'present'
    ).length,
    absentToday: attendanceRecords.filter(r => 
      r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'absent'
    ).length,
    lateToday: attendanceRecords.filter(r => 
      r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'late'
    ).length,
  };

  // Attendance trend data (last 7 days)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
    return {
      date: format(date, 'MMM dd'),
      present: dayRecords.filter(r => r.status === 'present').length,
      absent: dayRecords.filter(r => r.status === 'absent').length,
      late: dayRecords.filter(r => r.status === 'late').length,
    };
  });

  // Group attendance by student for the selected date
  const studentAttendanceMap = attendanceRecords.reduce((acc, record) => {
    const studentId = record.students?.id;
    if (studentId && record.date === format(selectedDate, 'yyyy-MM-dd')) {
      acc[studentId] = record;
    }
    return acc;
  }, {} as Record<number, any>);

  // Filter students by search
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    return (
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Low attendance students (less than 75%)
  const lowAttendanceStudents = students.map(student => {
    const studentRecords = attendanceRecords.filter(r => r.student_id === student.id);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const totalCount = studentRecords.length;
    const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 100;
    return { student, rate, totalCount };
  }).filter(s => s.rate < 75 && s.totalCount > 0);

  const handleExportAttendance = async (exportFormat: 'csv' | 'pdf' | 'excel') => {
    if (students.length === 0) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানির জন্য কোন ডেটা নেই' : 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = filteredStudents.map((student: any) => {
        const attendance = studentAttendanceMap[student.id];
        const studentRecords = attendanceRecords.filter(r => r.student_id === student.id);
        const presentCount = studentRecords.filter(r => r.status === 'present').length;
        const absentCount = studentRecords.filter(r => r.status === 'absent').length;
        const lateCount = studentRecords.filter(r => r.status === 'late').length;
        const totalDays = studentRecords.length;
        const attendanceRate = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0';

        return {
          'Student ID': student.student_id || '',
          'Student Name': student.name || '',
          'Class': student.class || '',
          'Section': student.section || '',
          'Date': format(selectedDate, 'yyyy-MM-dd'),
          'Status': attendance?.status || 'Not Marked',
          'Remarks': attendance?.remarks || '',
          'Total Days': totalDays,
          'Present': presentCount,
          'Absent': absentCount,
          'Late': lateCount,
          'Attendance Rate': `${attendanceRate}%`,
        };
      });

      const columns = [
        { header: 'Student ID', key: 'Student ID' },
        { header: 'Student Name', key: 'Student Name', width: 20 },
        { header: 'Class', key: 'Class' },
        { header: 'Section', key: 'Section' },
        { header: 'Date', key: 'Date' },
        { header: 'Status', key: 'Status' },
        { header: 'Remarks', key: 'Remarks', width: 25 },
        { header: 'Total Days', key: 'Total Days' },
        { header: 'Present', key: 'Present' },
        { header: 'Absent', key: 'Absent' },
        { header: 'Late', key: 'Late' },
        { header: 'Attendance Rate', key: 'Attendance Rate' },
      ];

      const filterDescription = [
        selectedClass && selectedClass !== 'all' ? `Class: ${selectedClass}` : '',
        selectedSection && selectedSection !== 'all' ? `Section: ${selectedSection}` : '',
        `Date: ${format(selectedDate, 'PPP')}`,
      ].filter(Boolean).join(' | ');

      const title = language === 'bn' ? 'উপস্থিতি রিপোর্ট' : 'Attendance Report';
      const description = filterDescription;

      const statsData = [
        { label: language === 'bn' ? 'মোট শিক্ষার্থী' : 'Total Students', value: stats.totalStudents },
        { label: language === 'bn' ? 'আজ উপস্থিত' : 'Present Today', value: stats.presentToday },
        { label: language === 'bn' ? 'আজ অনুপস্থিত' : 'Absent Today', value: stats.absentToday },
        { label: language === 'bn' ? 'আজ বিলম্বিত' : 'Late Today', value: stats.lateToday },
        { 
          label: language === 'bn' ? 'উপস্থিতির হার' : 'Present Percentage', 
          value: stats.totalStudents > 0 
            ? `${((stats.presentToday / stats.totalStudents) * 100).toFixed(1)}%` 
            : '0%' 
        },
      ];

      if (exportFormat === 'csv' || exportFormat === 'excel') {
        if (exportFormat === 'csv') {
          exportUtils.exportWithStats({
            filename: 'attendance-report',
            columns,
            data: exportData,
          }, statsData, 'csv');
        } else {
          exportUtils.exportWithStats({
            filename: 'attendance-report',
            title,
            columns,
            data: exportData,
          }, statsData, 'excel');
        }
      } else if (exportFormat === 'pdf') {
        exportUtils.exportWithStats({
          filename: 'attendance-report',
          title,
          description,
          columns,
          data: exportData,
          orientation: 'landscape',
        }, statsData, 'pdf');
      }

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' 
          ? `উপস্থিতি রিপোর্ট ${exportFormat.toUpperCase()} ফরম্যাটে রপ্তানি হয়েছে` 
          : `Attendance report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানিতে ব্যর্থ' : 'Failed to export attendance',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditAttendance = (student: any) => {
    const attendance = studentAttendanceMap[student.id];
    setSelectedStudent(student);
    setEditStatus(attendance?.status || 'present');
    setEditRemarks(attendance?.remarks || '');
    setEditDialogOpen(true);
  };

  const handleSaveAttendance = () => {
    if (!selectedStudent) return;

    markAttendanceMutation.mutate({
      studentId: selectedStudent.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: editStatus,
      remarks: editRemarks,
      schoolId,
    });
  };

  const handleDeleteAttendance = (student: any) => {
    if (!confirm(language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')) return;

    deleteAttendanceMutation.mutate({
      studentId: student.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const handleBulkSave = () => {
    if (viewMode === 'daily') {
      const attendanceList: InsertAttendance[] = Object.entries(bulkAttendance).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        date: format(selectedDate, 'yyyy-MM-dd'),
        status,
        schoolId,
      }));

      if (attendanceList.length === 0) {
        toast({
          title: language === 'bn' ? 'সতর্কতা' : 'Warning',
          description: language === 'bn' ? 'কোন উপস্থিতি চিহ্নিত হয়নি' : 'No attendance marked',
          variant: 'destructive',
        });
        return;
      }

      bulkMarkMutation.mutate(attendanceList);
    } else {
      const periodAttendanceList: InsertAttendancePeriod[] = Object.entries(bulkPeriodAttendance).map(([key, status]) => {
        const [studentId, periodNumber] = key.split('-').map(Number);
        return {
          studentId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          periodNumber,
          status,
          schoolId,
        };
      });

      if (periodAttendanceList.length === 0) {
        toast({
          title: language === 'bn' ? 'সতর্কতা' : 'Warning',
          description: language === 'bn' ? 'কোন পিরিয়ড উপস্থিতি চিহ্নিত হয়নি' : 'No period attendance marked',
          variant: 'destructive',
        });
        return;
      }

      bulkMarkPeriodMutation.mutate(periodAttendanceList);
    }
  };

  const handleEditPeriodAttendance = (student: any, periodNumber: number) => {
    const key = `${student.id}-${periodNumber}`;
    const attendance = periodAttendanceMap[key];
    setSelectedStudent(student);
    setSelectedPeriod({ periodNumber });
    setEditStatus(attendance?.status || 'present');
    setEditRemarks(attendance?.remarks || '');
    setPeriodEditDialogOpen(true);
  };

  const handleSavePeriodAttendance = () => {
    if (!selectedStudent || !selectedPeriod) return;

    markPeriodAttendanceMutation.mutate({
      studentId: selectedStudent.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      periodNumber: selectedPeriod.periodNumber,
      status: editStatus,
      remarks: editRemarks,
      schoolId,
    });
  };

  const handleMarkAllPresent = () => {
    const newBulkAttendance: Record<number, string> = {};
    filteredStudents.forEach(student => {
      newBulkAttendance[student.id] = 'present';
    });
    setBulkAttendance(newBulkAttendance);
  };

  const t = {
    title: language === 'bn' ? 'উপস্থিতি ব্যবস্থাপনা' : 'Attendance Management',
    export: language === 'bn' ? 'রপ্তানি' : 'Export',
    totalStudents: language === 'bn' ? 'মোট শিক্ষার্থী' : 'Total Students',
    presentToday: language === 'bn' ? 'আজ উপস্থিত' : 'Present Today',
    absentToday: language === 'bn' ? 'আজ অনুপস্থিত' : 'Absent Today',
    lateToday: language === 'bn' ? 'আজ বিলম্বিত' : 'Late Today',
    attendanceRecords: language === 'bn' ? 'উপস্থিতি রেকর্ড' : 'Attendance Records',
    attendanceDescription: language === 'bn' ? 'শিক্ষার্থীদের উপস্থিতি পর্যবেক্ষণ এবং পরিচালনা করুন' : 'Monitor and manage student attendance',
    searchStudent: language === 'bn' ? 'শিক্ষার্থী খুঁজুন...' : 'Search student...',
    selectClass: language === 'bn' ? 'শ্রেণী নির্বাচন' : 'Select Class',
    allClasses: language === 'bn' ? 'সকল ক্লাস' : 'All Classes',
    selectSection: language === 'bn' ? 'শাখা নির্বাচন' : 'Select Section',
    allSections: language === 'bn' ? 'সকল শাখা' : 'All Sections',
    selectDate: language === 'bn' ? 'তারিখ নির্বাচন' : 'Select Date',
    selectStatus: language === 'bn' ? 'অবস্থা নির্বাচন করুন' : 'Select Status',
    dailyAttendance: language === 'bn' ? 'দৈনিক উপস্থিতি' : 'Daily Attendance',
    periodAttendance: language === 'bn' ? 'পিরিয়ড উপস্থিতি' : 'Period Attendance',
    trends: language === 'bn' ? 'ট্রেন্ড' : 'Trends',
    alerts: language === 'bn' ? 'সতর্কতা' : 'Alerts',
    studentId: language === 'bn' ? 'শিক্ষার্থী আইডি' : 'Student ID',
    name: language === 'bn' ? 'নাম' : 'Name',
    class: language === 'bn' ? 'শ্রেণী' : 'Class',
    status: language === 'bn' ? 'অবস্থা' : 'Status',
    remarks: language === 'bn' ? 'মন্তব্য' : 'Remarks',
    actions: language === 'bn' ? 'কার্যক্রম' : 'Actions',
    loading: language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...',
    noStudents: language === 'bn' ? 'কোন শিক্ষার্থী পাওয়া যায়নি' : 'No students found',
    present: language === 'bn' ? 'উপস্থিত' : 'Present',
    absent: language === 'bn' ? 'অনুপস্থিত' : 'Absent',
    late: language === 'bn' ? 'বিলম্বিত' : 'Late',
    notMarked: language === 'bn' ? 'চিহ্নিত নয়' : 'Not Marked',
    attendanceTrend: language === 'bn' ? '৭-দিনের উপস্থিতি ট্রেন্ড' : '7-Day Attendance Trend',
    attendanceRate: language === 'bn' ? 'উপস্থিতির হার' : 'Attendance Rate',
    attendancePercentage: language === 'bn' ? 'উপস্থিতি %' : 'Attendance %',
    totalDays: language === 'bn' ? 'মোট দিন' : 'Total Days',
    days: language === 'bn' ? 'দিন' : 'days',
    period: language === 'bn' ? 'পিরিয়ড' : 'Period',
    noLowAttendance: language === 'bn' ? 'কম উপস্থিতির শিক্ষার্থী নেই' : 'No students with low attendance',
    viewStudents: language === 'bn' ? 'শিক্ষার্থী দেখুন' : 'View Students',
    bulkMode: language === 'bn' ? 'বাল্ক মোড' : 'Bulk Mode',
    save: language === 'bn' ? 'সংরক্ষণ' : 'Save',
    cancel: language === 'bn' ? 'বাতিল' : 'Cancel',
    markAllPresent: language === 'bn' ? 'সকলকে উপস্থিত করুন' : 'Mark All Present',
    editAttendance: language === 'bn' ? 'উপস্থিতি সম্পাদনা' : 'Edit Attendance',
    editPeriodAttendance: language === 'bn' ? 'পিরিয়ড উপস্থিতি সম্পাদনা' : 'Edit Period Attendance',
    delete: language === 'bn' ? 'মুছে ফেলুন' : 'Delete',
    edit: language === 'bn' ? 'সম্পাদনা' : 'Edit',
    dailyView: language === 'bn' ? 'দৈনিক ভিউ' : 'Daily View',
    periodView: language === 'bn' ? 'পিরিয়ড ভিউ' : 'Period View',
  };

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCheck className="w-8 h-8 text-blue-600" />
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/management/students">
              <Button variant="outline" size="sm" data-testid="button-view-students">
                <Users className="w-4 h-4 mr-2" />
                {t.viewStudents}
              </Button>
            </Link>
            <PermissionGate
              permission={PERMISSIONS.MARK_ATTENDANCE}
              context={{
                classId: selectedClass && selectedClass !== 'all' ? parseInt(selectedClass) : undefined,
                teacherClassSubjects
              }}
            >
              {bulkMode ? (
                <>
                  <Button onClick={handleMarkAllPresent} variant="outline" data-testid="button-mark-all-present">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t.markAllPresent}
                  </Button>
                  <Button onClick={handleBulkSave} disabled={bulkMarkMutation.isPending} data-testid="button-bulk-save">
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </Button>
                  <Button onClick={() => { setBulkMode(false); setBulkAttendance({}); }} variant="outline" data-testid="button-cancel-bulk">
                    {t.cancel}
                  </Button>
                </>
              ) : (
                <>
                <Button onClick={() => setBulkMode(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.bulkMode}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isExporting} data-testid="button-export-attendance">
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {t.export}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {language === 'bn' ? 'ফরম্যাট নির্বাচন করুন' : 'Choose Format'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExportAttendance('csv')} data-testid="export-csv">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {language === 'bn' ? 'CSV ফাইল' : 'CSV File'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportAttendance('pdf')} data-testid="export-pdf">
                      <FileText className="w-4 h-4 mr-2" />
                      {language === 'bn' ? 'PDF ডকুমেন্ট' : 'PDF Document'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportAttendance('excel')} data-testid="export-excel">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {language === 'bn' ? 'এক্সেল ফাইল' : 'Excel File'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
              )}
            </PermissionGate>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalStudents}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.presentToday}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.absentToday}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.lateToday}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lateToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t.attendanceRecords}</CardTitle>
                <CardDescription>{t.attendanceDescription}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.searchStudent}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-student"
                  />
                </div>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={viewMode === 'daily' ? 'default' : 'outline'}
                onClick={() => setViewMode('daily')}
                size="sm"
                data-testid="button-daily-view"
              >
                {t.dailyView}
              </Button>
              <Button
                variant={viewMode === 'period' ? 'default' : 'outline'}
                onClick={() => setViewMode('period')}
                size="sm"
                data-testid="button-period-view"
              >
                {t.periodView}
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger data-testid="select-class">
                  <SelectValue placeholder={t.selectClass} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allClasses}</SelectItem>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger data-testid="select-section">
                  <SelectValue placeholder={t.selectSection} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allSections}</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : <span>{t.selectDate}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="daily" data-testid="tab-daily">
                  {t.dailyAttendance}
                </TabsTrigger>
                <TabsTrigger value="trends" data-testid="tab-trends">
                  {t.trends}
                </TabsTrigger>
                <TabsTrigger value="alerts" data-testid="tab-alerts">
                  {t.alerts}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-4">
                {viewMode === 'daily' ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.studentId}</TableHead>
                          <TableHead>{t.name}</TableHead>
                          <TableHead>{t.class}</TableHead>
                          <TableHead className="text-center">{t.status}</TableHead>
                          {!bulkMode && <TableHead className="text-center">{t.attendancePercentage}</TableHead>}
                          {!bulkMode && <TableHead>{t.remarks}</TableHead>}
                          <TableHead className="text-center">{t.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceLoading ? (
                          <TableRow>
                            <TableCell colSpan={bulkMode ? 5 : 7} className="text-center py-8">
                              {t.loading}
                            </TableCell>
                          </TableRow>
                        ) : filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={bulkMode ? 5 : 7} className="text-center py-8 text-muted-foreground">
                              {t.noStudents}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStudents.map((student: any) => {
                            const attendance = studentAttendanceMap[student.id];
                            const status = bulkMode ? (bulkAttendance[student.id] || 'not-marked') : (attendance?.status || 'not-marked');
                            const attendancePercentage = calculateAttendancePercentage(student.id);
                            const percentageColor = getAttendancePercentageColor(attendancePercentage);

                            return (
                              <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                                <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.class} - {student.section}</TableCell>
                                <TableCell className="text-center">
                                  {bulkMode ? (
                                    <Select
                                      value={bulkAttendance[student.id] || ''}
                                      onValueChange={(value) => setBulkAttendance({ ...bulkAttendance, [student.id]: value })}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder={t.selectStatus} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">{t.present}</SelectItem>
                                        <SelectItem value="absent">{t.absent}</SelectItem>
                                        <SelectItem value="late">{t.late}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <>
                                      {status === 'present' && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          {t.present}
                                        </Badge>
                                      )}
                                      {status === 'absent' && (
                                        <Badge variant="destructive">
                                          <XCircle className="w-3 h-3 mr-1" />
                                          {t.absent}
                                        </Badge>
                                      )}
                                      {status === 'late' && (
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {t.late}
                                        </Badge>
                                      )}
                                      {status === 'not-marked' && (
                                        <Badge variant="outline">{t.notMarked}</Badge>
                                      )}
                                    </>
                                  )}
                                </TableCell>
                                {!bulkMode && (
                                  <TableCell className="text-center">
                                    <span className={cn("font-semibold", percentageColor)} data-testid={`text-attendance-percentage-${student.id}`}>
                                      {attendancePercentage.toFixed(1)}%
                                    </span>
                                  </TableCell>
                                )}
                                {!bulkMode && (
                                  <TableCell className="text-sm text-muted-foreground">
                                    {attendance?.remarks || '-'}
                                  </TableCell>
                                )}
                                <TableCell className="text-center">
                                  {!bulkMode && (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditAttendance(student)}
                                        data-testid={`button-edit-${student.id}`}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      {attendance && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteAttendance(student)}
                                          data-testid={`button-delete-${student.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto" data-testid="period-view-grid">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">{t.studentId}</TableHead>
                          <TableHead className="sticky left-[120px] bg-background z-10">{t.name}</TableHead>
                          {uniquePeriods.length > 0 ? (
                            uniquePeriods.map((periodNum) => (
                              <TableHead key={periodNum} className="text-center min-w-[100px]" data-testid={`header-period-${periodNum}`}>
                                {t.period} {periodNum}
                              </TableHead>
                            ))
                          ) : (
                            Array.from({ length: 8 }, (_, i) => i + 1).map((periodNum) => (
                              <TableHead key={periodNum} className="text-center min-w-[100px]" data-testid={`header-period-${periodNum}`}>
                                {t.period} {periodNum}
                              </TableHead>
                            ))
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {periodAttendanceLoading ? (
                          <TableRow>
                            <TableCell colSpan={uniquePeriods.length > 0 ? uniquePeriods.length + 2 : 10} className="text-center py-8">
                              {t.loading}
                            </TableCell>
                          </TableRow>
                        ) : filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={uniquePeriods.length > 0 ? uniquePeriods.length + 2 : 10} className="text-center py-8 text-muted-foreground">
                              {t.noStudents}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStudents.map((student: any) => (
                            <TableRow key={student.id} data-testid={`row-period-student-${student.id}`}>
                              <TableCell className="sticky left-0 bg-background font-mono text-sm">{student.student_id}</TableCell>
                              <TableCell className="sticky left-[120px] bg-background font-medium">{student.name}</TableCell>
                              {(uniquePeriods.length > 0 ? uniquePeriods : Array.from({ length: 8 }, (_, i) => i + 1)).map((periodNum) => {
                                const key = `${student.id}-${periodNum}`;
                                const periodAttendance = periodAttendanceMap[key];
                                const status = bulkMode ? (bulkPeriodAttendance[key] || 'not-marked') : (periodAttendance?.status || 'not-marked');

                                return (
                                  <TableCell key={periodNum} className="text-center" data-testid={`cell-period-${student.id}-${periodNum}`}>
                                    {bulkMode ? (
                                      <Select
                                        value={bulkPeriodAttendance[key] || ''}
                                        onValueChange={(value) => setBulkPeriodAttendance({ ...bulkPeriodAttendance, [key]: value })}
                                      >
                                        <SelectTrigger className="w-24 h-8 text-xs">
                                          <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="present">P</SelectItem>
                                          <SelectItem value="absent">A</SelectItem>
                                          <SelectItem value="late">L</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => handleEditPeriodAttendance(student, periodNum)}
                                        data-testid={`button-edit-period-${student.id}-${periodNum}`}
                                      >
                                        {status === 'present' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                        {status === 'absent' && <XCircle className="w-4 h-4 text-red-600" />}
                                        {status === 'late' && <Clock className="w-4 h-4 text-orange-600" />}
                                        {status === 'not-marked' && <span className="text-muted-foreground">-</span>}
                                      </Button>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t.attendanceTrend}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name={t.present} />
                        <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name={t.absent} />
                        <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name={t.late} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.studentId}</TableHead>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.class}</TableHead>
                        <TableHead className="text-center">{t.attendanceRate}</TableHead>
                        <TableHead className="text-center">{t.totalDays}</TableHead>
                        <TableHead className="text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowAttendanceStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle className="w-8 h-8 text-green-500" />
                              <p>{t.noLowAttendance}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        lowAttendanceStudents.map(({ student, rate, totalCount }) => (
                          <TableRow key={student.id} data-testid={`row-alert-${student.id}`}>
                            <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.class} - {student.section}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="font-semibold">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                {rate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{totalCount} {t.days}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" data-testid={`button-view-alert-${student.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editAttendance}</DialogTitle>
            <DialogDescription>
              {selectedStudent?.name} - {format(selectedDate, 'PPP')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.status}</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t.present}</SelectItem>
                  <SelectItem value="absent">{t.absent}</SelectItem>
                  <SelectItem value="late">{t.late}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.remarks}</Label>
              <Textarea
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder={language === 'bn' ? 'মন্তব্য লিখুন...' : 'Enter remarks...'}
                rows={3}
                data-testid="textarea-edit-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
              {t.cancel}
            </Button>
            <Button onClick={handleSaveAttendance} disabled={markAttendanceMutation.isPending} data-testid="button-save-attendance">
              <Save className="w-4 h-4 mr-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Period Attendance Dialog */}
      <Dialog open={periodEditDialogOpen} onOpenChange={setPeriodEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editPeriodAttendance}</DialogTitle>
            <DialogDescription>
              {selectedStudent?.name} - {t.period} {selectedPeriod?.periodNumber} - {format(selectedDate, 'PPP')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.status}</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-period-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t.present}</SelectItem>
                  <SelectItem value="absent">{t.absent}</SelectItem>
                  <SelectItem value="late">{t.late}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.remarks}</Label>
              <Textarea
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder={language === 'bn' ? 'মন্তব্য লিখুন...' : 'Enter remarks...'}
                rows={3}
                data-testid="textarea-edit-period-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodEditDialogOpen(false)} data-testid="button-cancel-period-edit">
              {t.cancel}
            </Button>
            <Button onClick={handleSavePeriodAttendance} disabled={markPeriodAttendanceMutation.isPending} data-testid="button-save-period-attendance">
              <Save className="w-4 h-4 mr-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
