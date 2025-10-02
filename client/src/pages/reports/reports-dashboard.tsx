import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, FileText, Download, AlertCircle } from 'lucide-react';

export default function ReportsDashboardPage() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [dateRange, setDateRange] = useState('this_month');

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

  // Fetch attendance analytics
  const { data: attendanceStats = [] } = useQuery({
    queryKey: ['/api/reports/attendance'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('attendance_analytics')
        .select('*')
        .eq('school_id', schoolId)
        .limit(10);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  // Fetch fee defaulters
  const { data: feeDefaulters = [] } = useQuery({
    queryKey: ['/api/reports/fee-defaulters'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('fee_defaulters_view')
        .select('*')
        .eq('school_id', schoolId)
        .limit(20);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  // Fetch teacher workload
  const { data: teacherWorkload = [] } = useQuery({
    queryKey: ['/api/reports/teacher-workload'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('teacher_workload_view')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) console.error(error);
      return data || [];
    }
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              রিপোর্ট ও বিশ্লেষণ
            </h1>
            <p className="text-muted-foreground mt-1">
              বিদ্যালয়ের বিস্তৃত রিপোর্ট এবং তথ্য বিশ্লেষণ
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">এই সপ্তাহ</SelectItem>
                <SelectItem value="this_month">এই মাস</SelectItem>
                <SelectItem value="this_year">এই বছর</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              এক্সপোর্ট
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">উপস্থিতি রিপোর্ট</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats.length}</div>
              <p className="text-xs text-muted-foreground">শ্রেণী ভিত্তিক</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">বকেয়াদার</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feeDefaulters.length}</div>
              <p className="text-xs text-muted-foreground">অপেক্ষমাণ পেমেন্ট</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">শিক্ষক কাজের চাপ</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teacherWorkload.length}</div>
              <p className="text-xs text-muted-foreground">শিক্ষক</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">পারফরম্যান্স</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">বিশ্লেষণ</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="attendance">
              <Users className="w-4 h-4 mr-2" />
              উপস্থিতি
            </TabsTrigger>
            <TabsTrigger value="fees">
              <DollarSign className="w-4 h-4 mr-2" />
              ফি বকেয়া
            </TabsTrigger>
            <TabsTrigger value="workload">
              <TrendingUp className="w-4 h-4 mr-2" />
              কাজের চাপ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>উপস্থিতি বিশ্লেষণ</CardTitle>
                <CardDescription>শ্রেণী ও মাস অনুসারে শিক্ষার্থীর উপস্থিতি</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শ্রেণী</TableHead>
                      <TableHead>শাখা</TableHead>
                      <TableHead>মাস</TableHead>
                      <TableHead>মোট দিন</TableHead>
                      <TableHead>উপস্থিত</TableHead>
                      <TableHead>অনুপস্থিত</TableHead>
                      <TableHead>শতাংশ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          কোন ডেটা পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceStats.map((stat: any, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{stat.class_name}</TableCell>
                          <TableCell>{stat.section}</TableCell>
                          <TableCell>{stat.month}</TableCell>
                          <TableCell>{stat.total_days}</TableCell>
                          <TableCell>{stat.present_days}</TableCell>
                          <TableCell>{stat.absent_days}</TableCell>
                          <TableCell>
                            <Badge variant={stat.attendance_percentage >= 80 ? "default" : "destructive"}>
                              {stat.attendance_percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ফি বকেয়াদার তালিকা</CardTitle>
                <CardDescription>যেসব শিক্ষার্থীর পেমেন্ট বাকি রয়েছে</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>শ্রেণী</TableHead>
                      <TableHead>শাখা</TableHead>
                      <TableHead>মোট বকেয়া</TableHead>
                      <TableHead>অবস্থা</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeDefaulters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          কোন বকেয়া পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeDefaulters.map((defaulter: any, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{defaulter.student_name}</TableCell>
                          <TableCell>{defaulter.class_name}</TableCell>
                          <TableCell>{defaulter.section}</TableCell>
                          <TableCell>{defaulter.total_due} টাকা</TableCell>
                          <TableCell>
                            <Badge variant="destructive">বকেয়া</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>শিক্ষক কাজের চাপ</CardTitle>
                <CardDescription>বিষয় বরাদ্দ এবং পাঠদান ঘণ্টা</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষকের নাম</TableHead>
                      <TableHead>বিষয় সংখ্যা</TableHead>
                      <TableHead>শ্রেণী সংখ্যা</TableHead>
                      <TableHead>সাপ্তাহিক ঘণ্টা</TableHead>
                      <TableHead>অবস্থা</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherWorkload.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          কোন ডেটা পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      teacherWorkload.map((teacher: any, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{teacher.teacher_name}</TableCell>
                          <TableCell>{teacher.subject_count}</TableCell>
                          <TableCell>{teacher.class_count}</TableCell>
                          <TableCell>{teacher.weekly_hours}</TableCell>
                          <TableCell>
                            <Badge variant={teacher.weekly_hours > 25 ? "destructive" : "default"}>
                              {teacher.weekly_hours > 25 ? "অতিরিক্ত" : "স্বাভাবিক"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
