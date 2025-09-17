import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { ProfileDetailsModal } from '@/components/profile-details-modal';
import { Trash2, Edit, Plus, Users, CheckCircle, AlertCircle, Search, Download } from 'lucide-react';

export default function StudentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    name: '',
    nameInBangla: '',
    fatherName: '',
    motherName: '',
    class: '',
    section: '',
    rollNumber: '',
    phone: '',
    email: '',
    guardianName: '',
    guardianPhone: '',
    presentAddress: '',
    bloodGroup: '',
    gender: '',
    dateOfBirth: '',
  });

  // Fetch students via secure adapter
  const { data: studentsData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { studentsAdapter } = await import('@/lib/data-adapter');
      return studentsAdapter.getStudents();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create student mutation with direct Supabase
  const createStudent = useMutation({
    mutationFn: async (studentData: any) => {
      const { studentsAdapter } = await import('@/lib/data-adapter');
      return studentsAdapter.createStudent(studentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন শিক্ষার্থী যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Student creation failed:', error);
      toast({
        title: "ত্রুটি!",
        description: error.message || "শিক্ষার্থী যোগ করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Update student mutation via secure adapter
  const updateStudent = useMutation({
    mutationFn: async ({ id, ...studentData }: any) => {
      const { studentsAdapter } = await import('@/lib/data-adapter');
      return studentsAdapter.updateStudent(id, studentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "সফল হয়েছে!",
        description: "শিক্ষার্থীর তথ্য আপডেট করা হয়েছে",
      });
      setEditingStudent(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Student update failed:', error);
      toast({
        title: "ত্রুটি!",
        description: error.message || "তথ্য আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Delete student mutation via secure adapter  
  const deleteStudent = useMutation({
    mutationFn: async (id: number) => {
      const { studentsAdapter } = await import('@/lib/data-adapter');
      return studentsAdapter.deleteStudent(id);
    },
    onSuccess: async (data, variables) => {
      console.log('Delete successful for student ID:', variables);
      
      // Invalidate cache to refresh student list
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
      toast({
        title: "সফল হয়েছে!",
        description: "শিক্ষার্থী মুছে ফেলা হয়েছে",
      });
    },
    onError: (error: any) => {
      console.error('❌ Student deletion failed:', error);
      toast({
        title: "ত্রুটি!",
        description: error.message || "মুছে ফেলতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewStudent({
      studentId: '',
      name: '',
      nameInBangla: '',
      fatherName: '',
      motherName: '',
      class: '',
      section: '',
      rollNumber: '',
      phone: '',
      email: '',
      guardianName: '',
      guardianPhone: '',
      presentAddress: '',
      bloodGroup: '',
      gender: '',
      dateOfBirth: '',
    });
    setEditingStudent(null);
  };

  // Filter students based on search and class filter
  const filteredStudents = (studentsData || []).filter((student: any) => {
    if (!student) return false;
    
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'active' && student.status === 'active') ||
                       (activeTab === 'inactive' && student.status === 'inactive');
    
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || 
                          (student.name && student.name.toLowerCase().includes(searchLower)) ||
                          (student.nameInBangla && student.nameInBangla.includes(searchText)) ||
                          (student.studentId && student.studentId.includes(searchText)) ||
                          (student.rollNumber && student.rollNumber.includes(searchText));
    
    const matchesClass = selectedClass === 'all' || student.class === selectedClass;
    
    return matchesTab && matchesSearch && matchesClass;
  });

  // Handle adding a new student
  const handleAddStudent = () => {
    // Debug: Log the form data
    console.log('Form data:', newStudent);
    
    // Validate inputs
    if (!newStudent.name || !newStudent.class || !newStudent.rollNumber) {
      console.log('Validation failed:', {
        name: newStudent.name,
        class: newStudent.class, 
        rollNumber: newStudent.rollNumber
      });
      toast({
        title: "সতর্কতা!",
        description: "শিক্ষার্থীর নাম, শ্রেণী এবং রোল দিতে হবে",
        variant: "destructive",
      });
      return;
    }

    // Generate student ID if not provided and clean up data
    const studentData = {
      ...newStudent,
      studentId: newStudent.studentId || `STU${Date.now()}`,
      dateOfBirth: newStudent.dateOfBirth || null,
      // schoolId handled by adapter securely
    };

    if (editingStudent) {
      updateStudent.mutate({ id: editingStudent.id, ...studentData });
    } else {
      createStudent.mutate(studentData);
    }
  };

  // Handle editing a student
  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setNewStudent({
      studentId: student.studentId || '',
      name: student.name || '',
      nameInBangla: student.nameInBangla || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      class: student.class || '',
      section: student.section || '',
      rollNumber: student.rollNumber || '',
      phone: student.phone || '',
      email: student.email || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      presentAddress: student.presentAddress || '',
      bloodGroup: student.bloodGroup || '',
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || '',
    });
    setIsAddDialogOpen(true);
  };

  // Handle deleting a student
  const handleDeleteStudent = (studentId: number) => {
    console.log('Delete request for student ID:', studentId);
    if (confirm('আপনি কি নিশ্চিত যে এই শিক্ষার্থীকে মুছে ফেলতে চান?')) {
      console.log('User confirmed delete, calling mutation...');
      deleteStudent.mutate(studentId);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">তথ্য লোড হচ্ছে...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">তথ্য লোড করতে সমস্যা হয়েছে</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              পুনরায় চেষ্টা করুন
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Enhanced Header with Statistics */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              শিক্ষার্থী ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-2">
              সকল শিক্ষার্থীদের তথ্য দেখুন, সম্পাদনা করুন এবং নতুন শিক্ষার্থী যোগ করুন
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">মোট শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Array.isArray(studentsData) ? studentsData.length : 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">সক্রিয় শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Array.isArray(studentsData) ? studentsData.filter((s: any) => s.status === 'active').length : 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">নিষ্ক্রিয় শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Array.isArray(studentsData) ? studentsData.filter((s: any) => s.status === 'inactive').length : 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">নতুন যোগদান</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Array.isArray(studentsData) ? 
                      studentsData.filter((s: any) => {
                        const createdDate = new Date(s.createdAt);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return createdDate > thirtyDaysAgo;
                      }).length : 0
                    }
                  </p>
                </div>
                <Plus className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="শিক্ষার্থীর নাম, আইডি বা ফোন নম্বর দিয়ে খুঁজুন..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            এক্সপোর্ট
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  resetForm();
                }}
              >
                <span className="material-icons text-sm">add</span>
                নতুন শিক্ষার্থী
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>নতুন শিক্ষার্থী যোগ করুন</DialogTitle>
                <DialogDescription>
                  শিক্ষার্থীর সকল প্রয়োজনীয় তথ্য নীচের ফর্মে পূরণ করুন।
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="name">নাম (ইংরেজিতে)</Label>
                    <Input 
                      id="name"
                      placeholder="ইংরেজিতে নাম লিখুন"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="nameInBangla">নাম (বাংলায়)</Label>
                    <Input 
                      id="nameInBangla"
                      placeholder="বাংলায় নাম লিখুন"
                      value={newStudent.nameInBangla}
                      onChange={(e) => setNewStudent({...newStudent, nameInBangla: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="fatherName">পিতার নাম</Label>
                    <Input 
                      id="fatherName"
                      placeholder="পিতার নাম"
                      value={newStudent.fatherName}
                      onChange={(e) => setNewStudent({...newStudent, fatherName: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="motherName">মাতার নাম</Label>
                    <Input 
                      id="motherName"
                      placeholder="মাতার নাম"
                      value={newStudent.motherName}
                      onChange={(e) => setNewStudent({...newStudent, motherName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="class">শ্রেণী</Label>
                    <Select 
                      onValueChange={(value) => setNewStudent({...newStudent, class: value})}
                      value={newStudent.class}
                    >
                      <SelectTrigger id="class">
                        <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ষষ্ঠ শ্রেণী">ষষ্ঠ শ্রেণী</SelectItem>
                        <SelectItem value="সপ্তম শ্রেণী">সপ্তম শ্রেণী</SelectItem>
                        <SelectItem value="অষ্টম শ্রেণী">অষ্টম শ্রেণী</SelectItem>
                        <SelectItem value="নবম শ্রেণী">নবম শ্রেণী</SelectItem>
                        <SelectItem value="দশম শ্রেণী">দশম শ্রেণী</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="section">শাখা</Label>
                    <Select 
                      onValueChange={(value) => setNewStudent({...newStudent, section: value})}
                      value={newStudent.section}
                    >
                      <SelectTrigger id="section">
                        <SelectValue placeholder="শাখা নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="rollNumber">রোল নং</Label>
                    <Input 
                      id="rollNumber"
                      placeholder="রোল নম্বর"
                      value={newStudent.rollNumber}
                      onChange={(e) => setNewStudent({...newStudent, rollNumber: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="phone">শিক্ষার্থীর ফোন (ঐচ্ছিক)</Label>
                    <Input 
                      id="phone"
                      placeholder="01XXXXXXXXX"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="email">ইমেইল (ঐচ্ছিক)</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="student@example.com"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="gender">লিঙ্গ</Label>
                    <Select 
                      onValueChange={(value) => setNewStudent({...newStudent, gender: value})}
                      value={newStudent.gender}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">পুরুষ</SelectItem>
                        <SelectItem value="Female">মহিলা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="bloodGroup">রক্তের গ্রুপ (ঐচ্ছিক)</Label>
                    <Select 
                      onValueChange={(value) => setNewStudent({...newStudent, bloodGroup: value})}
                      value={newStudent.bloodGroup}
                    >
                      <SelectTrigger id="bloodGroup">
                        <SelectValue placeholder="রক্তের গ্রুপ" />
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
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="presentAddress">ঠিকানা</Label>
                  <Input 
                    id="presentAddress"
                    placeholder="বর্তমান ঠিকানা"
                    value={newStudent.presentAddress}
                    onChange={(e) => setNewStudent({...newStudent, presentAddress: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>বাতিল</Button>
                <Button onClick={handleAddStudent}>সংরক্ষণ করুন</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-full md:w-64">
                <Input 
                  placeholder="নাম, আইডি বা রোল দিয়ে খুঁজুন" 
                  className="w-full"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              
              <Select 
                onValueChange={setSelectedClass}
                value={selectedClass}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল শ্রেণী</SelectItem>
                  <SelectItem value="ষষ্ঠ শ্রেণী">ষষ্ঠ শ্রেণী</SelectItem>
                  <SelectItem value="সপ্তম শ্রেণী">সপ্তম শ্রেণী</SelectItem>
                  <SelectItem value="অষ্টম শ্রেণী">অষ্টম শ্রেণী</SelectItem>
                  <SelectItem value="নবম শ্রেণী">নবম শ্রেণী</SelectItem>
                  <SelectItem value="দশম শ্রেণী">দশম শ্রেণী</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <span className="material-icons text-gray-500 text-sm">print</span>
                প্রিন্ট
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <span className="material-icons text-gray-500 text-sm">sms</span>
                SMS পাঠান
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">সকল শিক্ষার্থী ({(studentsData || []).length})</TabsTrigger>
              <TabsTrigger value="active">সক্রিয় ({(studentsData || []).filter(s => s.status === 'active').length})</TabsTrigger>
              <TabsTrigger value="inactive">নিষ্ক্রিয় ({(studentsData || []).filter(s => s.status === 'inactive').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredStudents.length > 0 ? (
                <div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">ক্রম</TableHead>
                          <TableHead className="w-[80px]">আইডি</TableHead>
                          <TableHead className="min-w-[200px]">নাম</TableHead>
                          <TableHead>শ্রেণী/শাখা</TableHead>
                          <TableHead>রোল</TableHead>
                          <TableHead>অবস্থা</TableHead>
                          <TableHead className="text-right">পদক্ষেপ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student, index) => (
                          <TableRow key={student.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{student.studentId}</TableCell>
                            <TableCell>
                              <ProfileDetailsModal
                                trigger={
                                  <button className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors w-full text-left">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {student.name ? student.name.split(' ').map((n: string) => n[0] || '').join('').slice(0, 2) || 'NA' : 'NA'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">{student.nameInBangla || student.name}</div>
                                      <div className="text-xs text-gray-500">{student.name}</div>
                                    </div>
                                  </button>
                                }
                                profile={{
                                  id: student.id,
                                  name: student.name,
                                  studentId: student.studentId,
                                  email: student.email,
                                  phone: student.phone,
                                  address: student.address,
                                  dateOfBirth: student.dateOfBirth,
                                  gender: student.gender,
                                  class: student.class,
                                  section: student.section,
                                  rollNumber: student.rollNumber,
                                  admissionDate: student.createdAt
                                }}
                                type="student"
                                language="bn"
                              />
                            </TableCell>
                            <TableCell>{student.class} / {student.section}</TableCell>
                            <TableCell>{student.rollNumber}</TableCell>
                            <TableCell>
                              {student.status === 'active' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">সক্রিয়</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">নিষ্ক্রিয়</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleEditStudent(student)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteStudent(student.id)}
                                  disabled={deleteStudent.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-icons text-gray-400 text-5xl mb-2">person_off</span>
                  <p className="text-gray-500 mb-4">কোন শিক্ষার্থী পাওয়া যায়নি</p>
                  <Button onClick={() => {
                    setSearchText('');
                    setSelectedClass('all');
                    setActiveTab('all');
                  }}>সকল ফিল্টার রিসেট করুন</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppShell>
  );
}
