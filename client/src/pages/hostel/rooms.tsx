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
import { Progress } from '@/components/ui/progress';
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
  Home, 
  Users, 
  Search, 
  Building,
  DoorClosed,
  Wrench,
  CheckCircle,
  BedDouble,
  Filter
} from 'lucide-react';

interface Hostel {
  id: number;
  hostel_name: string;
  hostel_type: string;
}

interface HostelRoom {
  id: number;
  hostel_id?: number;
  room_number: string;
  floor: number;
  room_type: string;
  capacity: number;
  current_occupancy: number;
  monthly_fee: string;
  facilities: string[];
  status: string;
  notes?: string;
  hostels?: Hostel;
}

export default function HostelRoomsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<HostelRoom | null>(null);
  const [formData, setFormData] = useState({
    hostel_id: '',
    room_number: '',
    floor: 1,
    room_type: 'single',
    capacity: 1,
    current_occupancy: 0,
    monthly_fee: '',
    facilities: '',
    status: 'available',
    notes: '',
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

  const { data: hostels = [] } = useQuery({
    queryKey: ['/api/hostels'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('hostels')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as Hostel[];
    }
  });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['/api/hostel-rooms'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('hostel_rooms')
        .select(`
          *,
          hostels:hostel_id (
            id,
            hostel_name,
            hostel_type
          )
        `)
        .eq('school_id', schoolId)
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (room: any) => {
      const schoolId = await getCurrentSchoolId();
      const facilitiesArray = room.facilities 
        ? room.facilities.split(',').map((f: string) => f.trim()).filter(Boolean)
        : [];

      const roomData = {
        ...room,
        facilities: facilitiesArray,
        hostel_id: room.hostel_id ? parseInt(room.hostel_id) : null,
        school_id: schoolId,
      };

      if (editingRoom) {
        const { data, error } = await supabase
          .from('hostel_rooms')
          .update(roomData)
          .eq('id', editingRoom.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('hostel_rooms')
          .insert([roomData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hostel-rooms'] });
      toast({ 
        title: editingRoom ? 'সফল' : 'সফল', 
        description: editingRoom ? 'রুম আপডেট হয়েছে' : 'নতুন রুম যোগ হয়েছে'
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('hostel_rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hostel-rooms'] });
      toast({ title: 'সফল', description: 'রুম মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      hostel_id: '',
      room_number: '',
      floor: 1,
      room_type: 'single',
      capacity: 1,
      current_occupancy: 0,
      monthly_fee: '',
      facilities: '',
      status: 'available',
      notes: '',
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: HostelRoom) => {
    setEditingRoom(room);
    setFormData({
      hostel_id: room.hostel_id?.toString() || '',
      room_number: room.room_number,
      floor: room.floor,
      room_type: room.room_type,
      capacity: room.capacity,
      current_occupancy: room.current_occupancy,
      monthly_fee: room.monthly_fee,
      facilities: room.facilities?.join(', ') || '',
      status: room.status,
      notes: room.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': 
        return <Badge className="bg-green-500" data-testid={`badge-status-available`}>উপলব্ধ</Badge>;
      case 'occupied': 
        return <Badge className="bg-blue-500" data-testid={`badge-status-occupied`}>দখলকৃত</Badge>;
      case 'maintenance': 
        return <Badge variant="destructive" data-testid={`badge-status-maintenance`}>রক্ষণাবেক্ষণ</Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoomTypeBadge = (type: string) => {
    switch (type) {
      case 'single': return <Badge variant="outline">একক</Badge>;
      case 'double': return <Badge variant="outline">দ্বৈত</Badge>;
      case 'triple': return <Badge variant="outline">ত্রৈত</Badge>;
      case 'dormitory': return <Badge variant="outline">ডরমিটরি</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getOccupancyColor = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100;
    if (percentage === 0) return 'bg-gray-500';
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    if (percentage < 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = searchText === '' || 
      room.room_number.toLowerCase().includes(searchText.toLowerCase());
    const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
    const matchesRoomType = filterRoomType === 'all' || room.room_type === filterRoomType;
    const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
    
    return matchesSearch && matchesFloor && matchesRoomType && matchesStatus;
  });

  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    available: rooms.filter(r => r.status === 'available').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    totalCapacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
    totalOccupancy: rooms.reduce((sum, r) => sum + r.current_occupancy, 0),
  };

  const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              হোস্টেল রুম ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              রুম, ধারণক্ষমতা এবং সুবিধাসমূহ পরিচালনা করুন
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-room">
                <Plus className="w-4 h-4 mr-2" />
                নতুন রুম যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRoom ? 'রুম সম্পাদনা করুন' : 'নতুন রুম যোগ করুন'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hostel_id">হোস্টেল</Label>
                    <Select
                      value={formData.hostel_id}
                      onValueChange={(value) => setFormData({ ...formData, hostel_id: value })}
                    >
                      <SelectTrigger data-testid="select-hostel">
                        <SelectValue placeholder="হোস্টেল নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {hostels.map(hostel => (
                          <SelectItem key={hostel.id} value={hostel.id.toString()}>
                            {hostel.hostel_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="room_number">রুম নম্বর *</Label>
                    <Input
                      id="room_number"
                      data-testid="input-room-number"
                      value={formData.room_number}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="floor">ফ্লোর *</Label>
                    <Input
                      id="floor"
                      data-testid="input-floor"
                      type="number"
                      min="0"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="room_type">রুমের ধরন *</Label>
                    <Select
                      value={formData.room_type}
                      onValueChange={(value) => setFormData({ ...formData, room_type: value })}
                    >
                      <SelectTrigger data-testid="select-room-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">একক</SelectItem>
                        <SelectItem value="double">দ্বৈত</SelectItem>
                        <SelectItem value="triple">ত্রৈত</SelectItem>
                        <SelectItem value="dormitory">ডরমিটরি</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="capacity">ধারণক্ষমতা *</Label>
                    <Input
                      id="capacity"
                      data-testid="input-capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="current_occupancy">বর্তমান দখল</Label>
                    <Input
                      id="current_occupancy"
                      data-testid="input-occupancy"
                      type="number"
                      min="0"
                      max={formData.capacity}
                      value={formData.current_occupancy}
                      onChange={(e) => setFormData({ ...formData, current_occupancy: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_fee">মাসিক ফি *</Label>
                    <Input
                      id="monthly_fee"
                      data-testid="input-fee"
                      type="number"
                      step="0.01"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">স্ট্যাটাস *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">উপলব্ধ</SelectItem>
                        <SelectItem value="occupied">দখলকৃত</SelectItem>
                        <SelectItem value="maintenance">রক্ষণাবেক্ষণ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="facilities">সুবিধাসমূহ (কমা দিয়ে আলাদা করুন)</Label>
                  <Textarea
                    id="facilities"
                    data-testid="input-facilities"
                    value={formData.facilities}
                    onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                    placeholder="যেমন: এসি, ওয়াইফাই, সংযুক্ত বাথরুম"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">বিশেষ নোট</Label>
                  <Textarea
                    id="notes"
                    data-testid="input-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createOrUpdateMutation.isPending}>
                    {createOrUpdateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : editingRoom ? 'আপডেট করুন' : 'যোগ করুন'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট রুম</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-rooms">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                ধারণক্ষমতা: {stats.totalCapacity}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">দখলকৃত রুম</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-occupied-rooms">{stats.occupied}</div>
              <p className="text-xs text-muted-foreground">
                দখলকারী: {stats.totalOccupancy}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">উপলব্ধ রুম</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-available-rooms">{stats.available}</div>
              <p className="text-xs text-muted-foreground">
                বুকিংয়ের জন্য প্রস্তুত
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">রক্ষণাবেক্ষণ</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-maintenance-rooms">{stats.maintenance}</div>
              <p className="text-xs text-muted-foreground">
                মেরামতাধীন
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>রুম তালিকা</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="রুম নম্বর খুঁজুন..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={filterFloor} onValueChange={setFilterFloor}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-floor">
                  <SelectValue placeholder="ফ্লোর ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল ফ্লোর</SelectItem>
                  {uniqueFloors.map(floor => (
                    <SelectItem key={floor} value={floor.toString()}>
                      ফ্লোর {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRoomType} onValueChange={setFilterRoomType}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-type">
                  <SelectValue placeholder="রুমের ধরন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল ধরন</SelectItem>
                  <SelectItem value="single">একক</SelectItem>
                  <SelectItem value="double">দ্বৈত</SelectItem>
                  <SelectItem value="triple">ত্রৈত</SelectItem>
                  <SelectItem value="dormitory">ডরমিটরি</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="স্ট্যাটাস" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  <SelectItem value="available">উপলব্ধ</SelectItem>
                  <SelectItem value="occupied">দখলকৃত</SelectItem>
                  <SelectItem value="maintenance">রক্ষণাবেক্ষণ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">লোড হচ্ছে...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                কোনো রুম পাওয়া যায়নি
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>রুম নম্বর</TableHead>
                      <TableHead>হোস্টেল</TableHead>
                      <TableHead>ফ্লোর</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>ধারণক্ষমতা</TableHead>
                      <TableHead>দখল</TableHead>
                      <TableHead>মাসিক ফি</TableHead>
                      <TableHead>সুবিধা</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                        <TableCell className="font-medium">{room.room_number}</TableCell>
                        <TableCell>{room.hostels?.hostel_name || '-'}</TableCell>
                        <TableCell>ফ্লোর {room.floor}</TableCell>
                        <TableCell>{getRoomTypeBadge(room.room_type)}</TableCell>
                        <TableCell>{room.capacity}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{room.current_occupancy}/{room.capacity}</span>
                              <Badge 
                                variant="outline" 
                                className={`${getOccupancyColor(room.current_occupancy, room.capacity)} text-white border-0`}
                              >
                                {Math.round((room.current_occupancy / room.capacity) * 100)}%
                              </Badge>
                            </div>
                            <Progress 
                              value={(room.current_occupancy / room.capacity) * 100} 
                              className="h-1"
                            />
                          </div>
                        </TableCell>
                        <TableCell>৳{parseFloat(room.monthly_fee).toLocaleString()}</TableCell>
                        <TableCell>
                          {room.facilities?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {room.facilities.slice(0, 2).map((facility: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {facility}
                                </Badge>
                              ))}
                              {room.facilities.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{room.facilities.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(room.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(room)}
                              data-testid={`button-edit-${room.id}`}
                            >
                              সম্পাদনা
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                if (confirm('আপনি কি নিশ্চিত এই রুমটি মুছে ফেলতে চান?')) {
                                  deleteMutation.mutate(room.id);
                                }
                              }}
                              data-testid={`button-delete-${room.id}`}
                            >
                              মুছুন
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
