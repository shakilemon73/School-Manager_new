import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Phone,
  Mail
} from 'lucide-react';

// Teacher form schema
const teacherSchema = z.object({
  name: z.string().min(2, 'নাম আবশ্যক'),
  nameInBangla: z.string().min(2, 'বাংলা নাম আবশ্যক'),
  teacherId: z.string().min(1, 'শিক্ষক আইডি আবশ্যক'),
  designation: z.string().min(1, 'পদবী আবশ্যক'),
  department: z.string().min(1, 'বিভাগ আবশ্যক'),
  subject: z.string().min(1, 'বিষয় আবশ্যক'),
  phone: z.string().min(11, 'ফোন নম্বর আবশ্যক'),
  email: z.string().email('সঠিক ইমেইল দিন').optional().or(z.literal('')),
  address: z.string().min(1, 'ঠিকানা আবশ্যক'),
  dateOfBirth: z.string().min(1, 'জন্ম তারিখ আবশ্যক'),
  joiningDate: z.string().min(1, 'যোগদানের তারিখ আবশ্যক'),
  salary: z.string().min(1, 'বেতন আবশ্যক'),
  qualification: z.string().min(1, 'শিক্ষাগত যোগ্যতা আবশ্যক'),
  experience: z.string().min(1, 'অভিজ্ঞতা আবশ্যক'),
  isActive: z.boolean().default(true),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

const designations = [
  'প্রধান শিক্ষক', 'সহকারী প্রধান শিক্ষক', 'সহকারী শিক্ষক', 
  'প্রভাষক', 'সহযোগী অধ্যাপক', 'অধ্যাপক', 'বিষয় শিক্ষক'
];

const departments = [
  'বাংলা', 'ইংরেজি', 'গণিত', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান',
  'ইতিহাস', 'ভূগোল', 'সমাজবিজ্ঞান', 'অর্থনীতি', 'রাষ্ট্রবিজ্ঞান',
  'দর্শন', 'ইসলামের ইতিহাস', 'আরবি', 'সংস্কৃত', 'কম্পিউটার বিজ্ঞান',
  'কৃষিবিজ্ঞান', 'গার্হস্থ্য বিজ্ঞান', 'শারীরিক শিক্ষা'
];

export default function TeachersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);

  // Fetch teachers directly from Supabase
  const { data: teachersData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching teachers directly from Supabase...');
      const teachers = await db.getTeachers(1);
      console.log('✅ Teachers from Supabase:', teachers?.length || 0);
      return teachers || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch teacher stats directly from Supabase
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching teacher stats directly from Supabase...');
      const stats = await db.getTeacherStats(1);
      console.log('✅ Teacher stats from Supabase:', stats);
      return stats || { total_teachers: 0, active_teachers: 0, inactive_teachers: 0 };
    },
  });

  // Create teacher mutation with direct Supabase
  const createTeacher = useMutation({
    mutationFn: async (teacherData: any) => {
      console.log('🔄 Creating teacher in Supabase...', teacherData);
      const teacherWithSchool = { ...teacherData, school_id: 1 };
      const newTeacher = await db.createTeacher(teacherWithSchool);
      console.log('✅ Teacher created in Supabase:', newTeacher);
      return newTeacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন শিক্ষক যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি!",
        description: "শিক্ষক যোগ করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Update teacher mutation with direct Supabase
  const updateTeacher = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('🔄 Updating teacher in Supabase...', { id, data });
      const updatedTeacher = await db.updateTeacher(id, data);
      console.log('✅ Teacher updated in Supabase:', updatedTeacher);
      return updatedTeacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "শিক্ষকের তথ্য আপডেট করা হয়েছে",
      });
      setEditingTeacher(null);
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি!",
        description: "শিক্ষকের তথ্য আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Delete teacher mutation with direct Supabase
  const deleteTeacher = useMutation({
    mutationFn: async (id: number) => {
      console.log('🔄 Deleting teacher from Supabase...', id);
      const result = await db.deleteTeacher(id);
      console.log('✅ Teacher deleted from Supabase:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "শিক্ষক মুছে ফেলা হয়েছে",
      });
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি!",
        description: "শিক্ষক মুছতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      nameInBangla: '',
      teacherId: '',
      designation: '',
      department: '',
      subject: '',
      phone: '',
      email: '',
      address: '',
      dateOfBirth: '',
      joiningDate: '',
      salary: '',
      qualification: '',
      experience: '',
      isActive: true,
    },
  });

  const onSubmit = (data: TeacherFormData) => {
    if (editingTeacher) {
      updateTeacher.mutate({ id: editingTeacher.id, data });
    } else {
      createTeacher.mutate(data);
    }
  };

  const handleEdit = (teacher: any) => {
    setEditingTeacher(teacher);
    form.reset({
      name: teacher.name || '',
      nameInBangla: teacher.nameInBangla || '',
      teacherId: teacher.teacherId || '',
      designation: teacher.designation || '',
      department: teacher.department || '',
      subject: teacher.subject || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      address: teacher.address || '',
      dateOfBirth: teacher.dateOfBirth || '',
      joiningDate: teacher.joiningDate || '',
      salary: teacher.salary || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || '',
      isActive: teacher.isActive ?? true,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই শিক্ষককে মুছে ফেলতে চান?')) {
      deleteTeacher.mutate(id);
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingTeacher(null);
  };

  // Filter teachers based on search and filters
  const filteredTeachers = Array.isArray(teachersData) ? teachersData.filter((teacher: any) => {
    const matchesSearch = teacher.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                         teacher.nameInBangla?.includes(searchText) ||
                         teacher.teacherId?.toLowerCase().includes(searchText.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || teacher.department === selectedDepartment;
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'active' && teacher.isActive) ||
                      (activeTab === 'inactive' && !teacher.isActive);
    
    return matchesSearch && matchesDepartment && matchesTab;
  }) : [];

  if (isLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">শিক্ষকদের তথ্য লোড হচ্ছে...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">শিক্ষক ব্যবস্থাপনা</h1>
            <p className="text-gray-600 mt-2">সকল শিক্ষকের তথ্য পরিচালনা করুন</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                নতুন শিক্ষক যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTeacher ? 'শিক্ষকের তথ্য সম্পাদনা' : 'নতুন শিক্ষক যোগ করুন'}
                </DialogTitle>
                <DialogDescription>
                  {editingTeacher ? 'শিক্ষকের তথ্য আপডেট করুন' : 'নতুন শিক্ষকের সম্পূর্ণ তথ্য প্রদান করুন'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>নাম (ইংরেজি)</FormLabel>
                          <FormControl>
                            <Input placeholder="শিক্ষকের নাম" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nameInBangla"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>নাম (বাংলা)</FormLabel>
                          <FormControl>
                            <Input placeholder="শিক্ষকের বাংলা নাম" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="teacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>শিক্ষক আইডি</FormLabel>
                          <FormControl>
                            <Input placeholder="T001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>পদবী</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="পদবী নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {designations.map(designation => (
                                <SelectItem key={designation} value={designation}>
                                  {designation}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>বিভাগ</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map(department => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>বিষয়</FormLabel>
                          <FormControl>
                            <Input placeholder="প্রধান বিষয়" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ফোন নম্বর</FormLabel>
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ইমেইল (ঐচ্ছিক)</FormLabel>
                          <FormControl>
                            <Input placeholder="teacher@school.edu.bd" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ঠিকানা</FormLabel>
                        <FormControl>
                          <Input placeholder="সম্পূর্ণ ঠিকানা" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>জন্ম তারিখ</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="joiningDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>যোগদানের তারিখ</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বেতন (টাকা)</FormLabel>
                        <FormControl>
                          <Input placeholder="50000" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>শিক্ষাগত যোগ্যতা</FormLabel>
                        <FormControl>
                          <Input placeholder="এমএ, বিএড" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>অভিজ্ঞতা</FormLabel>
                        <FormControl>
                          <Input placeholder="৫ বছর" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={createTeacher.isPending || updateTeacher.isPending}>
                      {createTeacher.isPending || updateTeacher.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                       editingTeacher ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট শিক্ষক</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">সক্রিয় শিক্ষক</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">নিষ্ক্রিয় শিক্ষক</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.inactive || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="নাম, আইডি বা বিষয় দিয়ে খুঁজুন..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল বিভাগ</SelectItem>
                  {departments.map(department => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                এক্সপোর্ট
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">সকল শিক্ষক ({filteredTeachers.length})</TabsTrigger>
            <TabsTrigger value="active">সক্রিয় ({filteredTeachers.filter((t: any) => t.isActive).length})</TabsTrigger>
            <TabsTrigger value="inactive">নিষ্ক্রিয় ({filteredTeachers.filter((t: any) => !t.isActive).length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Teachers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শিক্ষকের তথ্য</TableHead>
                  <TableHead>পদবী ও বিভাগ</TableHead>
                  <TableHead>যোগাযোগ</TableHead>
                  <TableHead>যোগদান</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher: any) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.nameInBangla}</div>
                        <div className="text-xs text-gray-400">ID: {teacher.teacherId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{teacher.designation}</div>
                        <div className="text-sm text-gray-500">{teacher.department}</div>
                        <div className="text-xs text-gray-400">{teacher.subject}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="w-3 h-3 mr-1" />
                          {teacher.phone}
                        </div>
                        {teacher.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {teacher.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('bn-BD') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={teacher.isActive ? "default" : "secondary"}>
                        {teacher.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            সক্রিয়
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            নিষ্ক্রিয়
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(teacher)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(teacher.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredTeachers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো শিক্ষক পাওয়া যায়নি</h3>
                <p className="mt-1 text-sm text-gray-500">নতুন শিক্ষক যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}