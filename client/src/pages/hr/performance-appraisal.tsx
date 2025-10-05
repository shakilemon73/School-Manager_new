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
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { 
  Plus, 
  Star,
  Award,
  TrendingUp,
  Search,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  Target,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  name_in_bangla?: string;
  department?: string;
  designation?: string;
}

interface AppraisalCriteria {
  id: number;
  name: string;
  name_bn?: string;
  description?: string;
  category: string;
  max_score: number;
  weightage: string;
  is_active: boolean;
}

interface Appraisal {
  id: number;
  staff_id: number;
  appraisal_period: string;
  review_date: string;
  scores: any;
  total_score?: string;
  percentage?: string;
  grade?: string;
  strengths?: string;
  areas_of_improvement?: string;
  goals?: string;
  reviewer_id?: number;
  reviewer_name?: string;
  status: string;
  staff?: StaffMember;
}

export default function PerformanceAppraisalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAppraisalDialogOpen, setIsAppraisalDialogOpen] = useState(false);
  const [isCriteriaDialogOpen, setIsCriteriaDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('appraisals');
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [appraisalData, setAppraisalData] = useState({
    staff_id: '',
    appraisal_period: '',
    review_date: format(new Date(), 'yyyy-MM-dd'),
    scores: {} as any,
    strengths: '',
    areas_of_improvement: '',
    goals: '',
    reviewer_name: '',
    status: 'draft',
  });

  const [criteriaData, setCriteriaData] = useState({
    name: '',
    name_bn: '',
    description: '',
    category: 'teaching',
    max_score: 10,
    weightage: '1.0',
    is_active: true,
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
      return data as StaffMember[];
    }
  });

  const { data: criteriaList = [], isLoading: isLoadingCriteria } = useQuery({
    queryKey: ['/api/appraisal-criteria'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('appraisal_criteria')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as AppraisalCriteria[];
    }
  });

  const { data: appraisals = [], isLoading: isLoadingAppraisals } = useQuery({
    queryKey: ['/api/appraisals'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          staff:staff_id (
            id,
            staff_id,
            name,
            name_in_bangla,
            department,
            designation
          )
        `)
        .eq('school_id', schoolId)
        .order('review_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createCriteriaMutation = useMutation({
    mutationFn: async (newCriteria: any) => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('appraisal_criteria')
        .insert([{ ...newCriteria, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appraisal-criteria'] });
      toast({ title: 'সফল', description: 'মূল্যায়ন মানদণ্ড যোগ করা হয়েছে' });
      setIsCriteriaDialogOpen(false);
      resetCriteriaForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const createAppraisalMutation = useMutation({
    mutationFn: async (newAppraisal: any) => {
      const schoolId = await getCurrentSchoolId();
      
      const totalScore = Object.values(newAppraisal.scores).reduce(
        (sum: number, score: any) => sum + parseFloat(score || '0'), 
        0
      );
      
      const maxScore = criteriaList.reduce((sum, c) => sum + c.max_score, 0);
      const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : '0';
      
      let grade = 'F';
      if (parseFloat(percentage) >= 90) grade = 'A+';
      else if (parseFloat(percentage) >= 80) grade = 'A';
      else if (parseFloat(percentage) >= 70) grade = 'B';
      else if (parseFloat(percentage) >= 60) grade = 'C';
      else if (parseFloat(percentage) >= 50) grade = 'D';

      const appraisalRecord = {
        ...newAppraisal,
        total_score: totalScore.toString(),
        percentage,
        grade,
        school_id: schoolId,
      };

      if (selectedAppraisal) {
        const { data, error } = await supabase
          .from('appraisals')
          .update(appraisalRecord)
          .eq('id', selectedAppraisal.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('appraisals')
          .insert([appraisalRecord])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appraisals'] });
      toast({ 
        title: 'সফল', 
        description: selectedAppraisal ? 'মূল্যায়ন আপডেট হয়েছে' : 'মূল্যায়ন তৈরি হয়েছে' 
      });
      setIsAppraisalDialogOpen(false);
      resetAppraisalForm();
      setSelectedAppraisal(null);
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const deleteCriteriaMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('appraisal_criteria')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appraisal-criteria'] });
      toast({ title: 'সফল', description: 'মানদণ্ড মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const deleteAppraisalMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('appraisals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appraisals'] });
      toast({ title: 'সফল', description: 'মূল্যায়ন মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetAppraisalForm = () => {
    setAppraisalData({
      staff_id: '',
      appraisal_period: '',
      review_date: format(new Date(), 'yyyy-MM-dd'),
      scores: {},
      strengths: '',
      areas_of_improvement: '',
      goals: '',
      reviewer_name: '',
      status: 'draft',
    });
  };

  const resetCriteriaForm = () => {
    setCriteriaData({
      name: '',
      name_bn: '',
      description: '',
      category: 'teaching',
      max_score: 10,
      weightage: '1.0',
      is_active: true,
    });
  };

  const handleAppraisalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAppraisalMutation.mutate(appraisalData);
  };

  const handleCriteriaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCriteriaMutation.mutate(criteriaData);
  };

  const handleEditAppraisal = (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setAppraisalData({
      staff_id: appraisal.staff_id.toString(),
      appraisal_period: appraisal.appraisal_period,
      review_date: appraisal.review_date,
      scores: appraisal.scores || {},
      strengths: appraisal.strengths || '',
      areas_of_improvement: appraisal.areas_of_improvement || '',
      goals: appraisal.goals || '',
      reviewer_name: appraisal.reviewer_name || '',
      status: appraisal.status,
    });
    setIsAppraisalDialogOpen(true);
  };

  const getGradeBadge = (grade?: string) => {
    if (!grade) return null;
    const color = grade === 'A+' || grade === 'A' ? 'bg-green-500' :
                  grade === 'B' ? 'bg-blue-500' :
                  grade === 'C' ? 'bg-yellow-500' : 'bg-red-500';
    return <Badge className={color} data-testid={`badge-grade-${grade}`}>{grade}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" data-testid={`badge-status-draft`}>খসড়া</Badge>;
      case 'completed': return <Badge className="bg-green-500" data-testid={`badge-status-completed`}>সম্পন্ন</Badge>;
      case 'in_review': return <Badge className="bg-blue-500" data-testid={`badge-status-in_review`}>পর্যালোচনায়</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredAppraisals = appraisals.filter(app => {
    const matchesSearch = searchText === '' || 
      app.staff?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      app.appraisal_period.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const filteredCriteria = criteriaList.filter(criteria => {
    const matchesSearch = searchText === '' || 
      criteria.name.toLowerCase().includes(searchText.toLowerCase()) ||
      criteria.category.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const calculateStats = () => {
    const totalAppraisals = appraisals.length;
    const completedAppraisals = appraisals.filter(a => a.status === 'completed').length;
    const averageScore = appraisals.length > 0 
      ? (appraisals.reduce((sum, a) => sum + parseFloat(a.percentage || '0'), 0) / appraisals.length).toFixed(1)
      : '0';
    const excellentPerformers = appraisals.filter(a => a.grade === 'A+' || a.grade === 'A').length;

    return { totalAppraisals, completedAppraisals, averageScore, excellentPerformers };
  };

  const stats = calculateStats();

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-page-title">
              কর্মক্ষমতা মূল্যায়ন ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-1">Performance Appraisal Management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">মোট মূল্যায়ন</CardTitle>
              <Award className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-appraisals">{stats.totalAppraisals}</div>
              <p className="text-xs text-gray-600">Total Appraisals</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">সম্পন্ন</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-appraisals">{stats.completedAppraisals}</div>
              <p className="text-xs text-gray-600">Completed</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-average">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">গড় স্কোর</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-average-score">{stats.averageScore}%</div>
              <p className="text-xs text-gray-600">Average Score</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-excellent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">উৎকৃষ্ট কর্মী</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-excellent-performers">{stats.excellentPerformers}</div>
              <p className="text-xs text-gray-600">Excellent (A/A+)</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appraisals" data-testid="tab-appraisals">
              মূল্যায়ন তালিকা
            </TabsTrigger>
            <TabsTrigger value="criteria" data-testid="tab-criteria">
              মূল্যায়ন মানদণ্ড
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appraisals" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>মূল্যায়ন তালিকা (Appraisals List)</CardTitle>
                  <Dialog open={isAppraisalDialogOpen} onOpenChange={setIsAppraisalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-appraisal" onClick={() => {
                        resetAppraisalForm();
                        setSelectedAppraisal(null);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        নতুন মূল্যায়ন
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedAppraisal ? 'মূল্যায়ন সম্পাদনা' : 'নতুন মূল্যায়ন'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAppraisalSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="staff_id">কর্মচারী *</Label>
                            <Select
                              value={appraisalData.staff_id}
                              onValueChange={(value) => setAppraisalData({ ...appraisalData, staff_id: value })}
                              required
                            >
                              <SelectTrigger data-testid="select-staff">
                                <SelectValue placeholder="কর্মচারী নির্বাচন করুন" />
                              </SelectTrigger>
                              <SelectContent>
                                {staffMembers.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id.toString()}>
                                    {staff.name} - {staff.designation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="appraisal_period">মূল্যায়ন সময়কাল *</Label>
                            <Input
                              id="appraisal_period"
                              data-testid="input-appraisal-period"
                              value={appraisalData.appraisal_period}
                              onChange={(e) => setAppraisalData({ ...appraisalData, appraisal_period: e.target.value })}
                              placeholder="যেমন: জানুয়ারি-জুন ২০২৫"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="review_date">পর্যালোচনা তারিখ *</Label>
                            <Input
                              id="review_date"
                              type="date"
                              data-testid="input-review-date"
                              value={appraisalData.review_date}
                              onChange={(e) => setAppraisalData({ ...appraisalData, review_date: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="reviewer_name">পর্যালোচক</Label>
                            <Input
                              id="reviewer_name"
                              data-testid="input-reviewer-name"
                              value={appraisalData.reviewer_name}
                              onChange={(e) => setAppraisalData({ ...appraisalData, reviewer_name: e.target.value })}
                              placeholder="পর্যালোচকের নাম"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="mb-2 block">মূল্যায়ন মানদণ্ড স্কোর</Label>
                          <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-3">
                            {criteriaList.map((criteria) => (
                              <div key={criteria.id} className="flex items-center justify-between gap-2">
                                <Label className="flex-1 text-sm">
                                  {criteria.name} (Max: {criteria.max_score})
                                </Label>
                                <Input
                                  type="number"
                                  data-testid={`input-score-${criteria.id}`}
                                  min="0"
                                  max={criteria.max_score}
                                  step="0.5"
                                  className="w-24"
                                  value={appraisalData.scores[criteria.id] || ''}
                                  onChange={(e) => setAppraisalData({
                                    ...appraisalData,
                                    scores: { ...appraisalData.scores, [criteria.id]: e.target.value }
                                  })}
                                  placeholder="স্কোর"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="strengths">শক্তিশালী দিক</Label>
                          <Textarea
                            id="strengths"
                            data-testid="input-strengths"
                            value={appraisalData.strengths}
                            onChange={(e) => setAppraisalData({ ...appraisalData, strengths: e.target.value })}
                            placeholder="কর্মচারীর শক্তিশালী দিকগুলো লিখুন"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="areas_of_improvement">উন্নতির ক্ষেত্র</Label>
                          <Textarea
                            id="areas_of_improvement"
                            data-testid="input-areas-of-improvement"
                            value={appraisalData.areas_of_improvement}
                            onChange={(e) => setAppraisalData({ ...appraisalData, areas_of_improvement: e.target.value })}
                            placeholder="উন্নতির ক্ষেত্রগুলো লিখুন"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="goals">লক্ষ্য</Label>
                          <Textarea
                            id="goals"
                            data-testid="input-goals"
                            value={appraisalData.goals}
                            onChange={(e) => setAppraisalData({ ...appraisalData, goals: e.target.value })}
                            placeholder="ভবিষ্যতের লক্ষ্য লিখুন"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="status">অবস্থা</Label>
                          <Select
                            value={appraisalData.status}
                            onValueChange={(value) => setAppraisalData({ ...appraisalData, status: value })}
                          >
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">খসড়া (Draft)</SelectItem>
                              <SelectItem value="in_review">পর্যালোচনায় (In Review)</SelectItem>
                              <SelectItem value="completed">সম্পন্ন (Completed)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAppraisalDialogOpen(false)}
                            data-testid="button-cancel"
                          >
                            বাতিল
                          </Button>
                          <Button 
                            type="submit" 
                            data-testid="button-submit"
                            disabled={createAppraisalMutation.isPending}
                          >
                            {createAppraisalMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="কর্মচারী বা সময়কাল খুঁজুন..."
                      data-testid="input-search"
                      className="pl-10"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                {isLoadingAppraisals ? (
                  <div className="text-center py-8" data-testid="loading-appraisals">লোড হচ্ছে...</div>
                ) : filteredAppraisals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                    কোনো মূল্যায়ন পাওয়া যায়নি
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী</TableHead>
                        <TableHead>সময়কাল</TableHead>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>স্কোর</TableHead>
                        <TableHead>গ্রেড</TableHead>
                        <TableHead>পর্যালোচক</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppraisals.map((appraisal) => (
                        <TableRow key={appraisal.id} data-testid={`row-appraisal-${appraisal.id}`}>
                          <TableCell>
                            <div className="font-medium">{appraisal.staff?.name}</div>
                            <div className="text-sm text-gray-500">{appraisal.staff?.designation}</div>
                          </TableCell>
                          <TableCell>{appraisal.appraisal_period}</TableCell>
                          <TableCell>{format(new Date(appraisal.review_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {appraisal.percentage && `${appraisal.percentage}%`}
                            </div>
                          </TableCell>
                          <TableCell>{getGradeBadge(appraisal.grade)}</TableCell>
                          <TableCell>{appraisal.reviewer_name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(appraisal.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAppraisal(appraisal)}
                                data-testid={`button-edit-${appraisal.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('আপনি কি নিশ্চিত যে এই মূল্যায়নটি মুছতে চান?')) {
                                    deleteAppraisalMutation.mutate(appraisal.id);
                                  }
                                }}
                                data-testid={`button-delete-${appraisal.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>মূল্যায়ন মানদণ্ড (Appraisal Criteria)</CardTitle>
                  <Dialog open={isCriteriaDialogOpen} onOpenChange={setIsCriteriaDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-criteria" onClick={resetCriteriaForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        নতুন মানদণ্ড
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>নতুন মূল্যায়ন মানদণ্ড</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCriteriaSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">মানদণ্ডের নাম *</Label>
                          <Input
                            id="name"
                            data-testid="input-criteria-name"
                            value={criteriaData.name}
                            onChange={(e) => setCriteriaData({ ...criteriaData, name: e.target.value })}
                            placeholder="যেমন: শিক্ষাদান দক্ষতা"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="name_bn">মানদণ্ডের নাম (বাংলা)</Label>
                          <Input
                            id="name_bn"
                            data-testid="input-criteria-name-bn"
                            value={criteriaData.name_bn}
                            onChange={(e) => setCriteriaData({ ...criteriaData, name_bn: e.target.value })}
                            placeholder="শিক্ষাদান দক্ষতা"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">বিবরণ</Label>
                          <Textarea
                            id="description"
                            data-testid="input-criteria-description"
                            value={criteriaData.description}
                            onChange={(e) => setCriteriaData({ ...criteriaData, description: e.target.value })}
                            placeholder="মানদণ্ডের বিস্তারিত বিবরণ"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">শ্রেণী *</Label>
                            <Select
                              value={criteriaData.category}
                              onValueChange={(value) => setCriteriaData({ ...criteriaData, category: value })}
                            >
                              <SelectTrigger data-testid="select-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="teaching">শিক্ষাদান (Teaching)</SelectItem>
                                <SelectItem value="discipline">শৃঙ্খলা (Discipline)</SelectItem>
                                <SelectItem value="communication">যোগাযোগ (Communication)</SelectItem>
                                <SelectItem value="leadership">নেতৃত্ব (Leadership)</SelectItem>
                                <SelectItem value="innovation">উদ্ভাবন (Innovation)</SelectItem>
                                <SelectItem value="teamwork">দলবদ্ধতা (Teamwork)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="max_score">সর্বোচ্চ স্কোর *</Label>
                            <Input
                              id="max_score"
                              type="number"
                              data-testid="input-max-score"
                              value={criteriaData.max_score}
                              onChange={(e) => setCriteriaData({ ...criteriaData, max_score: parseInt(e.target.value) })}
                              min="1"
                              max="100"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="weightage">ওজন</Label>
                            <Input
                              id="weightage"
                              type="number"
                              data-testid="input-weightage"
                              value={criteriaData.weightage}
                              onChange={(e) => setCriteriaData({ ...criteriaData, weightage: e.target.value })}
                              step="0.1"
                              min="0.1"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCriteriaDialogOpen(false)}
                            data-testid="button-cancel-criteria"
                          >
                            বাতিল
                          </Button>
                          <Button 
                            type="submit" 
                            data-testid="button-submit-criteria"
                            disabled={createCriteriaMutation.isPending}
                          >
                            {createCriteriaMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="মানদণ্ড খুঁজুন..."
                      data-testid="input-search-criteria"
                      className="pl-10"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                {isLoadingCriteria ? (
                  <div className="text-center py-8" data-testid="loading-criteria">লোড হচ্ছে...</div>
                ) : filteredCriteria.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="empty-state-criteria">
                    কোনো মানদণ্ড পাওয়া যায়নি
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>মানদণ্ড</TableHead>
                        <TableHead>শ্রেণী</TableHead>
                        <TableHead>সর্বোচ্চ স্কোর</TableHead>
                        <TableHead>ওজন</TableHead>
                        <TableHead>বিবরণ</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCriteria.map((criteria) => (
                        <TableRow key={criteria.id} data-testid={`row-criteria-${criteria.id}`}>
                          <TableCell>
                            <div className="font-medium">{criteria.name}</div>
                            {criteria.name_bn && (
                              <div className="text-sm text-gray-500">{criteria.name_bn}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{criteria.category}</Badge>
                          </TableCell>
                          <TableCell>{criteria.max_score}</TableCell>
                          <TableCell>{criteria.weightage}</TableCell>
                          <TableCell className="max-w-xs truncate">{criteria.description || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('আপনি কি নিশ্চিত যে এই মানদণ্ডটি মুছতে চান?')) {
                                  deleteCriteriaMutation.mutate(criteria.id);
                                }
                              }}
                              data-testid={`button-delete-criteria-${criteria.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
