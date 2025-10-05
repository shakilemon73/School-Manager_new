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
  Stethoscope,
  Activity,
  Eye,
  Heart,
  Search,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: number;
  student_id: string;
  name: string;
  name_in_bangla?: string;
  class?: string;
  section?: string;
}

interface MedicalCheckup {
  id: number;
  student_id: number;
  checkup_date: string;
  checkup_type: string;
  height?: string;
  weight?: string;
  bmi?: string;
  blood_pressure?: string;
  vision_left?: string;
  vision_right?: string;
  dental_status?: string;
  general_health_status: string;
  findings?: string;
  recommendations?: string;
  examined_by?: string;
  next_checkup_date?: string;
  students?: Student;
}

export default function MedicalCheckupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCheckup, setSelectedCheckup] = useState<MedicalCheckup | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    checkup_date: format(new Date(), 'yyyy-MM-dd'),
    checkup_type: 'routine',
    height: '',
    weight: '',
    blood_pressure: '',
    vision_left: '',
    vision_right: '',
    dental_status: '',
    general_health_status: 'good',
    findings: '',
    recommendations: '',
    examined_by: '',
    next_checkup_date: '',
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

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data as Student[];
    }
  });

  const { data: checkups = [], isLoading } = useQuery({
    queryKey: ['/api/medical-checkups'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('medical_checkups')
        .select(`
          *,
          students:student_id (
            id,
            student_id,
            name,
            name_in_bangla,
            class,
            section
          )
        `)
        .eq('school_id', schoolId)
        .order('checkup_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (newCheckup: any) => {
      const schoolId = await getCurrentSchoolId();
      
      const bmi = newCheckup.height && newCheckup.weight 
        ? (parseFloat(newCheckup.weight) / Math.pow(parseFloat(newCheckup.height) / 100, 2)).toFixed(2)
        : null;

      const checkupData = {
        student_id: parseInt(newCheckup.student_id),
        checkup_date: newCheckup.checkup_date,
        checkup_type: newCheckup.checkup_type,
        height: newCheckup.height || null,
        weight: newCheckup.weight || null,
        bmi,
        blood_pressure: newCheckup.blood_pressure || null,
        vision_left: newCheckup.vision_left || null,
        vision_right: newCheckup.vision_right || null,
        dental_status: newCheckup.dental_status || null,
        general_health_status: newCheckup.general_health_status,
        findings: newCheckup.findings || null,
        recommendations: newCheckup.recommendations || null,
        examined_by: newCheckup.examined_by || null,
        next_checkup_date: newCheckup.next_checkup_date || null,
        school_id: schoolId,
      };

      if (selectedCheckup) {
        const { data, error } = await supabase
          .from('medical_checkups')
          .update(checkupData)
          .eq('id', selectedCheckup.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('medical_checkups')
          .insert([checkupData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-checkups'] });
      toast({ 
        title: 'সফল', 
        description: selectedCheckup ? 'চেক-আপ রেকর্ড আপডেট হয়েছে' : 'চেক-আপ রেকর্ড যোগ করা হয়েছে' 
      });
      setIsDialogOpen(false);
      resetForm();
      setSelectedCheckup(null);
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('medical_checkups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-checkups'] });
      toast({ title: 'সফল', description: 'চেক-আপ রেকর্ড মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      checkup_date: format(new Date(), 'yyyy-MM-dd'),
      checkup_type: 'routine',
      height: '',
      weight: '',
      blood_pressure: '',
      vision_left: '',
      vision_right: '',
      dental_status: '',
      general_health_status: 'good',
      findings: '',
      recommendations: '',
      examined_by: '',
      next_checkup_date: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  const handleEdit = (checkup: MedicalCheckup) => {
    setSelectedCheckup(checkup);
    setFormData({
      student_id: checkup.student_id.toString(),
      checkup_date: checkup.checkup_date,
      checkup_type: checkup.checkup_type,
      height: checkup.height || '',
      weight: checkup.weight || '',
      blood_pressure: checkup.blood_pressure || '',
      vision_left: checkup.vision_left || '',
      vision_right: checkup.vision_right || '',
      dental_status: checkup.dental_status || '',
      general_health_status: checkup.general_health_status,
      findings: checkup.findings || '',
      recommendations: checkup.recommendations || '',
      examined_by: checkup.examined_by || '',
      next_checkup_date: checkup.next_checkup_date || '',
    });
    setIsDialogOpen(true);
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-600" data-testid="badge-excellent">Excellent</Badge>;
      case 'good': return <Badge className="bg-green-500" data-testid="badge-good">Good</Badge>;
      case 'fair': return <Badge className="bg-yellow-500" data-testid="badge-fair">Fair</Badge>;
      case 'poor': return <Badge variant="destructive" data-testid="badge-poor">Poor</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNextCheckupBadge = (nextDate?: string) => {
    if (!nextDate) return null;
    const today = new Date();
    const checkupDate = new Date(nextDate);
    const daysUntil = Math.ceil((checkupDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return <Badge variant="destructive" data-testid="badge-overdue">Overdue</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-orange-500" data-testid="badge-due-soon">Due Soon</Badge>;
    } else {
      return <Badge className="bg-blue-500" data-testid="badge-scheduled">Scheduled</Badge>;
    }
  };

  const filteredCheckups = checkups.filter(checkup => {
    const matchesSearch = searchText === '' || 
      checkup.students?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      checkup.students?.student_id.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesFilter = filterType === 'all' || checkup.checkup_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const calculateStats = () => {
    const totalCheckups = checkups.length;
    const routineCheckups = checkups.filter(c => c.checkup_type === 'routine').length;
    const upcomingCheckups = checkups.filter(c => {
      if (!c.next_checkup_date) return false;
      const nextDate = new Date(c.next_checkup_date);
      const today = new Date();
      return nextDate >= today;
    }).length;
    const goodHealth = checkups.filter(c => c.general_health_status === 'excellent' || c.general_health_status === 'good').length;

    return { totalCheckups, routineCheckups, upcomingCheckups, goodHealth };
  };

  const stats = calculateStats();

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-page-title">
              চিকিৎসা পরীক্ষা ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-1">Medical Checkups Management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">মোট চেক-আপ</CardTitle>
              <Stethoscope className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-checkups">{stats.totalCheckups}</div>
              <p className="text-xs text-gray-600">Total Checkups</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-routine">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">নিয়মিত চেক-আপ</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-routine-checkups">{stats.routineCheckups}</div>
              <p className="text-xs text-gray-600">Routine Checkups</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-upcoming">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">আগামী চেক-আপ</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-upcoming-checkups">{stats.upcomingCheckups}</div>
              <p className="text-xs text-gray-600">Upcoming</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-healthy">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">সুস্বাস্থ্য</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-good-health">{stats.goodHealth}</div>
              <p className="text-xs text-gray-600">Good/Excellent Health</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>চিকিৎসা পরীক্ষা রেকর্ড (Medical Checkup Records)</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-checkup" onClick={() => {
                    resetForm();
                    setSelectedCheckup(null);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন চেক-আপ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedCheckup ? 'চেক-আপ রেকর্ড সম্পাদনা' : 'নতুন চিকিৎসা পরীক্ষা'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="student_id">শিক্ষার্থী *</Label>
                        <Select
                          value={formData.student_id}
                          onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                          required
                        >
                          <SelectTrigger data-testid="select-student">
                            <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.name} - {student.class} ({student.student_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="checkup_date">চেক-আপ তারিখ *</Label>
                        <Input
                          id="checkup_date"
                          type="date"
                          data-testid="input-checkup-date"
                          value={formData.checkup_date}
                          onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="checkup_type">চেক-আপের ধরন *</Label>
                        <Select
                          value={formData.checkup_type}
                          onValueChange={(value) => setFormData({ ...formData, checkup_type: value })}
                        >
                          <SelectTrigger data-testid="select-checkup-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="routine">Routine (নিয়মিত)</SelectItem>
                            <SelectItem value="sports">Sports (খেলাধুলা)</SelectItem>
                            <SelectItem value="emergency">Emergency (জরুরী)</SelectItem>
                            <SelectItem value="dental">Dental (দাঁত)</SelectItem>
                            <SelectItem value="vision">Vision (দৃষ্টি)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="height">উচ্চতা (সেমি)</Label>
                        <Input
                          id="height"
                          type="number"
                          step="0.1"
                          data-testid="input-height"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          placeholder="150.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="weight">ওজন (কেজি)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          data-testid="input-weight"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          placeholder="45.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="blood_pressure">রক্তচাপ</Label>
                        <Input
                          id="blood_pressure"
                          data-testid="input-blood-pressure"
                          value={formData.blood_pressure}
                          onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                          placeholder="120/80"
                        />
                      </div>

                      <div>
                        <Label htmlFor="vision_left">বাম চোখের দৃষ্টি</Label>
                        <Input
                          id="vision_left"
                          data-testid="input-vision-left"
                          value={formData.vision_left}
                          onChange={(e) => setFormData({ ...formData, vision_left: e.target.value })}
                          placeholder="20/20 or 6/6"
                        />
                      </div>

                      <div>
                        <Label htmlFor="vision_right">ডান চোখের দৃষ্টি</Label>
                        <Input
                          id="vision_right"
                          data-testid="input-vision-right"
                          value={formData.vision_right}
                          onChange={(e) => setFormData({ ...formData, vision_right: e.target.value })}
                          placeholder="20/20 or 6/6"
                        />
                      </div>

                      <div>
                        <Label htmlFor="dental_status">দাঁতের অবস্থা</Label>
                        <Select
                          value={formData.dental_status}
                          onValueChange={(value) => setFormData({ ...formData, dental_status: value })}
                        >
                          <SelectTrigger data-testid="select-dental-status">
                            <SelectValue placeholder="নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent (উৎকৃষ্ট)</SelectItem>
                            <SelectItem value="good">Good (ভাল)</SelectItem>
                            <SelectItem value="fair">Fair (মোটামুটি)</SelectItem>
                            <SelectItem value="needs_treatment">Needs Treatment (চিকিৎসা প্রয়োজন)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="general_health_status">সার্বিক স্বাস্থ্য *</Label>
                        <Select
                          value={formData.general_health_status}
                          onValueChange={(value) => setFormData({ ...formData, general_health_status: value })}
                        >
                          <SelectTrigger data-testid="select-health-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent (উৎকৃষ্ট)</SelectItem>
                            <SelectItem value="good">Good (ভাল)</SelectItem>
                            <SelectItem value="fair">Fair (মোটামুটি)</SelectItem>
                            <SelectItem value="poor">Poor (খারাপ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="examined_by">পরীক্ষক</Label>
                        <Input
                          id="examined_by"
                          data-testid="input-examined-by"
                          value={formData.examined_by}
                          onChange={(e) => setFormData({ ...formData, examined_by: e.target.value })}
                          placeholder="ডাক্তারের নাম"
                        />
                      </div>

                      <div>
                        <Label htmlFor="next_checkup_date">পরবর্তী চেক-আপ তারিখ</Label>
                        <Input
                          id="next_checkup_date"
                          type="date"
                          data-testid="input-next-checkup-date"
                          value={formData.next_checkup_date}
                          onChange={(e) => setFormData({ ...formData, next_checkup_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="findings">পরীক্ষার ফলাফল</Label>
                      <Textarea
                        id="findings"
                        data-testid="input-findings"
                        value={formData.findings}
                        onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                        placeholder="পরীক্ষার ফলাফল লিখুন"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="recommendations">সুপারিশ</Label>
                      <Textarea
                        id="recommendations"
                        data-testid="input-recommendations"
                        value={formData.recommendations}
                        onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                        placeholder="ডাক্তারের সুপারিশ লিখুন"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        বাতিল
                      </Button>
                      <Button 
                        type="submit" 
                        data-testid="button-submit"
                        disabled={createOrUpdateMutation.isPending}
                      >
                        {createOrUpdateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="শিক্ষার্থী খুঁজুন..."
                  data-testid="input-search"
                  className="pl-10"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48" data-testid="select-filter-type">
                  <SelectValue placeholder="চেক-আপ ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ধরন</SelectItem>
                  <SelectItem value="routine">Routine (নিয়মিত)</SelectItem>
                  <SelectItem value="sports">Sports (খেলাধুলা)</SelectItem>
                  <SelectItem value="emergency">Emergency (জরুরী)</SelectItem>
                  <SelectItem value="dental">Dental (দাঁত)</SelectItem>
                  <SelectItem value="vision">Vision (দৃষ্টি)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-checkups">লোড হচ্ছে...</div>
            ) : filteredCheckups.length === 0 ? (
              <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                কোনো চেক-আপ রেকর্ড পাওয়া যায়নি
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>শিক্ষার্থী</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>ধরন</TableHead>
                    <TableHead>উচ্চতা/ওজন/BMI</TableHead>
                    <TableHead>স্বাস্থ্য অবস্থা</TableHead>
                    <TableHead>পরীক্ষক</TableHead>
                    <TableHead>পরবর্তী চেক-আপ</TableHead>
                    <TableHead>কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckups.map((checkup) => (
                    <TableRow key={checkup.id} data-testid={`row-checkup-${checkup.id}`}>
                      <TableCell>
                        <div className="font-medium">{checkup.students?.name}</div>
                        <div className="text-sm text-gray-500">
                          {checkup.students?.class} - {checkup.students?.student_id}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(checkup.checkup_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{checkup.checkup_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {checkup.height && checkup.weight ? (
                          <div className="text-sm">
                            {checkup.height}cm / {checkup.weight}kg
                            {checkup.bmi && <div className="text-xs text-gray-500">BMI: {checkup.bmi}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getHealthStatusBadge(checkup.general_health_status)}</TableCell>
                      <TableCell>{checkup.examined_by || '-'}</TableCell>
                      <TableCell>
                        {checkup.next_checkup_date ? (
                          <div>
                            <div className="text-sm">{format(new Date(checkup.next_checkup_date), 'dd MMM yyyy')}</div>
                            {getNextCheckupBadge(checkup.next_checkup_date)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(checkup)}
                            data-testid={`button-edit-${checkup.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছতে চান?')) {
                                deleteMutation.mutate(checkup.id);
                              }
                            }}
                            data-testid={`button-delete-${checkup.id}`}
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
      </div>
    </AppShell>
  );
}
