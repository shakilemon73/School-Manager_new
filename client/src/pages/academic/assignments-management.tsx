// Migrated to direct Supabase: Assignments using assessments table
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
import { Plus, FileText, Calendar, Clock, CheckCircle, AlertCircle, Search, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

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

export default function AssignmentsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
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
      toast({ title: 'সফল', description: 'অ্যাসাইনমেন্ট মুছে ফেলা হয়েছে' });
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'homework': return <Badge variant="default">হোমওয়ার্ক</Badge>;
      case 'project': return <Badge variant="secondary">প্রজেক্ট</Badge>;
      case 'quiz': return <Badge variant="outline">কুইজ</Badge>;
      default: return <Badge>{type}</Badge>;
    }
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
                  <TableHead className="text-right">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filteredAssessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      কোন অ্যাসাইনমেন্ট পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id} data-testid={`row-assignment-${assessment.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-title-${assessment.id}`}>
                            {assessment.assessment_name_bn || assessment.assessment_name}
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
                        {assessment.date ? format(new Date(assessment.date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>{assessment.total_marks}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(assessment)}
                            data-testid={`button-edit-${assessment.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(assessment.id)}
                            data-testid={`button-delete-${assessment.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
