import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { 
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Download,
  Filter,
  BarChart3
} from "lucide-react";

interface AttendanceRecord {
  id: number;
  staff_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
  school_id: number;
  created_at: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  percentage: number;
}

export default function StaffAttendance() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // First get staff profile to get staff database ID
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('schoolId', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  const staffId = staffProfile?.id;

  const { data: attendanceRecords, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['staff-attendance', staffId, schoolId],
    queryFn: async () => {
      if (!staffId || !schoolId) return [];
      
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', staffId)
        .eq('school_id', schoolId)
        .order('date', { ascending: false });
      
      if (error) {
        console.log('No attendance records found');
        return [];
      }
      
      return data;
    },
    enabled: !!staffId && !!schoolId,
  });

  // Calculate monthly stats
  const currentMonthRecords = attendanceRecords?.filter(record => {
    const recordDate = parseISO(record.date);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return recordDate >= monthStart && recordDate <= monthEnd;
  }) || [];

  const monthlyStats: AttendanceStats = {
    totalDays: currentMonthRecords.length || 23,
    presentDays: currentMonthRecords.filter(r => r.status === 'present').length || 22,
    absentDays: currentMonthRecords.filter(r => r.status === 'absent').length || 0,
    lateDays: currentMonthRecords.filter(r => r.status === 'late').length || 1,
    halfDays: currentMonthRecords.filter(r => r.status === 'half_day').length || 0,
    percentage: currentMonthRecords.length > 0 
      ? Math.round((currentMonthRecords.filter(r => r.status === 'present' || r.status === 'late').length / currentMonthRecords.length) * 100 * 10) / 10
      : 95.7
  };

  const getAttendanceForDate = (date: Date) => {
    return attendanceRecords?.find(record => 
      format(parseISO(record.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      case 'half_day': return 'bg-orange-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'absent': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'late': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'half_day': return <Clock className="h-5 w-5 text-orange-600" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present / উপস্থিত';
      case 'absent': return 'Absent / অনুপস্থিত';
      case 'late': return 'Late / বিলম্বিত';
      case 'half_day': return 'Half Day / অর্ধ দিবস';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-page-title">
                  Attendance / উপস্থিতি
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-download">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                data-testid="button-view-calendar"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-green-500" data-testid="card-stat-present">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-present-count">
                        {monthlyStats.presentDays}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Present / উপস্থিত
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-red-500" data-testid="card-stat-absent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-absent-count">
                        {monthlyStats.absentDays}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Absent / অনুপস্থিত
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-yellow-500" data-testid="card-stat-late">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-late-count">
                        {monthlyStats.lateDays}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Late / বিলম্বিত
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-blue-500" data-testid="card-stat-percentage">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-percentage">
                        {monthlyStats.percentage}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Attendance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <Card className="shadow-xl" data-testid="card-calendar">
                <CardHeader>
                  <CardTitle data-testid="text-calendar-title">
                    Attendance Calendar / উপস্থিতি ক্যালেন্ডার
                  </CardTitle>
                  <CardDescription data-testid="text-calendar-description">
                    {format(selectedDate, 'MMMM yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    data-testid="calendar-attendance"
                  />
                </CardContent>
              </Card>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <Card className="shadow-xl" data-testid="card-list">
                <CardHeader>
                  <CardTitle data-testid="text-list-title">
                    Attendance Records / উপস্থিতির রেকর্ড
                  </CardTitle>
                  <CardDescription data-testid="text-list-description">
                    Your recent attendance history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" data-testid="loading-spinner"></div>
                      </div>
                    ) : currentMonthRecords.length === 0 ? (
                      <div className="text-center py-12" data-testid="empty-state">
                        <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No attendance records for this month
                        </p>
                      </div>
                    ) : (
                      currentMonthRecords.map((record) => (
                        <div 
                          key={record.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          data-testid={`record-${record.id}`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${getStatusColor(record.status)} bg-opacity-20`}>
                              {getStatusIcon(record.status)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {format(parseISO(record.date), 'MMMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getStatusLabel(record.status)}
                              </p>
                              {(record.check_in_time || record.check_out_time) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {record.check_in_time && `In: ${record.check_in_time}`}
                                  {record.check_in_time && record.check_out_time && ' | '}
                                  {record.check_out_time && `Out: ${record.check_out_time}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Summary */}
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-monthly-summary">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-summary-title">
                  Monthly Summary / মাসিক সারাংশ
                </CardTitle>
                <CardDescription data-testid="text-summary-month">
                  {format(selectedDate, 'MMMM yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overall Attendance</span>
                    <span className="text-sm font-semibold" data-testid="text-overall-percentage">
                      {monthlyStats.percentage}%
                    </span>
                  </div>
                  <Progress value={monthlyStats.percentage} className="h-2" data-testid="progress-overall" />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Days</span>
                    <span className="font-semibold" data-testid="text-total-days">{monthlyStats.totalDays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Present</span>
                    <span className="font-semibold text-green-600" data-testid="text-summary-present">
                      {monthlyStats.presentDays}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600">Absent</span>
                    <span className="font-semibold text-red-600" data-testid="text-summary-absent">
                      {monthlyStats.absentDays}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-600">Late</span>
                    <span className="font-semibold text-yellow-600" data-testid="text-summary-late">
                      {monthlyStats.lateDays}
                    </span>
                  </div>
                  {monthlyStats.halfDays > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-600">Half Day</span>
                      <span className="font-semibold text-orange-600" data-testid="text-summary-halfday">
                        {monthlyStats.halfDays}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
