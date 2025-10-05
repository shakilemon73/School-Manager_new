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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Users,
  Calendar,
  Award,
  TrendingUp,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdmissionTest {
  id: number;
  session_id?: number;
  test_name: string;
  test_name_bn?: string;
  test_date: string;
  test_time: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  subjects?: string[];
  venue?: string;
  instructions?: string;
  student_id?: number;
  score?: number;
  obtained_marks?: number;
  percentage?: number;
  rank?: number;
  status: string;
  school_id: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdmissionTestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTest, setSelectedTest] = useState<AdmissionTest | null>(null);
  const [formData, setFormData] = useState({
    test_name: '',
    test_name_bn: '',
    test_date: format(new Date(), 'yyyy-MM-dd'),
    test_time: '10:00',
    duration_minutes: 120,
    total_marks: 100,
    pass_marks: 40,
    subjects: '',
    venue: '',
    instructions: '',
    status: 'scheduled',
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

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['/api/admission-tests'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('admission_tests')
        .select('*')
        .eq('school_id', schoolId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      return data as AdmissionTest[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTest: any) => {
      const schoolId = await getCurrentSchoolId();
      const subjects = newTest.subjects ? newTest.subjects.split(',').map((s: string) => s.trim()) : [];

      const { data, error } = await supabase
        .from('admission_tests')
        .insert([{
          ...newTest,
          subjects,
          school_id: schoolId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-tests'] });
      toast({ title: 'সফল', description: 'পরীক্ষা তৈরি হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const subjects = updates.subjects ? 
        (typeof updates.subjects === 'string' ? updates.subjects.split(',').map((s: string) => s.trim()) : updates.subjects) 
        : [];

      const { data, error } = await supabase
        .from('admission_tests')
        .update({ ...updates, subjects })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-tests'] });
      toast({ title: 'সফল', description: 'পরীক্ষা আপডেট হয়েছে' });
      setSelectedTest(null);
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('admission_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-tests'] });
      toast({ title: 'সফল', description: 'পরীক্ষা মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      test_name: '',
      test_name_bn: '',
      test_date: format(new Date(), 'yyyy-MM-dd'),
      test_time: '10:00',
      duration_minutes: 120,
      total_marks: 100,
      pass_marks: 40,
      subjects: '',
      venue: '',
      instructions: '',
      status: 'scheduled',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500" data-testid={`badge-status-scheduled`}>নির্ধারিত</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-500" data-testid={`badge-status-in-progress`}>চলমান</Badge>;
      case 'completed':
        return <Badge className="bg-green-500" data-testid={`badge-status-completed`}>সম্পন্ন</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>বাতিল</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = searchText === '' ||
      test.test_name.toLowerCase().includes(searchText.toLowerCase()) ||
      test.test_name_bn?.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || test.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: tests.length,
    scheduled: tests.filter(t => t.status === 'scheduled').length,
    completed: tests.filter(t => t.status === 'completed').length,
    averageScore: tests.filter(t => t.percentage).length > 0
      ? (tests.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0) / tests.filter(t => t.percentage).length).toFixed(2)
      : '0',
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ভর্তি পরীক্ষা ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              ভর্তি পরীক্ষা তৈরি, পরিচালনা এবং ফলাফল ট্র্যাক করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-test">
                <Plus className="w-4 h-4 mr-2" />
                নতুন পরীক্ষা
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন ভর্তি পরীক্ষা তৈরি করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test_name">পরীক্ষার নাম (ইংরেজি) *</Label>
                    <Input
                      id="test_name"
                      data-testid="input-test-name"
                      value={formData.test_name}
                      onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="test_name_bn">পরীক্ষার নাম (বাংলা)</Label>
                    <Input
                      id="test_name_bn"
                      data-testid="input-test-name-bn"
                      value={formData.test_name_bn}
                      onChange={(e) => setFormData({ ...formData, test_name_bn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test_date">পরীক্ষার তারিখ *</Label>
                    <Input
                      id="test_date"
                      data-testid="input-test-date"
                      type="date"
                      value={formData.test_date}
                      onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="test_time">সময় *</Label>
                    <Input
                      id="test_time"
                      data-testid="input-test-time"
                      type="time"
                      value={formData.test_time}
                      onChange={(e) => setFormData({ ...formData, test_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="duration_minutes">সময়কাল (মিনিট) *</Label>
                    <Input
                      id="duration_minutes"
                      data-testid="input-duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_marks">মোট নম্বর *</Label>
                    <Input
                      id="total_marks"
                      data-testid="input-total-marks"
                      type="number"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pass_marks">পাস নম্বর *</Label>
                    <Input
                      id="pass_marks"
                      data-testid="input-pass-marks"
                      type="number"
                      value={formData.pass_marks}
                      onChange={(e) => setFormData({ ...formData, pass_marks: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subjects">বিষয়সমূহ (কমা দিয়ে আলাদা করুন)</Label>
                  <Input
                    id="subjects"
                    data-testid="input-subjects"
                    value={formData.subjects}
                    onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                    placeholder="যেমন: গণিত, বাংলা, ইংরেজি"
                  />
                </div>

                <div>
                  <Label htmlFor="venue">পরীক্ষার স্থান</Label>
                  <Input
                    id="venue"
                    data-testid="input-venue"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">নির্দেশনা</Label>
                  <Textarea
                    id="instructions"
                    data-testid="input-instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="status">অবস্থা *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">নির্ধারিত</SelectItem>
                      <SelectItem value="in_progress">চলমান</SelectItem>
                      <SelectItem value="completed">সম্পন্ন</SelectItem>
                      <SelectItem value="cancelled">বাতিল</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট পরীক্ষা</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-tests">{stats.total}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-scheduled">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">নির্ধারিত</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-scheduled-tests">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সম্পন্ন</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-tests">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-average">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">গড় স্কোর</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-average-score">{stats.averageScore}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>পরীক্ষার তালিকা</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="খুঁজুন..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList data-testid="tabs-status">
                <TabsTrigger value="all" data-testid="tab-all">সকল</TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">নির্ধারিত</TabsTrigger>
                <TabsTrigger value="in_progress" data-testid="tab-in-progress">চলমান</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">সম্পন্ন</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8" data-testid="loading-state">লোড হচ্ছে...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>পরীক্ষার নাম</TableHead>
                        <TableHead>তারিখ ও সময়</TableHead>
                        <TableHead>সময়কাল</TableHead>
                        <TableHead>নম্বর</TableHead>
                        <TableHead>বিষয়সমূহ</TableHead>
                        <TableHead>স্থান</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center" data-testid="empty-state">
                            কোন পরীক্ষা পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTests.map((test) => (
                          <TableRow key={test.id} data-testid={`row-test-${test.id}`}>
                            <TableCell>
                              <div className="font-medium">{test.test_name}</div>
                              {test.test_name_bn && (
                                <div className="text-sm text-muted-foreground">{test.test_name_bn}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(test.test_date), 'dd MMM yyyy')}
                              <br />
                              <span className="text-sm text-muted-foreground">{test.test_time}</span>
                            </TableCell>
                            <TableCell>{test.duration_minutes} মিনিট</TableCell>
                            <TableCell>
                              {test.total_marks} (পাস: {test.pass_marks})
                            </TableCell>
                            <TableCell>
                              {test.subjects && test.subjects.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {test.subjects.slice(0, 2).map((subject, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {subject}
                                    </Badge>
                                  ))}
                                  {test.subjects.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{test.subjects.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{test.venue || '-'}</TableCell>
                            <TableCell>{getStatusBadge(test.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedTest(test)}
                                  data-testid={`button-edit-${test.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(test.id)}
                                  data-testid={`button-delete-${test.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
