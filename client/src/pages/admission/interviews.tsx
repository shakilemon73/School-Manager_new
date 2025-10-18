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
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import {
  Plus,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Calendar,
  Star,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdmissionInterview {
  id: number;
  application_id?: number;
  student_id: number;
  interview_date: string;
  interview_time: string;
  panel_members?: string[];
  venue?: string;
  duration_minutes?: number;
  rating?: number;
  feedback?: string;
  strengths?: string;
  weaknesses?: string;
  recommendation: string;
  interviewer_id?: number;
  interviewer_name?: string;
  status: string;
  school_id: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdmissionInterviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    student_id: '',
    interview_date: format(new Date(), 'yyyy-MM-dd'),
    interview_time: '10:00',
    panel_members: '',
    venue: '',
    duration_minutes: 30,
    rating: 5,
    feedback: '',
    strengths: '',
    weaknesses: '',
    recommendation: 'pending',
    interviewer_name: '',
    status: 'scheduled',
  });

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ['/api/admission-interviews', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_interviews')
        .select('*')
        .eq('school_id', schoolId)
        .order('interview_date', { ascending: false });

      if (error) throw error;
      return data as AdmissionInterview[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students-list', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, student_id')
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newInterview: any) => {
      const panelMembers = newInterview.panel_members
        ? newInterview.panel_members.split(',').map((m: string) => m.trim())
        : [];

      const { data, error } = await supabase
        .from('admission_interviews')
        .insert([{
          ...newInterview,
          student_id: parseInt(newInterview.student_id),
          panel_members: panelMembers,
          school_id: schoolId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-interviews'] });
      toast({ title: 'সফল', description: 'সাক্ষাৎকার শিডিউল করা হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data, error } = await supabase
        .from('admission_interviews')
        .update({ status })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-interviews'] });
      toast({ title: 'সফল', description: 'অবস্থা আপডেট হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('admission_interviews')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admission-interviews'] });
      toast({ title: 'সফল', description: 'সাক্ষাৎকার মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      interview_date: format(new Date(), 'yyyy-MM-dd'),
      interview_time: '10:00',
      panel_members: '',
      venue: '',
      duration_minutes: 30,
      rating: 5,
      feedback: '',
      strengths: '',
      weaknesses: '',
      recommendation: 'pending',
      interviewer_name: '',
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
      case 'completed':
        return <Badge className="bg-green-500" data-testid={`badge-status-completed`}>সম্পন্ন</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>বাতিল</Badge>;
      case 'rescheduled':
        return <Badge className="bg-orange-500" data-testid={`badge-status-rescheduled`}>পুনঃনির্ধারিত</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'recommended':
        return <Badge className="bg-green-500"><ThumbsUp className="w-3 h-3 mr-1" />সুপারিশকৃত</Badge>;
      case 'not_recommended':
        return <Badge variant="destructive"><ThumbsDown className="w-3 h-3 mr-1" />সুপারিশ না</Badge>;
      case 'on_hold':
        return <Badge className="bg-orange-500">অপেক্ষমান</Badge>;
      case 'pending':
        return <Badge variant="outline">বিবেচনাধীন</Badge>;
      default:
        return <Badge variant="secondary">{recommendation}</Badge>;
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = searchText === '' ||
      interview.interviewer_name?.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || interview.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === 'scheduled').length,
    completed: interviews.filter(i => i.status === 'completed').length,
    recommended: interviews.filter(i => i.recommendation === 'recommended').length,
    recommendedPercentage: interviews.filter(i => i.status === 'completed').length > 0
      ? ((interviews.filter(i => i.recommendation === 'recommended').length / interviews.filter(i => i.status === 'completed').length) * 100).toFixed(1)
      : '0',
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              ভর্তি সাক্ষাৎকার ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              ভর্তি সাক্ষাৎকার শিডিউল এবং মূল্যায়ন করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-interview">
                <Plus className="w-4 h-4 mr-2" />
                নতুন সাক্ষাৎকার
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন সাক্ষাৎকার শিডিউল করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_id">শিক্ষার্থী *</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  >
                    <SelectTrigger data-testid="select-student">
                      <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name} ({student.student_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interview_date">সাক্ষাৎকারের তারিখ *</Label>
                    <Input
                      id="interview_date"
                      data-testid="input-interview-date"
                      type="date"
                      value={formData.interview_date}
                      onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="interview_time">সময় *</Label>
                    <Input
                      id="interview_time"
                      data-testid="input-interview-time"
                      type="time"
                      value={formData.interview_time}
                      onChange={(e) => setFormData({ ...formData, interview_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="panel_members">প্যানেল সদস্য (কমা দিয়ে আলাদা করুন)</Label>
                  <Input
                    id="panel_members"
                    data-testid="input-panel-members"
                    value={formData.panel_members}
                    onChange={(e) => setFormData({ ...formData, panel_members: e.target.value })}
                    placeholder="যেমন: জনাব আহমেদ, মিসেস রহমান"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="venue">স্থান</Label>
                    <Input
                      id="venue"
                      data-testid="input-venue"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_minutes">সময়কাল (মিনিট)</Label>
                    <Input
                      id="duration_minutes"
                      data-testid="input-duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="interviewer_name">সাক্ষাৎকারকারী</Label>
                  <Input
                    id="interviewer_name"
                    data-testid="input-interviewer-name"
                    value={formData.interviewer_name}
                    onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="rating">রেটিং (0-10)</Label>
                  <Input
                    id="rating"
                    data-testid="input-rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="feedback">মতামত</Label>
                  <Textarea
                    id="feedback"
                    data-testid="input-feedback"
                    value={formData.feedback}
                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strengths">শক্তি</Label>
                    <Textarea
                      id="strengths"
                      data-testid="input-strengths"
                      value={formData.strengths}
                      onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weaknesses">দুর্বলতা</Label>
                    <Textarea
                      id="weaknesses"
                      data-testid="input-weaknesses"
                      value={formData.weaknesses}
                      onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recommendation">সুপারিশ *</Label>
                    <Select
                      value={formData.recommendation}
                      onValueChange={(value) => setFormData({ ...formData, recommendation: value })}
                    >
                      <SelectTrigger data-testid="select-recommendation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">বিবেচনাধীন</SelectItem>
                        <SelectItem value="recommended">সুপারিশকৃত</SelectItem>
                        <SelectItem value="not_recommended">সুপারিশ না</SelectItem>
                        <SelectItem value="on_hold">অপেক্ষমান</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="completed">সম্পন্ন</SelectItem>
                        <SelectItem value="cancelled">বাতিল</SelectItem>
                        <SelectItem value="rescheduled">পুনঃনির্ধারিত</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              <CardTitle className="text-sm font-medium">মোট সাক্ষাৎকার</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-interviews">{stats.total}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-scheduled">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">নির্ধারিত</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-scheduled-interviews">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সম্পন্ন</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-interviews">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-recommended">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সুপারিশকৃত</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-recommended-percentage">{stats.recommendedPercentage}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>সাক্ষাৎকারের তালিকা</CardTitle>
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
                <TabsTrigger value="completed" data-testid="tab-completed">সম্পন্ন</TabsTrigger>
                <TabsTrigger value="cancelled" data-testid="tab-cancelled">বাতিল</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8" data-testid="loading-state">লোড হচ্ছে...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ ও সময়</TableHead>
                        <TableHead>প্যানেল সদস্য</TableHead>
                        <TableHead>স্থান</TableHead>
                        <TableHead>সময়কাল</TableHead>
                        <TableHead>রেটিং</TableHead>
                        <TableHead>সুপারিশ</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInterviews.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center" data-testid="empty-state">
                            কোন সাক্ষাৎকার পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInterviews.map((interview) => (
                          <TableRow key={interview.id} data-testid={`row-interview-${interview.id}`}>
                            <TableCell>
                              {format(new Date(interview.interview_date), 'dd MMM yyyy')}
                              <br />
                              <span className="text-sm text-muted-foreground">{interview.interview_time}</span>
                            </TableCell>
                            <TableCell>
                              {interview.panel_members && interview.panel_members.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {interview.panel_members.slice(0, 2).map((member, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {member}
                                    </Badge>
                                  ))}
                                  {interview.panel_members.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{interview.panel_members.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{interview.venue || '-'}</TableCell>
                            <TableCell>{interview.duration_minutes || 30} মিনিট</TableCell>
                            <TableCell>
                              {interview.rating ? (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span>{interview.rating}/10</span>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{getRecommendationBadge(interview.recommendation)}</TableCell>
                            <TableCell>{getStatusBadge(interview.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(interview.id)}
                                  data-testid={`button-delete-${interview.id}`}
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
