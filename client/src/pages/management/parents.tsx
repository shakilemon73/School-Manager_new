import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
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
import { ProfileDetailsModal } from '@/components/profile-details-modal';
import { Trash2, Edit, Plus, Users, CheckCircle, AlertCircle, Search, Download } from 'lucide-react';

export default function ParentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [newParent, setNewParent] = useState({
    parentId: '',
    fatherName: '',
    fatherNameInBangla: '',
    motherName: '',
    motherNameInBangla: '',
    occupation: '',
    phone: '',
    email: '',
    address: '',
    nid: '',
    emergencyContact: '',
  });

  // Fetch parents from Supabase
  const { data: parentsData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['parents', schoolId],
    queryFn: async () => {
      const data = await db.getParents(schoolId);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Create parent mutation
  const createParentMutation = useMutation({
    mutationFn: async (parent: any) => {
      const parentData = {
        ...parent,
        parentId: parent.parentId || `P${Date.now()}`,
        status: 'active',
        schoolId
      };
      
      return await db.createParent(parentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast({
        title: "অভিভাবক যোগ করা হয়েছে",
        description: "নতুন অভিভাবক সফলভাবে যোগ করা হয়েছে।",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "অভিভাবক যোগ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Update parent mutation
  const updateParentMutation = useMutation({
    mutationFn: async ({ id, ...parent }: any) => {
      return await db.updateParent(id, parent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast({
        title: "অভিভাবক আপডেট করা হয়েছে",
        description: "অভিভাবকের তথ্য সফলভাবে আপডেট করা হয়েছে।",
      });
      setEditingParent(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "অভিভাবক আপডেট করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Delete parent mutation
  const deleteParentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await db.deleteParent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast({
        title: "অভিভাবক মুছে ফেলা হয়েছে",
        description: "অভিভাবক সফলভাবে মুছে ফেলা হয়েছে।",
      });
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: "অভিভাবক মুছে ফেলতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParent) {
      updateParentMutation.mutate({ id: editingParent.id, ...newParent });
    } else {
      createParentMutation.mutate(newParent);
    }
  };

  const handleEdit = (parent: any) => {
    setEditingParent(parent);
    setNewParent({
      parentId: parent.parentId || '',
      fatherName: parent.fatherName || '',
      fatherNameInBangla: parent.fatherNameInBangla || '',
      motherName: parent.motherName || '',
      motherNameInBangla: parent.motherNameInBangla || '',
      occupation: parent.occupation || '',
      phone: parent.phone || '',
      email: parent.email || '',
      address: parent.address || '',
      nid: parent.nid || '',
      emergencyContact: parent.emergencyContact || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই অভিভাবক মুছে ফেলতে চান?')) {
      deleteParentMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setNewParent({
      parentId: '',
      fatherName: '',
      fatherNameInBangla: '',
      motherName: '',
      motherNameInBangla: '',
      occupation: '',
      phone: '',
      email: '',
      address: '',
      nid: '',
      emergencyContact: '',
    });
    setEditingParent(null);
  };

  // Filter parents based on search
  const filteredParents = (parentsData || []).filter((parent: any) => {
    if (!parent) return false;
    
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'active' && parent.status === 'active') ||
                       (activeTab === 'inactive' && parent.status === 'inactive');
    
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || 
                          (parent.fatherName && parent.fatherName.toLowerCase().includes(searchLower)) ||
                          (parent.fatherNameInBangla && parent.fatherNameInBangla.includes(searchText)) ||
                          (parent.motherName && parent.motherName.toLowerCase().includes(searchLower)) ||
                          (parent.motherNameInBangla && parent.motherNameInBangla.includes(searchText)) ||
                          (parent.parentId && parent.parentId.includes(searchText)) ||
                          (parent.phone && parent.phone.includes(searchText));
    
    return matchesTab && matchesSearch;
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
              অভিভাবক ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 mt-2">
              সকল অভিভাবকদের তথ্য দেখুন, সম্পাদনা করুন এবং নতুন অভিভাবক যোগ করুন
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">মোট অভিভাবক</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Array.isArray(parentsData) ? parentsData.length : 0}
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
                  <p className="text-sm text-gray-600">সক্রিয় অভিভাবক</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Array.isArray(parentsData) ? parentsData.filter((p: any) => p.status === 'active').length : 0}
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
                  <p className="text-sm text-gray-600">নিষ্ক্রিয় অভিভাবক</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Array.isArray(parentsData) ? parentsData.filter((p: any) => p.status === 'inactive').length : 0}
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
                  <p className="text-sm text-gray-600">নতুন নিবন্ধন</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Array.isArray(parentsData) ? 
                      parentsData.filter((p: any) => {
                        const joinDate = new Date(p.createdAt);
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
              placeholder="অভিভাবকের নাম, আইডি বা ফোন নম্বর দিয়ে খুঁজুন..."
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
                নতুন অভিভাবক যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingParent ? 'অভিভাবক সম্পাদনা' : 'নতুন অভিভাবক যোগ করুন'}
                </DialogTitle>
                <DialogDescription>
                  অভিভাবকের সকল প্রয়োজনীয় তথ্য পূরণ করুন।
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="parentId">অভিভাবক আইডি</Label>
                  <Input
                    id="parentId"
                    value={newParent.parentId}
                    onChange={(e) => setNewParent({...newParent, parentId: e.target.value})}
                    placeholder="P001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fatherName">পিতার নাম (ইংরেজি)</Label>
                    <Input
                      id="fatherName"
                      value={newParent.fatherName}
                      onChange={(e) => setNewParent({...newParent, fatherName: e.target.value})}
                      placeholder="Father Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherNameInBangla">পিতার নাম (বাংলা)</Label>
                    <Input
                      id="fatherNameInBangla"
                      value={newParent.fatherNameInBangla}
                      onChange={(e) => setNewParent({...newParent, fatherNameInBangla: e.target.value})}
                      placeholder="পিতার নাম"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motherName">মাতার নাম (ইংরেজি)</Label>
                    <Input
                      id="motherName"
                      value={newParent.motherName}
                      onChange={(e) => setNewParent({...newParent, motherName: e.target.value})}
                      placeholder="Mother Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherNameInBangla">মাতার নাম (বাংলা)</Label>
                    <Input
                      id="motherNameInBangla"
                      value={newParent.motherNameInBangla}
                      onChange={(e) => setNewParent({...newParent, motherNameInBangla: e.target.value})}
                      placeholder="মাতার নাম"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="occupation">পেশা</Label>
                  <Input
                    id="occupation"
                    value={newParent.occupation}
                    onChange={(e) => setNewParent({...newParent, occupation: e.target.value})}
                    placeholder="ব্যবসা, চাকরি ইত্যাদি"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">ফোন নম্বর</Label>
                    <Input
                      id="phone"
                      value={newParent.phone}
                      onChange={(e) => setNewParent({...newParent, phone: e.target.value})}
                      placeholder="+880123456789"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newParent.email}
                      onChange={(e) => setNewParent({...newParent, email: e.target.value})}
                      placeholder="parent@email.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Input
                    id="address"
                    value={newParent.address}
                    onChange={(e) => setNewParent({...newParent, address: e.target.value})}
                    placeholder="সম্পূর্ণ ঠিকানা"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nid">জাতীয় পরিচয়পত্র নম্বর</Label>
                    <Input
                      id="nid"
                      value={newParent.nid}
                      onChange={(e) => setNewParent({...newParent, nid: e.target.value})}
                      placeholder="1234567890123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact">জরুরি যোগাযোগ</Label>
                    <Input
                      id="emergencyContact"
                      value={newParent.emergencyContact}
                      onChange={(e) => setNewParent({...newParent, emergencyContact: e.target.value})}
                      placeholder="+880987654321"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createParentMutation.isPending || updateParentMutation.isPending}
                  >
                    {editingParent ? 'আপডেট করুন' : 'যোগ করুন'}
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
            সকল অভিভাবক ({Array.isArray(parentsData) ? parentsData.length : 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            সক্রিয় ({Array.isArray(parentsData) ? parentsData.filter((p: any) => p.status === 'active').length : 0})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            নিষ্ক্রিয় ({Array.isArray(parentsData) ? parentsData.filter((p: any) => p.status === 'inactive').length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">অভিভাবকদের তথ্য লোড হচ্ছে...</p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>অভিভাবকদের তালিকা</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>অভিভাবক</TableHead>
                      <TableHead>পিতা-মাতা</TableHead>
                      <TableHead>পেশা</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500">
                            কোন অভিভাবক পাওয়া যায়নি
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParents.map((parent: any, index: number) => (
                        <TableRow key={parent.id || index}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={parent.photo} />
                                <AvatarFallback>
                                  {parent.fatherName?.split(' ').map((n: string) => n[0]).join('') || 'P'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <ProfileDetailsModal
                                  trigger={
                                    <button className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">
                                      {parent.fatherNameInBangla || parent.fatherName}
                                    </button>
                                  }
                                  profile={parent}
                                  type="parent"
                                  language="bn"
                                />
                                <div className="text-sm text-gray-500">
                                  {parent.parentId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>পিতা: {parent.fatherNameInBangla || parent.fatherName}</div>
                              <div>মাতা: {parent.motherNameInBangla || parent.motherName}</div>
                            </div>
                          </TableCell>
                          <TableCell>{parent.occupation}</TableCell>
                          <TableCell>{parent.phone}</TableCell>
                          <TableCell>
                            <Badge variant={parent.status === 'active' ? 'default' : 'secondary'}>
                              {parent.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(parent)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(parent.id)}
                                disabled={deleteParentMutation.isPending}
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