import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { Link } from "wouter";
import { useState } from "react";
import { 
  ArrowLeft,
  Award,
  TrendingUp,
  Download,
  Search,
  Calendar,
  BookOpen,
  Target,
  BarChart3
} from "lucide-react";

interface ExamResult {
  id: number;
  studentId: number;
  examId: number;
  subjectId: number;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  gpa: number;
  position: number;
  remarks?: string;
  exam?: {
    id: number;
    name: string;
    examDate: string;
    academicYear: string;
    term: string;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
  };
}

interface AcademicPerformance {
  overallGPA: number;
  totalExams: number;
  averageMarks: number;
  bestSubject: string;
  improvementNeeded: string;
}

export default function StudentResults() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const [searchTerm, setSearchTerm] = useState("");
  const [termFilter, setTermFilter] = useState<string>('all');

  const { data: examResults, isLoading } = useQuery<ExamResult[]>({
    queryKey: ["/api/students/results"],
  });

  const { data: performance } = useQuery<AcademicPerformance>({
    queryKey: ["/api/students/performance"],
  });

  // Filter results
  const filteredResults = examResults?.filter(result => {
    const matchesSearch = !searchTerm || 
      result.exam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTerm = termFilter === 'all' || result.exam?.term === termFilter;
    
    return matchesSearch && matchesTerm;
  }) || [];

  // Get unique terms
  const terms = [...new Set(examResults?.map(result => result.exam?.term).filter(Boolean) || [])];

  // Group results by exam
  const resultsByExam = filteredResults.reduce((acc, result) => {
    const examKey = result.exam?.id || 0;
    if (!acc[examKey]) {
      acc[examKey] = {
        exam: result.exam,
        subjects: [],
        totalMarks: 0,
        obtainedMarks: 0,
        averageGPA: 0
      };
    }
    acc[examKey].subjects.push(result);
    acc[examKey].totalMarks += result.totalMarks;
    acc[examKey].obtainedMarks += result.marksObtained;
    return acc;
  }, {} as Record<number, any>);

  // Calculate average GPA for each exam
  Object.values(resultsByExam).forEach((examData: any) => {
    examData.averageGPA = examData.subjects.reduce((sum: number, subject: ExamResult) => sum + subject.gpa, 0) / examData.subjects.length;
    examData.percentage = (examData.obtainedMarks / examData.totalMarks) * 100;
  });

  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case 'A+': return 'bg-green-100 text-green-800 border-green-200';
      case 'A': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'D': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-emerald-200/20">
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
                  Exam Results
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  পরীক্ষার ফলাফল • Academic performance and grades
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search exams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {performance?.overallGPA?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-emerald-600 font-medium">Overall GPA</p>
                </div>
                <div className="bg-emerald-500 p-3 rounded-xl">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {performance?.totalExams || Object.keys(resultsByExam).length}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Total Exams</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {performance?.averageMarks?.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Average Marks</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-blue-700">
                    {performance?.bestSubject || 'Mathematics'}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">Best Subject</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Results List */}
          <div className="lg:col-span-3">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      <span>Exam Results</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed examination results and grades
                    </CardDescription>
                  </div>
                  
                  <select
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Terms</option>
                    {terms.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.values(resultsByExam).map((examData: any) => (
                    <div key={examData.exam?.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {examData.exam?.name || 'Unknown Exam'}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                            <span>Term: {examData.exam?.term}</span>
                            <span>Year: {examData.exam?.academicYear}</span>
                            <span>Date: {examData.exam?.examDate}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              GPA: {examData.averageGPA.toFixed(2)}
                            </Badge>
                            <Badge variant="outline">
                              {examData.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {examData.obtainedMarks}/{examData.totalMarks} marks
                          </p>
                        </div>
                      </div>

                      {/* Subject Results */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {examData.subjects.map((result: ExamResult) => (
                          <div key={result.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {result.subject?.name || 'Unknown Subject'}
                              </h4>
                              <Badge className={getGradeColor(result.grade)}>
                                {result.grade}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500">Marks</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {result.marksObtained}/{result.totalMarks}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">GPA</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {result.gpa.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Position</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {result.position}
                                </p>
                              </div>
                            </div>
                            
                            {result.remarks && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <p className="text-blue-800 dark:text-blue-300">
                                  {result.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {Object.keys(resultsByExam).length === 0 && (
                    <div className="text-center py-12">
                      <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Results Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || termFilter !== 'all' 
                          ? 'No results match your search criteria.' 
                          : 'No exam results available yet.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Insights */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span>Performance Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <h4 className="font-medium text-emerald-900 dark:text-emerald-300 mb-1">Strong Subject</h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {performance?.bestSubject || 'Mathematics'} - Keep up the excellent work!
                  </p>
                </div>
                
                {performance?.improvementNeeded && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">Focus Area</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      {performance.improvementNeeded} - Consider extra practice
                    </p>
                  </div>
                )}
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Overall Progress</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Your academic performance is on track. Keep maintaining consistency.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Grade Scale */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Grade Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span className="font-medium">A+</span>
                    <span className="text-gray-600">80-100%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <span className="font-medium">A</span>
                    <span className="text-gray-600">70-79%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span className="font-medium">B</span>
                    <span className="text-gray-600">60-69%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <span className="font-medium">C</span>
                    <span className="text-gray-600">50-59%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="font-medium">D</span>
                    <span className="text-gray-600">40-49%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Result Sheet
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Exam Schedule
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Study Materials
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}