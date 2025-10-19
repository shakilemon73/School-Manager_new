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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { Plus, Home, Bed, Users, Building, Search } from 'lucide-react';
import { Hostel } from '@/lib/new-features-types';

export default function HostelManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    hostel_name: '',
    hostel_name_bn: '',
    hostel_type: 'boys',
    total_rooms: 0,
    total_capacity: 0,
    address: '',
    facilities: '',
  });

  // Fetch hostels
  const { data: hostels = [], isLoading } = useQuery({
    queryKey: ['hostels', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostels')
        .select('*, hostel_rooms(count)')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Create hostel
  const createMutation = useMutation({
    mutationFn: async (newHostel: any) => {
      const { data, error } = await supabase
        .from('hostels')
        .insert([{ ...newHostel, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostels'] });
      toast({ title: 'সফল', description: 'হোস্টেল তৈরি হয়েছে' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      hostel_name: '',
      hostel_name_bn: '',
      hostel_type: 'boys',
      total_rooms: 0,
      total_capacity: 0,
      address: '',
      facilities: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const filteredHostels = hostels.filter(hostel => {
    const matchesSearch = searchText === '' || 
      hostel.hostel_name.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || hostel.hostel_type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: hostels.length,
    boys: hostels.filter(h => h.hostel_type === 'boys').length,
    girls: hostels.filter(h => h.hostel_type === 'girls').length,
    totalCapacity: hostels.reduce((sum, h) => sum + (h.total_capacity || 0), 0),
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              হোস্টেল ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              হোস্টেল, রুম এবং শিক্ষার্থী বরাদ্দ পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-hostel">
                <Plus className="w-4 h-4 mr-2" />
                নতুন হোস্টেল
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>নতুন হোস্টেল যোগ করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hostel_name">হোস্টেলের নাম *</Label>
                    <Input
                      id="hostel_name"
                      data-testid="input-name"
                      value={formData.hostel_name}
                      onChange={(e) => setFormData({ ...formData, hostel_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hostel_type">হোস্টেলের ধরন *</Label>
                    <Select
                      value={formData.hostel_type}
                      onValueChange={(value) => setFormData({ ...formData, hostel_type: value })}
                    >
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boys">ছেলেদের</SelectItem>
                        <SelectItem value="girls">মেয়েদের</SelectItem>
                        <SelectItem value="mixed">মিশ্র</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_rooms">মোট রুম</Label>
                    <Input
                      id="total_rooms"
                      data-testid="input-rooms"
                      type="number"
                      min="0"
                      value={formData.total_rooms}
                      onChange={(e) => setFormData({ ...formData, total_rooms: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_capacity">মোট ক্ষমতা</Label>
                    <Input
                      id="total_capacity"
                      data-testid="input-capacity"
                      type="number"
                      min="0"
                      value={formData.total_capacity}
                      onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Textarea
                    id="address"
                    data-testid="input-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="facilities">সুবিধাসমূহ</Label>
                  <Textarea
                    id="facilities"
                    data-testid="input-facilities"
                    value={formData.facilities}
                    onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                    তৈরি করুন
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট হোস্টেল</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ছেলেদের হোস্টেল</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.boys}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মেয়েদের হোস্টেল</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.girls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট ক্ষমতা</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCapacity}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="হোস্টেল অনুসন্ধান করুন..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">সকল ({stats.total})</TabsTrigger>
            <TabsTrigger value="boys">ছেলেদের ({stats.boys})</TabsTrigger>
            <TabsTrigger value="girls">মেয়েদের ({stats.girls})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>হোস্টেলের নাম</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>মোট রুম</TableHead>
                      <TableHead>ক্ষমতা</TableHead>
                      <TableHead>ঠিকানা</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          লোড হচ্ছে...
                        </TableCell>
                      </TableRow>
                    ) : filteredHostels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          কোন হোস্টেল পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHostels.map((hostel) => (
                        <TableRow key={hostel.id} data-testid={`row-hostel-${hostel.id}`}>
                          <TableCell className="font-medium" data-testid={`text-name-${hostel.id}`}>
                            {hostel.hostel_name}
                          </TableCell>
                          <TableCell>
                            {hostel.hostel_type === 'boys' && <Badge>ছেলেদের</Badge>}
                            {hostel.hostel_type === 'girls' && <Badge variant="secondary">মেয়েদের</Badge>}
                            {hostel.hostel_type === 'mixed' && <Badge variant="outline">মিশ্র</Badge>}
                          </TableCell>
                          <TableCell>{hostel.total_rooms || 0}</TableCell>
                          <TableCell>{hostel.total_capacity || 0}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {hostel.address || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
