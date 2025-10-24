import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useCurrentAcademicYear } from '@/hooks/use-school-context';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { exportUtils } from '@/lib/export-utils';
import { Link } from 'wouter';
import {
  Award,
  Download,
  Search,
  BarChart3,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Users,
  BookOpen,
  Calendar,
  FileText,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ResultsManagement() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const schoolId = useRequireSchoolId();
  const { currentAcademicYear } = useCurrentAcademicYear();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('table');
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

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subjects')
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

  // Fetch academic terms
  const { data: terms = [] } = useQuery({
    queryKey: ['academic-terms', schoolId, currentAcademicYear?.id],
    queryFn: async () => {
      try {
        if (!currentAcademicYear?.id) return [];
        
        const { data, error } = await supabase
          .from('academic_terms')
          .select('*')
          .eq('school_id', schoolId)
          .eq('academic_year_id', currentAcademicYear.id)
          .order('start_date');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!currentAcademicYear?.id,
  });

  // Fetch student scores with filters
  const { data: studentResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['student-results', schoolId, selectedClass, selectedSection, selectedSubject, selectedTerm],
    queryFn: async () => {
      try {
        let query = supabase
          .from('student_scores')
          .select(`
            *,
            students!inner(id, name, student_id, class, section, school_id),
            assessments!inner(id, assessment_name, total_marks, subject_id, term_id)
          `)
          .eq('students.school_id', schoolId);

        if (selectedClass && selectedClass !== 'all') {
          query = query.eq('students.class', selectedClass);
        }
        if (selectedSection && selectedSection !== 'all') {
          query = query.eq('students.section', selectedSection);
        }
        if (selectedTerm && selectedTerm !== 'all') {
          query = query.eq('assessments.term_id', parseInt(selectedTerm));
        }
        if (selectedSubject && selectedSubject !== 'all') {
          query = query.eq('assessments.subject_id', parseInt(selectedSubject));
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Failed to fetch student results:', error);
        return [];
      }
    },
  });

  // Calculate statistics
  const stats = {
    totalStudents: new Set(studentResults.map(r => r.students?.id)).size,
    totalAssessments: new Set(studentResults.map(r => r.assessment_id)).size,
    averageScore: studentResults.length > 0 
      ? (studentResults.reduce((acc, r) => acc + (parseFloat(r.score_obtained || '0')), 0) / studentResults.length).toFixed(2)
      : '0',
    passingRate: studentResults.length > 0
      ? ((studentResults.filter(r => {
          const score = parseFloat(r.score_obtained || '0');
          const maxScore = parseFloat(r.assessments?.total_marks || '100');
          return (score / maxScore) * 100 >= 40;
        }).length / studentResults.length) * 100).toFixed(1)
      : '0'
  };

  // Grade distribution for chart
  const gradeDistribution = studentResults.reduce((acc, result) => {
    const grade = result.grade_letter || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gradeChartData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  // Filter results by search
  const filteredResults = studentResults.filter(result => {
    if (!searchQuery) return true;
    const student = result.students;
    return (
      student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleExportResults = async (format: 'csv' | 'pdf' | 'excel') => {
    if (filteredResults.length === 0) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানির জন্য কোন ডেটা নেই' : 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = filteredResults.map((result: any) => {
        const score = parseFloat(result.score_obtained || '0');
        const maxScore = parseFloat(result.assessments?.total_marks || '100');
        const percentage = (score / maxScore) * 100;
        const isPassing = percentage >= 40;

        return {
          'Student ID': result.students?.student_id || '',
          'Student Name': result.students?.name || '',
          'Class': result.students?.class || '',
          'Section': result.students?.section || '',
          'Assessment': result.assessments?.assessment_name || '',
          'Score Obtained': result.is_absent ? 'Absent' : score.toString(),
          'Total Marks': maxScore.toString(),
          'Percentage': result.is_absent ? 'N/A' : `${percentage.toFixed(2)}%`,
          'Grade': result.grade_letter || 'N/A',
          'Status': result.is_absent ? 'Absent' : (isPassing ? 'Passed' : 'Failed'),
        };
      });

      const columns = [
        { header: 'Student ID', key: 'Student ID' },
        { header: 'Student Name', key: 'Student Name', width: 20 },
        { header: 'Class', key: 'Class' },
        { header: 'Section', key: 'Section' },
        { header: 'Assessment', key: 'Assessment', width: 25 },
        { header: 'Score Obtained', key: 'Score Obtained' },
        { header: 'Total Marks', key: 'Total Marks' },
        { header: 'Percentage', key: 'Percentage' },
        { header: 'Grade', key: 'Grade' },
        { header: 'Status', key: 'Status' },
      ];

      const filterDescription = [
        selectedClass && selectedClass !== 'all' ? `Class: ${selectedClass}` : '',
        selectedSection && selectedSection !== 'all' ? `Section: ${selectedSection}` : '',
        selectedSubject && selectedSubject !== 'all' 
          ? `Subject: ${subjects.find((s: any) => s.id.toString() === selectedSubject)?.name || ''}` 
          : '',
        selectedTerm && selectedTerm !== 'all' 
          ? `Term: ${terms.find((t: any) => t.id.toString() === selectedTerm)?.name || ''}` 
          : '',
      ].filter(Boolean).join(' | ');

      const title = language === 'bn' ? 'ফলাফল রিপোর্ট' : 'Student Results Report';
      const description = filterDescription || (language === 'bn' ? 'সকল ফলাফল' : 'All Results');

      if (format === 'csv') {
        exportUtils.exportToCSV({
          filename: 'student-results',
          columns,
          data: exportData,
        });
      } else if (format === 'pdf') {
        exportUtils.exportToPDF({
          filename: 'student-results',
          title,
          description,
          columns,
          data: exportData,
          orientation: 'landscape',
        });
      } else if (format === 'excel') {
        exportUtils.exportToExcel({
          filename: 'student-results',
          title,
          columns,
          data: exportData,
        });
      }

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' 
          ? `ফলাফল ${format.toUpperCase()} ফরম্যাটে রপ্তানি হয়েছে` 
          : `Results exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানিতে ব্যর্থ' : 'Failed to export results',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const t = {
    title: language === 'bn' ? 'ফলাফল ব্যবস্থাপনা' : 'Student Results Management',
    export: language === 'bn' ? 'রপ্তানি' : 'Export',
    totalStudents: language === 'bn' ? 'মোট শিক্ষার্থী' : 'Total Students',
    totalAssessments: language === 'bn' ? 'মোট মূল্যায়ন' : 'Total Assessments',
    averageScore: language === 'bn' ? 'গড় স্কোর' : 'Average Score',
    passingRate: language === 'bn' ? 'পাসের হার' : 'Passing Rate',
    resultsList: language === 'bn' ? 'ফলাফল তালিকা' : 'Results List',
    resultsDescription: language === 'bn' ? 'শিক্ষার্থীদের মূল্যায়ন ফলাফল দেখুন এবং পরিচালনা করুন' : 'View and manage student assessment results',
    searchStudent: language === 'bn' ? 'শিক্ষার্থী খুঁজুন...' : 'Search student...',
    selectClass: language === 'bn' ? 'শ্রেণী নির্বাচন' : 'Select Class',
    allClasses: language === 'bn' ? 'সকল ক্লাস' : 'All Classes',
    selectSection: language === 'bn' ? 'শাখা নির্বাচন' : 'Select Section',
    allSections: language === 'bn' ? 'সকল শাখা' : 'All Sections',
    selectSubject: language === 'bn' ? 'বিষয় নির্বাচন' : 'Select Subject',
    allSubjects: language === 'bn' ? 'সকল বিষয়' : 'All Subjects',
    selectTerm: language === 'bn' ? 'টার্ম নির্বাচন' : 'Select Term',
    allTerms: language === 'bn' ? 'সকল টার্ম' : 'All Terms',
    resultsTable: language === 'bn' ? 'ফলাফল তালিকা' : 'Results Table',
    analytics: language === 'bn' ? 'বিশ্লেষণ' : 'Analytics',
    studentId: language === 'bn' ? 'শিক্ষার্থী আইডি' : 'Student ID',
    name: language === 'bn' ? 'নাম' : 'Name',
    class: language === 'bn' ? 'শ্রেণী' : 'Class',
    assessment: language === 'bn' ? 'মূল্যায়ন' : 'Assessment',
    score: language === 'bn' ? 'স্কোর' : 'Score',
    grade: language === 'bn' ? 'গ্রেড' : 'Grade',
    status: language === 'bn' ? 'অবস্থা' : 'Status',
    actions: language === 'bn' ? 'কার্যক্রম' : 'Actions',
    loading: language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...',
    noResults: language === 'bn' ? 'কোন ফলাফল পাওয়া যায়নি' : 'No results found',
    absent: language === 'bn' ? 'অনুপস্থিত' : 'Absent',
    passed: language === 'bn' ? 'উত্তীর্ণ' : 'Passed',
    failed: language === 'bn' ? 'অনুত্তীর্ণ' : 'Failed',
    gradeDistribution: language === 'bn' ? 'গ্রেড বিতরণ' : 'Grade Distribution',
    percentageDistribution: language === 'bn' ? 'শতাংশ বিতরণ' : 'Percentage Distribution',
    students: language === 'bn' ? 'শিক্ষার্থী' : 'Students',
    viewGradebook: language === 'bn' ? 'গ্রেডবুক দেখুন' : 'View Gradebook',
    viewStudents: language === 'bn' ? 'শিক্ষার্থী দেখুন' : 'View Students',
    viewSubjects: language === 'bn' ? 'বিষয় দেখুন' : 'View Subjects',
  };

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Award className="w-8 h-8 text-purple-600" />
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/academic/gradebook">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                {t.viewGradebook}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting} data-testid="button-export-results">
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
                <DropdownMenuItem onClick={() => handleExportResults('csv')} data-testid="export-csv">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'CSV ফাইল' : 'CSV File'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportResults('pdf')} data-testid="export-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'PDF ডকুমেন্ট' : 'PDF Document'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportResults('excel')} data-testid="export-excel">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'এক্সেল ফাইল' : 'Excel File'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalAssessments}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssessments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.averageScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.passingRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passingRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t.resultsList}</CardTitle>
                <CardDescription>{t.resultsDescription}</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger data-testid="select-subject">
                  <SelectValue placeholder={t.selectSubject} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allSubjects}</SelectItem>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger data-testid="select-term">
                  <SelectValue placeholder={t.selectTerm} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allTerms}</SelectItem>
                  {terms.map((term: any) => (
                    <SelectItem key={term.id} value={term.id.toString()}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="table" data-testid="tab-table">
                  {t.resultsTable}
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">
                  {t.analytics}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.studentId}</TableHead>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.class}</TableHead>
                        <TableHead>{t.assessment}</TableHead>
                        <TableHead className="text-center">{t.score}</TableHead>
                        <TableHead className="text-center">{t.grade}</TableHead>
                        <TableHead className="text-center">{t.status}</TableHead>
                        <TableHead className="text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            {t.loading}
                          </TableCell>
                        </TableRow>
                      ) : filteredResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {t.noResults}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredResults.map((result: any) => {
                          const score = parseFloat(result.score_obtained || '0');
                          const maxScore = parseFloat(result.assessments?.total_marks || '100');
                          const percentage = (score / maxScore) * 100;
                          const isPassing = percentage >= 40;

                          return (
                            <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                              <TableCell className="font-mono text-sm">
                                {result.students?.student_id}
                              </TableCell>
                              <TableCell className="font-medium">{result.students?.name}</TableCell>
                              <TableCell>{result.students?.class} - {result.students?.section}</TableCell>
                              <TableCell>{result.assessments?.assessment_name}</TableCell>
                              <TableCell className="text-center font-semibold">
                                {result.is_absent ? (
                                  <Badge variant="outline">{t.absent}</Badge>
                                ) : (
                                  <span>{score}/{maxScore}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {result.grade_letter ? (
                                  <Badge variant="outline">{result.grade_letter}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {result.is_absent ? (
                                  <Badge variant="outline">{t.absent}</Badge>
                                ) : isPassing ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t.passed}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {t.failed}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="sm" data-testid={`button-view-${result.id}`}>
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

              <TabsContent value="analytics" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.gradeDistribution}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={gradeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grade" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8b5cf6" name={t.students} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t.percentageDistribution}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={gradeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.grade}: ${entry.count}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {gradeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
