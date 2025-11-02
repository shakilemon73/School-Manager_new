import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft,
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  AlertCircle
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface LeaveApplication {
  id: number;
  staff_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_remarks?: string;
  school_id: number;
  created_at: string;
}

export default function StaffLeave() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Get staff profile
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('schoolId', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  const staffId = staffProfile?.id;

  // Get leave applications
  const { data: leaveApplications, isLoading } = useQuery<LeaveApplication[]>({
    queryKey: ['staff-leave-applications', staffId, schoolId],
    queryFn: async () => {
      if (!staffId || !schoolId) return [];
      
      const { data, error } = await supabase
        .from('staff_leave')
        .select('*')
        .eq('staff_id', staffId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('No leave applications found');
        return [];
      }
      
      return data;
    },
    enabled: !!staffId && !!schoolId,
  });

  // Calculate leave stats
  const leaveStats = {
    total: 20,
    used: leaveApplications?.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.days, 0) || 3,
    pending: leaveApplications?.filter(l => l.status === 'pending').reduce((sum, l) => sum + l.days, 0) || 1,
  };
  leaveStats.remaining = leaveStats.total - leaveStats.used - leaveStats.pending;

  // Submit leave application
  const submitLeaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('staff_leave')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-leave-applications', staffId, schoolId] });
      toast({
        title: "Success! / সফল!",
        description: "Leave application submitted successfully / ছুটির আবেদন সফলভাবে জমা দেওয়া হয়েছে",
      });
      setShowForm(false);
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit leave application",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leaveType || !startDate || !endDate || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    submitLeaveMutation.mutate({
      staff_id: staffId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      reason,
      status: 'pending',
      school_id: schoolId,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-page-title">
                  Leave Management / ছুটি ব্যবস্থাপনা
                </h1>
              </div>
            </div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-green-600 to-teal-600"
              data-testid="button-apply-leave"
            >
              <Plus className="h-4 w-4 mr-2" />
              Apply Leave / ছুটির আবেদন
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leave Application Form */}
            {showForm && (
              <Card className="shadow-xl border-2 border-green-200" data-testid="card-leave-form">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                  <CardTitle data-testid="text-form-title">
                    New Leave Application / নতুন ছুটির আবেদন
                  </CardTitle>
                  <CardDescription className="text-green-100" data-testid="text-form-description">
                    Fill in the details below
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Leave Type / ছুটির ধরন *
                      </label>
                      <Select value={leaveType} onValueChange={setLeaveType} required>
                        <SelectTrigger data-testid="select-leave-type">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual" data-testid="option-casual">Casual Leave / নৈমিত্তিক ছুটি</SelectItem>
                          <SelectItem value="sick" data-testid="option-sick">Sick Leave / অসুস্থতার ছুটি</SelectItem>
                          <SelectItem value="annual" data-testid="option-annual">Annual Leave / বার্ষিক ছুটি</SelectItem>
                          <SelectItem value="emergency" data-testid="option-emergency">Emergency Leave / জরুরি ছুটি</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Start Date / শুরুর তারিখ *
                        </label>
                        <Input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          data-testid="input-start-date"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          End Date / শেষ তারিখ *
                        </label>
                        <Input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Reason / কারণ *
                      </label>
                      <Textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a reason for your leave..."
                        rows={4}
                        required
                        data-testid="textarea-reason"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-green-600 to-teal-600"
                        disabled={submitLeaveMutation.isPending}
                        data-testid="button-submit"
                      >
                        {submitLeaveMutation.isPending ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Leave Applications List */}
            <Card className="shadow-xl" data-testid="card-leave-list">
              <CardHeader>
                <CardTitle data-testid="text-list-title">
                  My Leave Applications / আমার ছুটির আবেদন
                </CardTitle>
                <CardDescription data-testid="text-list-description">
                  View all your leave applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" data-testid="loading-spinner"></div>
                    </div>
                  ) : leaveApplications && leaveApplications.length === 0 ? (
                    <div className="text-center py-12" data-testid="empty-state">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No leave applications yet
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Click "Apply Leave" to submit your first application
                      </p>
                    </div>
                  ) : (
                    leaveApplications?.map((leave) => (
                      <div 
                        key={leave.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                        data-testid={`leave-${leave.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-full ${getStatusColor(leave.status)} bg-opacity-20`}>
                              {getStatusIcon(leave.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                                </h3>
                                <Badge className={getStatusColor(leave.status)}>
                                  {leave.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {format(parseISO(leave.start_date), 'MMM dd, yyyy')} - {format(parseISO(leave.end_date), 'MMM dd, yyyy')}
                                <span className="ml-2">({leave.days} days)</span>
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                <FileText className="h-3 w-3 inline mr-1" />
                                {leave.reason}
                              </p>
                              {leave.approver_remarks && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                  Remarks: {leave.approver_remarks}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leave Balance */}
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-leave-balance">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-balance-title">
                  Leave Balance / ছুটির ব্যালেন্স
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4">
                    <span className="text-3xl font-bold text-green-600" data-testid="text-remaining">
                      {leaveStats.remaining}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Days Remaining / অবশিষ্ট দিন
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</span>
                    <span className="font-semibold" data-testid="text-total">{leaveStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Used</span>
                    <span className="font-semibold text-green-600" data-testid="text-used">
                      {leaveStats.used}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-600">Pending</span>
                    <span className="font-semibold text-yellow-600" data-testid="text-pending">
                      {leaveStats.pending}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leave Guidelines */}
            <Card className="shadow-xl" data-testid="card-guidelines">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-guidelines-title">
                  Guidelines / নির্দেশিকা
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Apply for leave at least 3 days in advance</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Emergency leave requires supervisor approval</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Maximum 5 consecutive days for casual leave</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
