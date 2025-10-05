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
  Heart,
  Activity,
  User,
  Phone,
  Stethoscope,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface Student {
  id: number;
  student_id: string;
  name: string;
  name_in_bangla?: string;
  class?: string;
  section?: string;
  blood_group?: string;
}

interface HealthRecord {
  id: number;
  student_id: number;
  blood_group?: string;
  height?: string;
  weight?: string;
  bmi?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  family_doctor_name?: string;
  family_doctor_phone?: string;
  medical_notes?: string;
  students?: Student;
}

export default function HealthRecordsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    blood_group: '',
    height: '',
    weight: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    family_doctor_name: '',
    family_doctor_phone: '',
    medical_notes: '',
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

  const { data: healthRecords = [], isLoading } = useQuery({
    queryKey: ['/api/health-records'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          *,
          students:student_id (
            id,
            student_id,
            name,
            name_in_bangla,
            class,
            section,
            blood_group
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (newRecord: any) => {
      const schoolId = await getCurrentSchoolId();
      
      const bmi = newRecord.height && newRecord.weight 
        ? (parseFloat(newRecord.weight) / Math.pow(parseFloat(newRecord.height) / 100, 2)).toFixed(2)
        : null;

      const recordData = {
        student_id: parseInt(newRecord.student_id),
        blood_group: newRecord.blood_group || null,
        height: newRecord.height || null,
        weight: newRecord.weight || null,
        bmi,
        allergies: newRecord.allergies ? newRecord.allergies.split(',').map((a: string) => a.trim()) : [],
        chronic_conditions: newRecord.chronic_conditions ? newRecord.chronic_conditions.split(',').map((c: string) => c.trim()) : [],
        current_medications: newRecord.current_medications ? newRecord.current_medications.split(',').map((m: string) => m.trim()) : [],
        emergency_contact_name: newRecord.emergency_contact_name || null,
        emergency_contact_relation: newRecord.emergency_contact_relation || null,
        emergency_contact_phone: newRecord.emergency_contact_phone || null,
        family_doctor_name: newRecord.family_doctor_name || null,
        family_doctor_phone: newRecord.family_doctor_phone || null,
        medical_notes: newRecord.medical_notes || null,
        school_id: schoolId,
      };

      if (selectedRecord) {
        const { data, error } = await supabase
          .from('health_records')
          .update(recordData)
          .eq('id', selectedRecord.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('health_records')
          .insert([recordData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-records'] });
      toast({ 
        title: 'সফল', 
        description: selectedRecord ? 'স্বাস্থ্য রেকর্ড আপডেট হয়েছে' : 'স্বাস্থ্য রেকর্ড যোগ করা হয়েছে' 
      });
      setIsDialogOpen(false);
      resetForm();
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-records'] });
      toast({ title: 'সফল', description: 'স্বাস্থ্য রেকর্ড মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      blood_group: '',
      height: '',
      weight: '',
      allergies: '',
      chronic_conditions: '',
      current_medications: '',
      emergency_contact_name: '',
      emergency_contact_relation: '',
      emergency_contact_phone: '',
      family_doctor_name: '',
      family_doctor_phone: '',
      medical_notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  const handleEdit = (record: HealthRecord) => {
    setSelectedRecord(record);
    setFormData({
      student_id: record.student_id.toString(),
      blood_group: record.blood_group || '',
      height: record.height || '',
      weight: record.weight || '',
      allergies: record.allergies?.join(', ') || '',
      chronic_conditions: record.chronic_conditions?.join(', ') || '',
      current_medications: record.current_medications?.join(', ') || '',
      emergency_contact_name: record.emergency_contact_name || '',
      emergency_contact_relation: record.emergency_contact_relation || '',
      emergency_contact_phone: record.emergency_contact_phone || '',
      family_doctor_name: record.family_doctor_name || '',
      family_doctor_phone: record.family_doctor_phone || '',
      medical_notes: record.medical_notes || '',
    });
    setIsDialogOpen(true);
  };

  const getBMICategory = (bmi?: string) => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return <Badge variant="outline" className="bg-yellow-50">Underweight</Badge>;
    if (bmiValue < 25) return <Badge className="bg-green-500">Normal</Badge>;
    if (bmiValue < 30) return <Badge className="bg-orange-500">Overweight</Badge>;
    return <Badge variant="destructive">Obese</Badge>;
  };

  const filteredRecords = healthRecords.filter(record => {
    const matchesSearch = searchText === '' || 
      record.students?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      record.students?.student_id.toLowerCase().includes(searchText.toLowerCase()) ||
      record.blood_group?.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const calculateStats = () => {
    const totalRecords = healthRecords.length;
    const withAllergies = healthRecords.filter(r => r.allergies && r.allergies.length > 0).length;
    const withChronicConditions = healthRecords.filter(r => r.chronic_conditions && r.chronic_conditions.length > 0).length;
    const withMedications = healthRecords.filter(r => r.current_medications && r.current_medications.length > 0).length;

    return { totalRecords, withAllergies, withChronicConditions, withMedications };
  };

  const stats = calculateStats();

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-page-title">
              স্বাস্থ্য রেকর্ড ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-1">Health Records Management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">মোট রেকর্ড</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-records">{stats.totalRecords}</div>
              <p className="text-xs text-gray-600">Total Records</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-allergies">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">এলার্জি আছে</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-with-allergies">{stats.withAllergies}</div>
              <p className="text-xs text-gray-600">With Allergies</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-chronic">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">দীর্ঘস্থায়ী রোগ</CardTitle>
              <Activity className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-with-chronic">{stats.withChronicConditions}</div>
              <p className="text-xs text-gray-600">Chronic Conditions</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-medications">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ওষুধ সেবন</CardTitle>
              <Stethoscope className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-with-medications">{stats.withMedications}</div>
              <p className="text-xs text-gray-600">On Medications</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>স্বাস্থ্য রেকর্ড তালিকা (Health Records List)</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-record" onClick={() => {
                    resetForm();
                    setSelectedRecord(null);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন রেকর্ড
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedRecord ? 'স্বাস্থ্য রেকর্ড সম্পাদনা' : 'নতুন স্বাস্থ্য রেকর্ড'}
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
                        <Label htmlFor="blood_group">রক্তের গ্রুপ</Label>
                        <Select
                          value={formData.blood_group}
                          onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                        >
                          <SelectTrigger data-testid="select-blood-group">
                            <SelectValue placeholder="নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
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
                    </div>

                    <div>
                      <Label htmlFor="allergies">এলার্জি (কমা দিয়ে আলাদা করুন)</Label>
                      <Input
                        id="allergies"
                        data-testid="input-allergies"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="যেমন: পেনিসিলিন, চিনাবাদাম"
                      />
                    </div>

                    <div>
                      <Label htmlFor="chronic_conditions">দীর্ঘস্থায়ী রোগ (কমা দিয়ে আলাদা করুন)</Label>
                      <Input
                        id="chronic_conditions"
                        data-testid="input-chronic-conditions"
                        value={formData.chronic_conditions}
                        onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                        placeholder="যেমন: হাঁপানি, ডায়াবেটিস"
                      />
                    </div>

                    <div>
                      <Label htmlFor="current_medications">বর্তমান ওষুধ (কমা দিয়ে আলাদা করুন)</Label>
                      <Input
                        id="current_medications"
                        data-testid="input-medications"
                        value={formData.current_medications}
                        onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                        placeholder="যেমন: ইনহেলার, ইনসুলিন"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">জরুরি যোগাযোগ (Emergency Contact)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="emergency_contact_name">নাম</Label>
                          <Input
                            id="emergency_contact_name"
                            data-testid="input-emergency-name"
                            value={formData.emergency_contact_name}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                            placeholder="জরুরি যোগাযোগের নাম"
                          />
                        </div>

                        <div>
                          <Label htmlFor="emergency_contact_relation">সম্পর্ক</Label>
                          <Input
                            id="emergency_contact_relation"
                            data-testid="input-emergency-relation"
                            value={formData.emergency_contact_relation}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                            placeholder="যেমন: পিতা, মাতা"
                          />
                        </div>

                        <div>
                          <Label htmlFor="emergency_contact_phone">ফোন</Label>
                          <Input
                            id="emergency_contact_phone"
                            data-testid="input-emergency-phone"
                            value={formData.emergency_contact_phone}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                            placeholder="+880 1XXX XXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">পারিবারিক ডাক্তার (Family Doctor)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="family_doctor_name">ডাক্তারের নাম</Label>
                          <Input
                            id="family_doctor_name"
                            data-testid="input-doctor-name"
                            value={formData.family_doctor_name}
                            onChange={(e) => setFormData({ ...formData, family_doctor_name: e.target.value })}
                            placeholder="ডাক্তারের নাম"
                          />
                        </div>

                        <div>
                          <Label htmlFor="family_doctor_phone">ফোন</Label>
                          <Input
                            id="family_doctor_phone"
                            data-testid="input-doctor-phone"
                            value={formData.family_doctor_phone}
                            onChange={(e) => setFormData({ ...formData, family_doctor_phone: e.target.value })}
                            placeholder="+880 1XXX XXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="medical_notes">চিকিৎসা নোট</Label>
                      <Textarea
                        id="medical_notes"
                        data-testid="input-medical-notes"
                        value={formData.medical_notes}
                        onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                        placeholder="অতিরিক্ত চিকিৎসা তথ্য লিখুন"
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
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="শিক্ষার্থী, আইডি বা রক্তের গ্রুপ খুঁজুন..."
                  data-testid="input-search"
                  className="pl-10"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-records">লোড হচ্ছে...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                কোনো স্বাস্থ্য রেকর্ড পাওয়া যায়নি
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>শিক্ষার্থী</TableHead>
                    <TableHead>রক্তের গ্রুপ</TableHead>
                    <TableHead>উচ্চতা/ওজন</TableHead>
                    <TableHead>BMI</TableHead>
                    <TableHead>এলার্জি</TableHead>
                    <TableHead>জরুরি যোগাযোগ</TableHead>
                    <TableHead>কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                      <TableCell>
                        <div className="font-medium">{record.students?.name}</div>
                        <div className="text-sm text-gray-500">
                          {record.students?.class} - {record.students?.student_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.blood_group ? (
                          <Badge variant="outline">{record.blood_group}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.height && record.weight ? (
                          <div className="text-sm">
                            {record.height}cm / {record.weight}kg
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.bmi ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{record.bmi}</span>
                            {getBMICategory(record.bmi)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.allergies && record.allergies.length > 0 ? (
                          <Badge variant="outline" className="bg-yellow-50">
                            {record.allergies.length} item(s)
                          </Badge>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.emergency_contact_phone ? (
                          <div className="text-sm">
                            <div className="font-medium">{record.emergency_contact_name}</div>
                            <div className="text-gray-500">{record.emergency_contact_phone}</div>
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
                            onClick={() => handleEdit(record)}
                            data-testid={`button-edit-${record.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছতে চান?')) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            data-testid={`button-delete-${record.id}`}
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
