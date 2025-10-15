// Migrated to direct Supabase: Subjects CRUD
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, Edit2, Trash2, BookOpen, Search, GraduationCap, Filter } from 'lucide-react';
import { Subject } from '@shared/schema';

export default function SubjectsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    subject_name_bn: '',
    description: '',
    credit_hours: 3,
    is_compulsory: false,
    department: '',
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

  // Fetch subjects
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Create subject mutation
  const createMutation = useMutation({
    mutationFn: async (newSubject: any) => {
      const schoolId = await getCurrentSchoolId();
      // Convert from snake_case form to camelCase schema
      const dbData = {
        code: newSubject.subject_code,
        name: newSubject.subject_name,
        nameBn: newSubject.subject_name_bn,
        description: newSubject.description,
        creditHours: newSubject.credit_hours,
        isCompulsory: newSubject.is_compulsory,
        department: newSubject.department,
        school_id: schoolId,
      };
      const { data, error } = await supabase
        .from('subjects')
        .insert([dbData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: 'সফল', description: 'বিষয় সফলভাবে তৈরি হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Update subject mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      // Convert from snake_case form to camelCase schema
      const dbData = {
        code: updates.subject_code,
        name: updates.subject_name,
        nameBn: updates.subject_name_bn,
        description: updates.description,
        creditHours: updates.credit_hours,
        isCompulsory: updates.is_compulsory,
        department: updates.department,
      };
      const { data, error } = await supabase
        .from('subjects')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: 'সফল', description: 'বিষয় আপডেট হয়েছে' });
      setEditingSubject(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Delete subject mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: 'সফল', description: 'বিষয় মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      subject_code: '',
      subject_name: '',
      subject_name_bn: '',
      description: '',
      credit_hours: 3,
      is_compulsory: false,
      department: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    // Convert from camelCase schema to snake_case form
    setFormData({
      subject_code: subject.code || '',
      subject_name: subject.name || '',
      subject_name_bn: subject.nameBn || '',
      description: subject.description || '',
      credit_hours: subject.creditHours || 3,
      is_compulsory: subject.isCompulsory || false,
      department: subject.department || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('আপনি কি নিশ্চিত এই বিষয়টি মুছে ফেলতে চান?')) {
      deleteMutation.mutate(id);
    }
  };

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = searchText === '' || 
      subject.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === 'all' || subject.department === selectedDepartment;
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'compulsory' && subject.isCompulsory) ||
      (activeTab === 'elective' && !subject.isCompulsory);
    
    return matchesSearch && matchesDepartment && matchesTab;
  });

  const stats = {
    total: subjects.length,
    compulsory: subjects.filter(s => s.isCompulsory).length,
    elective: subjects.filter(s => !s.isCompulsory).length,
  };

  const departments = Array.from(new Set(subjects.map(s => s.department).filter(Boolean)));

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              বিষয়সমূহ ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              সকল শিক্ষা বিষয় পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-subject" onClick={() => { setEditingSubject(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                নতুন বিষয় যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? 'বিষয় সম্পাদনা' : 'নতুন বিষয় যোগ করুন'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subject_code">বিষয় কোড *</Label>
                    <Input
                      id="subject_code"
                      data-testid="input-subject-code"
                      value={formData.subject_code}
                      onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">বিভাগ</Label>
                    <Input
                      id="department"
                      data-testid="input-department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject_name">বিষয়ের নাম (ইংরেজি) *</Label>
                  <Input
                    id="subject_name"
                    data-testid="input-subject-name"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject_name_bn">বিষয়ের নাম (বাংলা)</Label>
                  <Input
                    id="subject_name_bn"
                    data-testid="input-subject-name-bn"
                    value={formData.subject_name_bn}
                    onChange={(e) => setFormData({ ...formData, subject_name_bn: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">বিবরণ</Label>
                  <Textarea
                    id="description"
                    data-testid="input-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="credit_hours">ক্রেডিট ঘন্টা</Label>
                    <Input
                      id="credit_hours"
                      data-testid="input-credit-hours"
                      type="number"
                      min="0"
                      value={formData.credit_hours}
                      onChange={(e) => setFormData({ ...formData, credit_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="is_compulsory"
                      data-testid="switch-compulsory"
                      checked={formData.is_compulsory}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_compulsory: checked })}
                    />
                    <Label htmlFor="is_compulsory">বাধ্যতামূলক বিষয়</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSubject ? 'আপডেট করুন' : 'তৈরি করুন'}
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
              <CardTitle className="text-sm font-medium">মোট বিষয়</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">বাধ্যতামূলক</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.compulsory}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ঐচ্ছিক</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.elective}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="বিষয় বা কোড অনুসন্ধান করুন..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]" data-testid="select-department">
              <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল বিভাগ</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept || ''}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">সকল ({stats.total})</TabsTrigger>
            <TabsTrigger value="compulsory">বাধ্যতামূলক ({stats.compulsory})</TabsTrigger>
            <TabsTrigger value="elective">ঐচ্ছিক ({stats.elective})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>কোড</TableHead>
                      <TableHead>বিষয়ের নাম</TableHead>
                      <TableHead>বিভাগ</TableHead>
                      <TableHead>ক্রেডিট</TableHead>
                      <TableHead>ধরন</TableHead>
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
                    ) : filteredSubjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          কোন বিষয় পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubjects.map((subject) => (
                        <TableRow key={subject.id} data-testid={`row-subject-${subject.id}`}>
                          <TableCell className="font-medium">{subject.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid={`text-subject-name-${subject.id}`}>
                                {subject.name}
                              </div>
                              {subject.nameBn && (
                                <div className="text-sm text-muted-foreground">
                                  {subject.nameBn}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{subject.department || '-'}</TableCell>
                          <TableCell>{subject.creditHours || '-'}</TableCell>
                          <TableCell>
                            {subject.isCompulsory ? (
                              <Badge variant="default">বাধ্যতামূলক</Badge>
                            ) : (
                              <Badge variant="secondary">ঐচ্ছিক</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-edit-${subject.id}`}
                                onClick={() => handleEdit(subject)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-delete-${subject.id}`}
                                onClick={() => handleDelete(subject.id)}
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
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
