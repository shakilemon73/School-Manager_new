import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, FileText, Download } from 'lucide-react';

export default function ReportsDashboardPage() {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('this_month');

  // Fetch attendance analytics
  const { data: attendanceStats } = useQuery({
    queryKey: ['/api/reports/attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_analytics')
        .select('*')
        .eq('school_id', 1)
        .limit(10);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  // Fetch fee defaulters
  const { data: feeDefaulters } = useQuery({
    queryKey: ['/api/reports/fee-defaulters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_defaulters_view')
        .select('*')
        .eq('school_id', 1)
        .limit(20);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  // Fetch teacher workload
  const { data: teacherWorkload } = useQuery({
    queryKey: ['/api/reports/teacher-workload'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_workload_view')
        .select('*')
        .eq('school_id', 1);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  const reports = [
    {
      title: 'Attendance Report',
      description: 'Student attendance by class and month',
      icon: Users,
      color: 'blue',
      count: attendanceStats?.length || 0
    },
    {
      title: 'Fee Defaulters',
      description: 'Students with pending fee payments',
      icon: DollarSign,
      color: 'red',
      count: feeDefaulters?.length || 0
    },
    {
      title: 'Teacher Workload',
      description: 'Subject assignments and teaching hours',
      icon: TrendingUp,
      color: 'green',
      count: teacherWorkload?.length || 0
    },
    {
      title: 'Performance Analytics',
      description: 'Student performance trends',
      icon: BarChart3,
      color: 'purple',
      count: 0
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive school reports and insights</p>
        </div>
        <Button data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {reports.map((report, index) => (
          <Card key={index} data-testid={`card-report-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{report.title}</CardTitle>
              <report.icon className={`w-4 h-4 text-${report.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.count}</div>
              <p className="text-xs text-gray-600 mt-1">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Report Configuration</CardTitle>
            <div className="flex gap-2">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48" data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                  <SelectItem value="fee-defaulters">Fee Defaulters</SelectItem>
                  <SelectItem value="teacher-workload">Teacher Workload</SelectItem>
                  <SelectItem value="performance">Performance Analytics</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportType === 'attendance' && (
            <div>
              <h3 className="font-semibold mb-3">Attendance Analytics</h3>
              <div className="space-y-2">
                {attendanceStats?.map((stat: any, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">Class {stat.class} {stat.section}</div>
                      <div className="text-sm text-gray-600">
                        {stat.total_students} students
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {stat.attendance_percentage}%
                      </div>
                      <div className="text-xs text-gray-600">
                        {stat.present_count}/{stat.present_count + stat.absent_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportType === 'fee-defaulters' && (
            <div>
              <h3 className="font-semibold mb-3">Fee Defaulters List</h3>
              <div className="space-y-2">
                {feeDefaulters?.map((student: any, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-600">
                        Class {student.class} {student.section} - Roll: {student.roll_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        ৳{student.total_due}
                      </div>
                      <div className="text-xs text-gray-600">
                        {student.pending_transactions} pending
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportType === 'teacher-workload' && (
            <div>
              <h3 className="font-semibold mb-3">Teacher Workload Analysis</h3>
              <div className="space-y-2">
                {teacherWorkload?.map((teacher: any, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <div>
                      <div className="font-medium">{teacher.name}</div>
                      <div className="text-sm text-gray-600">
                        ID: {teacher.staff_id}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">{teacher.subjects_assigned}</div>
                        <div className="text-gray-600">Subjects</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{teacher.timetable_slots}</div>
                        <div className="text-gray-600">Periods</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{teacher.assignments_given}</div>
                        <div className="text-gray-600">Assignments</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
