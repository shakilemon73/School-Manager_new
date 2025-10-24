import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { useCurrentAcademicYear } from '@/hooks/use-school-context';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { exportUtils } from '@/lib/export-utils';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { Link } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { notificationService } from '@/lib/notification-service';
import { resultsDb } from '@/lib/db/results';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  Loader2,
  Globe,
  EyeOff,
  Printer,
  IdCard,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Bell,
  Send,
  ThumbsUp,
  ThumbsDown,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function ResultsManagement() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const schoolId = useRequireSchoolId();
  const { currentAcademicYear } = useCurrentAcademicYear();
  const { hasPermission, teacherClassSubjects, role } = usePermissions();
  
  // Basic filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('table');
  const [isExporting, setIsExporting] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState<string>('all');
  
  // Feature 3.1: Status Filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Feature 3.2: Performance Trends
  const [selectedStudentForTrends, setSelectedStudentForTrends] = useState<string>('');
  const [isTrendsExpanded, setIsTrendsExpanded] = useState(false);
  
  // Feature 3.3: Approval Workflow
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedAssessmentForApproval, setSelectedAssessmentForApproval] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Feature 3.4 & Result Card
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<any>(null);
  const [isResultCardOpen, setIsResultCardOpen] = useState(false);

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
    queryKey: ['student-results', schoolId, selectedClass, selectedSection, selectedSubject, selectedTerm, publicationStatus],
    queryFn: async () => {
      try {
        let query = supabase
          .from('student_scores')
          .select(`
            *,
            students!inner(id, name, student_id, class, section, school_id, photo, roll_number),
            assessments!inner(id, assessment_name, total_marks, subject_id, term_id, is_published, status, rejection_reason)
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
        if (publicationStatus && publicationStatus !== 'all') {
          query = query.eq('assessments.is_published', publicationStatus === 'published');
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

  // Feature 3.5: Fetch Class Analytics
  const { data: classAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['class-analytics', schoolId, selectedClass, selectedSection, selectedTerm],
    queryFn: async () => {
      if (!selectedClass || selectedClass === 'all' || !selectedSection || selectedSection === 'all') {
        return null;
      }
      
      try {
        const termId = selectedTerm && selectedTerm !== 'all' ? parseInt(selectedTerm) : undefined;
        return await resultsDb.getClassAnalytics(schoolId, selectedClass, selectedSection, termId);
      } catch (error) {
        console.error('Failed to fetch class analytics:', error);
        return null;
      }
    },
    enabled: !!(selectedClass && selectedClass !== 'all' && selectedSection && selectedSection !== 'all'),
  });

  // Feature 3.5: Fetch Class Toppers
  const { data: classToppers = [] } = useQuery({
    queryKey: ['class-toppers', schoolId, selectedClass, selectedSection, selectedTerm],
    queryFn: async () => {
      if (!selectedClass || selectedClass === 'all' || !selectedSection || selectedSection === 'all') {
        return [];
      }
      
      try {
        const termId = selectedTerm && selectedTerm !== 'all' ? parseInt(selectedTerm) : undefined;
        return await resultsDb.getClassToppers(schoolId, selectedClass, selectedSection, termId, 10);
      } catch (error) {
        console.error('Failed to fetch class toppers:', error);
        return [];
      }
    },
    enabled: !!(selectedClass && selectedClass !== 'all' && selectedSection && selectedSection !== 'all'),
  });

  // Feature 3.2: Fetch Performance Trends
  const { data: performanceTrends = [] } = useQuery({
    queryKey: ['performance-trends', selectedStudentForTrends, schoolId],
    queryFn: async () => {
      if (!selectedStudentForTrends) return [];
      
      try {
        const termIds = terms.map(t => t.id);
        return await resultsDb.getStudentPerformanceTrends(
          parseInt(selectedStudentForTrends),
          schoolId,
          termIds
        );
      } catch (error) {
        console.error('Failed to fetch performance trends:', error);
        return [];
      }
    },
    enabled: !!selectedStudentForTrends && terms.length > 0,
  });

  // Fetch all results for selected student (for result card)
  const { data: studentCardResults = [] } = useQuery({
    queryKey: ['student-card-results', selectedStudentForCard?.id],
    queryFn: async () => {
      if (!selectedStudentForCard) return [];
      
      try {
        const { data, error } = await supabase
          .from('student_scores')
          .select(`
            *,
            assessments!inner(
              id, 
              assessment_name, 
              total_marks, 
              subject_id,
              subjects(name)
            )
          `)
          .eq('student_id', selectedStudentForCard.id);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Failed to fetch student card results:', error);
        return [];
      }
    },
    enabled: !!selectedStudentForCard,
  });

  // Feature 3.3: Mutation to update assessment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      assessmentId, 
      status, 
      rejectionReason 
    }: { 
      assessmentId: number; 
      status: 'draft' | 'pending' | 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      return await resultsDb.updateAssessmentStatus(assessmentId, schoolId, status, rejectionReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-results'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated successfully',
      });
      setIsApprovalDialogOpen(false);
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    },
    onError: (error) => {
      console.error('Update status error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'স্ট্যাটাস আপডেট করতে ব্যর্থ' : 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  // Feature 3.6: Mutation to publish results with notifications
  const publishResultsMutation = useMutation({
    mutationFn: async ({ assessmentId, classValue, section, termName }: any) => {
      // First, approve the assessment
      await resultsDb.updateAssessmentStatus(assessmentId, schoolId, 'approved');
      
      // Get students in the class
      const students = await resultsDb.getStudentsInClass(schoolId, classValue, section);
      const studentIds = students.map(s => s.id);
      
      // Send notifications
      await notificationService.notifyResultsPublished(
        schoolId,
        classValue,
        section,
        termName,
        studentIds
      );
      
      return { studentCount: studentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-results'] });
      toast({
        title: language === 'bn' ? 'ফলাফল প্রকাশিত' : 'Results Published',
        description: language === 'bn' 
          ? `ফলাফল প্রকাশিত হয়েছে এবং ${data.studentCount} জন শিক্ষার্থীকে জানানো হয়েছে` 
          : `Results published and ${data.studentCount} students notified`,
      });
    },
    onError: (error) => {
      console.error('Publish results error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ফলাফল প্রকাশ করতে ব্যর্থ' : 'Failed to publish results',
        variant: 'destructive',
      });
    },
  });

  // Mutation to toggle publication status (legacy - keeping for backward compatibility)
  const togglePublishMutation = useMutation({
    mutationFn: async ({ assessmentId, isPublished }: { assessmentId: number; isPublished: boolean }) => {
      const { data, error } = await supabase
        .from('assessments')
        .update({ is_published: !isPublished })
        .eq('id', assessmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-results'] });
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'প্রকাশনা অবস্থা আপডেট হয়েছে' : 'Publication status updated',
      });
    },
    onError: (error) => {
      console.error('Toggle publish error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'প্রকাশনা অবস্থা আপডেট করতে ব্যর্থ' : 'Failed to update publication status',
        variant: 'destructive',
      });
    },
  });

  // Feature 3.1: Apply status filter
  const getFilteredByStatus = (results: any[]) => {
    if (statusFilter === 'all') return results;
    
    return results.filter(result => {
      const score = parseFloat(result.score_obtained || '0');
      const maxScore = parseFloat(result.assessments?.total_marks || '100');
      const percentage = (score / maxScore) * 100;
      
      if (statusFilter === 'absent') {
        return result.is_absent === true;
      } else if (statusFilter === 'pass') {
        return !result.is_absent && percentage >= 40;
      } else if (statusFilter === 'fail') {
        return !result.is_absent && percentage < 40;
      } else if (['A+', 'A', 'A-', 'B', 'C', 'D', 'F'].includes(statusFilter)) {
        return result.grade_letter === statusFilter;
      }
      
      return true;
    });
  };

  // Calculate statistics
  const allFilteredResults = getFilteredByStatus(studentResults);
  
  const stats = {
    totalStudents: new Set(allFilteredResults.map(r => r.students?.id)).size,
    totalAssessments: new Set(allFilteredResults.map(r => r.assessment_id)).size,
    averageScore: allFilteredResults.length > 0 
      ? (allFilteredResults.reduce((acc, r) => acc + (parseFloat(r.score_obtained || '0')), 0) / allFilteredResults.length).toFixed(2)
      : '0',
    passingRate: allFilteredResults.length > 0
      ? ((allFilteredResults.filter(r => {
          const score = parseFloat(r.score_obtained || '0');
          const maxScore = parseFloat(r.assessments?.total_marks || '100');
          return (score / maxScore) * 100 >= 40;
        }).length / allFilteredResults.length) * 100).toFixed(1)
      : '0',
    publishedCount: allFilteredResults.filter(r => r.assessments?.is_published).length,
    unpublishedCount: allFilteredResults.filter(r => !r.assessments?.is_published).length,
  };

  // Grade distribution for chart
  const gradeDistribution = allFilteredResults.reduce((acc, result) => {
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
  const filteredResults = allFilteredResults.filter(result => {
    if (!searchQuery) return true;
    const student = result.students;
    return (
      student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate card statistics
  const cardStats = selectedStudentForCard ? {
    totalMarks: studentCardResults.reduce((acc, r) => acc + parseFloat(r.score_obtained || '0'), 0),
    maxMarks: studentCardResults.reduce((acc, r) => acc + parseFloat(r.assessments?.total_marks || '0'), 0),
    percentage: studentCardResults.length > 0 
      ? ((studentCardResults.reduce((acc, r) => acc + parseFloat(r.score_obtained || '0'), 0) / 
          studentCardResults.reduce((acc, r) => acc + parseFloat(r.assessments?.total_marks || '0'), 1)) * 100).toFixed(2)
      : '0',
    overallGrade: studentCardResults.length > 0 ? (studentCardResults[0]?.grade_letter || 'N/A') : 'N/A',
  } : null;

  // Feature 3.4: Download Individual PDF
  const handleDownloadPDF = async (student: any) => {
    try {
      // Fetch all results for this student
      const { data: scores, error } = await supabase
        .from('student_scores')
        .select(`
          *,
          assessments!inner(
            id,
            assessment_name,
            total_marks,
            term_id,
            subjects(name, name_bn),
            academic_terms(name, name_bn)
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text(language === 'bn' ? 'ফলাফল পত্র' : 'Result Sheet', 105, 20, { align: 'center' });
      
      // Student Info
      doc.setFontSize(11);
      const yStart = 35;
      doc.text(`${language === 'bn' ? 'নাম' : 'Name'}: ${student.name}`, 20, yStart);
      doc.text(`${language === 'bn' ? 'রোল নম্বর' : 'Roll Number'}: ${student.roll_number || 'N/A'}`, 20, yStart + 7);
      doc.text(`${language === 'bn' ? 'শ্রেণী' : 'Class'}: ${student.class}`, 20, yStart + 14);
      doc.text(`${language === 'bn' ? 'শাখা' : 'Section'}: ${student.section}`, 20, yStart + 21);
      doc.text(`${language === 'bn' ? 'শিক্ষার্থী আইডি' : 'Student ID'}: ${student.student_id}`, 20, yStart + 28);
      
      // Results table
      const tableData = scores?.map((score: any) => {
        const percentage = !score.is_absent 
          ? ((parseFloat(score.score_obtained || '0') / parseFloat(score.assessments?.total_marks || '100')) * 100).toFixed(2)
          : 'N/A';
        
        return [
          language === 'bn' ? score.assessments?.subjects?.name_bn : score.assessments?.subjects?.name,
          score.assessments?.assessment_name || '',
          score.is_absent ? (language === 'bn' ? 'অনুপস্থিত' : 'Absent') : score.score_obtained,
          score.assessments?.total_marks || '',
          percentage,
          score.grade_letter || 'N/A',
        ];
      }) || [];

      (doc as any).autoTable({
        head: [[
          language === 'bn' ? 'বিষয়' : 'Subject',
          language === 'bn' ? 'মূল্যায়ন' : 'Assessment',
          language === 'bn' ? 'প্রাপ্ত নম্বর' : 'Marks Obtained',
          language === 'bn' ? 'মোট নম্বর' : 'Total Marks',
          language === 'bn' ? 'শতাংশ' : 'Percentage',
          language === 'bn' ? 'গ্রেড' : 'Grade',
        ]],
        body: tableData,
        startY: yStart + 40,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(9);
      doc.text(`${language === 'bn' ? 'তারিখ' : 'Date'}: ${new Date().toLocaleDateString()}`, 20, finalY);
      doc.text(language === 'bn' ? 'স্বাক্ষর __________________' : 'Signature __________________', 20, finalY + 7);

      doc.save(`result-sheet-${student.student_id}.pdf`);
      
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'পিডিএফ ডাউনলোড হয়েছে' : 'PDF downloaded successfully',
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'পিডিএফ ডাউনলোড করতে ব্যর্থ' : 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleViewCard = (result: any) => {
    setSelectedStudentForCard(result.students);
    setIsResultCardOpen(true);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleTogglePublish = (assessmentId: number, isPublished: boolean) => {
    togglePublishMutation.mutate({ assessmentId, isPublished });
  };

  // Feature 3.6: Handle publish with notifications
  const handlePublishWithNotifications = async () => {
    if (!selectedAssessmentForApproval) return;
    
    // Find a result with this assessment to get class/section info
    const sampleResult = studentResults.find(r => r.assessment_id === selectedAssessmentForApproval.id);
    if (!sampleResult) return;
    
    const termInfo = terms.find(t => t.id === selectedAssessmentForApproval.term_id);
    
    publishResultsMutation.mutate({
      assessmentId: selectedAssessmentForApproval.id,
      classValue: sampleResult.students.class,
      section: sampleResult.students.section,
      termName: termInfo?.name || 'Current Term',
    });
  };

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
    publicationStatus: language === 'bn' ? 'প্রকাশনা অবস্থা' : 'Publication Status',
    allResults: language === 'bn' ? 'সকল ফলাফল' : 'All Results',
    published: language === 'bn' ? 'প্রকাশিত' : 'Published',
    unpublished: language === 'bn' ? 'অপ্রকাশিত' : 'Unpublished',
    draft: language === 'bn' ? 'খসড়া' : 'Draft',
    publish: language === 'bn' ? 'প্রকাশ করুন' : 'Publish',
    unpublish: language === 'bn' ? 'অপ্রকাশ করুন' : 'Unpublish',
    viewCard: language === 'bn' ? 'কার্ড দেখুন' : 'View Card',
    resultCard: language === 'bn' ? 'ফলাফল কার্ড' : 'Result Card',
    printCard: language === 'bn' ? 'প্রিন্ট করুন' : 'Print Card',
    rollNumber: language === 'bn' ? 'রোল নম্বর' : 'Roll Number',
    subject: language === 'bn' ? 'বিষয়' : 'Subject',
    marksObtained: language === 'bn' ? 'প্রাপ্ত নম্বর' : 'Marks Obtained',
    totalMarks: language === 'bn' ? 'মোট নম্বর' : 'Total Marks',
    percentage: language === 'bn' ? 'শতাংশ' : 'Percentage',
    overallGrade: language === 'bn' ? 'সামগ্রিক গ্রেড' : 'Overall Grade',
    remarks: language === 'bn' ? 'মন্তব্য' : 'Remarks',
    attendance: language === 'bn' ? 'উপস্থিতি' : 'Attendance',
    schoolLogo: language === 'bn' ? 'স্কুল লোগো' : 'School Logo',
    signature: language === 'bn' ? 'স্বাক্ষর' : 'Signature',
    statusFilter: language === 'bn' ? 'স্ট্যাটাস ফিল্টার' : 'Status Filter',
    all: language === 'bn' ? 'সকল' : 'All',
    pass: language === 'bn' ? 'পাস' : 'Pass',
    fail: language === 'bn' ? 'ফেইল' : 'Fail',
    downloadPDF: language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF',
    performanceTrends: language === 'bn' ? 'পারফরম্যান্স ট্রেন্ড' : 'Performance Trends',
    selectStudent: language === 'bn' ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student',
    termComparison: language === 'bn' ? 'টার্ম তুলনা' : 'Term Comparison',
    submitForApproval: language === 'bn' ? 'অনুমোদনের জন্য জমা দিন' : 'Submit for Approval',
    approveResults: language === 'bn' ? 'ফলাফল অনুমোদন করুন' : 'Approve Results',
    rejectResults: language === 'bn' ? 'ফলাফল প্রত্যাখ্যান করুন' : 'Reject Results',
    pending: language === 'bn' ? 'মুলতুবি' : 'Pending',
    approved: language === 'bn' ? 'অনুমোদিত' : 'Approved',
    rejected: language === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected',
    subjectPerformance: language === 'bn' ? 'বিষয়ভিত্তিক পারফরম্যান্স' : 'Subject Performance',
    classToppers: language === 'bn' ? 'শ্রেণীর সেরা' : 'Class Toppers',
    passFailRate: language === 'bn' ? 'পাস/ফেইল হার' : 'Pass/Fail Rate',
    showing: language === 'bn' ? 'দেখাচ্ছে' : 'Showing',
    of: language === 'bn' ? 'এর মধ্যে' : 'of',
    publishWithNotifications: language === 'bn' ? 'প্রকাশ করুন এবং জানান' : 'Publish & Notify',
  };

  // Unique students for trends selector
  const uniqueStudents = Array.from(
    new Map(studentResults.map(r => [r.students?.id, r.students])).values()
  ).filter(Boolean);

  return (
    <AppShell>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/academic/gradebook">
              <Button variant="outline" size="sm" data-testid="button-view-gradebook">
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t.viewGradebook}</span>
              </Button>
            </Link>
            <PermissionGate 
              anyPermissions={[PERMISSIONS.EDIT_RESULTS, PERMISSIONS.PUBLISH_RESULTS]}
              context={{ 
                classId: selectedClass && selectedClass !== 'all' ? parseInt(selectedClass) : undefined,
                teacherClassSubjects 
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting} data-testid="button-export-results">
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">{t.export}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {language === 'bn' ? 'ফরম্যাট নির্বাচন করুন' : 'Choose Format'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportResults('csv')} data-testid="export-csv">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportResults('pdf')} data-testid="export-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportResults('excel')} data-testid="export-excel">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t.totalStudents}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t.totalAssessments}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalAssessments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t.averageScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.averageScore}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t.passingRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.passingRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {language === 'bn' ? 'ফিল্টার' : 'Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Filter */}
              <div>
                <Label className="text-xs md:text-sm">{t.selectClass}</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder={t.selectClass} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allClasses}</SelectItem>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Filter */}
              <div>
                <Label className="text-xs md:text-sm">{t.selectSection}</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger data-testid="select-section">
                    <SelectValue placeholder={t.selectSection} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allSections}</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Filter */}
              <div>
                <Label className="text-xs md:text-sm">{t.selectSubject}</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder={t.selectSubject} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allSubjects}</SelectItem>
                    {subjects.map((subj: any) => (
                      <SelectItem key={subj.id} value={subj.id.toString()}>
                        {subj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Term Filter */}
              <div>
                <Label className="text-xs md:text-sm">{t.selectTerm}</Label>
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
            </div>

            {/* Feature 3.1: Status Filter */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs md:text-sm">{t.statusFilter}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder={t.statusFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="filter-option-all">{t.all}</SelectItem>
                    <SelectItem value="pass" data-testid="filter-option-pass">{t.pass}</SelectItem>
                    <SelectItem value="fail" data-testid="filter-option-fail">{t.fail}</SelectItem>
                    <SelectItem value="absent" data-testid="filter-option-absent">{t.absent}</SelectItem>
                    <SelectItem value="A+" data-testid="filter-option-A+">A+</SelectItem>
                    <SelectItem value="A" data-testid="filter-option-A">A</SelectItem>
                    <SelectItem value="A-" data-testid="filter-option-A-">A-</SelectItem>
                    <SelectItem value="B" data-testid="filter-option-B">B</SelectItem>
                    <SelectItem value="C" data-testid="filter-option-C">C</SelectItem>
                    <SelectItem value="D" data-testid="filter-option-D">D</SelectItem>
                    <SelectItem value="F" data-testid="filter-option-F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">{language === 'bn' ? 'অনুসন্ধান' : 'Search'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.searchStudent}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-student"
                  />
                </div>
              </div>
            </div>

            {/* Filter count */}
            {statusFilter !== 'all' && (
              <div className="mt-3 text-sm text-muted-foreground">
                {t.showing} {filteredResults.length} {t.of} {studentResults.length} {t.students}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature 3.2: Performance Trends */}
        {uniqueStudents.length > 0 && terms.length > 1 && (
          <Card>
            <Collapsible open={isTrendsExpanded} onOpenChange={setIsTrendsExpanded}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    {t.performanceTrends}
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {isTrendsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs md:text-sm">{t.selectStudent}</Label>
                      <Select value={selectedStudentForTrends} onValueChange={setSelectedStudentForTrends}>
                        <SelectTrigger data-testid="student-selector-trends">
                          <SelectValue placeholder={t.selectStudent} />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueStudents.map((student: any) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name} ({student.student_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedStudentForTrends && performanceTrends.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold mb-3">{t.termComparison}</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={performanceTrends} data-testid="performance-trends-chart">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey={language === 'bn' ? 'termNameBn' : 'termName'} 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              label={{ value: language === 'bn' ? 'গড় নম্বর (%)' : 'Average Marks (%)', angle: -90, position: 'insideLeft' }}
                              domain={[0, 100]}
                            />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="averageMarks" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              name={language === 'bn' ? 'গড় নম্বর' : 'Average Marks'}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="table" className="text-xs md:text-sm">
              <FileText className="w-4 h-4 mr-2" />
              {t.resultsTable}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm" data-testid="analytics-tab">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t.analytics}
            </TabsTrigger>
          </TabsList>

          {/* Results Table Tab */}
          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.resultsList}</CardTitle>
                <CardDescription>{t.resultsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">{t.loading}</span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.noResults}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.studentId}</TableHead>
                          <TableHead>{t.name}</TableHead>
                          <TableHead className="hidden md:table-cell">{t.class}</TableHead>
                          <TableHead>{t.assessment}</TableHead>
                          <TableHead className="text-center">{t.score}</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">{t.grade}</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">{t.status}</TableHead>
                          <TableHead className="text-right">{t.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((result: any) => {
                          const score = parseFloat(result.score_obtained || '0');
                          const maxScore = parseFloat(result.assessments?.total_marks || '100');
                          const percentage = (score / maxScore) * 100;
                          const isPassing = percentage >= 40;
                          const assessmentStatus = result.assessments?.status || 'draft';

                          return (
                            <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                              <TableCell className="font-medium text-xs md:text-sm">
                                {result.students?.student_id}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6 md:w-8 md:h-8">
                                    <AvatarImage src={result.students?.photo} />
                                    <AvatarFallback>{result.students?.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="hidden sm:inline">{result.students?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs md:text-sm">
                                {result.students?.class}-{result.students?.section}
                              </TableCell>
                              <TableCell className="text-xs md:text-sm">
                                <div className="flex flex-col gap-1">
                                  <span>{result.assessments?.assessment_name}</span>
                                  {/* Feature 3.3: Status Badge */}
                                  <Badge 
                                    variant={
                                      assessmentStatus === 'approved' ? 'default' :
                                      assessmentStatus === 'pending' ? 'secondary' :
                                      assessmentStatus === 'rejected' ? 'destructive' :
                                      'outline'
                                    }
                                    className="w-fit text-xs"
                                    data-testid={`status-badge-${result.assessment_id}`}
                                  >
                                    {assessmentStatus === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {assessmentStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                    {assessmentStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                    {assessmentStatus === 'draft' && <FileText className="w-3 h-3 mr-1" />}
                                    {(t as any)[assessmentStatus] || assessmentStatus}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs md:text-sm">
                                {result.is_absent ? (
                                  <Badge variant="secondary">{t.absent}</Badge>
                                ) : (
                                  `${score}/${maxScore}`
                                )}
                              </TableCell>
                              <TableCell className="text-center hidden sm:table-cell">
                                <Badge variant="outline" className="text-xs md:text-sm">
                                  {result.grade_letter || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center hidden lg:table-cell">
                                {result.is_absent ? (
                                  <Badge variant="secondary">{t.absent}</Badge>
                                ) : isPassing ? (
                                  <Badge variant="default" className="bg-green-600">
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
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`actions-${result.id}`}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewCard(result)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      {t.viewCard}
                                    </DropdownMenuItem>
                                    {/* Feature 3.4: Download PDF */}
                                    <DropdownMenuItem 
                                      onClick={() => handleDownloadPDF(result.students)}
                                      data-testid={`btn-download-pdf-${result.students?.id}`}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      {t.downloadPDF}
                                    </DropdownMenuItem>
                                    {/* Feature 3.3: Approval Workflow Actions */}
                                    <PermissionGate anyPermissions={[PERMISSIONS.PUBLISH_RESULTS]}>
                                      <DropdownMenuSeparator />
                                      {assessmentStatus === 'draft' && (
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setSelectedAssessmentForApproval(result.assessments);
                                            updateStatusMutation.mutate({
                                              assessmentId: result.assessment_id,
                                              status: 'pending'
                                            });
                                          }}
                                          data-testid="btn-submit-approval"
                                        >
                                          <Send className="w-4 h-4 mr-2" />
                                          {t.submitForApproval}
                                        </DropdownMenuItem>
                                      )}
                                      {assessmentStatus === 'pending' && (role === 'super_admin' || role === 'school_admin') && (
                                        <>
                                          <DropdownMenuItem 
                                            onClick={() => {
                                              setSelectedAssessmentForApproval(result.assessments);
                                              setIsApprovalDialogOpen(true);
                                            }}
                                            data-testid="btn-approve-results"
                                          >
                                            <ThumbsUp className="w-4 h-4 mr-2" />
                                            {t.approveResults}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => {
                                              setSelectedAssessmentForApproval(result.assessments);
                                              setIsRejectDialogOpen(true);
                                            }}
                                            data-testid="btn-reject-results"
                                          >
                                            <ThumbsDown className="w-4 h-4 mr-2" />
                                            {t.rejectResults}
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </PermissionGate>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature 3.5: Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {!selectedClass || selectedClass === 'all' || !selectedSection || selectedSection === 'all' ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'bn' ? 'অ্যানালিটিক্স দেখতে দয়া করে একটি শ্রেণী এবং শাখা নির্বাচন করুন' : 'Please select a class and section to view analytics'}</p>
                  </div>
                </CardContent>
              </Card>
            ) : analyticsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Pass/Fail Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        {t.passFailRate}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t.passed}</span>
                          <span className="text-2xl font-bold text-green-600">
                            {classAnalytics?.passFailRate.pass || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t.failed}</span>
                          <span className="text-2xl font-bold text-red-600">
                            {classAnalytics?.passFailRate.fail || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-sm font-semibold">{t.passingRate}</span>
                          <span className="text-xl font-bold text-blue-600">
                            {classAnalytics?.passFailRate?.passPercentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        {language === 'bn' ? 'শ্রেণীর গড়' : 'Class Average'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-600">
                            {classAnalytics?.classAverage.toFixed(1) || 0}%
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {language === 'bn' ? 'গড় নম্বর' : 'Average Percentage'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Subject Performance Chart */}
                {classAnalytics?.subjectPerformance && classAnalytics.subjectPerformance.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        {t.subjectPerformance}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={classAnalytics.subjectPerformance} data-testid="subject-performance-chart">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey={language === 'bn' ? 'subjectNameBn' : 'subjectName'}
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            label={{ 
                              value: language === 'bn' ? 'গড় নম্বর (%)' : 'Average Marks (%)', 
                              angle: -90, 
                              position: 'insideLeft' 
                            }}
                            domain={[0, 100]}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="average" 
                            fill="#8b5cf6" 
                            name={language === 'bn' ? 'গড় নম্বর' : 'Average'}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Grade Distribution Chart */}
                {classAnalytics?.gradeDistribution && Object.keys(classAnalytics.gradeDistribution).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        {t.gradeDistribution}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart data-testid="grade-distribution-chart">
                          <Pie
                            data={Object.entries(classAnalytics.gradeDistribution).map(([grade, count]) => ({
                              name: grade,
                              value: count as number,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(classAnalytics.gradeDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Class Toppers */}
                {classToppers && classToppers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        {t.classToppers}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table data-testid="toppers-list">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">{language === 'bn' ? 'র‍্যাংক' : 'Rank'}</TableHead>
                              <TableHead>{t.name}</TableHead>
                              <TableHead className="text-center hidden md:table-cell">{t.totalMarks}</TableHead>
                              <TableHead className="text-center">{t.percentage}</TableHead>
                              <TableHead className="text-center hidden sm:table-cell">GPA</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classToppers.map((student: any, index: number) => (
                              <TableRow key={student.id} data-testid={`topper-${index + 1}`}>
                                <TableCell className="font-bold">
                                  {index + 1}
                                  {index === 0 && <span className="ml-1 text-yellow-500">🥇</span>}
                                  {index === 1 && <span className="ml-1 text-gray-400">🥈</span>}
                                  {index === 2 && <span className="ml-1 text-orange-600">🥉</span>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={student.photo} />
                                      <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-sm">{student.name}</div>
                                      <div className="text-xs text-muted-foreground">{student.student_id}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center hidden md:table-cell">
                                  {student.totalObtained.toFixed(0)}/{student.totalMaxMarks.toFixed(0)}
                                </TableCell>
                                <TableCell className="text-center font-semibold text-blue-600">
                                  {student.percentage.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-center hidden sm:table-cell">
                                  <Badge variant="outline">{student.gpa.toFixed(2)}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Feature 3.3: Approval Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.approveResults}</DialogTitle>
              <DialogDescription>
                {language === 'bn' 
                  ? 'আপনি কি নিশ্চিত যে আপনি এই মূল্যায়নের ফলাফল অনুমোদন করতে এবং শিক্ষার্থীদের জানাতে চান?' 
                  : 'Are you sure you want to approve this assessment and notify students?'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedAssessmentForApproval?.assessment_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' 
                    ? 'অনুমোদনের পরে, সমস্ত শিক্ষার্থী একটি বিজ্ঞপ্তি পাবেন এবং ফলাফল সম্পাদনা করা যাবে না।' 
                    : 'Once approved, all students will be notified and results cannot be edited.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button 
                onClick={handlePublishWithNotifications}
                disabled={publishResultsMutation.isPending}
                data-testid="btn-publish-results"
              >
                {publishResultsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    {t.publishWithNotifications}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.rejectResults}</DialogTitle>
              <DialogDescription>
                {language === 'bn' 
                  ? 'প্রত্যাখ্যানের কারণ প্রদান করুন' 
                  : 'Provide a reason for rejection'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{language === 'bn' ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={language === 'bn' ? 'কারণ লিখুন...' : 'Enter reason...'}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason('');
              }}>
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast({
                      title: language === 'bn' ? 'ত্রুটি' : 'Error',
                      description: language === 'bn' ? 'প্রত্যাখ্যানের কারণ প্রয়োজন' : 'Rejection reason is required',
                      variant: 'destructive',
                    });
                    return;
                  }
                  updateStatusMutation.mutate({
                    assessmentId: selectedAssessmentForApproval?.id,
                    status: 'rejected',
                    rejectionReason,
                  });
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    {t.rejectResults}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Result Card Dialog */}
        <Dialog open={isResultCardOpen} onOpenChange={setIsResultCardOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="print:hidden">
              <DialogTitle>{t.resultCard}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Button onClick={handlePrintCard} variant="outline" size="sm" data-testid="button-print-card">
                  <Printer className="w-4 h-4 mr-2" />
                  {t.printCard}
                </Button>
              </div>
            </DialogHeader>

            {selectedStudentForCard && (
              <div className="result-card-content p-6 bg-white dark:bg-gray-900">
                {/* Header */}
                <div className="text-center mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold mb-2">{t.resultCard}</h2>
                  <p className="text-sm text-muted-foreground">{currentAcademicYear?.name || ''}</p>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.name}</p>
                    <p className="font-semibold">{selectedStudentForCard.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.studentId}</p>
                    <p className="font-semibold">{selectedStudentForCard.student_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.class}</p>
                    <p className="font-semibold">{selectedStudentForCard.class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.rollNumber}</p>
                    <p className="font-semibold">{selectedStudentForCard.roll_number || 'N/A'}</p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.totalMarks}</p>
                    <p className="text-lg font-bold">{cardStats?.totalMarks.toFixed(0)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.percentage}</p>
                    <p className="text-lg font-bold">{cardStats?.percentage}%</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.overallGrade}</p>
                    <p className="text-lg font-bold">{cardStats?.overallGrade}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.status}</p>
                    <p className="text-lg font-bold">
                      {parseFloat(cardStats?.percentage || '0') >= 40 ? t.passed : t.failed}
                    </p>
                  </div>
                </div>

                {/* Results Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{language === 'bn' ? 'বিষয়ভিত্তিক ফলাফল' : 'Subject-wise Results'}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.subject}</TableHead>
                        <TableHead className="text-center">{t.assessment}</TableHead>
                        <TableHead className="text-center">{t.marksObtained}</TableHead>
                        <TableHead className="text-center">{t.totalMarks}</TableHead>
                        <TableHead className="text-center">{t.percentage}</TableHead>
                        <TableHead className="text-center">{t.grade}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentCardResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            {t.noResults}
                          </TableCell>
                        </TableRow>
                      ) : (
                        studentCardResults.map((result: any, index: number) => {
                          const score = parseFloat(result.score_obtained || '0');
                          const maxScore = parseFloat(result.assessments?.total_marks || '100');
                          const percentage = (score / maxScore) * 100;

                          return (
                            <TableRow key={result.id} data-testid={`row-subject-${index}`}>
                              <TableCell className="font-medium">
                                {result.assessments?.subjects?.name || 'N/A'}
                              </TableCell>
                              <TableCell className="text-center">
                                {result.assessments?.assessment_name}
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {result.is_absent ? t.absent : score}
                              </TableCell>
                              <TableCell className="text-center">{maxScore}</TableCell>
                              <TableCell className="text-center">{result.is_absent ? '-' : `${percentage.toFixed(2)}%`}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{result.grade_letter || 'N/A'}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Separator className="mb-6" />

                {/* Remarks */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{t.remarks}</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg min-h-[80px]">
                    <p className="text-sm text-muted-foreground italic">
                      {language === 'bn' 
                        ? 'শিক্ষার্থী ভালো পারফর্ম্যান্স করেছে।' 
                        : 'Student has shown good performance.'}
                    </p>
                  </div>
                </div>

                {/* Signature Section */}
                <div className="grid grid-cols-3 gap-8 mt-12 print:mt-16">
                  <div className="text-center">
                    <div className="border-t-2 border-gray-300 pt-2">
                      <p className="text-sm font-medium">{language === 'bn' ? 'শ্রেণী শিক্ষক' : 'Class Teacher'}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-gray-300 pt-2">
                      <p className="text-sm font-medium">{language === 'bn' ? 'প্রধান শিক্ষক' : 'Principal'}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-gray-300 pt-2">
                      <p className="text-sm font-medium">{language === 'bn' ? 'অভিভাবক' : 'Guardian'}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-xs text-muted-foreground print:mt-12">
                  <p>{language === 'bn' ? 'তারিখ' : 'Date'}: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .result-card-content {
            padding: 20mm !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .result-card-content, .result-card-content * {
            visibility: visible;
          }

          .result-card-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          button, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
