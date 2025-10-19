// Migrated to direct Supabase: Academic Year Settings with full CRUD
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface AcademicYear {
  id: number;
  name: string;
  name_bn: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
  status: string;
  school_id: number;
}

interface Term {
  id: number;
  name: string;
  name_bn: string;
  start_date: string;
  end_date: string;
  academic_year_id: number;
  status: string;
}

export default function AcademicYearPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('current');
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    start_date: '',
    end_date: '',
    is_active: false,
  });

  // Fetch current academic year
  const { data: currentYear, isLoading: currentLoading } = useQuery({
    queryKey: ['current-academic-year', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as AcademicYear | null;
    }
  });

  // Fetch all academic years
  const { data: allYears = [], isLoading: allYearsLoading } = useQuery({
    queryKey: ['academic-years-all', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as AcademicYear[];
    }
  });

  // Fetch terms for current year
  const { data: currentTerms = [] } = useQuery({
    queryKey: ['current-year-terms', schoolId, currentYear?.id],
    queryFn: async () => {
      if (!currentYear?.id) return [];
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('academic_year_id', currentYear.id)
        .order('start_date');
      
      if (error) throw error;
      return data as Term[];
    },
    enabled: !!currentYear?.id
  });

  // Create academic year mutation
  const createYearMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('academic_years')
        .insert([{
          ...data,
          school_id: schoolId,
          is_current: false,
          status: 'draft'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years-all'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast({ title: 'সফল', description: 'শিক্ষাবর্ষ তৈরি হয়েছে' });
      setFormData({ name: '', name_bn: '', start_date: '', end_date: '', is_active: false });
      setActiveTab('previous');
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Set current year mutation
  const setCurrentYearMutation = useMutation({
    mutationFn: async (yearId: number) => {
      // First, unset all years as current
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('school_id', schoolId);
      
      // Then set the selected year as current
      const { error } = await supabase
        .from('academic_years')
        .update({ is_current: true, is_active: true, status: 'active' })
        .eq('id', yearId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years-all'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast({ title: 'সফল', description: 'বর্তমান শিক্ষাবর্ষ সেট করা হয়েছে' });
    }
  });

  // Delete academic year mutation
  const deleteYearMutation = useMutation({
    mutationFn: async (yearId: number) => {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', yearId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years-all'] });
      toast({ title: 'সফল', description: 'শিক্ষাবর্ষ মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createYearMutation.mutate(formData);
  };

  const handleSetCurrent = (yearId: number) => {
    setCurrentYearMutation.mutate(yearId);
  };

  const handleDelete = (yearId: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই শিক্ষাবর্ষটি মুছে ফেলতে চান?')) {
      deleteYearMutation.mutate(yearId);
    }
  };

  const renderCurrentAcademicYearTab = () => {
    if (currentLoading) {
      return <Card><CardContent className="p-6">লোড হচ্ছে...</CardContent></Card>;
    }

    if (!currentYear) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">কোন সক্রিয় শিক্ষাবর্ষ নেই</p>
            <Button className="mt-4" onClick={() => setActiveTab('create')} data-testid="button-create-first-year">
              <Plus className="w-4 h-4 mr-2" />
              প্রথম শিক্ষাবর্ষ তৈরি করুন
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>বর্তমান শিক্ষাবর্ষ</CardTitle>
          <CardDescription>সক্রিয় একাডেমিক বছরের বিবরণ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div>
                <h3 className="font-medium text-lg" data-testid="text-current-year">{currentYear.name}</h3>
                <p className="text-sm text-muted-foreground">{currentYear.name_bn}</p>
              </div>
              <Badge variant="default">সক্রিয়</Badge>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">মূল তথ্য</h3>
                <dl className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 items-center">
                    <dt className="text-sm font-medium text-muted-foreground">শুরুর তারিখ</dt>
                    <dd className="col-span-2">{format(new Date(currentYear.start_date), 'dd/MM/yyyy')}</dd>
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <dt className="text-sm font-medium text-muted-foreground">শেষের তারিখ</dt>
                    <dd className="col-span-2">{format(new Date(currentYear.end_date), 'dd/MM/yyyy')}</dd>
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <dt className="text-sm font-medium text-muted-foreground">স্ট্যাটাস</dt>
                    <dd className="col-span-2">
                      <Badge>{currentYear.status}</Badge>
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="font-medium mb-4">টার্মসমূহ</h3>
                {currentTerms.length > 0 ? (
                  <div className="space-y-2">
                    {currentTerms.map((term) => (
                      <div key={term.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{term.name_bn || term.name}</span>
                        <Badge variant="outline" className="text-xs">{term.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">কোন টার্ম তৈরি হয়নি</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCreateAcademicYearTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>নতুন শিক্ষাবর্ষ তৈরি করুন</CardTitle>
        <CardDescription>একটি নতুন একাডেমিক বছর যোগ করুন</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">শিক্ষাবর্ষের নাম (ইংরেজি) *</Label>
              <Input
                id="name"
                data-testid="input-year-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_bn">শিক্ষাবর্ষের নাম (বাংলা) *</Label>
              <Input
                id="name_bn"
                data-testid="input-year-name-bn"
                value={formData.name_bn}
                onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                placeholder="২০২৬"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">শুরুর তারিখ *</Label>
              <Input
                id="start_date"
                data-testid="input-start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">শেষের তারিখ *</Label>
              <Input
                id="end_date"
                data-testid="input-end-date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              data-testid="switch-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active" className="font-normal">
              সক্রিয় হিসেবে চিহ্নিত করুন
            </Label>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => setActiveTab('current')}>
              বাতিল
            </Button>
            <Button type="submit" data-testid="button-submit" disabled={createYearMutation.isPending}>
              {createYearMutation.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderPreviousAcademicYearsTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>সকল শিক্ষাবর্ষ</CardTitle>
        <CardDescription>পূর্ববর্তী এবং ভবিষ্যত শিক্ষাবর্ষ পরিচালনা করুন</CardDescription>
      </CardHeader>
      <CardContent>
        {allYearsLoading ? (
          <div className="text-center py-8">লোড হচ্ছে...</div>
        ) : allYears.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            কোন শিক্ষাবর্ষ পাওয়া যায়নি
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>শিক্ষাবর্ষ</TableHead>
                <TableHead>শুরুর তারিখ</TableHead>
                <TableHead>শেষের তারিখ</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>বর্তমান</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allYears.map((year) => (
                <TableRow key={year.id} data-testid={`row-year-${year.id}`}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{year.name}</div>
                      <div className="text-sm text-muted-foreground">{year.name_bn}</div>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(year.start_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{format(new Date(year.end_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={year.status === 'active' ? 'default' : 'secondary'}>
                      {year.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {year.is_current ? (
                      <Badge variant="default">বর্তমান</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetCurrent(year.id)}
                        data-testid={`button-set-current-${year.id}`}
                      >
                        বর্তমান করুন
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(year.id)}
                        disabled={year.is_current}
                        data-testid={`button-delete-${year.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );

  return (
    <AppShell>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-page-title">
              <Calendar className="w-6 h-6" />
              শিক্ষাবর্ষ ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground">একাডেমিক বছর তৈরি এবং পরিচালনা করুন</p>
          </div>
          <Button onClick={() => setActiveTab('create')} data-testid="button-new-year">
            <Plus className="w-4 h-4 mr-2" />
            নতুন শিক্ষাবর্ষ
          </Button>
        </div>
        
        <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current" data-testid="tab-current">বর্তমান বছর</TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create">নতুন তৈরি করুন</TabsTrigger>
            <TabsTrigger value="previous" data-testid="tab-all">সকল বছর</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-6">
            {renderCurrentAcademicYearTab()}
          </TabsContent>
          
          <TabsContent value="create" className="mt-6">
            {renderCreateAcademicYearTab()}
          </TabsContent>
          
          <TabsContent value="previous" className="mt-6">
            {renderPreviousAcademicYearsTab()}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
