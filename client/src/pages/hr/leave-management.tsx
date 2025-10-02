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
import { Switch } from '@/components/ui/switch';
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
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { Plus, Calendar, Check, X, Clock, Search, Users, Settings, TrendingUp } from 'lucide-react';
import { LeaveApplication, LeaveType, LeaveBalance } from '@/lib/new-features-types';
import { format } from 'date-fns';

export default function LeaveManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    applicant_type: 'teacher',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  
  const [leaveTypeData, setLeaveTypeData] = useState({
    leave_name: '',
    leave_name_bn: '',
    max_days_per_year: '',
    is_paid: true,
    requires_approval: true,
  });

  const getCurrentSchoolId = async (): Promise<number> => {
    try {
      const schoolId = await userProfile.getCurrentUserSchoolId();
      if (!schoolId) throw new Error('User school ID not found');
      return schoolId;
    } catch (error) {
      console.error('❌ Failed to get user school ID:', error);
      throw new Error('Authentication required');
    }
  };

  // Fetch leave applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/leave-applications'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types (leave_name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['/api/leave-types'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as LeaveType[];
    }
  });

  // Fetch leave balances
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['/api/leave-balances'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          leave_types (leave_name)
        `)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch staff for balance tracking
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Create leave application
  const createMutation = useMutation({
    mutationFn: async (newApplication: any) => {
      const schoolId = await getCurrentSchoolId();
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
          school_id: schoolId,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-applications'] });
      toast({ title: 'সফল', description: 'ছুটির আবেদন জমা হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Create leave type
  const createTypeMutation = useMutation({
    mutationFn: async (newType: any) => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('leave_types')
        .insert([{ ...newType, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-types'] });
      toast({ title: 'সফল', description: 'ছুটির ধরন যোগ করা হয়েছে' });
      setIsTypeDialogOpen(false);
      resetTypeForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Update status
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
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances'] });
      toast({ title: 'সফল', description: 'অবস্থা আপডেট হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
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

  const resetTypeForm = () => {
    setLeaveTypeData({
      leave_name: '',
      leave_name_bn: '',
      max_days_per_year: '',
      is_paid: true,
      requires_approval: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTypeMutation.mutate(leaveTypeData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50" data-testid={`badge-status-pending`}>অপেক্ষমাণ</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-500" data-testid={`badge-status-approved`}>অনুমোদিত</Badge>;
      case 'rejected': return <Badge variant="destructive" data-testid={`badge-status-rejected`}>প্রত্যাখ্যাত</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchText === '' || 
      app.leave_types?.leave_name.toLowerCase().includes(searchText.toLowerCase()) ||
      app.reason.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ছুটি ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              কর্মচারীদের ছুটির আবেদন পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-apply-leave">
                <Plus className="w-4 h-4 mr-2" />
                ছুটির আবেদন
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>নতুন ছুটির আবেদন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="applicant_type">আবেদনকারীর ধরন</Label>
                  <Select
                    value={formData.applicant_type}
                    onValueChange={(value) => setFormData({ ...formData, applicant_type: value })}
                  >
                    <SelectTrigger data-testid="select-applicant-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">শিক্ষক</SelectItem>
                      <SelectItem value="staff">কর্মচারী</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leave_type_id">ছুটির ধরন *</Label>
                  <Select
                    value={formData.leave_type_id}
                    onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
                  >
                    <SelectTrigger data-testid="select-leave-type">
                      <SelectValue placeholder="ছুটির ধরন নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.leave_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">শুরুর তারিখ *</Label>
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
                    <Label htmlFor="end_date">শেষ তারিখ *</Label>
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
                  <Label htmlFor="reason">কারণ *</Label>
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
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                    জমা দিন
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট আবেদন</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অপেক্ষমাণ</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অনুমোদিত</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-approved">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">প্রত্যাখ্যাত</CardTitle>
              <X className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-rejected">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="আবেদন অনুসন্ধান করুন..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all">সকল ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">অপেক্ষমাণ ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">অনুমোদিত ({stats.approved})</TabsTrigger>
            <TabsTrigger value="balances" data-testid="tab-balances">ছুটির ব্যালেন্স</TabsTrigger>
            <TabsTrigger value="types" data-testid="tab-types">ছুটির ধরন</TabsTrigger>
          </TabsList>

          {/* Applications Tabs */}
          {['all', 'pending', 'approved', 'rejected'].includes(activeTab) && (
            <TabsContent value={activeTab} className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ছুটির ধরন</TableHead>
                          <TableHead>তারিখ</TableHead>
                          <TableHead>দিন</TableHead>
                          <TableHead>কারণ</TableHead>
                          <TableHead>অবস্থা</TableHead>
                          <TableHead className="text-right">কার্যক্রম</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              লোড হচ্ছে...
                            </TableCell>
                          </TableRow>
                        ) : filteredApplications.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              কোন আবেদন পাওয়া যায়নি
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredApplications.map((application) => (
                            <TableRow key={application.id} data-testid={`row-application-${application.id}`}>
                              <TableCell className="font-medium">
                                {application.leave_types?.leave_name}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {format(new Date(application.start_date), 'dd MMM')} - {format(new Date(application.end_date), 'dd MMM yyyy')}
                                </div>
                              </TableCell>
                              <TableCell>{application.total_days} দিন</TableCell>
                              <TableCell>
                                <div className="max-w-[200px] truncate" title={application.reason}>
                                  {application.reason}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(application.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                {application.status === 'pending' && (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600"
                                      data-testid={`button-approve-${application.id}`}
                                      onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'approved' })}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600"
                                      data-testid={`button-reject-${application.id}`}
                                      onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'rejected' })}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Leave Balances Tab */}
          <TabsContent value="balances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  ছুটির ব্যালেন্স
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী</TableHead>
                        <TableHead>ছুটির ধরন</TableHead>
                        <TableHead>বরাদ্দকৃত</TableHead>
                        <TableHead>ব্যবহৃত</TableHead>
                        <TableHead>অবশিষ্ট</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveBalances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            কোনো ছুটির ব্যালেন্স পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaveBalances.map((balance) => {
                          const staff = staffMembers.find(s => s.id === balance.user_id);
                          return (
                            <TableRow key={balance.id} data-testid={`row-balance-${balance.id}`}>
                              <TableCell>
                                {staff ? (
                                  <div>
                                    <div className="font-medium">{staff.name}</div>
                                    <div className="text-sm text-muted-foreground">{staff.staff_id}</div>
                                  </div>
                                ) : `User #${balance.user_id}`}
                              </TableCell>
                              <TableCell>{balance.leave_types?.leave_name}</TableCell>
                              <TableCell>{balance.total_allocated || 0}</TableCell>
                              <TableCell className="text-orange-600">{balance.used_days || 0}</TableCell>
                              <TableCell className="text-green-600 font-medium">{balance.remaining_days || 0}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Types Management Tab */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    ছুটির ধরন
                  </CardTitle>
                  <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-leave-type">
                        <Plus className="w-4 h-4 mr-2" />
                        নতুন ধরন
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>নতুন ছুটির ধরন যোগ করুন</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleTypeSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="leave_name">ছুটির নাম *</Label>
                          <Input
                            value={leaveTypeData.leave_name}
                            onChange={(e) => setLeaveTypeData({ ...leaveTypeData, leave_name: e.target.value })}
                            required
                            data-testid="input-leave-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="leave_name_bn">বাংলা নাম</Label>
                          <Input
                            value={leaveTypeData.leave_name_bn}
                            onChange={(e) => setLeaveTypeData({ ...leaveTypeData, leave_name_bn: e.target.value })}
                            data-testid="input-leave-name-bn"
                          />
                        </div>
                        <div>
                          <Label htmlFor="max_days_per_year">বছরে সর্বোচ্চ দিন</Label>
                          <Input
                            type="number"
                            value={leaveTypeData.max_days_per_year}
                            onChange={(e) => setLeaveTypeData({ ...leaveTypeData, max_days_per_year: e.target.value })}
                            data-testid="input-max-days"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="is_paid">বেতনসহ ছুটি</Label>
                          <Switch
                            checked={leaveTypeData.is_paid}
                            onCheckedChange={(checked) => setLeaveTypeData({ ...leaveTypeData, is_paid: checked })}
                            data-testid="switch-is-paid"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="requires_approval">অনুমোদন প্রয়োজন</Label>
                          <Switch
                            checked={leaveTypeData.requires_approval}
                            onCheckedChange={(checked) => setLeaveTypeData({ ...leaveTypeData, requires_approval: checked })}
                            data-testid="switch-requires-approval"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
                            বাতিল
                          </Button>
                          <Button type="submit" disabled={createTypeMutation.isPending} data-testid="button-submit-type">
                            {createTypeMutation.isPending ? 'যোগ করা হচ্ছে...' : 'যোগ করুন'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaveTypes.map((type) => (
                    <Card key={type.id} data-testid={`card-leave-type-${type.id}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{type.leave_name}</CardTitle>
                        {type.leave_name_bn && (
                          <p className="text-sm text-muted-foreground">{type.leave_name_bn}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">সর্বোচ্চ দিন:</span>
                          <span className="font-medium">{type.max_days_per_year || 'সীমাহীন'}</span>
                        </div>
                        <div className="flex gap-2">
                          {type.is_paid && (
                            <Badge variant="outline" className="text-green-600">বেতনসহ</Badge>
                          )}
                          {type.requires_approval && (
                            <Badge variant="outline" className="text-blue-600">অনুমোদন প্রয়োজন</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
