import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Check, X, Clock } from 'lucide-react';
import { LeaveApplication, LeaveType } from '@/lib/new-features-types';
import { format } from 'date-fns';

export default function LeaveManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    applicant_type: 'teacher',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Fetch leave applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['/api/leave-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types (leave_name)
        `)
        .eq('school_id', 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch leave types
  const { data: leaveTypes } = useQuery({
    queryKey: ['/api/leave-types'],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('leave_types')
        .select('*')
        .eq('school_id', 1);
      
      if (error) throw error;
      return data as LeaveType[];
    }
  });

  // Create leave application mutation
  const createMutation = useMutation({
    mutationFn: async (newApplication: any) => {
      const totalDays = Math.ceil(
        (new Date(newApplication.end_date).getTime() - new Date(newApplication.start_date).getTime()) 
        / (1000 * 60 * 60 * 24)
      ) + 1;

      const { data, error } = await supabase
        .from('leave_applications')
        .insert([{
          ...newApplication,
          applicant_id: 1,
          total_days: totalDays,
          school_id: 1,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-applications'] });
      toast({ title: 'Success', description: 'Leave application submitted successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Approve/Reject leave mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data, error } = await supabase
        .from('leave_applications')
        .update({ 
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-applications'] });
      toast({ title: 'Success', description: 'Leave status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      applicant_type: 'teacher',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage staff leave applications</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="applicant_type">Applicant Type</Label>
                <Select
                  value={formData.applicant_type}
                  onValueChange={(value) => setFormData({ ...formData, applicant_type: value })}
                >
                  <SelectTrigger data-testid="select-applicant-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="leave_type_id">Leave Type *</Label>
                <Select
                  value={formData.leave_type_id}
                  onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
                >
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.leave_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    data-testid="input-start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    data-testid="input-end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  data-testid="input-reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                  Submit Application
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {applications?.map((application) => (
          <Card key={application.id} data-testid={`card-application-${application.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span>{application.leave_types?.leave_name}</span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(application.status)}`}>
                      {application.status}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {application.applicant_type}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {application.total_days} days
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {application.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        data-testid={`button-approve-${application.id}`}
                        onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'approved' })}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        data-testid={`button-reject-${application.id}`}
                        onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'rejected' })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {format(new Date(application.start_date), 'MMM dd, yyyy')} - 
                    {format(new Date(application.end_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{application.reason}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {applications?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No leave applications</p>
            <p className="text-sm">Click "Apply for Leave" to submit a leave request</p>
          </div>
        )}
      </div>
    </div>
  );
}
