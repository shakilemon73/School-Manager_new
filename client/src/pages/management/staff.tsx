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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { ProfileDetailsModal } from '@/components/profile-details-modal';
import { Trash2, Edit, Plus, Users, CheckCircle, AlertCircle, Search, Download } from 'lucide-react';

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({
    staffId: '',
    name: '',
    nameInBangla: '',
    department: '',
    designation: '',
    phone: '',
    email: '',
    address: '',
    joinDate: '',
    salary: '',
  });

  const getCurrentSchoolId = async (): Promise<number> => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  // Fetch staff from Supabase
  const { data: staffData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      console.log('🔍 Fetching staff data for school ID:', schoolId);
      try {
        const data = await db.getStaff(schoolId);
        console.log('✅ Staff data received:', data);
        return data;
      } catch (error) {
        console.error('❌ Error fetching staff:', error);
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (staff: any) => {
      const schoolId = await getCurrentSchoolId();
      const staffData = {
        ...staff,
        staffId: staff.staffId || `STF${Date.now()}`,
        salary: parseInt(staff.salary) || 0,
        joinDate: staff.joinDate || new Date().toISOString().split('T')[0],
        status: 'active',
        schoolId
      };
      
      return await db.createStaff(staffData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "কর্মচারী যোগ করা হয়েছে",
        description: "নতুন কর্মচারী সফলভাবে যোগ করা হয়েছে।",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "কর্মচারী যোগ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, ...staff }: any) => {
      const staffData = {
        ...staff,
        salary: parseInt(staff.salary) || 0,
      };
      
      return await db.updateStaff(id, staffData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "কর্মচারী আপডেট করা হয়েছে",
        description: "কর্মচারীর তথ্য সফলভাবে আপডেট করা হয়েছে।",
      });
      setEditingStaff(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "কর্মচারী আপডেট করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      return await db.deleteStaff(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "কর্মচারী মুছে ফেলা হয়েছে",
        description: "কর্মচারী সফলভাবে মুছে ফেলা হয়েছে।",
      });
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "কর্মচারী মুছে ফেলতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, ...newStaff });
    } else {
      createStaffMutation.mutate(newStaff);
    }
  };

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setNewStaff({
      staffId: staff.staffId || '',
      name: staff.name || '',
      nameInBangla: staff.nameInBangla || '',
      department: staff.department || '',
      designation: staff.designation || '',
      phone: staff.phone || '',
      email: staff.email || '',
      address: staff.address || '',
      joinDate: staff.joinDate || '',
      salary: staff.salary?.toString() || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই কর্মচারী মুছে ফেলতে চান?')) {
      deleteStaffMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setNewStaff({
      staffId: '',
      name: '',
      nameInBangla: '',
      department: '',
      designation: '',
      phone: '',
      email: '',
      address: '',
      joinDate: '',
      salary: '',
    });
    setEditingStaff(null);
  };

  // Filter staff based on search and department filter
  const filteredStaff = (staffData || []).filter((staff: any) => {
    if (!staff) return false;
    
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'active' && staff.status === 'active') ||
                       (activeTab === 'inactive' && staff.status === 'inactive');
    
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || 
                          (staff.name && staff.name.toLowerCase().includes(searchLower)) ||
                          (staff.nameInBangla && staff.nameInBangla.includes(searchText)) ||
                          (staff.staffId && staff.staffId.includes(searchText)) ||
                          (staff.phone && staff.phone.includes(searchText));
    
    const matchesDepartment = selectedDepartment === 'all' || staff.department === selectedDepartment;
    
    return matchesTab && matchesSearch && matchesDepartment;
  });

  if (error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ডেটা লোড করতে সমস্যা হয়েছে
            </h3>
            <Button onClick={() => refetch()} variant="outline">
              আবার চেষ্টা করুন
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
              কর্মচারী ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-2">
              সকল কর্মচারীদের তথ্য দেখুন, সম্পাদনা করুন এবং নতুন কর্মচারী যোগ করুন
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">মোট কর্মচারী</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Array.isArray(staffData) ? staffData.length : 0}
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
                  <p className="text-sm text-gray-600">সক্রিয় কর্মচারী</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Array.isArray(staffData) ? staffData.filter((s: any) => s.status === 'active').length : 0}
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
                  <p className="text-sm text-gray-600">নিষ্ক্রিয় কর্মচারী</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Array.isArray(staffData) ? staffData.filter((s: any) => s.status === 'inactive').length : 0}
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
                    {Array.isArray(staffData) ? 
                      staffData.filter((s: any) => {
                        const joinDate = new Date(s.joinDate);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return joinDate > thirtyDaysAgo;
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
              placeholder="কর্মচারীর নাম, আইডি বা ফোন নম্বর দিয়ে খুঁজুন..."
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
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                নতুন কর্মচারী যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? 'কর্মচারী সম্পাদনা' : 'নতুন কর্মচারী যোগ করুন'}
                </DialogTitle>
                <DialogDescription>
                  কর্মচারীর সকল প্রয়োজনীয় তথ্য পূরণ করুন।
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="staffId">কর্মচারী আইডি</Label>
                    <Input
                      id="staffId"
                      value={newStaff.staffId}
                      onChange={(e) => setNewStaff({...newStaff, staffId: e.target.value})}
                      placeholder="STF001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">নাম (ইংরেজি)</Label>
                    <Input
                      id="name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                      placeholder="Staff Name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nameInBangla">নাম (বাংলা)</Label>
                  <Input
                    id="nameInBangla"
                    value={newStaff.nameInBangla}
                    onChange={(e) => setNewStaff({...newStaff, nameInBangla: e.target.value})}
                    placeholder="কর্মচারীর নাম"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">বিভাগ</Label>
                    <Select 
                      value={newStaff.department} 
                      onValueChange={(value) => setNewStaff({...newStaff, department: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administration">প্রশাসন</SelectItem>
                        <SelectItem value="Accounts">হিসাব</SelectItem>
                        <SelectItem value="Library">লাইব্রেরি</SelectItem>
                        <SelectItem value="Laboratory">ল্যাবরেটরি</SelectItem>
                        <SelectItem value="Security">নিরাপত্তা</SelectItem>
                        <SelectItem value="Cleaning">পরিচ্ছন্নতা</SelectItem>
                        <SelectItem value="Transport">পরিবহন</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="designation">পদবী</Label>
                    <Input
                      id="designation"
                      value={newStaff.designation}
                      onChange={(e) => setNewStaff({...newStaff, designation: e.target.value})}
                      placeholder="অফিস সহায়ক"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">ফোন নম্বর</Label>
                    <Input
                      id="phone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      placeholder="+880123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      placeholder="staff@school.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Input
                    id="address"
                    value={newStaff.address}
                    onChange={(e) => setNewStaff({...newStaff, address: e.target.value})}
                    placeholder="ঢাকা, বাংলাদেশ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="joinDate">যোগদানের তারিখ</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={newStaff.joinDate}
                      onChange={(e) => setNewStaff({...newStaff, joinDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">বেতন</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff({...newStaff, salary: e.target.value})}
                      placeholder="15000"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                  >
                    {editingStaff ? 'আপডেট করুন' : 'যোগ করুন'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            সকল কর্মচারী ({Array.isArray(staffData) ? staffData.length : 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            সক্রিয় ({Array.isArray(staffData) ? staffData.filter((s: any) => s.status === 'active').length : 0})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            নিষ্ক্রিয় ({Array.isArray(staffData) ? staffData.filter((s: any) => s.status === 'inactive').length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">কর্মচারীদের তথ্য লোড হচ্ছে...</p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>কর্মচারীদের তালিকা</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>কর্মচারী</TableHead>
                      <TableHead>বিভাগ</TableHead>
                      <TableHead>পদবী</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500">
                            কোন কর্মচারী পাওয়া যায়নি
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((staff: any, index: number) => (
                        <TableRow key={staff.id || index}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={staff.photo} />
                                <AvatarFallback>
                                  {staff.name?.split(' ').map((n: string) => n[0]).join('') || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <ProfileDetailsModal
                                  trigger={
                                    <button className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">
                                      {staff.nameInBangla || staff.name}
                                    </button>
                                  }
                                  profile={staff}
                                  type="staff"
                                  language="bn"
                                />
                                <div className="text-sm text-gray-500">
                                  {staff.staffId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{staff.department}</TableCell>
                          <TableCell>{staff.designation}</TableCell>
                          <TableCell>{staff.phone}</TableCell>
                          <TableCell>
                            <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                              {staff.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(staff)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(staff.id)}
                                disabled={deleteStaffMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}