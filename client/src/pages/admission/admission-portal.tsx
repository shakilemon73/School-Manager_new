import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { AdmissionApplication } from '@/lib/new-features-types';

export default function AdmissionPortalPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  // Fetch admission applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['/api/admission-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('school_id', 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdmissionApplication[];
    }
  });

  // Create application mutation
  const createMutation = useMutation({
    mutationFn: async (newApplication: any) => {
      // Generate application number
      const appNumber = `APP${Date.now().toString().slice(-8)}`;
      
      const { data, error } = await supabase
        .from('admission_applications')
        .insert([{
          ...newApplication,
          application_number: appNumber,
          session_id: 1, // Default session
          school_id: 1,
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
      toast({ title: 'Success', description: 'Application submitted successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'under_review': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Admission Portal</h1>
          <p className="text-gray-600 mt-1">Manage student admission applications</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-application">
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Admission Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Student Name *</Label>
                  <Input
                    id="student_name"
                    data-testid="input-student-name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    data-testid="select-gender"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="previous_class">Previous Class</Label>
                  <Input
                    id="previous_class"
                    data-testid="input-previous-class"
                    value={formData.previous_class}
                    onChange={(e) => setFormData({ ...formData, previous_class: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="desired_class">Desired Class *</Label>
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
                  <Label htmlFor="father_name">Father's Name *</Label>
                  <Input
                    id="father_name"
                    data-testid="input-father-name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mother_name">Mother's Name *</Label>
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
                  <Label htmlFor="guardian_phone">Guardian Phone *</Label>
                  <Input
                    id="guardian_phone"
                    data-testid="input-phone"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_email">Guardian Email</Label>
                  <Input
                    id="guardian_email"
                    data-testid="input-email"
                    type="email"
                    value={formData.guardian_email}
                    onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                  Submit Application
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {applications?.map((application) => (
          <Card key={application.id} data-testid={`card-application-${application.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(application.application_status || 'submitted')}
                    <span data-testid={`text-name-${application.id}`}>{application.student_name}</span>
                  </CardTitle>
                  <div className="text-sm text-gray-600 mt-1">
                    Application #: {application.application_number}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(application.application_status || 'submitted')}`}>
                      {application.application_status}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Desired Class: {application.desired_class}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="ml-2 font-medium">{application.date_of_birth}</span>
                </div>
                <div>
                  <span className="text-gray-600">Contact:</span>
                  <span className="ml-2 font-medium">{application.guardian_phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {applications?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No applications found</p>
            <p className="text-sm">Click "New Application" to submit a student admission request</p>
          </div>
        )}
      </div>
    </div>
  );
}
