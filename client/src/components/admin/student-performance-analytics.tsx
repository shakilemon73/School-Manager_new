import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { Trophy, TrendingUp, AlertTriangle, BarChart3, Award } from 'lucide-react';

export function StudentPerformanceAnalytics() {
  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['student-performance-analytics'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const { data: results, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          students(id, name, class, roll_number),
          exams(id, name),
          subjects(id, name, name_bn)
        `)
        .eq('school_id', schoolId)
        .eq('verified', true);
      
      if (error) throw error;

      const studentPerformance = new Map();
      
      results?.forEach((result: any) => {
        const studentId = result.student_id;
        if (!studentPerformance.has(studentId)) {
          studentPerformance.set(studentId, {
            student: result.students,
            totalMarks: 0,
            obtainedMarks: 0,
            examsCount: 0,
            gpaSum: 0,
            subjects: new Set()
          });
        }
        
        const performance = studentPerformance.get(studentId);
        performance.totalMarks += result.total_marks;
        performance.obtainedMarks += result.marks_obtained;
        performance.examsCount += 1;
        performance.gpaSum += parseFloat(result.gpa || 0);
        performance.subjects.add(result.subjects?.name);
      });

      const performanceArray = Array.from(studentPerformance.values()).map(p => ({
        ...p,
        avgPercentage: (p.obtainedMarks / p.totalMarks) * 100,
        avgGPA: p.gpaSum / p.examsCount,
        subjectCount: p.subjects.size
      }));

      performanceArray.sort((a, b) => b.avgGPA - a.avgGPA);
      
      const topPerformers = performanceArray.slice(0, 10);
      const needsAttention = performanceArray
        .filter(p => p.avgPercentage < 50 || p.avgGPA < 2.5)
        .slice(0, 10);

      const classWiseData = performanceArray.reduce((acc: any, p) => {
        const className = p.student.class || 'Unknown';
        if (!acc[className]) {
          acc[className] = { students: 0, totalGPA: 0, avgGPA: 0 };
        }
        acc[className].students += 1;
        acc[className].totalGPA += p.avgGPA;
        return acc;
      }, {});

      Object.keys(classWiseData).forEach(className => {
        const data = classWiseData[className];
        data.avgGPA = data.totalGPA / data.students;
      });

      return {
        topPerformers,
        needsAttention,
        classWiseData,
        overallStats: {
          totalStudents: performanceArray.length,
          avgGPA: performanceArray.reduce((sum, p) => sum + p.avgGPA, 0) / performanceArray.length,
          avgPercentage: performanceArray.reduce((sum, p) => sum + p.avgPercentage, 0) / performanceArray.length
        }
      };
    },
    enabled: true,
    staleTime: 60000
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ছাত্র পারফরম্যান্স অ্যানালিটিক্স</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">লোড হচ্ছে...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            ছাত্র পারফরম্যান্স অ্যানালিটিক্স
          </CardTitle>
          <div className="flex gap-3 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {performanceData?.overallStats.avgGPA.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">গড় জিপিএ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {performanceData?.overallStats.avgPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">গড় পারসেন্টেজ</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top-performers">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="top-performers">
              <Trophy className="w-4 h-4 mr-1" />
              শীর্ষ পারফরমার
            </TabsTrigger>
            <TabsTrigger value="needs-attention">
              <AlertTriangle className="w-4 h-4 mr-1" />
              মনোযোগ প্রয়োজন
            </TabsTrigger>
            <TabsTrigger value="class-wise">
              <TrendingUp className="w-4 h-4 mr-1" />
              শ্রেণীভিত্তিক
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top-performers" className="space-y-3">
            {performanceData?.topPerformers.map((student: any, index: number) => (
              <div
                key={student.student.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{student.student.name}</p>
                    <Badge variant="outline" className="text-xs">
                      শ্রেণী {student.student.class}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">রোল: {student.student.roll_number}</span>
                    <span className="text-gray-600">পরীক্ষা: {student.examsCount}</span>
                    <span className="text-gray-600">বিষয়: {student.subjectCount}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {student.avgGPA.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">জিপিএ</p>
                  <Badge className="mt-1 bg-green-100 text-green-800">
                    {student.avgPercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
            
            {(!performanceData?.topPerformers || performanceData.topPerformers.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>কোনো ডেটা নেই</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="needs-attention" className="space-y-3">
            {performanceData?.needsAttention.map((student: any) => (
              <div
                key={student.student.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{student.student.name}</p>
                    <Badge variant="outline" className="text-xs">
                      শ্রেণী {student.student.class}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>রোল: {student.student.roll_number}</span>
                    <span>পরীক্ষা: {student.examsCount}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">
                    {student.avgGPA.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">জিপিএ</p>
                  <Badge className="mt-1 bg-red-100 text-red-800">
                    {student.avgPercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
            
            {(!performanceData?.needsAttention || performanceData.needsAttention.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>সব ছাত্র ভালো করছে! 🎉</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="class-wise" className="space-y-3">
            {Object.entries(performanceData?.classWiseData || {}).map(([className, data]: [string, any]) => (
              <div
                key={className}
                className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-lg">শ্রেণী {className}</p>
                    <p className="text-sm text-gray-500">{data.students} জন ছাত্র</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {data.avgGPA.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">গড় জিপিএ</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>পারফরম্যান্স</span>
                    <span className="font-medium">
                      {((data.avgGPA / 5) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={(data.avgGPA / 5) * 100} className="h-2" />
                </div>
              </div>
            ))}
            
            {(!performanceData?.classWiseData || Object.keys(performanceData.classWiseData).length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>কোনো ডেটা নেই</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
