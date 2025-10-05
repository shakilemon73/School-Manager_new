import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesDb } from '@/lib/db/grades';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  BarChart3,
  TrendingUp,
  Award,
  Filter,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Check,
  X,
  AlertCircle,
  Save,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InsertAssessment, InsertStudentScore } from '@shared/schema';

export default function Gradebook() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
  const [selectedAssessment, setSelectedAssessment] = useState<number | undefined>();
  const [bulkEntryMode, setBulkEntryMode] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});

  const schoolId = 1;

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: () => gradesDb.getSubjects(schoolId),
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments', schoolId, selectedClass, selectedSection, selectedSubject, selectedTerm],
    queryFn: () => {
      if (!selectedClass || !selectedSection) return [];
      return gradesDb.getAssessmentsByClass(
        schoolId,
        selectedClass,
        selectedSection,
        selectedSubject,
        selectedTerm
      );
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  const { data: gradeBook, isLoading: gradeBookLoading } = useQuery({
    queryKey: ['gradebook', schoolId, selectedClass, selectedSection, selectedSubject, selectedTerm],
    queryFn: () => {
      if (!selectedClass || !selectedSection) return null;
      return gradesDb.getClassGradeBook(
        schoolId,
        selectedClass,
        selectedSection,
        selectedSubject,
        selectedTerm
      );
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  const { data: distribution, isLoading: distributionLoading } = useQuery({
    queryKey: ['grade-distribution', selectedAssessment],
    queryFn: () => {
      if (!selectedAssessment) return null;
      return gradesDb.getGradeDistribution(selectedAssessment);
    },
    enabled: !!selectedAssessment,
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (data: InsertAssessment) => gradesDb.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'মূল্যায়ন তৈরি হয়েছে' : 'Assessment created successfully',
      });
      setIsCreateDialogOpen(false);
    },
  });

  const recordScoreMutation = useMutation({
    mutationFn: (data: InsertStudentScore) => gradesDb.recordStudentScore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      queryClient.invalidateQueries({ queryKey: ['grade-distribution'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'নম্বর সংরক্ষিত হয়েছে' : 'Score saved successfully',
      });
    },
  });

  const bulkRecordMutation = useMutation({
    mutationFn: (scores: InsertStudentScore[]) => gradesDb.recordBulkStudentScores(scores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'সকল নম্বর সংরক্ষিত হয়েছে' : 'All scores saved successfully',
      });
      setBulkEntryMode(false);
      setEditingScores({});
    },
  });

  const handleScoreChange = (studentId: number, assessmentId: number, value: string) => {
    const key = `${studentId}-${assessmentId}`;
    setEditingScores(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveScore = (studentId: number, assessmentId: number) => {
    const key = `${studentId}-${assessmentId}`;
    const value = editingScores[key];

    if (value === undefined) return;

    const scoreData: InsertStudentScore = {
      assessmentId,
      studentId,
      scoreObtained: value ? value : null,
      isAbsent: value === 'A' || value === 'Absent',
      gradedDate: new Date().toISOString().split('T')[0],
    };

    recordScoreMutation.mutate(scoreData);
    setEditingScores(prev => {
      const newScores = { ...prev };
      delete newScores[key];
      return newScores;
    });
  };

  const handleBulkSave = () => {
    if (!selectedAssessment || !gradeBook) return;

    const scores: InsertStudentScore[] = gradeBook.students
      .map((student: any) => {
        const key = `${student.id}-${selectedAssessment}`;
        const value = editingScores[key];

        if (value === undefined) return null;

        return {
          assessmentId: selectedAssessment,
          studentId: student.id,
          scoreObtained: value && value !== 'A' && value !== 'Absent' ? value : null,
          isAbsent: value === 'A' || value === 'Absent',
          gradedDate: new Date().toISOString().split('T')[0],
        };
      })
      .filter(Boolean) as InsertStudentScore[];

    if (scores.length > 0) {
      bulkRecordMutation.mutate(scores);
    }
  };

  const getScoreColor = (score: number | null, totalMarks: number) => {
    if (score === null) return '';
    const percentage = (score / totalMarks) * 100;

    if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100';
    if (percentage >= 80) return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
    if (percentage >= 70) return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
    if (percentage >= 60) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
    return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    return 'F';
  };

  const exportToCSV = async () => {
    if (!selectedClass || !selectedSection) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ক্লাস এবং সেকশন নির্বাচন করুন' : 'Please select class and section',
        variant: 'destructive',
      });
      return;
    }

    try {
      const csv = await gradesDb.exportGradesToCSV(
        schoolId,
        selectedClass,
        selectedSection,
        selectedSubject,
        selectedTerm
      );

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradebook_${selectedClass}_${selectedSection}_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'এক্সপোর্ট সম্পন্ন হয়েছে' : 'Export completed',
      });
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'এক্সপোর্ট ব্যর্থ হয়েছে' : 'Export failed',
        variant: 'destructive',
      });
    }
  };

  const distributionChartData = useMemo(() => {
    if (!distribution) return [];

    return Object.entries(distribution.distribution).map(([grade, count]) => ({
      grade,
      count,
    }));
  }, [distribution]);

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const sections = ['A', 'B', 'C', 'D'];

  return (
    <AppShell>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
              {language === 'bn' ? 'গ্রেডবুক ব্যবস্থাপনা' : 'Gradebook Management'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {language === 'bn'
                ? 'শিক্ষার্থীদের নম্বর এবং গ্রেড পরিচালনা করুন'
                : 'Manage student marks and grades'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={!selectedClass || !selectedSection}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'এক্সপোর্ট' : 'Export CSV'}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-assessment">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'নতুন মূল্যায়ন' : 'New Assessment'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-create-assessment">
                <CreateAssessmentDialog
                  onSubmit={(data) => createAssessmentMutation.mutate(data)}
                  subjects={subjects || []}
                  isLoading={createAssessmentMutation.isPending}
                  language={language}
                  schoolId={schoolId}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card data-testid="card-filters">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {language === 'bn' ? 'ফিল্টার' : 'Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">{language === 'bn' ? 'ক্লাস' : 'Class'}</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class" data-testid="select-class">
                    <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls} data-testid={`select-class-${cls}`}>
                        {language === 'bn' ? `ক্লাস ${cls}` : `Class ${cls}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">{language === 'bn' ? 'সেকশন' : 'Section'}</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger id="section" data-testid="select-section">
                    <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((sec) => (
                      <SelectItem key={sec} value={sec} data-testid={`select-section-${sec}`}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{language === 'bn' ? 'বিষয়' : 'Subject'}</Label>
                <Select
                  value={selectedSubject?.toString()}
                  onValueChange={(val) => setSelectedSubject(val ? Number(val) : undefined)}
                >
                  <SelectTrigger id="subject" data-testid="select-subject">
                    <SelectValue placeholder={language === 'bn' ? 'সকল বিষয়' : 'All Subjects'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      {language === 'bn' ? 'সকল বিষয়' : 'All Subjects'}
                    </SelectItem>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()} data-testid={`select-subject-${subject.id}`}>
                        {language === 'bn' ? subject.nameBn : subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="term">{language === 'bn' ? 'টার্ম' : 'Term'}</Label>
                <Select
                  value={selectedTerm?.toString()}
                  onValueChange={(val) => setSelectedTerm(val ? Number(val) : undefined)}
                >
                  <SelectTrigger id="term" data-testid="select-term">
                    <SelectValue placeholder={language === 'bn' ? 'সকল টার্ম' : 'All Terms'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      {language === 'bn' ? 'সকল টার্ম' : 'All Terms'}
                    </SelectItem>
                    <SelectItem value="1">
                      {language === 'bn' ? 'প্রথম টার্ম' : 'First Term'}
                    </SelectItem>
                    <SelectItem value="2">
                      {language === 'bn' ? 'দ্বিতীয় টার্ম' : 'Second Term'}
                    </SelectItem>
                    <SelectItem value="3">
                      {language === 'bn' ? 'তৃতীয় টার্ম' : 'Third Term'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="gradebook" className="space-y-4" data-testid="tabs-main">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gradebook" data-testid="tab-gradebook">
              <Users className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'গ্রেডবুক' : 'Gradebook'}
            </TabsTrigger>
            <TabsTrigger value="assessments" data-testid="tab-assessments">
              <FileText className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'মূল্যায়ন' : 'Assessments'}
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'বিশ্লেষণ' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gradebook" className="space-y-4">
            {selectedClass && selectedSection ? (
              <Card data-testid="card-gradebook">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {language === 'bn'
                        ? `ক্লাস ${selectedClass}-${selectedSection} গ্রেডবুক`
                        : `Class ${selectedClass}-${selectedSection} Gradebook`}
                    </CardTitle>
                    {selectedAssessment && (
                      <div className="flex gap-2">
                        <Button
                          variant={bulkEntryMode ? 'default' : 'outline'}
                          onClick={() => setBulkEntryMode(!bulkEntryMode)}
                          data-testid="button-bulk-entry"
                        >
                          {bulkEntryMode
                            ? language === 'bn'
                              ? 'বাল্ক মোড বন্ধ'
                              : 'Exit Bulk Mode'
                            : language === 'bn'
                            ? 'বাল্ক এন্ট্রি'
                            : 'Bulk Entry'}
                        </Button>
                        {bulkEntryMode && (
                          <Button onClick={handleBulkSave} disabled={bulkRecordMutation.isPending} data-testid="button-save-bulk">
                            <Save className="w-4 h-4 mr-2" />
                            {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save All'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {gradeBookLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : gradeBook && gradeBook.students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">
                              {language === 'bn' ? 'রোল' : 'Roll'}
                            </TableHead>
                            <TableHead className="min-w-[150px]">
                              {language === 'bn' ? 'নাম' : 'Name'}
                            </TableHead>
                            {gradeBook.assessments.map((assessment: any) => (
                              <TableHead
                                key={assessment.id}
                                className="min-w-[120px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => setSelectedAssessment(assessment.id)}
                                data-testid={`header-assessment-${assessment.id}`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold">
                                    {language === 'bn'
                                      ? assessment.assessment_name_bn || assessment.assessment_name
                                      : assessment.assessment_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {language === 'bn' ? 'মোট' : 'Out of'} {assessment.total_marks}
                                  </span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="w-24">
                              {language === 'bn' ? 'গড়' : 'Average'}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gradeBook.students.map((student: any) => {
                            const studentScores = gradeBook.scores.filter(
                              (s: any) => s.student_id === student.id
                            );
                            const validScores = studentScores.filter((s: any) => !s.is_absent && s.score_obtained !== null);
                            const average = validScores.length > 0
                              ? validScores.reduce((sum: number, s: any) => sum + Number(s.score_obtained), 0) / validScores.length
                              : 0;

                            return (
                              <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                                <TableCell className="font-medium">{student.roll_number}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                {gradeBook.assessments.map((assessment: any) => {
                                  const score = studentScores.find(
                                    (s: any) => s.assessment_id === assessment.id
                                  );
                                  const key = `${student.id}-${assessment.id}`;
                                  const isEditing = editingScores.hasOwnProperty(key);

                                  if (bulkEntryMode && selectedAssessment === assessment.id) {
                                    return (
                                      <TableCell key={assessment.id}>
                                        <Input
                                          type="text"
                                          placeholder={language === 'bn' ? 'নম্বর/A' : 'Score/A'}
                                          value={editingScores[key] ?? (score?.is_absent ? 'A' : score?.score_obtained ?? '')}
                                          onChange={(e) => handleScoreChange(student.id, assessment.id, e.target.value)}
                                          className="w-20"
                                          data-testid={`input-score-${student.id}-${assessment.id}`}
                                        />
                                      </TableCell>
                                    );
                                  }

                                  return (
                                    <TableCell
                                      key={assessment.id}
                                      className={cn(
                                        'text-center font-semibold cursor-pointer transition-colors',
                                        score && !score.is_absent
                                          ? getScoreColor(Number(score.score_obtained), Number(assessment.total_marks))
                                          : ''
                                      )}
                                      onDoubleClick={() => setSelectedAssessment(assessment.id)}
                                      data-testid={`cell-score-${student.id}-${assessment.id}`}
                                    >
                                      {score ? (
                                        score.is_absent ? (
                                          <Badge variant="destructive">A</Badge>
                                        ) : (
                                          <div className="flex flex-col items-center">
                                            <span>{score.score_obtained}</span>
                                            <span className="text-xs text-gray-500">
                                              {getGradeLetter(
                                                (Number(score.score_obtained) / Number(assessment.total_marks)) * 100
                                              )}
                                            </span>
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center font-semibold">
                                  {average > 0 ? (
                                    <Badge variant="outline">{average.toFixed(1)}</Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        {language === 'bn' ? 'কোন শিক্ষার্থী পাওয়া যায়নি' : 'No students found'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'bn'
                        ? 'ক্লাস এবং সেকশন নির্বাচন করুন'
                        : 'Please select class and section'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            {assessmentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assessments.map((assessment: any) => (
                  <Card key={assessment.id} data-testid={`card-assessment-${assessment.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {language === 'bn'
                              ? assessment.assessment_name_bn || assessment.assessment_name
                              : assessment.assessment_name}
                          </CardTitle>
                          <CardDescription>
                            {language === 'bn' ? assessment.subject?.name_bn : assessment.subject?.name}
                          </CardDescription>
                        </div>
                        <Badge>{assessment.assessment_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {language === 'bn' ? 'মোট নম্বর' : 'Total Marks'}:
                          </span>
                          <span className="font-semibold">{assessment.total_marks}</span>
                        </div>
                        {assessment.weight_percentage && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {language === 'bn' ? 'ওজন' : 'Weight'}:
                            </span>
                            <span className="font-semibold">{assessment.weight_percentage}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {language === 'bn' ? 'তারিখ' : 'Date'}:
                          </span>
                          <span className="font-semibold">
                            {assessment.date
                              ? new Date(assessment.date).toLocaleDateString()
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'bn' ? 'কোন মূল্যায়ন পাওয়া যায়নি' : 'No assessments found'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {selectedAssessment && distribution ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card data-testid="card-distribution">
                  <CardHeader>
                    <CardTitle>
                      {language === 'bn' ? 'গ্রেড বিতরণ' : 'Grade Distribution'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card data-testid="card-statistics">
                  <CardHeader>
                    <CardTitle>
                      {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">
                        {language === 'bn' ? 'মোট শিক্ষার্থী' : 'Total Students'}
                      </span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {distribution.total}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">
                        {language === 'bn' ? 'গড় নম্বর' : 'Average Score'}
                      </span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {distribution.average.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(distribution.distribution).map(([grade, count]) => (
                        <div
                          key={grade}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className="font-medium text-sm">{grade}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'bn'
                        ? 'বিশ্লেষণ দেখতে একটি মূল্যায়ন নির্বাচন করুন'
                        : 'Select an assessment to view analytics'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function CreateAssessmentDialog({
  onSubmit,
  subjects,
  isLoading,
  language,
  schoolId,
}: {
  onSubmit: (data: InsertAssessment) => void;
  subjects: any[];
  isLoading: boolean;
  language: string;
  schoolId: number;
}) {
  const [formData, setFormData] = useState<Partial<InsertAssessment>>({
    schoolId,
    assessmentType: 'exam',
    isPublished: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.subjectId && formData.class && formData.section && formData.assessmentName && formData.totalMarks) {
      onSubmit(formData as InsertAssessment);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="form-create-assessment">
      <DialogHeader>
        <DialogTitle>
          {language === 'bn' ? 'নতুন মূল্যায়ন তৈরি করুন' : 'Create New Assessment'}
        </DialogTitle>
        <DialogDescription>
          {language === 'bn'
            ? 'মূল্যায়নের বিস্তারিত তথ্য প্রদান করুন'
            : 'Provide assessment details'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assessment-name">
              {language === 'bn' ? 'মূল্যায়নের নাম' : 'Assessment Name'}
            </Label>
            <Input
              id="assessment-name"
              value={formData.assessmentName || ''}
              onChange={(e) => setFormData({ ...formData, assessmentName: e.target.value })}
              required
              data-testid="input-assessment-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment-type">
              {language === 'bn' ? 'ধরন' : 'Type'}
            </Label>
            <Select
              value={formData.assessmentType}
              onValueChange={(value) => setFormData({ ...formData, assessmentType: value })}
            >
              <SelectTrigger id="assessment-type" data-testid="select-assessment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">{language === 'bn' ? 'পরীক্ষা' : 'Exam'}</SelectItem>
                <SelectItem value="test">{language === 'bn' ? 'টেস্ট' : 'Test'}</SelectItem>
                <SelectItem value="quiz">{language === 'bn' ? 'কুইজ' : 'Quiz'}</SelectItem>
                <SelectItem value="homework">{language === 'bn' ? 'হোমওয়ার্ক' : 'Homework'}</SelectItem>
                <SelectItem value="project">{language === 'bn' ? 'প্রজেক্ট' : 'Project'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject">
              {language === 'bn' ? 'বিষয়' : 'Subject'}
            </Label>
            <Select
              value={formData.subjectId?.toString()}
              onValueChange={(value) => setFormData({ ...formData, subjectId: Number(value) })}
            >
              <SelectTrigger id="subject" data-testid="select-subject-create">
                <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {language === 'bn' ? subject.nameBn : subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-marks">
              {language === 'bn' ? 'মোট নম্বর' : 'Total Marks'}
            </Label>
            <Input
              id="total-marks"
              type="number"
              value={formData.totalMarks || ''}
              onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
              required
              data-testid="input-total-marks"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="class-create">
              {language === 'bn' ? 'ক্লাস' : 'Class'}
            </Label>
            <Input
              id="class-create"
              value={formData.class || ''}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              required
              data-testid="input-class-create"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-create">
              {language === 'bn' ? 'সেকশন' : 'Section'}
            </Label>
            <Input
              id="section-create"
              value={formData.section || ''}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              required
              data-testid="input-section-create"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">
              {language === 'bn' ? 'ওজন %' : 'Weight %'}
            </Label>
            <Input
              id="weight"
              type="number"
              value={formData.weightPercentage || ''}
              onChange={(e) => setFormData({ ...formData, weightPercentage: e.target.value })}
              data-testid="input-weight"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            {language === 'bn' ? 'বিবরণ' : 'Description'}
          </Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            data-testid="textarea-description"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-assessment">
          {isLoading
            ? language === 'bn'
              ? 'তৈরি হচ্ছে...'
              : 'Creating...'
            : language === 'bn'
            ? 'তৈরি করুন'
            : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
