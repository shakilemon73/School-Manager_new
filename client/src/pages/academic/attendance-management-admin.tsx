import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
  BookOpen
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AttendanceManagementAdmin() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('daily');

  const getCurrentSchoolId = async (): Promise<number> => {
    try {
      const schoolId = await userProfile.getCurrentUserSchoolId();
      if (!schoolId) throw new Error('User school ID not found');
      return schoolId;
    } catch (error) {
      console.error('❌ Failed to get user school ID:', error);
      throw new Error('Authentication required');
    }
  };

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      try {
        const schoolId = await getCurrentSchoolId();
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
    queryKey: ['attendance-admin', selectedClass, selectedSection, selectedDate],
    queryFn: async () => {
      try {
        const schoolId = await getCurrentSchoolId();
        
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
    queryKey: ['students', selectedClass, selectedSection],
    queryFn: async () => {
      try {
        const schoolId = await getCurrentSchoolId();
        
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

  const handleExportAttendance = () => {
    toast({
      title: language === 'bn' ? 'রপ্তানি শুরু হয়েছে' : 'Export Started',
      description: language === 'bn' ? 'উপস্থিতি তথ্য রপ্তানির জন্য প্রস্তুত করা হচ্ছে...' : 'Preparing attendance data for export...',
    });
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
    dailyAttendance: language === 'bn' ? 'দৈনিক উপস্থিতি' : 'Daily Attendance',
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
    totalDays: language === 'bn' ? 'মোট দিন' : 'Total Days',
    days: language === 'bn' ? 'দিন' : 'days',
    noLowAttendance: language === 'bn' ? 'কম উপস্থিতির শিক্ষার্থী নেই' : 'No students with low attendance',
    viewStudents: language === 'bn' ? 'শিক্ষার্থী দেখুন' : 'View Students',
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
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                {t.viewStudents}
              </Button>
            </Link>
            <Button onClick={handleExportAttendance} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t.export}
            </Button>
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.studentId}</TableHead>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.class}</TableHead>
                        <TableHead className="text-center">{t.status}</TableHead>
                        <TableHead>{t.remarks}</TableHead>
                        <TableHead className="text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {t.loading}
                          </TableCell>
                        </TableRow>
                      ) : filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t.noStudents}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student: any) => {
                          const attendance = studentAttendanceMap[student.id];
                          const status = attendance?.status || 'not-marked';

                          return (
                            <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                              <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.class} - {student.section}</TableCell>
                              <TableCell className="text-center">
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
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {attendance?.remarks || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="sm" data-testid={`button-view-${student.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
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
    </AppShell>
  );
}
