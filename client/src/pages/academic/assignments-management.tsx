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
import { Plus, FileText, Calendar, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Assignment, Subject } from '@/lib/new-features-types';
import { format } from 'date-fns';

export default function AssignmentsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    title_bn: '',
    description: '',
    subject_id: '',
    class: '',
    section: '',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_marks: 100,
    status: 'active',
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

  // Fetch assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['/api/assignments'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects (subject_name)
        `)
        .eq('school_id', schoolId)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('subject_name');
      
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Create assignment mutation
  const createMutation = useMutation({
    mutationFn: async (newAssignment: any) => {
      const schoolId = await getCurrentSchoolId();
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', schoolId)
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          ...newAssignment,
          teacher_id: teacherData?.id || 1,
          school_id: schoolId,
          subject_id: newAssignment.subject_id || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({ title: 'সফল', description: 'হোমওয়ার্ক তৈরি হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      title_bn: '',
      description: '',
      subject_id: '',
      class: '',
      section: '',
      assigned_date: new Date().toISOString().split('T')[0],
      due_date: '',
      total_marks: 100,
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">সক্রিয়</Badge>;
      case 'completed': return <Badge variant="secondary">সম্পন্ন</Badge>;
      case 'expired': return <Badge variant="destructive">মেয়াদোত্তীর্ণ</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchText === '' || 
      assignment.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesClass = selectedClass === 'all' || assignment.class === selectedClass;
    const matchesTab = activeTab === 'all' || assignment.status === activeTab;
    
    return matchesSearch && matchesClass && matchesTab;
  });

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  };

  const classes = Array.from(new Set(assignments.map(a => a.class)));

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
              হোমওয়ার্ক তৈরি এবং জমা দেওয়া ট্র্যাক করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-assignment">
                <Plus className="w-4 h-4 mr-2" />
                নতুন হোমওয়ার্ক
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>নতুন হোমওয়ার্ক তৈরি করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">হোমওয়ার্কের শিরোনাম *</Label>
                  <Input
                    id="title"
                    data-testid="input-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
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
                    <Label htmlFor="subject_id">বিষয়</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                    >
                      <SelectTrigger data-testid="select-subject">
                        <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.subject_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    <Label htmlFor="due_date">জমা দেওয়ার তারিখ *</Label>
                    <Input
                      id="due_date"
                      data-testid="input-due-date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_marks">মোট নম্বর</Label>
                    <Input
                      id="total_marks"
                      data-testid="input-marks"
                      type="number"
                      min="0"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                    তৈরি করুন
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
              <CardTitle className="text-sm font-medium">মোট হোমওয়ার্ক</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সক্রিয়</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">সম্পন্ন</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="হোমওয়ার্ক অনুসন্ধান করুন..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]" data-testid="select-class">
              <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল শ্রেণী</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">সকল ({stats.total})</TabsTrigger>
            <TabsTrigger value="active">সক্রিয় ({stats.active})</TabsTrigger>
            <TabsTrigger value="completed">সম্পন্ন ({stats.completed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিরোনাম</TableHead>
                      <TableHead>বিষয়</TableHead>
                      <TableHead>শ্রেণী</TableHead>
                      <TableHead>জমা দেওয়ার তারিখ</TableHead>
                      <TableHead>নম্বর</TableHead>
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
                    ) : filteredAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          কোন হোমওয়ার্ক পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid={`text-title-${assignment.id}`}>
                                {assignment.title}
                              </div>
                              {assignment.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {assignment.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.subjects?.subject_name || '-'}
                          </TableCell>
                          <TableCell>
                            {assignment.class} {assignment.section}
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.due_date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{assignment.total_marks}</TableCell>
                          <TableCell>
                            {getStatusBadge(assignment.status)}
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
