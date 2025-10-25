import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { exportUtils } from '@/lib/export-utils';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
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
  FileSpreadsheet,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Settings,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InsertAssessment, InsertStudentScore, InsertAssessmentComponent, InsertGradeScale } from '@shared/schema';

export default function Gradebook() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const { hasPermission, teacherClassSubjects } = usePermissions();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
  const [selectedAssessment, setSelectedAssessment] = useState<number | undefined>();
  const [bulkEntryMode, setBulkEntryMode] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<number | null>(null);
  const [historyAssessmentId, setHistoryAssessmentId] = useState<number | null>(null);
  
  // Feature 2.1: Assessment Components state
  const [expandedAssessments, setExpandedAssessments] = useState<Set<number>>(new Set());
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [editingComponentAssessmentId, setEditingComponentAssessmentId] = useState<number | null>(null);
  
  // Feature 2.2: Grade Scales state
  const [isGradeScaleDialogOpen, setIsGradeScaleDialogOpen] = useState(false);
  const [selectedGradeScaleId, setSelectedGradeScaleId] = useState<number | undefined>();
  
  // Feature 2.3: Bulk Operations state
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isCopyAssessmentDialogOpen, setIsCopyAssessmentDialogOpen] = useState(false);
  const [copyingAssessmentId, setCopyingAssessmentId] = useState<number | null>(null);
  
  // Feature 2.2: Grade Overrides state
  const [isGradeOverrideDialogOpen, setIsGradeOverrideDialogOpen] = useState(false);
  const [overrideStudentId, setOverrideStudentId] = useState<number | null>(null);
  const [overrideSubjectId, setOverrideSubjectId] = useState<number | null>(null);

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
    queryKey: ['grade-distribution', schoolId, selectedAssessment],
    queryFn: () => {
      if (!selectedAssessment) return null;
      return gradesDb.getGradeDistribution(selectedAssessment, schoolId);
    },
    enabled: !!selectedAssessment,
  });

  const { data: gradeHistory, isLoading: gradeHistoryLoading } = useQuery({
    queryKey: ['grade-history', schoolId, historyStudentId, historyAssessmentId],
    queryFn: () => {
      if (!historyStudentId || !historyAssessmentId) return [];
      return gradesDb.getGradeHistory(historyStudentId, historyAssessmentId, schoolId);
    },
    enabled: !!historyStudentId && !!historyAssessmentId && isHistoryDialogOpen,
  });

  // Feature 2.1: Assessment Components queries
  const { data: assessmentComponents, isLoading: componentsLoading } = useQuery({
    queryKey: ['assessment-components', editingComponentAssessmentId, schoolId],
    queryFn: () => {
      if (!editingComponentAssessmentId) return [];
      return gradesDb.getAssessmentComponents(editingComponentAssessmentId, schoolId);
    },
    enabled: !!editingComponentAssessmentId,
  });

  // Feature 2.2: Grade Scales queries
  const { data: gradeScales, isLoading: gradeScalesLoading } = useQuery({
    queryKey: ['grade-scales', schoolId],
    queryFn: () => gradesDb.getGradeScales(schoolId),
  });

  // Feature 2.2: Grade Overrides queries
  const { data: gradeOverrides, isLoading: gradeOverridesLoading } = useQuery({
    queryKey: ['grade-overrides', schoolId, selectedTerm],
    queryFn: () => gradesDb.getAllGradeOverrides(schoolId, selectedTerm),
  });

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    
    if (hasPermission(PERMISSIONS.MANAGE_ALL_GRADES)) {
      return subjects;
    }

    if (teacherClassSubjects && teacherClassSubjects.length > 0) {
      const teacherSubjectIds = teacherClassSubjects.map((tcs: any) => tcs.subjectId);
      return subjects.filter((subject: any) => teacherSubjectIds.includes(subject.id));
    }

    return subjects;
  }, [subjects, teacherClassSubjects, hasPermission]);

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

  // Feature 2.1: Assessment Component mutations
  const createComponentMutation = useMutation({
    mutationFn: (data: InsertAssessmentComponent) => gradesDb.createAssessmentComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-components'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'কম্পোনেন্ট তৈরি হয়েছে' : 'Component created successfully',
      });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => gradesDb.deleteAssessmentComponent(id, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-components'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'কম্পোনেন্ট মুছে ফেলা হয়েছে' : 'Component deleted successfully',
      });
    },
  });

  // Feature 2.2: Grade Scale mutations
  const createGradeScaleMutation = useMutation({
    mutationFn: (data: InsertGradeScale) => gradesDb.createGradeScale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড স্কেল তৈরি হয়েছে' : 'Grade scale created successfully',
      });
      setIsGradeScaleDialogOpen(false);
    },
  });

  const updateGradeScaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertGradeScale> }) =>
      gradesDb.updateGradeScale(id, schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড স্কেল আপডেট হয়েছে' : 'Grade scale updated successfully',
      });
    },
  });

  const deleteGradeScaleMutation = useMutation({
    mutationFn: (id: number) => gradesDb.deleteGradeScale(id, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড স্কেল মুছে ফেলা হয়েছে' : 'Grade scale deleted successfully',
      });
    },
  });

  // Feature 2.3: Bulk operation mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => gradesDb.bulkDeleteAssessments(ids, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      setSelectedAssessmentIds(new Set());
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'মূল্যায়ন মুছে ফেলা হয়েছে' : 'Assessments deleted successfully',
      });
    },
  });

  const duplicateAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) => gradesDb.duplicateAssessment(assessmentId, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'মূল্যায়ন অনুলিপি করা হয়েছে' : 'Assessment duplicated successfully',
      });
    },
  });

  const copyAssessmentMutation = useMutation({
    mutationFn: ({ assessmentId, targetClass, targetSection }: { assessmentId: number; targetClass: string; targetSection: string }) =>
      gradesDb.copyAssessmentToClass(assessmentId, targetClass, targetSection, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'মূল্যায়ন কপি করা হয়েছে' : 'Assessment copied successfully',
      });
      setIsCopyAssessmentDialogOpen(false);
    },
  });

  // Feature 2.2: Grade Override mutations
  const createGradeOverrideMutation = useMutation({
    mutationFn: (data: any) => gradesDb.createGradeOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড ওভাররাইড তৈরি হয়েছে' : 'Grade override created successfully',
      });
      setIsGradeOverrideDialogOpen(false);
    },
  });

  const approveGradeOverrideMutation = useMutation({
    mutationFn: ({ id, teacherId }: { id: number; teacherId: number }) =>
      gradesDb.approveGradeOverride(id, teacherId, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-overrides'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড ওভাররাইড অনুমোদিত হয়েছে' : 'Grade override approved successfully',
      });
    },
  });

  const deleteGradeOverrideMutation = useMutation({
    mutationFn: (id: number) => gradesDb.deleteGradeOverride(id, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'গ্রেড ওভাররাইড মুছে ফেলা হয়েছে' : 'Grade override deleted successfully',
      });
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

  const calculateWeightedGrade = (studentScores: any[], assessments: any[]) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    assessments.forEach((assessment: any) => {
      const score = studentScores.find((s: any) => s.assessment_id === assessment.id);
      if (score && !score.is_absent && score.score_obtained !== null) {
        const weight = Number(assessment.weight_percentage || 100);
        const scorePercentage = (Number(score.score_obtained) / Number(assessment.total_marks)) * 100;
        totalWeightedScore += (scorePercentage * weight) / 100;
        totalWeight += weight;
      }
    });

    if (totalWeight === 0) return null;
    return (totalWeightedScore / totalWeight) * 100;
  };

  const handleViewHistory = (studentId: number, assessmentId: number) => {
    setHistoryStudentId(studentId);
    setHistoryAssessmentId(assessmentId);
    setIsHistoryDialogOpen(true);
  };

  // Feature 2.1: Assessment Components handlers
  const toggleAssessmentExpansion = (assessmentId: number) => {
    setExpandedAssessments(prev => {
      const next = new Set(prev);
      if (next.has(assessmentId)) {
        next.delete(assessmentId);
        setEditingComponentAssessmentId(null);
      } else {
        next.add(assessmentId);
        setEditingComponentAssessmentId(assessmentId);
      }
      return next;
    });
  };

  const handleAddComponent = (assessmentId: number) => {
    setEditingComponentAssessmentId(assessmentId);
    setIsComponentDialogOpen(true);
  };

  // Feature 2.3: Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedAssessmentIds.size === assessments?.length) {
      setSelectedAssessmentIds(new Set());
    } else {
      setSelectedAssessmentIds(new Set(assessments?.map((a: any) => a.id) || []));
    }
  };

  const toggleSelectAssessment = (assessmentId: number) => {
    setSelectedAssessmentIds(prev => {
      const next = new Set(prev);
      if (next.has(assessmentId)) {
        next.delete(assessmentId);
      } else {
        next.add(assessmentId);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedAssessmentIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedAssessmentIds));
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkDuplicate = async () => {
    if (selectedAssessmentIds.size === 0) return;
    
    for (const id of selectedAssessmentIds) {
      await duplicateAssessmentMutation.mutateAsync(id);
    }
    
    setSelectedAssessmentIds(new Set());
  };

  const handleCopyAssessment = (assessmentId: number) => {
    setCopyingAssessmentId(assessmentId);
    setIsCopyAssessmentDialogOpen(true);
  };

  const handleCreateOverride = (studentId: number, subjectId: number) => {
    setOverrideStudentId(studentId);
    setOverrideSubjectId(subjectId);
    setIsGradeOverrideDialogOpen(true);
  };

  const getStudentOverride = (studentId: number, subjectId: number) => {
    return gradeOverrides?.find(
      (override: any) => 
        override.student_id === studentId && 
        override.subject_id === subjectId &&
        (selectedTerm ? override.term_id === selectedTerm : true)
    );
  };

  useMemo(() => {
    if (filteredSubjects.length === 1 && !selectedSubject && selectedClass) {
      setSelectedSubject(filteredSubjects[0].id);
    }
  }, [filteredSubjects, selectedSubject, selectedClass]);

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

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    if (!selectedClass || !selectedSection || !gradeBook) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ক্লাস এবং সেকশন নির্বাচন করুন' : 'Please select class and section',
        variant: 'destructive',
      });
      return;
    }

    if (gradeBook.students.length === 0) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানির জন্য কোন ডেটা নেই' : 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = gradeBook.students.map((student: any) => {
        const studentScores = gradeBook.scores.filter((s: any) => s.student_id === student.id);
        const rowData: any = {
          'Roll': student.roll_number || '',
          'Name': student.name || '',
          'Student ID': student.student_id || '',
        };

        gradeBook.assessments.forEach((assessment: any) => {
          const score = studentScores.find((s: any) => s.assessment_id === assessment.id);
          const assessmentName = language === 'bn' 
            ? (assessment.assessment_name_bn || assessment.assessment_name)
            : assessment.assessment_name;
          
          if (score) {
            if (score.is_absent) {
              rowData[assessmentName] = 'Absent';
            } else {
              rowData[assessmentName] = `${score.score_obtained || 0}/${assessment.total_marks}`;
            }
          } else {
            rowData[assessmentName] = '-';
          }
        });

        const validScores = studentScores.filter((s: any) => !s.is_absent && s.score_obtained !== null);
        const average = validScores.length > 0
          ? (validScores.reduce((sum: number, s: any) => sum + Number(s.score_obtained), 0) / validScores.length).toFixed(2)
          : '0';
        
        rowData['Average'] = average;

        return rowData;
      });

      const baseColumns = [
        { header: 'Roll', key: 'Roll' },
        { header: 'Name', key: 'Name', width: 20 },
        { header: 'Student ID', key: 'Student ID' },
      ];

      const assessmentColumns = gradeBook.assessments.map((assessment: any) => ({
        header: language === 'bn' 
          ? (assessment.assessment_name_bn || assessment.assessment_name)
          : assessment.assessment_name,
        key: language === 'bn' 
          ? (assessment.assessment_name_bn || assessment.assessment_name)
          : assessment.assessment_name,
        width: 15,
      }));

      const columns = [
        ...baseColumns,
        ...assessmentColumns,
        { header: 'Average', key: 'Average' },
      ];

      const filterDescription = [
        `Class: ${selectedClass}`,
        `Section: ${selectedSection}`,
        selectedSubject && subjects?.find((s: any) => s.id === selectedSubject)
          ? `Subject: ${subjects.find((s: any) => s.id === selectedSubject)?.name}`
          : '',
        selectedTerm ? `Term: ${selectedTerm}` : '',
      ].filter(Boolean).join(' | ');

      const title = language === 'bn' ? 'গ্রেডবুক রিপোর্ট' : 'Gradebook Report';
      const description = filterDescription;

      if (format === 'csv') {
        exportUtils.exportToCSV({
          filename: `gradebook_${selectedClass}_${selectedSection}`,
          columns,
          data: exportData,
        });
      } else if (format === 'pdf') {
        exportUtils.exportToPDF({
          filename: `gradebook_${selectedClass}_${selectedSection}`,
          title,
          description,
          columns,
          data: exportData,
          orientation: 'landscape',
        });
      } else if (format === 'excel') {
        exportUtils.exportToExcel({
          filename: `gradebook_${selectedClass}_${selectedSection}`,
          title,
          columns,
          data: exportData,
        });
      }

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' 
          ? `গ্রেডবুক ${format.toUpperCase()} ফরম্যাটে রপ্তানি হয়েছে` 
          : `Gradebook exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'রপ্তানিতে ব্যর্থ' : 'Failed to export gradebook',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
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
          <div className="flex gap-2 flex-wrap">
            {/* Feature 2.2: Grade Scale Editor Button */}
            <Button
              variant="outline"
              onClick={() => setIsGradeScaleDialogOpen(true)}
              data-testid="grade-scale-editor"
            >
              <Settings className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'গ্রেড স্কেল' : 'Grade Scales'}
            </Button>

            {/* Feature 2.3: Bulk Operations Toolbar */}
            {selectedAssessmentIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  data-testid="bulk-delete-btn"
                  className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {language === 'bn' ? `মুছুন (${selectedAssessmentIds.size})` : `Delete (${selectedAssessmentIds.size})`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkDuplicate}
                  data-testid="bulk-duplicate-btn"
                  disabled={duplicateAssessmentMutation.isPending}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'bn' ? `অনুলিপি (${selectedAssessmentIds.size})` : `Duplicate (${selectedAssessmentIds.size})`}
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedClass || !selectedSection || isExporting}
                  data-testid="button-export-gradebook"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {language === 'bn' ? 'এক্সপোর্ট' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {language === 'bn' ? 'ফরম্যাট নির্বাচন করুন' : 'Choose Format'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="export-csv">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'CSV ফাইল' : 'CSV File'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} data-testid="export-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'PDF ডকুমেন্ট' : 'PDF Document'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} data-testid="export-excel">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'এক্সেল ফাইল' : 'Excel File'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PermissionGate 
              permission={PERMISSIONS.EDIT_GRADES} 
              context={{ 
                classId: selectedClass ? parseInt(selectedClass) : undefined, 
                subjectId: selectedSubject,
                teacherClassSubjects 
              }}
            >
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
            </PermissionGate>
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
                  value={selectedSubject?.toString() || 'all'}
                  onValueChange={(val) => setSelectedSubject(val === 'all' ? undefined : Number(val))}
                >
                  <SelectTrigger id="subject" data-testid="select-subject">
                    <SelectValue placeholder={language === 'bn' ? 'সকল বিষয়' : 'All Subjects'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'bn' ? 'সকল বিষয়' : 'All Subjects'}
                    </SelectItem>
                    {filteredSubjects?.map((subject) => (
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
                  value={selectedTerm?.toString() || 'all'}
                  onValueChange={(val) => setSelectedTerm(val === 'all' ? undefined : Number(val))}
                >
                  <SelectTrigger id="term" data-testid="select-term">
                    <SelectValue placeholder={language === 'bn' ? 'সকল টার্ম' : 'All Terms'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
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
                            <TableHead className="w-32">
                              {language === 'bn' ? 'ওজনযুক্ত গ্রেড' : 'Weighted Grade'}
                            </TableHead>
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
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/academic/student-profile?id=${student.id}`}
                                      className="hover:underline text-blue-600 dark:text-blue-400 font-medium transition-colors"
                                      data-testid={`student-link-${student.id}`}
                                    >
                                      {student.name}
                                    </Link>
                                    {/* Feature 2.2: Grade Override Badge */}
                                    {selectedSubject && getStudentOverride(student.id, selectedSubject) && (
                                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Override
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
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
                                          <div className="flex items-center justify-center gap-2">
                                            <div className="flex flex-col items-center">
                                              <span>{score.score_obtained}</span>
                                              <span className="text-xs text-gray-500">
                                                {getGradeLetter(
                                                  (Number(score.score_obtained) / Number(assessment.total_marks)) * 100
                                                )}
                                              </span>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewHistory(student.id, assessment.id);
                                              }}
                                              data-testid={`button-history-${student.id}-${assessment.id}`}
                                            >
                                              <History className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center font-semibold" data-testid={`cell-weighted-${student.id}`}>
                                  {(() => {
                                    const weightedGrade = calculateWeightedGrade(studentScores, gradeBook.assessments);
                                    if (weightedGrade !== null) {
                                      const percentage = weightedGrade;
                                      return (
                                        <div className="flex flex-col items-center">
                                          <Badge variant={percentage >= 60 ? 'default' : 'destructive'}>
                                            {weightedGrade.toFixed(2)}%
                                          </Badge>
                                          <span className="text-xs text-gray-500 mt-1">
                                            {getGradeLetter(percentage)}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return <span className="text-gray-400">-</span>;
                                  })()}
                                </TableCell>
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
            {/* Feature 2.3: Select All Checkbox */}
            {assessments && assessments.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Checkbox
                  checked={selectedAssessmentIds.size === assessments.length && assessments.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="bulk-select-all-checkbox"
                />
                <label className="text-sm font-medium cursor-pointer" onClick={toggleSelectAll}>
                  {language === 'bn' ? 'সব নির্বাচন করুন' : 'Select All'}
                  {selectedAssessmentIds.size > 0 && ` (${selectedAssessmentIds.size} selected)`}
                </label>
              </div>
            )}

            {assessmentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="space-y-4">
                {assessments.map((assessment: any) => (
                  <Card key={assessment.id} data-testid={`card-assessment-${assessment.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        {/* Feature 2.3: Bulk Selection Checkbox */}
                        <Checkbox
                          checked={selectedAssessmentIds.has(assessment.id)}
                          onCheckedChange={() => toggleSelectAssessment(assessment.id)}
                          data-testid={`bulk-select-checkbox-${assessment.id}`}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
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
                    <CardContent className="space-y-4">
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

                      {/* Feature 2.1: Assessment Components Expandable Section */}
                      <div className="border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAssessmentExpansion(assessment.id)}
                          className="w-full"
                          data-testid={`assessment-components-toggle-${assessment.id}`}
                        >
                          {expandedAssessments.has(assessment.id) ? (
                            <ChevronUp className="w-4 h-4 mr-2" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mr-2" />
                          )}
                          {language === 'bn' ? 'উপাদান দেখুন' : 'View Components'}
                        </Button>

                        {expandedAssessments.has(assessment.id) && (
                          <div className="mt-3 space-y-2" data-testid={`assessment-components-${assessment.id}`}>
                            {componentsLoading ? (
                              <Skeleton className="h-20 w-full" />
                            ) : assessmentComponents && assessmentComponents.length > 0 ? (
                              <div className="space-y-2">
                                {assessmentComponents.map((component: any) => (
                                  <div
                                    key={component.id}
                                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-start"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {language === 'bn'
                                          ? component.component_name_bn || component.component_name
                                          : component.component_name}
                                      </p>
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                                        <div>
                                          {language === 'bn' ? 'প্রকার' : 'Type'}: {component.component_type}
                                        </div>
                                        <div>
                                          {language === 'bn' ? 'সর্বোচ্চ নম্বর' : 'Max Score'}: {component.max_score}
                                        </div>
                                        <div>
                                          {language === 'bn' ? 'ওজন' : 'Weight'}: {component.weight_percentage}%
                                        </div>
                                        {component.passing_marks && (
                                          <div>
                                            {language === 'bn' ? 'পাস মার্ক' : 'Pass Marks'}: {component.passing_marks}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteComponentMutation.mutate({ id: component.id })}
                                      data-testid={`delete-component-${component.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-500 text-sm">
                                {language === 'bn' ? 'কোন উপাদান পাওয়া যায়নি' : 'No components found'}
                              </div>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddComponent(assessment.id)}
                              className="w-full mt-2"
                              data-testid={`add-component-${assessment.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {language === 'bn' ? 'উপাদান যোগ করুন' : 'Add Component'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Feature 2.3: Copy Assessment Button */}
                      <div className="border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyAssessment(assessment.id)}
                          className="w-full"
                          data-testid={`copy-assessment-${assessment.id}`}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {language === 'bn' ? 'অন্য ক্লাসে কপি করুন' : 'Copy to Another Class'}
                        </Button>
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

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-grade-history">
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'গ্রেড পরিবর্তনের ইতিহাস' : 'Grade Change History'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই শিক্ষার্থীর জন্য সমস্ত গ্রেড পরিবর্তনের রেকর্ড'
                : 'All grade change records for this student'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {gradeHistoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : gradeHistory && gradeHistory.length > 0 ? (
              <div className="space-y-3">
                {gradeHistory.map((history: any) => (
                  <Card key={history.id} data-testid={`card-history-${history.id}`}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">
                            {language === 'bn' ? 'পুরাতন নম্বর' : 'Old Score'}
                          </Label>
                          <p className="font-semibold" data-testid={`text-old-score-${history.id}`}>
                            {history.old_score || '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            {language === 'bn' ? 'নতুন নম্বর' : 'New Score'}
                          </Label>
                          <p className="font-semibold text-green-600" data-testid={`text-new-score-${history.id}`}>
                            {history.new_score || '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            {language === 'bn' ? 'পরিবর্তনকারী' : 'Changed By'}
                          </Label>
                          <p className="font-semibold" data-testid={`text-changed-by-${history.id}`}>
                            {history.changed_by?.name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            {language === 'bn' ? 'পরিবর্তনের সময়' : 'Changed At'}
                          </Label>
                          <p className="text-sm" data-testid={`text-changed-at-${history.id}`}>
                            {new Date(history.created_at).toLocaleString(
                              language === 'bn' ? 'bn-BD' : 'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      {history.change_reason && (
                        <div className="mt-3 pt-3 border-t">
                          <Label className="text-xs text-gray-500">
                            {language === 'bn' ? 'কারণ' : 'Reason'}
                          </Label>
                          <p className="text-sm mt-1">{history.change_reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {language === 'bn' ? 'কোন পরিবর্তনের ইতিহাস নেই' : 'No change history found'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHistoryDialogOpen(false)}
              data-testid="button-close-history"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature 2.1: Component Editor Dialog */}
      <ComponentEditorDialog
        open={isComponentDialogOpen}
        onOpenChange={setIsComponentDialogOpen}
        assessmentId={editingComponentAssessmentId}
        onSubmit={(data) => createComponentMutation.mutate(data)}
        isLoading={createComponentMutation.isPending}
        language={language}
        schoolId={schoolId}
      />

      {/* Feature 2.2: Grade Scale Editor Dialog */}
      <GradeScaleEditorDialog
        open={isGradeScaleDialogOpen}
        onOpenChange={setIsGradeScaleDialogOpen}
        gradeScales={gradeScales || []}
        onCreateScale={(data) => createGradeScaleMutation.mutate(data)}
        onUpdateScale={(id, data) => updateGradeScaleMutation.mutate({ id, data })}
        onDeleteScale={(id) => deleteGradeScaleMutation.mutate(id)}
        language={language}
        schoolId={schoolId}
      />

      {/* Feature 2.3: Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent data-testid="dialog-bulk-delete-confirm">
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Delete'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? `আপনি কি নিশ্চিত যে আপনি ${selectedAssessmentIds.size}টি মূল্যায়ন মুছে ফেলতে চান?`
                : `Are you sure you want to delete ${selectedAssessmentIds.size} assessment(s)?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(false)}
              data-testid="button-cancel-bulk-delete"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature 2.3: Copy Assessment Dialog */}
      <CopyAssessmentDialog
        open={isCopyAssessmentDialogOpen}
        onOpenChange={setIsCopyAssessmentDialogOpen}
        assessmentId={copyingAssessmentId}
        onCopy={(targetClass: string, targetSection: string) => {
          if (copyingAssessmentId) {
            copyAssessmentMutation.mutate({ 
              assessmentId: copyingAssessmentId, 
              targetClass, 
              targetSection 
            });
          }
        }}
        isLoading={copyAssessmentMutation.isPending}
        language={language}
        schoolId={schoolId}
      />

      {/* Feature 2.2: Grade Override Dialog */}
      <GradeOverrideDialog
        open={isGradeOverrideDialogOpen}
        onOpenChange={setIsGradeOverrideDialogOpen}
        studentId={overrideStudentId}
        subjectId={overrideSubjectId}
        termId={selectedTerm}
        onSubmit={(data: any) => createGradeOverrideMutation.mutate(data)}
        isLoading={createGradeOverrideMutation.isPending}
        language={language}
        schoolId={schoolId}
        subjects={subjects || []}
        students={gradeBook?.students || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['grade-overrides'] });
          queryClient.invalidateQueries({ queryKey: ['gradebook'] });
        }}
      />
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

// Feature 2.1: Component Editor Dialog Component
function ComponentEditorDialog({
  open,
  onOpenChange,
  assessmentId,
  onSubmit,
  isLoading,
  language,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: number | null;
  onSubmit: (data: InsertAssessmentComponent) => void;
  isLoading: boolean;
  language: string;
  schoolId: number;
}) {
  const [formData, setFormData] = useState<Partial<InsertAssessmentComponent>>({
    schoolId,
    assessmentId: assessmentId || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.componentName && formData.componentType && formData.maxScore && formData.weightPercentage) {
      onSubmit(formData as InsertAssessmentComponent);
      setFormData({ schoolId, assessmentId: assessmentId || undefined });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-component-editor">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'উপাদান যোগ করুন' : 'Add Component'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn' ? 'মূল্যায়ন উপাদানের বিস্তারিত' : 'Assessment component details'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="component-name">
                  {language === 'bn' ? 'উপাদানের নাম (EN)' : 'Component Name (EN)'}
                </Label>
                <Input
                  id="component-name"
                  value={formData.componentName || ''}
                  onChange={(e) => setFormData({ ...formData, componentName: e.target.value })}
                  required
                  data-testid="input-component-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="component-name-bn">
                  {language === 'bn' ? 'উপাদানের নাম (BN)' : 'Component Name (BN)'}
                </Label>
                <Input
                  id="component-name-bn"
                  value={formData.componentNameBn || ''}
                  onChange={(e) => setFormData({ ...formData, componentNameBn: e.target.value })}
                  data-testid="input-component-name-bn"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="component-type">
                {language === 'bn' ? 'উপাদানের ধরন' : 'Component Type'}
              </Label>
              <Select
                value={formData.componentType || undefined}
                onValueChange={(value) => setFormData({ ...formData, componentType: value })}
              >
                <SelectTrigger id="component-type" data-testid="select-component-type">
                  <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">{language === 'bn' ? 'এমসিকিউ' : 'MCQ'}</SelectItem>
                  <SelectItem value="Written">{language === 'bn' ? 'লিখিত' : 'Written'}</SelectItem>
                  <SelectItem value="Practical">{language === 'bn' ? 'ব্যবহারিক' : 'Practical'}</SelectItem>
                  <SelectItem value="Oral">{language === 'bn' ? 'মৌখিক' : 'Oral'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-score">
                  {language === 'bn' ? 'সর্বোচ্চ নম্বর' : 'Max Score'}
                </Label>
                <Input
                  id="max-score"
                  type="number"
                  value={formData.maxScore || ''}
                  onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  required
                  data-testid="input-max-score"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight-percentage">
                  {language === 'bn' ? 'ওজন %' : 'Weight %'}
                </Label>
                <Input
                  id="weight-percentage"
                  type="number"
                  value={formData.weightPercentage || ''}
                  onChange={(e) => setFormData({ ...formData, weightPercentage: e.target.value })}
                  required
                  data-testid="input-weight-percentage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing-marks">
                  {language === 'bn' ? 'পাস মার্ক' : 'Passing Marks'}
                </Label>
                <Input
                  id="passing-marks"
                  type="number"
                  value={formData.passingMarks || ''}
                  onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                  data-testid="input-passing-marks"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-component"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="button-submit-component">
              {isLoading
                ? language === 'bn'
                  ? 'যোগ হচ্ছে...'
                  : 'Adding...'
                : language === 'bn'
                ? 'যোগ করুন'
                : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Feature 2.2: Grade Scale Editor Dialog Component
function GradeScaleEditorDialog({
  open,
  onOpenChange,
  gradeScales,
  onCreateScale,
  onUpdateScale,
  onDeleteScale,
  language,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeScales: any[];
  onCreateScale: (data: InsertGradeScale) => void;
  onUpdateScale: (id: number, data: Partial<InsertGradeScale>) => void;
  onDeleteScale: (id: number) => void;
  language: string;
  schoolId: number;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertGradeScale>>({
    schoolId,
    scaleType: 'letter',
    isDefault: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scaleName && formData.gradeLabels) {
      onCreateScale(formData as InsertGradeScale);
      setFormData({ schoolId, scaleType: 'letter', isDefault: false });
      setIsCreating(false);
    }
  };

  const handleSetDefault = (id: number) => {
    onUpdateScale(id, { isDefault: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-grade-scale-editor">
        <DialogHeader>
          <DialogTitle>
            {language === 'bn' ? 'গ্রেড স্কেল পরিচালনা' : 'Manage Grade Scales'}
          </DialogTitle>
          <DialogDescription>
            {language === 'bn'
              ? 'আপনার স্কুলের জন্য গ্রেড স্কেল তৈরি ও সম্পাদনা করুন'
              : 'Create and edit grade scales for your school'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Grade Scales */}
          <div className="space-y-3">
            <h3 className="font-semibold">{language === 'bn' ? 'বিদ্যমান স্কেল' : 'Existing Scales'}</h3>
            {gradeScales.length > 0 ? (
              gradeScales.map((scale: any) => (
                <Card key={scale.id} className={scale.is_default ? 'border-blue-500 border-2' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{scale.scale_name}</h4>
                          {scale.is_default && (
                            <Badge variant="default">{language === 'bn' ? 'ডিফল্ট' : 'Default'}</Badge>
                          )}
                        </div>
                        {scale.scale_name_bn && (
                          <p className="text-sm text-gray-600">{scale.scale_name_bn}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {language === 'bn' ? 'ধরন' : 'Type'}: {scale.scale_type}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!scale.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(scale.id)}
                            data-testid={`button-set-default-${scale.id}`}
                          >
                            {language === 'bn' ? 'ডিফল্ট করুন' : 'Set Default'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteScale(scale.id)}
                          data-testid={`button-delete-scale-${scale.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                {language === 'bn' ? 'কোন গ্রেড স্কেল পাওয়া যায়নি' : 'No grade scales found'}
              </div>
            )}
          </div>

          {/* Create New Scale */}
          {!isCreating ? (
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="w-full"
              data-testid="button-create-new-scale"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'নতুন স্কেল তৈরি করুন' : 'Create New Scale'}
            </Button>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scale-name">
                        {language === 'bn' ? 'স্কেলের নাম (EN)' : 'Scale Name (EN)'}
                      </Label>
                      <Input
                        id="scale-name"
                        value={formData.scaleName || ''}
                        onChange={(e) => setFormData({ ...formData, scaleName: e.target.value })}
                        required
                        data-testid="input-scale-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scale-name-bn">
                        {language === 'bn' ? 'স্কেলের নাম (BN)' : 'Scale Name (BN)'}
                      </Label>
                      <Input
                        id="scale-name-bn"
                        value={formData.scaleNameBn || ''}
                        onChange={(e) => setFormData({ ...formData, scaleNameBn: e.target.value })}
                        data-testid="input-scale-name-bn"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scale-type">
                      {language === 'bn' ? 'স্কেলের ধরন' : 'Scale Type'}
                    </Label>
                    <Select
                      value={formData.scaleType}
                      onValueChange={(value) => setFormData({ ...formData, scaleType: value as any })}
                    >
                      <SelectTrigger id="scale-type" data-testid="select-scale-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">{language === 'bn' ? 'লেটার গ্রেড' : 'Letter Grade'}</SelectItem>
                        <SelectItem value="gpa">{language === 'bn' ? 'জিপিএ' : 'GPA'}</SelectItem>
                        <SelectItem value="percentage">{language === 'bn' ? 'শতকরা' : 'Percentage'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'bn' ? 'গ্রেড রেঞ্জ (JSON)' : 'Grade Ranges (JSON)'}</Label>
                    <Textarea
                      placeholder='[{"min": 80, "max": 100, "grade": "A+", "gpa": 5.0}]'
                      value={formData.gradeLabels ? JSON.stringify(formData.gradeLabels) : ''}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setFormData({ ...formData, gradeLabels: parsed });
                        } catch (err) {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={4}
                      data-testid="textarea-grade-ranges"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-default"
                      checked={formData.isDefault || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                      data-testid="checkbox-is-default"
                    />
                    <Label htmlFor="is-default" className="cursor-pointer">
                      {language === 'bn' ? 'ডিফল্ট হিসাবে সেট করুন' : 'Set as default'}
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setFormData({ schoolId, scaleType: 'letter', isDefault: false });
                      }}
                      data-testid="button-cancel-scale"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <Button type="submit" data-testid="button-submit-scale">
                      {language === 'bn' ? 'তৈরি করুন' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-grade-scale">
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Feature 2.3: Copy Assessment Dialog Component
function CopyAssessmentDialog({
  open,
  onOpenChange,
  assessmentId,
  onCopy,
  isLoading,
  language,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: number | null;
  onCopy: (targetClass: string, targetSection: string) => void;
  isLoading: boolean;
  language: string;
  schoolId: number;
}) {
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetClass && targetSection) {
      onCopy(targetClass, targetSection);
      setTargetClass('');
      setTargetSection('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-copy-assessment">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'মূল্যায়ন কপি করুন' : 'Copy Assessment'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই মূল্যায়নটি অন্য ক্লাসে কপি করুন'
                : 'Copy this assessment to another class'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-class">
                {language === 'bn' ? 'লক্ষ্য ক্লাস' : 'Target Class'}
              </Label>
              <Input
                id="target-class"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: 9' : 'e.g., 9'}
                required
                data-testid="input-target-class"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-section">
                {language === 'bn' ? 'লক্ষ্য সেকশন' : 'Target Section'}
              </Label>
              <Input
                id="target-section"
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: A' : 'e.g., A'}
                required
                data-testid="input-target-section"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-copy"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="button-submit-copy">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'bn' ? 'কপি হচ্ছে...' : 'Copying...'}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'কপি করুন' : 'Copy'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Feature 2.2: Grade Override Dialog Component
function GradeOverrideDialog({
  open,
  onOpenChange,
  studentId,
  subjectId,
  termId,
  onSubmit,
  isLoading,
  language,
  schoolId,
  subjects,
  students,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: number | null;
  subjectId: number | null;
  termId: number | undefined;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  language: string;
  schoolId: number;
  subjects: any[];
  students: any[];
  onSuccess?: () => void;
}) {
  const { hasPermission } = usePermissions();
  const [formData, setFormData] = useState({
    studentId: studentId || undefined,
    subjectId: subjectId || undefined,
    termId: termId || undefined,
    overrideGrade: '',
    reason: '',
    reasonBn: '',
    schoolId,
  });

  // Query existing override for this student/subject/term
  const { data: existingOverride } = useQuery({
    queryKey: ['grade-override-single', studentId, subjectId, termId, schoolId],
    queryFn: async () => {
      if (!studentId || !subjectId) return null;
      const overrides = await gradesDb.getGradeOverrides(studentId, schoolId, termId);
      return overrides?.find((o: any) => o.subject_id === subjectId) || null;
    },
    enabled: !!studentId && !!subjectId && open,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.studentId && formData.subjectId && formData.overrideGrade && formData.reason) {
      onSubmit(formData);
      setFormData({
        studentId: undefined,
        subjectId: undefined,
        termId: undefined,
        overrideGrade: '',
        reason: '',
        reasonBn: '',
        schoolId,
      });
      if (onSuccess) onSuccess();
    }
  };

  const handleApprove = async () => {
    if (existingOverride && !existingOverride.approved_by) {
      // Get teacher ID from user (would need to be passed as prop or from context)
      // For now, using a placeholder
      const teacherId = 1; // This should come from auth context
      await gradesDb.approveGradeOverride(existingOverride.id, teacherId, schoolId);
      if (onSuccess) onSuccess();
    }
  };

  const handleReject = async () => {
    if (existingOverride) {
      await gradesDb.deleteGradeOverride(existingOverride.id, schoolId);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-grade-override">
        <DialogHeader>
          <DialogTitle>
            {language === 'bn' ? 'গ্রেড ওভাররাইড' : 'Grade Override'}
          </DialogTitle>
          <DialogDescription>
            {language === 'bn'
              ? 'একজন শিক্ষার্থীর জন্য গ্রেড ওভাররাইড তৈরি বা পরিচালনা করুন'
              : 'Create or manage grade override for a student'}
          </DialogDescription>
        </DialogHeader>

        {existingOverride ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'bn' ? 'বিদ্যমান ওভাররাইড' : 'Existing Override'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">
                      {language === 'bn' ? 'শিক্ষার্থী' : 'Student'}
                    </p>
                    <p>{existingOverride.student?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">
                      {language === 'bn' ? 'বিষয়' : 'Subject'}
                    </p>
                    <p>{language === 'bn' ? existingOverride.subject?.name_bn : existingOverride.subject?.name}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    {language === 'bn' ? 'ওভাররাইড গ্রেড' : 'Override Grade'}
                  </p>
                  <Badge variant="default" className="text-base">
                    {existingOverride.override_grade}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    {language === 'bn' ? 'কারণ' : 'Reason'}
                  </p>
                  <p className="text-sm">{language === 'bn' ? existingOverride.reason_bn : existingOverride.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    {language === 'bn' ? 'অবস্থা' : 'Status'}
                  </p>
                  {existingOverride.approved_by ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="w-3 h-3 mr-1" />
                      {language === 'bn' ? 'অনুমোদিত' : 'Approved'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {language === 'bn' ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval'}
                    </Badge>
                  )}
                </div>

                {existingOverride.approved_by_user && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">
                      {language === 'bn' ? 'অনুমোদনকারী' : 'Approved By'}
                    </p>
                    <p className="text-sm">{existingOverride.approved_by_user.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(existingOverride.approved_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Actions */}
            {hasPermission(PERMISSIONS.MANAGE_ALL_GRADES) && !existingOverride.approved_by && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleApprove}
                  className="flex-1"
                  data-testid="button-approve-override"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'অনুমোদন করুন' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                  data-testid="button-reject-override"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'bn' ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-override">
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="override-student">
                  {language === 'bn' ? 'শিক্ষার্থী' : 'Student'}
                </Label>
                <Select
                  value={formData.studentId?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, studentId: Number(value) })}
                >
                  <SelectTrigger id="override-student" data-testid="select-override-student">
                    <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student: any) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name} ({student.roll_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="override-subject">
                  {language === 'bn' ? 'বিষয়' : 'Subject'}
                </Label>
                <Select
                  value={formData.subjectId?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: Number(value) })}
                >
                  <SelectTrigger id="override-subject" data-testid="select-override-subject">
                    <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {language === 'bn' ? subject.name_bn : subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="override-grade">
                {language === 'bn' ? 'ওভাররাইড গ্রেড' : 'Override Grade'}
              </Label>
              <Input
                id="override-grade"
                value={formData.overrideGrade}
                onChange={(e) => setFormData({ ...formData, overrideGrade: e.target.value })}
                placeholder={language === 'bn' ? 'যেমন: A+, 90, 5.0' : 'e.g., A+, 90, 5.0'}
                required
                data-testid="input-override-grade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="override-reason">
                {language === 'bn' ? 'কারণ (ইংরেজি)' : 'Reason (English)'}
              </Label>
              <Textarea
                id="override-reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder={language === 'bn' ? 'ওভাররাইডের কারণ ব্যাখ্যা করুন' : 'Explain the reason for override'}
                required
                rows={3}
                data-testid="textarea-override-reason"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="override-reason-bn">
                {language === 'bn' ? 'কারণ (বাংলা)' : 'Reason (Bengali)'}
              </Label>
              <Textarea
                id="override-reason-bn"
                value={formData.reasonBn}
                onChange={(e) => setFormData({ ...formData, reasonBn: e.target.value })}
                placeholder={language === 'bn' ? 'ওভাররাইডের কারণ ব্যাখ্যা করুন' : 'Explain the reason for override'}
                rows={3}
                data-testid="textarea-override-reason-bn"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  {language === 'bn'
                    ? 'এই গ্রেড ওভাররাইড প্রয়োগ করার আগে প্রশাসকের অনুমোদন প্রয়োজন হবে।'
                    : 'This grade override will require admin approval before being applied.'}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-override"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit-override">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'bn' ? 'জমা দিচ্ছে...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'জমা দিন' : 'Submit'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
