// Migrated to direct Supabase: Assignments using assessments table with submissions tracking
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { Plus, FileText, Calendar, Clock, CheckCircle, AlertCircle, Search, Trash2, Edit2, Eye, Upload, Download, Star, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Assessment {
  id: number;
  school_id: number;
  subject_id: number;
  class: string;
  section: string;
  academic_year_id: number | null;
  term_id: number | null;
  assessment_name: string;
  assessment_name_bn: string | null;
  assessment_type: string;
  total_marks: string;
  weight_percentage: string | null;
  date: string | null;
  created_by_teacher_id: number | null;
  description: string | null;
  description_bn: string | null;
  is_published: boolean;
  created_at: string;
  subjects?: {
    name: string;
    name_bn: string;
  };
}

interface Student {
  id: number;
  name: string;
  name_in_bangla: string | null;
  student_id: string;
  roll_number: string | null;
}

interface AssignmentSubmission {
  id: number;
  assessment_id: number;
  student_id: number;
  submission_text: string | null;
  submission_files: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }> | null;
  status: string;
  submitted_at: string | null;
  graded_at: string | null;
  score: string | null;
  feedback: string | null;
  feedback_bn: string | null;
  is_late: boolean;
  students?: {
    id: number;
    name: string;
    name_in_bangla: string | null;
    student_id: string;
    roll_number: string | null;
  };
}

export default function AssignmentsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const { hasPermission, teacherClassSubjects } = usePermissions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [viewSubmissionsAssignment, setViewSubmissionsAssignment] = useState<Assessment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [submittingStudent, setSubmittingStudent] = useState<AssignmentSubmission | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [formData, setFormData] = useState({
    assessment_name: '',
    assessment_name_bn: '',
    description: '',
    subject_id: '',
    class: '',
    section: '',
    date: new Date().toISOString().split('T')[0],
    total_marks: '100',
    assessment_type: 'homework',
  });
  const [gradeFormData, setGradeFormData] = useState({
    score: '',
    feedback: '',
    feedback_bn: '',
    status: 'graded',
  });
  const [submissionFormData, setSubmissionFormData] = useState({
    submission_text: '',
    files: [] as File[],
  });

  // Fetch assessments (homework and assignments)
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['/api/assessments', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          subjects (name, name_bn)
        `)
        .eq('school_id', schoolId)
        .in('assessment_type', ['homework', 'project'])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Assessment[];
    }
  });

  // Fetch submission counts for all assignments
  const { data: submissionCounts = {} } = useQuery({
    queryKey: ['/api/assignment-submission-counts', schoolId],
    queryFn: async () => {
      const counts: Record<number, { submitted: number; total: number }> = {};
      
      for (const assessment of assessments) {
        // Get total students in this class/section
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('class', assessment.class)
          .eq('section', assessment.section || '')
          .eq('status', 'active');

        // Get submitted count
        const { count: submittedCount } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', assessment.id)
          .eq('school_id', schoolId)
          .in('status', ['submitted', 'graded', 'returned']);

        counts[assessment.id] = {
          submitted: submittedCount || 0,
          total: totalStudents || 0,
        };
      }
      
      return counts;
    },
    enabled: assessments.length > 0,
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch submissions for a specific assignment
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['/api/assignment-submissions', viewSubmissionsAssignment?.id],
    queryFn: async () => {
      if (!viewSubmissionsAssignment) return [];

      // Get all students in this class/section
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, name_in_bangla, student_id, roll_number')
        .eq('school_id', schoolId)
        .eq('class', viewSubmissionsAssignment.class)
        .eq('section', viewSubmissionsAssignment.section || '')
        .eq('status', 'active')
        .order('roll_number');

      if (studentsError) throw studentsError;

      // Get submissions for this assignment
      const { data: existingSubmissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assessment_id', viewSubmissionsAssignment.id)
        .eq('school_id', schoolId);

      if (submissionsError) throw submissionsError;

      // Merge students with their submissions
      const submissionMap = new Map(
        (existingSubmissions || []).map(sub => [sub.student_id, sub])
      );

      return (students || []).map(student => {
        const submission = submissionMap.get(student.id);
        return {
          id: submission?.id || 0,
          assessment_id: viewSubmissionsAssignment.id,
          student_id: student.id,
          submission_text: submission?.submission_text || null,
          submission_files: submission?.submission_files || null,
          status: submission?.status || 'pending',
          submitted_at: submission?.submitted_at || null,
          graded_at: submission?.graded_at || null,
          score: submission?.score || null,
          feedback: submission?.feedback || null,
          feedback_bn: submission?.feedback_bn || null,
          is_late: submission?.is_late || false,
          students: student,
        } as AssignmentSubmission;
      });
    },
    enabled: !!viewSubmissionsAssignment,
  });

  // Create/Update assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Get current teacher ID
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', schoolId)
        .limit(1)
        .single();

      const assessmentData = {
        ...data,
        school_id: schoolId,
        created_by_teacher_id: teacherData?.id || null,
        subject_id: data.subject_id ? parseInt(data.subject_id) : null,
        is_published: true,
      };

      if (editingAssessment) {
        // Update existing
        const { data: result, error } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', editingAssessment.id)
          .eq('school_id', schoolId)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } else {
        // Create new
        const { data: result, error } = await supabase
          .from('assessments')
          .insert([assessmentData])
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assessments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-submission-counts'] });
      toast({ 
        title: 'সফল', 
        description: editingAssessment ? 'অ্যাসাইনমেন্ট আপডেট হয়েছে' : 'অ্যাসাইনমেন্ট তৈরি হয়েছে'
      });
      setIsAddDialogOpen(false);
      setEditingAssessment(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assessments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-submission-counts'] });
      toast({ title: 'সফল', description: 'অ্যাসাইনমেন্ট মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Submit assignment mutation (for students)
  const submitAssignmentMutation = useMutation({
    mutationFn: async ({ assessmentId, studentId }: { assessmentId: number; studentId: number }) => {
      // Simulate file upload (in production, use Supabase Storage)
      const fileData = submissionFormData.files.map(file => ({
        name: file.name,
        url: `placeholder-url/${file.name}`, // Replace with actual upload URL
        size: file.size,
        type: file.type,
      }));

      const now = new Date().toISOString();
      const assignment = assessments.find(a => a.id === assessmentId);
      const isLate = assignment?.date ? isPast(new Date(assignment.date)) : false;

      const submissionData = {
        assessment_id: assessmentId,
        student_id: studentId,
        submission_text: submissionFormData.submission_text,
        submission_files: fileData.length > 0 ? fileData : null,
        status: 'submitted',
        submitted_at: now,
        is_late: isLate,
        school_id: schoolId,
      };

      const { data, error } = await supabase
        .from('assignment_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-submission-counts'] });
      toast({ title: 'সফল', description: 'অ্যাসাইনমেন্ট জমা দেওয়া হয়েছে' });
      setSubmissionFormData({ submission_text: '', files: [] });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Grade submission mutation (for teachers)
  const gradeSubmissionMutation = useMutation({
    mutationFn: async (data: { submissionId: number; score: string; feedback: string; feedbackBn: string; status: string }) => {
      const updateData = {
        score: data.score,
        feedback: data.feedback,
        feedback_bn: data.feedbackBn,
        status: data.status,
        graded_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from('assignment_submissions')
        .update(updateData)
        .eq('id', data.submissionId)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-submissions'] });
      toast({ title: 'সফল', description: 'নম্বর প্রদান করা হয়েছে' });
      setGradingSubmission(null);
      setGradeFormData({ score: '', feedback: '', feedback_bn: '', status: 'graded' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      assessment_name: '',
      assessment_name_bn: '',
      description: '',
      subject_id: '',
      class: '',
      section: '',
      date: new Date().toISOString().split('T')[0],
      total_marks: '100',
      assessment_type: 'homework',
    });
  };

  const handleEdit = (assessment: Assessment) => {
    setFormData({
      assessment_name: assessment.assessment_name,
      assessment_name_bn: assessment.assessment_name_bn || '',
      description: assessment.description || '',
      subject_id: assessment.subject_id?.toString() || '',
      class: assessment.class,
      section: assessment.section,
      date: assessment.date || new Date().toISOString().split('T')[0],
      total_marks: assessment.total_marks,
      assessment_type: assessment.assessment_type,
    });
    setEditingAssessment(assessment);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি এই অ্যাসাইনমেন্ট মুছে ফেলতে চান?')) {
      deleteAssessmentMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAssessmentMutation.mutate(formData);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingAssessment(null);
    resetForm();
  };

  const handleViewSubmissions = (assignment: Assessment) => {
    setViewSubmissionsAssignment(assignment);
  };

  const handleGradeSubmission = (submission: AssignmentSubmission) => {
    setGradingSubmission(submission);
    setGradeFormData({
      score: submission.score || '',
      feedback: submission.feedback || '',
      feedback_bn: submission.feedback_bn || '',
      status: submission.status === 'submitted' ? 'graded' : submission.status,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSubmissionFormData({
        ...submissionFormData,
        files: Array.from(e.target.files),
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setSubmissionFormData({
      ...submissionFormData,
      files: submissionFormData.files.filter((_, i) => i !== index),
    });
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gradingSubmission) {
      gradeSubmissionMutation.mutate({
        submissionId: gradingSubmission.id,
        score: gradeFormData.score,
        feedback: gradeFormData.feedback,
        feedbackBn: gradeFormData.feedback_bn,
        status: gradeFormData.status,
      });
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingStudent && viewSubmissionsAssignment) {
      submitAssignmentMutation.mutate({
        assessmentId: viewSubmissionsAssignment.id,
        studentId: submittingStudent.student_id,
      });
      setSubmittingStudent(null);
    }
  };

  const handleSubmitAsStudent = (submission: AssignmentSubmission) => {
    setSubmittingStudent(submission);
    setSubmissionFormData({ submission_text: '', files: [] });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'homework': return <Badge variant="default">হোমওয়ার্ক</Badge>;
      case 'project': return <Badge variant="secondary">প্রজেক্ট</Badge>;
      case 'quiz': return <Badge variant="outline">কুইজ</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === 'pending') {
      return <Badge variant="outline" data-testid="badge-pending">অপেক্ষমাণ</Badge>;
    }
    if (status === 'submitted') {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="default" data-testid="badge-submitted">জমা দেওয়া হয়েছে</Badge>
          {isLate && <Badge variant="destructive" data-testid="badge-late">বিলম্বিত</Badge>}
        </div>
      );
    }
    if (status === 'graded') {
      return <Badge variant="secondary" data-testid="badge-graded">নম্বরপ্রাপ্ত</Badge>;
    }
    if (status === 'returned') {
      return <Badge variant="outline" data-testid="badge-returned">ফেরত</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = searchText === '' || 
      assessment.assessment_name.toLowerCase().includes(searchText.toLowerCase()) ||
      assessment.assessment_name_bn?.toLowerCase().includes(searchText.toLowerCase());
    const matchesClass = selectedClass === 'all' || assessment.class === selectedClass;
    const matchesType = selectedType === 'all' || assessment.assessment_type === selectedType;
    
    return matchesSearch && matchesClass && matchesType;
  });

  const stats = {
    total: assessments.length,
    homework: assessments.filter(a => a.assessment_type === 'homework').length,
    projects: assessments.filter(a => a.assessment_type === 'project').length,
  };

  const classes = Array.from(new Set(assessments.map(a => a.class))).filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              হোমওয়ার্ক ও অ্যাসাইনমেন্ট
            </h1>
            <p className="text-muted-foreground mt-1">
              হোমওয়ার্ক তৈরি এবং পরিচালনা করুন
            </p>
          </div>
          <PermissionGate
            permission={PERMISSIONS.CREATE_ASSIGNMENTS}
            context={{
              classId: selectedClass !== 'all' ? parseInt(selectedClass) : undefined,
              subjectId: formData.subject_id ? parseInt(formData.subject_id) : undefined,
              teacherClassSubjects
            }}
          >
            <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-assignment">
                  <Plus className="w-4 h-4 mr-2" />
                  নতুন অ্যাসাইনমেন্ট
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAssessment ? 'অ্যাসাইনমেন্ট সম্পাদনা করুন' : 'নতুন অ্যাসাইনমেন্ট তৈরি করুন'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assessment_name">শিরোনাম (ইংরেজি) *</Label>
                    <Input
                      id="assessment_name"
                      data-testid="input-title"
                      value={formData.assessment_name}
                      onChange={(e) => setFormData({ ...formData, assessment_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="assessment_name_bn">শিরোনাম (বাংলা)</Label>
                    <Input
                      id="assessment_name_bn"
                      data-testid="input-title-bn"
                      value={formData.assessment_name_bn}
                      onChange={(e) => setFormData({ ...formData, assessment_name_bn: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">বিস্তারিত</Label>
                  <Textarea
                    id="description"
                    data-testid="input-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assessment_type">ধরণ *</Label>
                    <Select
                      value={formData.assessment_type}
                      onValueChange={(value) => setFormData({ ...formData, assessment_type: value })}
                    >
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homework">হোমওয়ার্ক</SelectItem>
                        <SelectItem value="project">প্রজেক্ট</SelectItem>
                        <SelectItem value="quiz">কুইজ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject_id">বিষয়</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                    >
                      <SelectTrigger data-testid="select-subject">
                        <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name_bn || subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="class">শ্রেণী *</Label>
                    <Input
                      id="class"
                      data-testid="input-class"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">শাখা</Label>
                    <Input
                      id="section"
                      data-testid="input-section"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_marks">মোট নম্বর *</Label>
                    <Input
                      id="total_marks"
                      data-testid="input-marks"
                      type="number"
                      min="0"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">তারিখ *</Label>
                  <Input
                    id="date"
                    data-testid="input-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={saveAssessmentMutation.isPending}>
                    {saveAssessmentMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : (editingAssessment ? 'আপডেট করুন' : 'তৈরি করুন')}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট অ্যাসাইনমেন্ট</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">হোমওয়ার্ক</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.homework}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">প্রজেক্ট</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="অনুসন্ধান করুন..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]" data-testid="select-class-filter">
              <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল শ্রেণী</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
              <SelectValue placeholder="ধরণ নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল ধরণ</SelectItem>
              <SelectItem value="homework">হোমওয়ার্ক</SelectItem>
              <SelectItem value="project">প্রজেক্ট</SelectItem>
              <SelectItem value="quiz">কুইজ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead>ধরণ</TableHead>
                  <TableHead>বিষয়</TableHead>
                  <TableHead>শ্রেণী</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>নম্বর</TableHead>
                  <TableHead>জমা</TableHead>
                  <TableHead className="text-right">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filteredAssessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      কোন অ্যাসাইনমেন্ট পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssessments.map((assessment) => {
                    const counts = submissionCounts[assessment.id] || { submitted: 0, total: 0 };
                    const isOverdue = assessment.date ? isPast(new Date(assessment.date)) : false;
                    
                    return (
                      <TableRow key={assessment.id} data-testid={`row-assignment-${assessment.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2" data-testid={`text-title-${assessment.id}`}>
                              {assessment.assessment_name_bn || assessment.assessment_name}
                              {isOverdue && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                            </div>
                            {assessment.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {assessment.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(assessment.assessment_type)}
                        </TableCell>
                        <TableCell>
                          {assessment.subjects?.name_bn || assessment.subjects?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {assessment.class} {assessment.section}
                        </TableCell>
                        <TableCell>
                          {assessment.date ? (
                            <div className="flex flex-col">
                              <span>{format(new Date(assessment.date), 'dd MMM yyyy')}</span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs mt-1 w-fit">
                                  সময়সীমা অতিক্রান্ত
                                </Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{assessment.total_marks}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium" data-testid={`text-submission-count-${assessment.id}`}>
                              {counts.submitted} / {counts.total}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSubmissions(assessment)}
                              data-testid={`button-view-submissions-${assessment.id}`}
                              className="h-7"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              দেখুন
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <PermissionGate
                              permission={PERMISSIONS.EDIT_ASSIGNMENTS}
                              context={{
                                classId: parseInt(assessment.class),
                                subjectId: assessment.subject_id || undefined,
                                teacherClassSubjects
                              }}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(assessment)}
                                data-testid={`button-edit-${assessment.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate
                              permission={PERMISSIONS.DELETE_ASSIGNMENTS}
                              context={{
                                classId: parseInt(assessment.class),
                                subjectId: assessment.subject_id || undefined,
                                teacherClassSubjects
                              }}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(assessment.id)}
                                data-testid={`button-delete-${assessment.id}`}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* View Submissions Modal */}
      <Dialog open={!!viewSubmissionsAssignment} onOpenChange={(open) => !open && setViewSubmissionsAssignment(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              জমাকৃত অ্যাসাইনমেন্ট - {viewSubmissionsAssignment?.assessment_name_bn || viewSubmissionsAssignment?.assessment_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">শ্রেণী: </span>
                <span className="font-medium">{viewSubmissionsAssignment?.class} {viewSubmissionsAssignment?.section}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">তারিখ: </span>
                <span className="font-medium">
                  {viewSubmissionsAssignment?.date ? format(new Date(viewSubmissionsAssignment.date), 'dd MMM yyyy') : '-'}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">মোট নম্বর: </span>
                <span className="font-medium">{viewSubmissionsAssignment?.total_marks}</span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>রোল</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>অবস্থা</TableHead>
                  <TableHead>জমার তারিখ</TableHead>
                  <TableHead>ফাইল</TableHead>
                  <TableHead>নম্বর</TableHead>
                  <TableHead className="text-right">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.student_id} data-testid={`row-submission-${submission.student_id}`}>
                    <TableCell>{submission.students?.roll_number || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {submission.students?.name_in_bangla || submission.students?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {submission.students?.student_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status, submission.is_late)}
                    </TableCell>
                    <TableCell>
                      {submission.submitted_at ? format(new Date(submission.submitted_at), 'dd MMM yyyy, hh:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      {submission.submission_files && submission.submission_files.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {submission.submission_files.map((file, idx) => (
                            <Button
                              key={idx}
                              size="sm"
                              variant="link"
                              className="h-auto p-0 justify-start"
                              data-testid={`button-download-file-${idx}`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              {file.name}
                            </Button>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {submission.score ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{submission.score} / {viewSubmissionsAssignment?.total_marks}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {submission.status === 'submitted' || submission.status === 'graded' ? (
                        <PermissionGate
                          permission={PERMISSIONS.GRADE_ASSIGNMENTS}
                          context={{
                            classId: viewSubmissionsAssignment ? parseInt(viewSubmissionsAssignment.class) : undefined,
                            subjectId: viewSubmissionsAssignment?.subject_id || undefined,
                            teacherClassSubjects
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGradeSubmission(submission)}
                            data-testid={`button-grade-${submission.student_id}`}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {submission.status === 'graded' ? 'সম্পাদনা' : 'নম্বর দিন'}
                          </Button>
                        </PermissionGate>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSubmitAsStudent(submission)}
                          data-testid={`button-submit-as-${submission.student_id}`}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          জমা দিন
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grading Modal */}
      <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>নম্বর প্রদান করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">শিক্ষার্থী: </span>
                <span className="font-medium">
                  {gradingSubmission?.students?.name_in_bangla || gradingSubmission?.students?.name}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">মোট নম্বর: </span>
                <span className="font-medium">{viewSubmissionsAssignment?.total_marks}</span>
              </div>
            </div>

            {gradingSubmission?.submission_text && (
              <div>
                <Label>জমাকৃত লেখা</Label>
                <div className="p-3 bg-muted rounded-lg mt-1">
                  <p className="text-sm">{gradingSubmission.submission_text}</p>
                </div>
              </div>
            )}

            {gradingSubmission?.submission_files && gradingSubmission.submission_files.length > 0 && (
              <div>
                <Label>জমাকৃত ফাইল</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {gradingSubmission.submission_files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="score">নম্বর *</Label>
                <Input
                  id="score"
                  data-testid="input-grade-score"
                  type="number"
                  min="0"
                  max={viewSubmissionsAssignment?.total_marks}
                  step="0.01"
                  value={gradeFormData.score}
                  onChange={(e) => setGradeFormData({ ...gradeFormData, score: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">অবস্থা *</Label>
                <Select
                  value={gradeFormData.status}
                  onValueChange={(value) => setGradeFormData({ ...gradeFormData, status: value })}
                >
                  <SelectTrigger data-testid="select-grade-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graded">নম্বরপ্রাপ্ত</SelectItem>
                    <SelectItem value="returned">পুনঃ সংশোধন প্রয়োজন</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="feedback">মন্তব্য (ইংরেজি)</Label>
              <Textarea
                id="feedback"
                data-testid="input-feedback"
                value={gradeFormData.feedback}
                onChange={(e) => setGradeFormData({ ...gradeFormData, feedback: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="feedback_bn">মন্তব্য (বাংলা)</Label>
              <Textarea
                id="feedback_bn"
                data-testid="input-feedback-bn"
                value={gradeFormData.feedback_bn}
                onChange={(e) => setGradeFormData({ ...gradeFormData, feedback_bn: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setGradingSubmission(null)}>
                বাতিল
              </Button>
              <Button type="submit" data-testid="button-submit-grade" disabled={gradeSubmissionMutation.isPending}>
                {gradeSubmissionMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'নম্বর প্রদান করুন'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Submission Modal */}
      <Dialog open={!!submittingStudent} onOpenChange={(open) => !open && setSubmittingStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>অ্যাসাইনমেন্ট জমা দিন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">শিক্ষার্থী: </span>
                <span className="font-medium">
                  {submittingStudent?.students?.name_in_bangla || submittingStudent?.students?.name}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">মোট নম্বর: </span>
                <span className="font-medium">{viewSubmissionsAssignment?.total_marks}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="assignment_details">অ্যাসাইনমেন্ট বিবরণ</Label>
              <div className="p-3 bg-muted rounded-lg mt-1">
                <p className="text-sm font-medium">
                  {viewSubmissionsAssignment?.assessment_name_bn || viewSubmissionsAssignment?.assessment_name}
                </p>
                {viewSubmissionsAssignment?.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {viewSubmissionsAssignment.description}
                  </p>
                )}
                {viewSubmissionsAssignment?.date && (
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      শেষ তারিখ: {format(new Date(viewSubmissionsAssignment.date), 'dd MMM yyyy')}
                    </span>
                    {isPast(new Date(viewSubmissionsAssignment.date)) && (
                      <Badge variant="destructive" className="text-xs">সময়সীমা অতিক্রান্ত</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="submission_text">লিখিত উত্তর</Label>
              <Textarea
                id="submission_text"
                data-testid="input-submission-text"
                placeholder="আপনার উত্তর এখানে লিখুন..."
                value={submissionFormData.submission_text}
                onChange={(e) => setSubmissionFormData({ ...submissionFormData, submission_text: e.target.value })}
                rows={5}
              />
            </div>

            <div>
              <Label>ফাইল আপলোড করুন</Label>
              <p className="text-sm text-muted-foreground mb-2">
                সমর্থিত ফরম্যাট: PDF, DOC, DOCX, JPG, PNG, ZIP
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="file-upload"
                    data-testid="input-file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    data-testid="button-choose-files"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    ফাইল নির্বাচন করুন
                  </Button>
                </div>

                {submissionFormData.files.length > 0 && (
                  <div className="space-y-2">
                    <Label>নির্বাচিত ফাইল ({submissionFormData.files.length})</Label>
                    {submissionFormData.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`file-preview-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFile(idx)}
                          data-testid={`button-remove-file-${idx}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setSubmittingStudent(null)}>
                বাতিল
              </Button>
              <Button
                type="submit"
                data-testid="button-submit-assignment"
                disabled={submitAssignmentMutation.isPending || (submissionFormData.files.length === 0 && !submissionFormData.submission_text)}
              >
                {submitAssignmentMutation.isPending ? 'জমা দিচ্ছে...' : 'জমা দিন'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
