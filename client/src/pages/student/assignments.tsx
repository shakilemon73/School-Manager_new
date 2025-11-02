import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { 
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Calendar,
  Award,
  BookOpen,
  Filter,
  XCircle,
  Paperclip,
  Send
} from "lucide-react";

interface Assignment {
  id: number;
  assessment_name: string;
  assessment_name_bn?: string;
  assessment_type: string;
  description?: string;
  description_bn?: string;
  subject_id: number;
  class: string;
  section: string;
  date: string;
  total_marks: number;
  status: string;
  school_id: number;
  created_at: string;
  subjects?: {
    name: string;
    name_bn?: string;
  };
}

interface Submission {
  id: number;
  assessment_id: number;
  student_id: number;
  submission_text?: string;
  submission_files?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  status: string;
  submitted_at: string;
  graded_at?: string;
  score?: number;
  feedback?: string;
  feedback_bn?: string;
  is_late: boolean;
}

export default function StudentAssignments() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Get student profile to get student database ID
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  const studentId = studentProfile?.id;
  const studentClass = studentProfile?.class;
  const studentSection = studentProfile?.section;

  // Fetch all assignments for the student's class
  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: ['student-assignments', studentClass, studentSection, schoolId],
    queryFn: async () => {
      if (!studentClass || !studentSection || !schoolId) return [];
      
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          subjects (
            name,
            name_bn
          )
        `)
        .eq('class', studentClass)
        .eq('section', studentSection)
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }
      
      return data as Assignment[];
    },
    enabled: !!studentClass && !!studentSection && !!schoolId,
  });

  // Fetch submissions for this student
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ['student-submissions', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return [];
      
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId);
      
      if (error) {
        console.error('Error fetching submissions:', error);
        return [];
      }
      
      return data as Submission[];
    },
    enabled: !!studentId && !!schoolId,
  });

  // Submit assignment mutation
  const submitAssignmentMutation = useMutation({
    mutationFn: async (data: { assessmentId: number; text: string; files: FileList | null }) => {
      if (!studentId || !schoolId) throw new Error('Student ID or School ID missing');

      // For now, we'll just submit text (file upload would need storage integration)
      const submissionData = {
        assessment_id: data.assessmentId,
        student_id: studentId,
        submission_text: data.text,
        submission_files: [], // TODO: Implement file upload to storage
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        is_late: false, // TODO: Check if past due date
        school_id: schoolId,
      };

      const { data: result, error } = await supabase
        .from('assignment_submissions')
        .insert(submissionData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-submissions'] });
      toast({
        title: "Assignment Submitted",
        description: "Your assignment has been submitted successfully.",
      });
      setIsSubmitDialogOpen(false);
      setSubmissionText("");
      setSelectedFiles(null);
      setSelectedAssignment(null);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getAssignmentStatus = (assignment: Assignment): { status: string; color: string; icon: any } => {
    const submission = submissions?.find(s => s.assessment_id === assignment.id);
    const dueDate = assignment.date ? parseISO(assignment.date) : null;
    const isOverdue = dueDate ? isPast(dueDate) && !submission : false;

    if (submission) {
      if (submission.graded_at) {
        return { status: 'Graded', color: 'bg-green-100 text-green-800 border-green-200', icon: Award };
      }
      return { status: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 };
    }

    if (isOverdue) {
      return { status: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle };
    }

    return { status: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
  };

  const filteredAssignments = assignments?.filter(assignment => {
    if (selectedTab === 'all') return true;
    
    const submission = submissions?.find(s => s.assessment_id === assignment.id);
    const dueDate = assignment.date ? parseISO(assignment.date) : null;
    const isOverdue = dueDate ? isPast(dueDate) && !submission : false;

    if (selectedTab === 'pending') {
      return !submission && !isOverdue;
    } else if (selectedTab === 'submitted') {
      return submission && !submission.graded_at;
    } else if (selectedTab === 'graded') {
      return submission && submission.graded_at;
    } else if (selectedTab === 'overdue') {
      return isOverdue;
    }

    return true;
  }) || [];

  const handleSubmit = () => {
    if (!selectedAssignment || !submissionText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your submission text.",
        variant: "destructive",
      });
      return;
    }

    submitAssignmentMutation.mutate({
      assessmentId: selectedAssignment.id,
      text: submissionText,
      files: selectedFiles,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" data-testid="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-pink-200/20" data-testid="header-assignments">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
                  My Assignments
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300" data-testid="text-page-subtitle">
                  অ্যাসাইনমেন্ট • View and submit your assignments
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200" data-testid="badge-total-assignments">
                <FileText className="h-3 w-3 mr-1" />
                {assignments?.length || 0} Total
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="card-stat-pending">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700" data-testid="text-pending-count">
                    {filteredAssignments.filter(a => getAssignmentStatus(a).status === 'Pending').length}
                  </p>
                  <p className="text-sm text-blue-600" data-testid="text-pending-label">Pending</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" data-testid="icon-pending" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200" data-testid="card-stat-submitted">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700" data-testid="text-submitted-count">
                    {filteredAssignments.filter(a => getAssignmentStatus(a).status === 'Submitted').length}
                  </p>
                  <p className="text-sm text-yellow-600" data-testid="text-submitted-label">Submitted</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-yellow-500" data-testid="icon-submitted" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="card-stat-graded">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700" data-testid="text-graded-count">
                    {filteredAssignments.filter(a => getAssignmentStatus(a).status === 'Graded').length}
                  </p>
                  <p className="text-sm text-green-600" data-testid="text-graded-label">Graded</p>
                </div>
                <Award className="h-8 w-8 text-green-500" data-testid="icon-graded" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200" data-testid="card-stat-overdue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-700" data-testid="text-overdue-count">
                    {filteredAssignments.filter(a => getAssignmentStatus(a).status === 'Overdue').length}
                  </p>
                  <p className="text-sm text-red-600" data-testid="text-overdue-label">Overdue</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" data-testid="icon-overdue" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6" data-testid="tabs-filter">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl" data-testid="tabs-list">
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending
            </TabsTrigger>
            <TabsTrigger value="submitted" data-testid="tab-submitted">
              Submitted
            </TabsTrigger>
            <TabsTrigger value="graded" data-testid="tab-graded">
              Graded
            </TabsTrigger>
            <TabsTrigger value="overdue" data-testid="tab-overdue">
              Overdue
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6" data-testid="tab-content">
            {filteredAssignments.length === 0 ? (
              <Card className="p-12" data-testid="card-empty-state">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" data-testid="icon-empty" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-empty-title">
                    No Assignments Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400" data-testid="text-empty-description">
                    {selectedTab === 'all' 
                      ? "No assignments have been posted yet."
                      : `No ${selectedTab} assignments at the moment.`}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-assignments">
                {filteredAssignments.map((assignment) => {
                  const { status, color, icon: StatusIcon } = getAssignmentStatus(assignment);
                  const submission = submissions?.find(s => s.assessment_id === assignment.id);
                  const dueDate = assignment.date ? parseISO(assignment.date) : null;

                  return (
                    <Card 
                      key={assignment.id} 
                      className="hover:shadow-xl transition-all duration-300 border-2 hover:border-pink-300" 
                      data-testid={`card-assignment-${assignment.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className={color} data-testid={`badge-status-${assignment.id}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${assignment.id}`}>
                            {assignment.assessment_type}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg" data-testid={`text-title-${assignment.id}`}>
                          {assignment.assessment_name}
                        </CardTitle>
                        {assignment.assessment_name_bn && (
                          <p className="text-sm text-gray-500" data-testid={`text-title-bn-${assignment.id}`}>
                            {assignment.assessment_name_bn}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600" data-testid={`text-subject-${assignment.id}`}>
                          <BookOpen className="h-4 w-4" />
                          <span>{assignment.subjects?.name || 'Unknown Subject'}</span>
                        </div>

                        {dueDate && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600" data-testid={`text-due-date-${assignment.id}`}>
                            <Calendar className="h-4 w-4" />
                            <span>Due: {format(dueDate, 'MMM dd, yyyy')}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-sm text-gray-600" data-testid={`text-points-${assignment.id}`}>
                          <Award className="h-4 w-4" />
                          <span>{assignment.total_marks} points</span>
                        </div>

                        {assignment.description && (
                          <p className="text-sm text-gray-500 line-clamp-2" data-testid={`text-description-${assignment.id}`}>
                            {assignment.description}
                          </p>
                        )}

                        {submission && submission.graded_at && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3" data-testid={`card-grade-${assignment.id}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-700" data-testid={`text-score-label-${assignment.id}`}>Score:</span>
                              <span className="text-lg font-bold text-green-700" data-testid={`text-score-${assignment.id}`}>
                                {submission.score || 0}/{assignment.total_marks}
                              </span>
                            </div>
                            {submission.feedback && (
                              <p className="text-xs text-gray-600 mt-2" data-testid={`text-feedback-${assignment.id}`}>
                                {submission.feedback}
                              </p>
                            )}
                          </div>
                        )}

                        {submission && !submission.graded_at && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3" data-testid={`card-submission-${assignment.id}`}>
                            <p className="text-sm text-blue-700" data-testid={`text-submitted-at-${assignment.id}`}>
                              Submitted on {format(parseISO(submission.submitted_at), 'MMM dd, yyyy')}
                            </p>
                            {submission.is_late && (
                              <Badge variant="destructive" className="mt-2 text-xs" data-testid={`badge-late-${assignment.id}`}>
                                Late Submission
                              </Badge>
                            )}
                          </div>
                        )}

                        {!submission && status !== 'Overdue' && (
                          <Dialog open={isSubmitDialogOpen && selectedAssignment?.id === assignment.id} onOpenChange={(open) => {
                            setIsSubmitDialogOpen(open);
                            if (!open) {
                              setSelectedAssignment(null);
                              setSubmissionText("");
                              setSelectedFiles(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full mt-2" 
                                onClick={() => setSelectedAssignment(assignment)}
                                data-testid={`button-submit-${assignment.id}`}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Submit Assignment
                              </Button>
                            </DialogTrigger>
                            <DialogContent data-testid="dialog-submit">
                              <DialogHeader>
                                <DialogTitle data-testid="text-dialog-title">Submit Assignment</DialogTitle>
                                <DialogDescription data-testid="text-dialog-description">
                                  Submit your work for: {selectedAssignment?.assessment_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="submission-text" data-testid="label-submission-text">
                                    Your Answer/Solution *
                                  </Label>
                                  <Textarea
                                    id="submission-text"
                                    placeholder="Type your answer or solution here..."
                                    value={submissionText}
                                    onChange={(e) => setSubmissionText(e.target.value)}
                                    className="min-h-[200px]"
                                    data-testid="textarea-submission"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="file-upload" data-testid="label-file-upload">
                                    Attach Files (Optional)
                                  </Label>
                                  <Input
                                    id="file-upload"
                                    type="file"
                                    multiple
                                    onChange={(e) => setSelectedFiles(e.target.files)}
                                    data-testid="input-file-upload"
                                  />
                                  <p className="text-xs text-gray-500" data-testid="text-file-help">
                                    Upload documents, images, or other relevant files
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsSubmitDialogOpen(false);
                                    setSelectedAssignment(null);
                                    setSubmissionText("");
                                    setSelectedFiles(null);
                                  }}
                                  data-testid="button-cancel"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSubmit}
                                  disabled={submitAssignmentMutation.isPending || !submissionText.trim()}
                                  data-testid="button-confirm-submit"
                                >
                                  {submitAssignmentMutation.isPending ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Submit
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {submission && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-2"
                            onClick={() => {
                              toast({
                                title: "Submission Details",
                                description: submission.submission_text || "No text submission",
                              });
                            }}
                            data-testid={`button-view-submission-${assignment.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Submission
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
