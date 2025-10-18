import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { Plus, FileText, CheckCircle, Clock, XCircle, Search, AlertCircle } from 'lucide-react';
import { AdmissionApplication } from '@/lib/new-features-types';
import { format } from 'date-fns';

export default function AdmissionPortalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    student_name: '',
    date_of_birth: '',
    gender: 'male',
    father_name: '',
    mother_name: '',
    guardian_phone: '',
    guardian_email: '',
    address: '',
    previous_school: '',
    previous_class: '',
    desired_class: '',
  });

  // Fetch applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/admission-applications', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdmissionApplication[];
    }
  });

  // Create application
  const createMutation = useMutation({
    mutationFn: async (newApplication: any) => {
      const appNumber = `APP${Date.now().toString().slice(-8)}`;
      
      const { data, error } = await supabase
        .from('admission_applications')
        .insert([{
          ...newApplication,
          application_number: appNumber,
          session_id: 1,
          school_id: schoolId,
          application_status: 'submitted',
          payment_status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-applications'] });
      toast({ title: 'সফল', description: 'আবেদন সফলভাবে জমা হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      student_name: '',
      date_of_birth: '',
      gender: 'male',
      father_name: '',
      mother_name: '',
      guardian_phone: '',
      guardian_email: '',
      address: '',
      previous_school: '',
      previous_class: '',
      desired_class: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge variant="outline" className="bg-yellow-50">জমা দেওয়া</Badge>;
      case 'under_review': return <Badge variant="outline" className="bg-blue-50">পর্যালোচনা</Badge>;
      case 'accepted': return <Badge variant="default" className="bg-green-500">গৃহীত</Badge>;
      case 'rejected': return <Badge variant="destructive">প্রত্যাখ্যাত</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchText === '' || 
      app.student_name.toLowerCase().includes(searchText.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || app.application_status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.application_status === 'submitted').length,
    underReview: applications.filter(a => a.application_status === 'under_review').length,
    accepted: applications.filter(a => a.application_status === 'accepted').length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ভর্তি পোর্টাল
            </h1>
            <p className="text-muted-foreground mt-1">
              ভর্তির আবেদন পরিচালনা ও ট্র্যাক করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-application">
                <Plus className="w-4 h-4 mr-2" />
                নতুন আবেদন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন ভর্তির আবেদন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="student_name">শিক্ষার্থীর নাম *</Label>
                    <Input
                      id="student_name"
                      data-testid="input-student-name"
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">জন্ম তারিখ *</Label>
                    <Input
                      id="date_of_birth"
                      data-testid="input-dob"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">লিঙ্গ *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">পুরুষ</SelectItem>
                        <SelectItem value="female">মহিলা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="desired_class">কাঙ্ক্ষিত শ্রেণী *</Label>
                    <Input
                      id="desired_class"
                      data-testid="input-desired-class"
                      value={formData.desired_class}
                      onChange={(e) => setFormData({ ...formData, desired_class: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="father_name">পিতার নাম *</Label>
                    <Input
                      id="father_name"
                      data-testid="input-father-name"
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mother_name">মাতার নাম *</Label>
                    <Input
                      id="mother_name"
                      data-testid="input-mother-name"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_phone">ফোন নম্বর *</Label>
                    <Input
                      id="guardian_phone"
                      data-testid="input-phone"
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_email">ইমেইল</Label>
                    <Input
                      id="guardian_email"
                      data-testid="input-email"
                      type="email"
                      value={formData.guardian_email}
                      onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">ঠিকানা *</Label>
                  <Input
                    id="address"
                    data-testid="input-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                    আবেদন জমা দিন
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট আবেদন</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">জমা দেওয়া</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.submitted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">পর্যালোচনা</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.underReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">গৃহীত</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="আবেদন নম্বর বা নাম দিয়ে অনুসন্ধান করুন..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">সকল ({stats.total})</TabsTrigger>
            <TabsTrigger value="submitted">জমা ({stats.submitted})</TabsTrigger>
            <TabsTrigger value="under_review">পর্যালোচনা ({stats.underReview})</TabsTrigger>
            <TabsTrigger value="accepted">গৃহীত ({stats.accepted})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>আবেদন নম্বর</TableHead>
                      <TableHead>শিক্ষার্থীর নাম</TableHead>
                      <TableHead>শ্রেণী</TableHead>
                      <TableHead>আবেদনের তারিখ</TableHead>
                      <TableHead>পেমেন্ট</TableHead>
                      <TableHead>অবস্থা</TableHead>
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
                      filteredApplications.map((app) => (
                        <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                          <TableCell className="font-medium" data-testid={`text-app-number-${app.id}`}>
                            {app.application_number}
                          </TableCell>
                          <TableCell>{app.student_name}</TableCell>
                          <TableCell>{app.desired_class}</TableCell>
                          <TableCell>
                            {format(new Date(app.created_at), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            {app.payment_status === 'paid' ? (
                              <Badge variant="default">পরিশোধিত</Badge>
                            ) : (
                              <Badge variant="outline">অপেক্ষমাণ</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(app.application_status || 'submitted')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
