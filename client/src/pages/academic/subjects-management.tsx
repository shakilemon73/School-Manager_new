import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, BookOpen, Users } from 'lucide-react';
import { Subject, SubjectAssignment } from '@/lib/new-features-types';

export default function SubjectsManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    subject_name_bn: '',
    description: '',
    credit_hours: 0,
    is_compulsory: false,
    department: '',
  });

  // Fetch subjects
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', 1)
        .order('subject_name');
      
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Create subject mutation
  const createMutation = useMutation({
    mutationFn: async (newSubject: any) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ ...newSubject, school_id: 1 }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: 'Success', description: 'Subject created successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update subject mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      toast({ title: 'Success', description: 'Subject updated successfully' });
      setEditingSubject(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Success', description: 'Subject deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      subject_code: '',
      subject_name: '',
      subject_name_bn: '',
      description: '',
      credit_hours: 0,
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
    setFormData({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      subject_name_bn: subject.subject_name_bn || '',
      description: subject.description || '',
      credit_hours: subject.credit_hours || 0,
      is_compulsory: subject.is_compulsory || false,
      department: subject.department || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading subjects...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Subjects Management</h1>
          <p className="text-gray-600 mt-1">Manage all subjects and their assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-subject" onClick={() => { setEditingSubject(null); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject_code">Subject Code *</Label>
                  <Input
                    id="subject_code"
                    data-testid="input-subject-code"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    data-testid="input-department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject_name">Subject Name (English) *</Label>
                <Input
                  id="subject_name"
                  data-testid="input-subject-name"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject_name_bn">Subject Name (Bengali)</Label>
                <Input
                  id="subject_name_bn"
                  data-testid="input-subject-name-bn"
                  value={formData.subject_name_bn}
                  onChange={(e) => setFormData({ ...formData, subject_name_bn: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
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
                  <Label htmlFor="credit_hours">Credit Hours</Label>
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
                  <Label htmlFor="is_compulsory">Compulsory Subject</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSubject ? 'Update' : 'Create'} Subject
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((subject) => (
          <Card key={subject.id} data-testid={`card-subject-${subject.id}`}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold" data-testid={`text-subject-name-${subject.id}`}>
                      {subject.subject_name}
                    </div>
                    <div className="text-sm text-gray-500 font-normal">
                      {subject.subject_code}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
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
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subject.subject_name_bn && (
                <p className="text-sm text-gray-600 mb-2">{subject.subject_name_bn}</p>
              )}
              {subject.description && (
                <p className="text-sm text-gray-700 mb-3">{subject.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {subject.credit_hours && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {subject.credit_hours} Credits
                  </span>
                )}
                {subject.is_compulsory && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                    Compulsory
                  </span>
                )}
                {subject.department && (
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {subject.department}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {subjects?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No subjects found</p>
            <p className="text-sm">Click "Add Subject" to create your first subject</p>
          </div>
        )}
      </div>
    </div>
  );
}
