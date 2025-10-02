import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useSupabaseDirectAuth, userProfile } from '@/hooks/use-supabase-direct-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, BookOpen, TrendingUp, Calendar, User, Download } from 'lucide-react';

export default function EnhancedParentPortal() {
  const { user } = useSupabaseDirectAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');

  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: children } = useQuery({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('email', user?.email)
        .eq('school_id', schoolId)
        .single();
      
      if (parentError || !parent) throw new Error('Parent not found');

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .or(`father_name.eq.${user?.user_metadata?.name},mother_name.eq.${user?.user_metadata?.name}`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: childMarks, isLoading: marksLoading } = useQuery({
    queryKey: ['child-marks', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return null;
      
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams(id, name, exam_type, exam_date, total_marks),
          subjects(id, name, name_bn, code)
        `)
        .eq('student_id', parseInt(selectedChild))
        .eq('verified', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild
  });

  const { data: childAttendance } = useQuery({
    queryKey: ['child-attendance', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return null;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', parseInt(selectedChild))
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const present = data?.filter(a => a.status === 'present').length || 0;
      const attendanceRate = total > 0 ? (present / total) * 100 : 0;
      
      return { total, present, attendanceRate, records: data || [] };
    },
    enabled: !!selectedChild
  });

  const calculatePerformance = () => {
    if (!childMarks || childMarks.length === 0) return null;
    
    const totalGPA = childMarks.reduce((sum, mark) => sum + parseFloat(mark.gpa || 0), 0);
    const avgGPA = totalGPA / childMarks.length;
    
    const totalMarks = childMarks.reduce((sum, mark) => sum + mark.total_marks, 0);
    const obtainedMarks = childMarks.reduce((sum, mark) => sum + mark.marks_obtained, 0);
    const avgPercentage = (obtainedMarks / totalMarks) * 100;
    
    const subjectPerformance = childMarks.reduce((acc: any, mark) => {
      const subjectName = mark.subjects?.name_bn || mark.subjects?.name;
      if (!acc[subjectName]) {
        acc[subjectName] = { total: 0, obtained: 0, exams: 0 };
      }
      acc[subjectName].total += mark.total_marks;
      acc[subjectName].obtained += mark.marks_obtained;
      acc[subjectName].exams += 1;
      return acc;
    }, {});
    
    return {
      avgGPA: avgGPA.toFixed(2),
      avgPercentage: avgPercentage.toFixed(1),
      totalExams: childMarks.length,
      subjectPerformance
    };
  };

  const performance = calculatePerformance();
  const selectedChildData = children?.find(c => c.id === parseInt(selectedChild));

  const groupMarksByExam = () => {
    if (!childMarks) return {};
    
    return childMarks.reduce((acc: any, mark) => {
      const examId = mark.exam_id;
      if (!acc[examId]) {
        acc[examId] = {
          exam: mark.exams,
          results: []
        };
      }
      acc[examId].results.push(mark);
      return acc;
    }, {});
  };

  const examGroups = groupMarksByExam();

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">অভিভাবক পোর্টাল</CardTitle>
            <CardDescription>আপনার সন্তানের একাডেমিক পারফরম্যান্স দেখুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <label className="block text-sm font-medium mb-2">সন্তান নির্বাচন করুন</label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="সন্তান বেছে নিন" />
                </SelectTrigger>
                <SelectContent>
                  {children?.map(child => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      {child.name} - শ্রেণী {child.class} (রোল: {child.roll_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedChild && selectedChildData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-blue-600">
                        {performance?.avgGPA || '0.00'}
                      </p>
                      <p className="text-sm text-blue-700 font-medium">গড় জিপিএ</p>
                    </div>
                    <Award className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {performance?.avgPercentage || '0'}%
                      </p>
                      <p className="text-sm text-gray-600 font-medium">গড় পারসেন্টেজ</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {performance?.totalExams || 0}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">মোট পরীক্ষা</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-green-600">
                        {childAttendance?.attendanceRate.toFixed(0) || 0}%
                      </p>
                      <p className="text-sm text-green-700 font-medium">উপস্থিতি হার</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>পরীক্ষার ফলাফল</CardTitle>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        রিপোর্ট ডাউনলোড
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {marksLoading ? (
                      <div className="text-center py-8">লোড হচ্ছে...</div>
                    ) : Object.keys(examGroups).length > 0 ? (
                      <div className="space-y-6">
                        {Object.values(examGroups).map((group: any) => (
                          <div key={group.exam.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{group.exam.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {group.exam.exam_type} - {new Date(group.exam.exam_date).toLocaleDateString('bn-BD')}
                                </p>
                              </div>
                              <div className="text-right">
                                {(() => {
                                  const total = group.results.reduce((sum: number, r: any) => sum + r.total_marks, 0);
                                  const obtained = group.results.reduce((sum: number, r: any) => sum + r.marks_obtained, 0);
                                  const avgGPA = group.results.reduce((sum: number, r: any) => sum + parseFloat(r.gpa), 0) / group.results.length;
                                  return (
                                    <>
                                      <Badge className="bg-blue-100 text-blue-800 mb-1">
                                        GPA: {avgGPA.toFixed(2)}
                                      </Badge>
                                      <p className="text-sm text-gray-500">
                                        {obtained}/{total} ({((obtained/total)*100).toFixed(1)}%)
                                      </p>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {group.results.map((result: any) => (
                                <div key={result.id} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-sm">
                                      {result.subjects?.name_bn || result.subjects?.name}
                                    </p>
                                    <Badge variant="outline">{result.grade}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">
                                      {result.marks_obtained}/{result.total_marks}
                                    </span>
                                    <span className="font-medium text-blue-600">
                                      GPA {result.gpa}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        কোনো পরীক্ষার ফলাফল পাওয়া যায়নি
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>বিষয়ভিত্তিক পারফরম্যান্স</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {performance?.subjectPerformance && Object.entries(performance.subjectPerformance).map(([subject, data]: [string, any]) => {
                        const percentage = (data.obtained / data.total) * 100;
                        return (
                          <div key={subject}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">{subject}</p>
                              <span className="text-sm text-gray-600">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">
                              {data.exams} টি পরীক্ষা
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>উপস্থিতি রেকর্ড</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {childAttendance && (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {childAttendance.attendanceRate.toFixed(1)}%
                          </p>
                          <p className="text-sm text-green-700">উপস্থিতি হার</p>
                          <p className="text-xs text-gray-600 mt-2">
                            {childAttendance.present}/{childAttendance.total} দিন উপস্থিত (শেষ ৩০ দিন)
                          </p>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {childAttendance.records.slice(0, 10).map((record: any) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-2 text-sm"
                            >
                              <span className="text-gray-600">
                                {new Date(record.date).toLocaleDateString('bn-BD')}
                              </span>
                              <Badge className={
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }>
                                {record.status === 'present' ? 'উপস্থিত' : 'অনুপস্থিত'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      ছাত্র তথ্য
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">নাম:</span>
                        <span className="font-medium">{selectedChildData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">শ্রেণী:</span>
                        <span className="font-medium">{selectedChildData.class}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">রোল নম্বর:</span>
                        <span className="font-medium">{selectedChildData.roll_number}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
