import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Assignment, Subject } from '@/lib/new-features-types';
import { format } from 'date-fns';

export default function AssignmentsManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  // Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['/api/assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects (subject_name)
        `)
        .eq('school_id', 1)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch subjects for dropdown
  const { data: subjects } = useQuery({
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

  // Create assignment mutation
  const createMutation = useMutation({
    mutationFn: async (newAssignment: any) => {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', 1)
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          ...newAssignment,
          teacher_id: teacherData?.id || 1,
          school_id: 1,
          subject_id: newAssignment.subject_id || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({ title: 'Success', description: 'Assignment created successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Homework & Assignments</h1>
          <p className="text-gray-600 mt-1">Manage assignments and track submissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-assignment">
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
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
                  <Label htmlFor="subject_id">Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class">Class *</Label>
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
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    data-testid="input-section"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date *</Label>
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
                  <Label htmlFor="total_marks">Total Marks</Label>
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
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                  Create Assignment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {assignments?.map((assignment) => (
          <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span data-testid={`text-title-${assignment.id}`}>{assignment.title}</span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Class: {assignment.class} {assignment.section}
                    </span>
                    {assignment.subjects && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {assignment.subjects.subject_name}
                      </span>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {assignment.total_marks} marks
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </CardHeader>
            {assignment.description && (
              <CardContent>
                <p className="text-sm text-gray-700">{assignment.description}</p>
              </CardContent>
            )}
          </Card>
        ))}

        {assignments?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No assignments found</p>
            <p className="text-sm">Click "Create Assignment" to add your first assignment</p>
          </div>
        )}
      </div>
    </div>
  );
}
