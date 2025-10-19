import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
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
  studentId: number;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  createdAt: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  percentage: number;
}

export default function StudentAttendance() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // First get student profile to get student database ID
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      return await db.getStudentProfile(user.id, schoolId);
    },
    enabled: !!user?.id && !!schoolId,
  });

  const studentId = studentProfile?.id;

  const { data: attendanceRecords, isLoading } = useQuery<any[]>({
    queryKey: ['student-attendance', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return [];
      return await db.getStudentAttendance(studentId, schoolId);
    },
    enabled: !!studentId && !!schoolId,
  });

  const { data: attendanceStats } = useQuery<any>({
    queryKey: ['student-attendance-stats', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return null;
      return await db.getStudentAttendanceStats(studentId, schoolId);
    },
    enabled: !!studentId && !!schoolId,
  });

  // Calculate monthly stats
  const currentMonthRecords = attendanceRecords?.filter(record => {
    const recordDate = parseISO(record.date);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return recordDate >= monthStart && recordDate <= monthEnd;
  }) || [];

  const monthlyStats = {
    totalDays: currentMonthRecords.length,
    presentDays: currentMonthRecords.filter(r => r.status === 'present').length,
    absentDays: currentMonthRecords.filter(r => r.status === 'absent').length,
    lateDays: currentMonthRecords.filter(r => r.status === 'late').length,
    percentage: currentMonthRecords.length > 0 
      ? Math.round((currentMonthRecords.filter(r => r.status === 'present' || r.status === 'late').length / currentMonthRecords.length) * 100)
      : 0
  };

  // Generate calendar data
  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate)
  });

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
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  My Attendance
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  উপস্থিতি • Track your attendance record
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {attendanceStats?.percentage || monthlyStats.percentage}%
                  </p>
                  <p className="text-sm text-green-600 font-medium">Overall Attendance</p>
                  <Progress 
                    value={attendanceStats?.percentage || monthlyStats.percentage} 
                    className="mt-2 h-2" 
                  />
                </div>
                <div className="bg-green-500 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attendanceStats?.presentDays || monthlyStats.presentDays}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Present Days</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attendanceStats?.absentDays || monthlyStats.absentDays}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Absent Days</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attendanceStats?.lateDays || monthlyStats.lateDays}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Late Days</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar/List View */}
          <div className="lg:col-span-2">
            {viewMode === 'calendar' ? (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <span>Attendance Calendar</span>
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, 'MMMM yyyy')} • Click on dates to see details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4 text-center text-sm font-medium text-gray-600">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {monthDays.map((day, index) => {
                      const attendance = getAttendanceForDate(day);
                      const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                      const isCurrentDay = isToday(day);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            relative p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                            ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                            ${isCurrentDay ? 'ring-2 ring-blue-300' : ''}
                          `}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {format(day, 'd')}
                          </div>
                          
                          {attendance && (
                            <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${getStatusColor(attendance.status)}`} />
                          )}
                          
                          {isCurrentDay && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center space-x-6 mt-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span>Late</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>Absent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Attendance Records</span>
                  </CardTitle>
                  <CardDescription>
                    Recent attendance history with details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentMonthRecords.slice(0, 10).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(parseISO(record.date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            {record.remarks && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {record.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={record.status === 'present' ? 'default' : 
                                   record.status === 'late' ? 'secondary' : 'destructive'}
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                    
                    {currentMonthRecords.length === 0 && (
                      <div className="text-center py-12">
                        <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Records Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          No attendance records available for this month.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dayAttendance = getAttendanceForDate(selectedDate);
                  if (dayAttendance) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(dayAttendance.status)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {dayAttendance.status}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Status for this day
                            </p>
                          </div>
                        </div>
                        
                        {dayAttendance.remarks && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Remarks:
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {dayAttendance.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-6">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No attendance record for this date
                        </p>
                      </div>
                    );
                  }
                })()}
              </CardContent>
            </Card>

            {/* Monthly Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Monthly Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {monthlyStats.percentage}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Attendance Rate
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Days</span>
                    <span className="font-medium">{monthlyStats.totalDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Present</span>
                    <span className="font-medium text-green-600">{monthlyStats.presentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-yellow-600">Late</span>
                    <span className="font-medium text-yellow-600">{monthlyStats.lateDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Absent</span>
                    <span className="font-medium text-red-600">{monthlyStats.absentDays}</span>
                  </div>
                </div>
                
                <Progress value={monthlyStats.percentage} className="h-3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}