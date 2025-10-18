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
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { 
  Plus, 
  Syringe,
  Shield,
  Calendar,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock
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

interface Vaccination {
  id: number;
  student_id: number;
  vaccine_name: string;
  vaccine_name_bn?: string;
  dose_number: number;
  vaccination_date: string;
  next_dose_date?: string;
  batch_number?: string;
  administered_by?: string;
  location?: string;
  side_effects?: string;
  notes?: string;
  students?: Student;
}

export default function VaccinationsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterVaccine, setFilterVaccine] = useState('all');
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    vaccine_name: '',
    vaccine_name_bn: '',
    dose_number: 1,
    vaccination_date: format(new Date(), 'yyyy-MM-dd'),
    next_dose_date: '',
    batch_number: '',
    administered_by: '',
    location: '',
    side_effects: '',
    notes: '',
  });

  // Translations
  const t = {
    title: language === 'bn' ? 'টিকাকরণ ব্যবস্থাপনা' : 'Vaccinations Management',
    totalVaccinations: language === 'bn' ? 'মোট টিকা' : 'Total Vaccinations',
    students: language === 'bn' ? 'শিক্ষার্থী' : 'Vaccinated Students',
    upcomingDoses: language === 'bn' ? 'আগামী ডোজ' : 'Upcoming Doses',
    sideEffects: language === 'bn' ? 'পার্শ্বপ্রতিক্রিয়া' : 'With Side Effects',
    addVaccination: language === 'bn' ? 'টিকা যোগ করুন' : 'Add Vaccination',
    search: language === 'bn' ? 'অনুসন্ধান করুন' : 'Search',
    searchPlaceholder: language === 'bn' ? 'শিক্ষার্থীর নাম, টিকা বা আইডি দিয়ে খুঁজুন...' : 'Search by student, vaccine or ID...',
    filterByVaccine: language === 'bn' ? 'টিকা দিয়ে ফিল্টার করুন' : 'Filter by Vaccine',
    all: language === 'bn' ? 'সব' : 'All',
    student: language === 'bn' ? 'শিক্ষার্থী' : 'Student',
    vaccine: language === 'bn' ? 'টিকা' : 'Vaccine',
    dose: language === 'bn' ? 'ডোজ' : 'Dose',
    date: language === 'bn' ? 'তারিখ' : 'Date',
    nextDose: language === 'bn' ? 'পরবর্তী ডোজ' : 'Next Dose',
    actions: language === 'bn' ? 'কার্যক্রম' : 'Actions',
    overdue: language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue',
    dueSoon: language === 'bn' ? 'শীঘ্রই প্রয়োজন' : 'Due Soon',
    scheduled: language === 'bn' ? 'নির্ধারিত' : 'Scheduled',
    edit: language === 'bn' ? 'সম্পাদনা' : 'Edit',
    delete: language === 'bn' ? 'মুছুন' : 'Delete',
    noRecords: language === 'bn' ? 'কোন টিকা রেকর্ড পাওয়া যায়নি' : 'No vaccination records found',
    loading: language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...',
    success: language === 'bn' ? 'সফল' : 'Success',
    error: language === 'bn' ? 'ত্রুটি' : 'Error',
    vaccinationUpdated: language === 'bn' ? 'টিকা রেকর্ড আপডেট হয়েছে' : 'Vaccination record updated',
    vaccinationAdded: language === 'bn' ? 'টিকা রেকর্ড যোগ করা হয়েছে' : 'Vaccination record added',
    vaccinationDeleted: language === 'bn' ? 'টিকা রেকর্ড মুছে ফেলা হয়েছে' : 'Vaccination record deleted',
    selectStudent: language === 'bn' ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student',
    vaccineName: language === 'bn' ? 'টিকার নাম' : 'Vaccine Name',
    vaccineNameBn: language === 'bn' ? 'টিকার নাম (বাংলা)' : 'Vaccine Name (Bangla)',
    doseNumber: language === 'bn' ? 'ডোজ নম্বর' : 'Dose Number',
    vaccinationDate: language === 'bn' ? 'টিকার তারিখ' : 'Vaccination Date',
    nextDoseDate: language === 'bn' ? 'পরবর্তী ডোজ তারিখ' : 'Next Dose Date',
    batchNumber: language === 'bn' ? 'ব্যাচ নম্বর' : 'Batch Number',
    administeredBy: language === 'bn' ? 'প্রদানকারী' : 'Administered By',
    location: language === 'bn' ? 'স্থান' : 'Location',
    notes: language === 'bn' ? 'নোট' : 'Notes',
    cancel: language === 'bn' ? 'বাতিল' : 'Cancel',
    save: language === 'bn' ? 'সংরক্ষণ করুন' : 'Save',
    editVaccination: language === 'bn' ? 'টিকা সম্পাদনা করুন' : 'Edit Vaccination',
    confirmDelete: language === 'bn' ? 'এই টিকা রেকর্ড মুছে ফেলতে চান?' : 'Delete this vaccination record?',
  };

  // Migrated to direct Supabase: Students GET
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
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

  const { data: vaccinations = [], isLoading } = useQuery({
    queryKey: ['/api/vaccinations', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccinations')
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
        .order('vaccination_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (newVaccination: any) => {
      
      const vaccinationData = {
        student_id: parseInt(newVaccination.student_id),
        vaccine_name: newVaccination.vaccine_name,
        vaccine_name_bn: newVaccination.vaccine_name_bn || null,
        dose_number: parseInt(newVaccination.dose_number),
        vaccination_date: newVaccination.vaccination_date,
        next_dose_date: newVaccination.next_dose_date || null,
        batch_number: newVaccination.batch_number || null,
        administered_by: newVaccination.administered_by || null,
        location: newVaccination.location || null,
        side_effects: newVaccination.side_effects || null,
        notes: newVaccination.notes || null,
        school_id: schoolId,
      };

      if (selectedVaccination) {
        const { data, error } = await supabase
          .from('vaccinations')
          .update(vaccinationData)
          .eq('id', selectedVaccination.id)
          .eq('school_id', schoolId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('vaccinations')
          .insert([vaccinationData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations'] });
      toast({ 
        title: t.success, 
        description: selectedVaccination ? t.vaccinationUpdated : t.vaccinationAdded 
      });
      setIsDialogOpen(false);
      resetForm();
      setSelectedVaccination(null);
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('vaccinations')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations'] });
      toast({ title: t.success, description: t.vaccinationDeleted });
    },
    onError: (error: any) => {
      toast({ title: t.error, description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      vaccine_name: '',
      vaccine_name_bn: '',
      dose_number: 1,
      vaccination_date: format(new Date(), 'yyyy-MM-dd'),
      next_dose_date: '',
      batch_number: '',
      administered_by: '',
      location: '',
      side_effects: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  const handleEdit = (vaccination: Vaccination) => {
    setSelectedVaccination(vaccination);
    setFormData({
      student_id: vaccination.student_id.toString(),
      vaccine_name: vaccination.vaccine_name,
      vaccine_name_bn: vaccination.vaccine_name_bn || '',
      dose_number: vaccination.dose_number,
      vaccination_date: vaccination.vaccination_date,
      next_dose_date: vaccination.next_dose_date || '',
      batch_number: vaccination.batch_number || '',
      administered_by: vaccination.administered_by || '',
      location: vaccination.location || '',
      side_effects: vaccination.side_effects || '',
      notes: vaccination.notes || '',
    });
    setIsDialogOpen(true);
  };

  const getNextDoseBadge = (nextDoseDate?: string) => {
    if (!nextDoseDate) return null;
    const today = new Date();
    const nextDate = new Date(nextDoseDate);
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return <Badge variant="destructive" data-testid="badge-overdue">{t.overdue}</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-500" data-testid="badge-due-soon">{t.dueSoon}</Badge>;
    } else {
      return <Badge className="bg-blue-500" data-testid="badge-scheduled">{t.scheduled}</Badge>;
    }
  };

  const uniqueVaccines = Array.from(new Set(vaccinations.map(v => v.vaccine_name)));

  const filteredVaccinations = vaccinations.filter(vaccination => {
    const matchesSearch = searchText === '' || 
      vaccination.students?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      vaccination.vaccine_name.toLowerCase().includes(searchText.toLowerCase()) ||
      vaccination.students?.student_id.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesFilter = filterVaccine === 'all' || vaccination.vaccine_name === filterVaccine;
    
    return matchesSearch && matchesFilter;
  });

  const calculateStats = () => {
    const totalVaccinations = vaccinations.length;
    const uniqueStudents = new Set(vaccinations.map(v => v.student_id)).size;
    const upcomingDoses = vaccinations.filter(v => {
      if (!v.next_dose_date) return false;
      const nextDate = new Date(v.next_dose_date);
      const today = new Date();
      return nextDate >= today;
    }).length;
    const withSideEffects = vaccinations.filter(v => v.side_effects && v.side_effects.trim() !== '').length;

    return { totalVaccinations, uniqueStudents, upcomingDoses, withSideEffects };
  };

  const stats = calculateStats();

  return (
    <AppShell>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-page-title">
              {t.title}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.totalVaccinations}</CardTitle>
              <Syringe className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-vaccinations">{stats.totalVaccinations}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-students">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.students}</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-unique-students">{stats.uniqueStudents}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-upcoming">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.upcomingDoses}</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-upcoming-doses">{stats.upcomingDoses}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-side-effects">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.sideEffects}</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-with-side-effects">{stats.withSideEffects}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t.title}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-vaccination" onClick={() => {
                    resetForm();
                    setSelectedVaccination(null);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t.addVaccination}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedVaccination ? t.editVaccination : t.addVaccination}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="student_id">{t.student} *</Label>
                      <Select
                        value={formData.student_id}
                        onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-student">
                          <SelectValue placeholder={t.selectStudent} />
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vaccine_name">{t.vaccineName} *</Label>
                        <Input
                          id="vaccine_name"
                          data-testid="input-vaccine-name"
                          value={formData.vaccine_name}
                          onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="vaccine_name_bn">{t.vaccineNameBn}</Label>
                        <Input
                          id="vaccine_name_bn"
                          data-testid="input-vaccine-name-bn"
                          value={formData.vaccine_name_bn}
                          onChange={(e) => setFormData({ ...formData, vaccine_name_bn: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="dose_number">{t.doseNumber} *</Label>
                        <Input
                          id="dose_number"
                          type="number"
                          min="1"
                          data-testid="input-dose-number"
                          value={formData.dose_number}
                          onChange={(e) => setFormData({ ...formData, dose_number: parseInt(e.target.value) })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="vaccination_date">{t.vaccinationDate} *</Label>
                        <Input
                          id="vaccination_date"
                          type="date"
                          data-testid="input-vaccination-date"
                          value={formData.vaccination_date}
                          onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="next_dose_date">{t.nextDoseDate}</Label>
                        <Input
                          id="next_dose_date"
                          type="date"
                          data-testid="input-next-dose-date"
                          value={formData.next_dose_date}
                          onChange={(e) => setFormData({ ...formData, next_dose_date: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="batch_number">{t.batchNumber}</Label>
                        <Input
                          id="batch_number"
                          data-testid="input-batch-number"
                          value={formData.batch_number}
                          onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="administered_by">{t.administeredBy}</Label>
                        <Input
                          id="administered_by"
                          data-testid="input-administered-by"
                          value={formData.administered_by}
                          onChange={(e) => setFormData({ ...formData, administered_by: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="location">{t.location}</Label>
                        <Input
                          id="location"
                          data-testid="input-location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="side_effects">{t.sideEffects}</Label>
                      <Textarea
                        id="side_effects"
                        data-testid="input-side-effects"
                        value={formData.side_effects}
                        onChange={(e) => setFormData({ ...formData, side_effects: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">{t.notes}</Label>
                      <Textarea
                        id="notes"
                        data-testid="input-notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        {t.cancel}
                      </Button>
                      <Button 
                        type="submit" 
                        data-testid="button-submit"
                        disabled={createOrUpdateMutation.isPending}
                      >
                        {createOrUpdateMutation.isPending ? `${t.save}...` : t.save}
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
                  placeholder={t.searchPlaceholder}
                  data-testid="input-search"
                  className="pl-10"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Select value={filterVaccine} onValueChange={setFilterVaccine}>
                <SelectTrigger className="w-48" data-testid="select-filter-vaccine">
                  <SelectValue placeholder={t.filterByVaccine} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {uniqueVaccines.map((vaccine) => (
                    <SelectItem key={vaccine} value={vaccine}>
                      {vaccine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-vaccinations">{t.loading}</div>
            ) : filteredVaccinations.length === 0 ? (
              <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                {t.noRecords}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.student}</TableHead>
                    <TableHead>{t.vaccine}</TableHead>
                    <TableHead>{t.dose}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.nextDose}</TableHead>
                    <TableHead>{t.administeredBy}</TableHead>
                    <TableHead>{t.sideEffects}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVaccinations.map((vaccination) => (
                    <TableRow key={vaccination.id} data-testid={`row-vaccination-${vaccination.id}`}>
                      <TableCell>
                        <div className="font-medium">{vaccination.students?.name}</div>
                        <div className="text-sm text-gray-500">
                          {vaccination.students?.class} - {vaccination.students?.student_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{vaccination.vaccine_name}</div>
                        {vaccination.vaccine_name_bn && (
                          <div className="text-sm text-gray-500">{vaccination.vaccine_name_bn}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Dose {vaccination.dose_number}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(vaccination.vaccination_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        {vaccination.next_dose_date ? (
                          <div>
                            <div className="text-sm">{format(new Date(vaccination.next_dose_date), 'dd MMM yyyy')}</div>
                            {getNextDoseBadge(vaccination.next_dose_date)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{vaccination.administered_by || '-'}</TableCell>
                      <TableCell>
                        {vaccination.side_effects ? (
                          <Badge variant="outline" className="bg-orange-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vaccination)}
                            data-testid={`button-edit-${vaccination.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(t.confirmDelete)) {
                                deleteMutation.mutate(vaccination.id);
                              }
                            }}
                            data-testid={`button-delete-${vaccination.id}`}
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
