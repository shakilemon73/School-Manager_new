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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Search, 
  Users,
  UserCheck,
  UserX,
  Palmtree,
  ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface Student {
  id: number;
  student_id: string;
  name: string;
  name_in_bangla?: string;
  class?: string;
  section?: string;
}

interface HostelRoom {
  id: number;
  room_number: string;
  floor: number;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  room_id?: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  leave_type?: string;
  leave_approved_by?: number;
  notes?: string;
  students?: Student;
  hostel_rooms?: HostelRoom;
}

export default function HostelAttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [formData, setFormData] = useState({
    student_id: '',
    room_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '',
    check_out_time: '',
    status: 'present',
    leave_type: '',
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

  // Migrated to direct Supabase: Students GET
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name, name_in_bangla, class, section')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data as Student[];
    }
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['/api/hostel-rooms'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('hostel_rooms')
        .select('id, room_number, floor')
        .eq('school_id', schoolId)
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true });
      
      if (error) throw error;
      return data as HostelRoom[];
    }
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['/api/hostel-attendance', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('hostel_attendance')
        .select(`
          *,
          students:student_id (
            id,
            student_id,
            name,
            name_in_bangla,
            class,
            section
          ),
          hostel_rooms:room_id (
            id,
            room_number,
            floor
          )
        `)
        .eq('school_id', schoolId)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (record: any) => {
      const schoolId = await getCurrentSchoolId();
      
      const existing = await supabase
        .from('hostel_attendance')
        .select('id')
        .eq('student_id', record.student_id)
        .eq('date', record.date)
        .eq('school_id', schoolId)
        .single();

      const recordData = {
        ...record,
        room_id: record.room_id ? parseInt(record.room_id) : null,
        student_id: parseInt(record.student_id),
        school_id: schoolId,
      };

      if (existing.data) {
        const { data, error } = await supabase
          .from('hostel_attendance')
          .update(recordData)
          .eq('id', existing.data.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('hostel_attendance')
          .insert([recordData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hostel-attendance'] });
      toast({ title: 'সফল', description: 'উপস্থিতি রেকর্ড করা হয়েছে' });
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
        .from('hostel_attendance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hostel-attendance'] });
      toast({ title: 'সফল', description: 'উপস্থিতি রেকর্ড মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      room_id: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      check_in_time: '',
      check_out_time: '',
      status: 'present',
      leave_type: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': 
        return <Badge className="bg-green-500" data-testid={`badge-status-present`}>উপস্থিত</Badge>;
      case 'absent': 
        return <Badge variant="destructive" data-testid={`badge-status-absent`}>অনুপস্থিত</Badge>;
      case 'on_leave': 
        return <Badge className="bg-orange-500" data-testid={`badge-status-on-leave`}>ছুটিতে</Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = searchText === '' || 
      record.students?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      record.students?.student_id.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesRoom = filterRoom === 'all' || record.room_id?.toString() === filterRoom;
    
    return matchesSearch && matchesStatus && matchesRoom;
  });

  const stats = {
    total: attendance.length,
    present: attendance.filter(r => r.status === 'present').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    onLeave: attendance.filter(r => r.status === 'on_leave').length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              হোস্টেল উপস্থিতি ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              দৈনিক চেক-ইন/আউট এবং ছুটি ট্র্যাক করুন
            </p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-select-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP', { locale: bn })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-attendance">
                  <Plus className="w-4 h-4 mr-2" />
                  উপস্থিতি রেকর্ড করুন
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>উপস্থিতি রেকর্ড করুন</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="student_id">শিক্ষার্থী *</Label>
                      <Select
                        value={formData.student_id}
                        onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                      >
                        <SelectTrigger data-testid="select-student">
                          <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name} ({student.student_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="room_id">রুম</Label>
                      <Select
                        value={formData.room_id}
                        onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                      >
                        <SelectTrigger data-testid="select-room">
                          <SelectValue placeholder="রুম নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map(room => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              {room.room_number} (ফ্লোর {room.floor})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="date">তারিখ *</Label>
                    <Input
                      id="date"
                      data-testid="input-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="check_in_time">চেক-ইন সময়</Label>
                      <Input
                        id="check_in_time"
                        data-testid="input-checkin"
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="check_out_time">চেক-আউট সময়</Label>
                      <Input
                        id="check_out_time"
                        data-testid="input-checkout"
                        type="time"
                        value={formData.check_out_time}
                        onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
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
                          <SelectItem value="present">উপস্থিত</SelectItem>
                          <SelectItem value="absent">অনুপস্থিত</SelectItem>
                          <SelectItem value="on_leave">ছুটিতে</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.status === 'on_leave' && (
                    <div>
                      <Label htmlFor="leave_type">ছুটির ধরন</Label>
                      <Select
                        value={formData.leave_type}
                        onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                      >
                        <SelectTrigger data-testid="select-leave-type">
                          <SelectValue placeholder="ছুটির ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sick_leave">অসুস্থতা ছুটি</SelectItem>
                          <SelectItem value="casual_leave">নৈমিত্তিক ছুটি</SelectItem>
                          <SelectItem value="home_visit">বাড়ি যাওয়া</SelectItem>
                          <SelectItem value="emergency">জরুরি</SelectItem>
                          <SelectItem value="other">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                      {createOrUpdateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'রেকর্ড করুন'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট উপস্থিতি</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-attendance">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {format(selectedDate, 'PPP', { locale: bn })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">আজ উপস্থিত</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-present">{stats.present}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}% উপস্থিতি হার
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ছুটিতে</CardTitle>
              <Palmtree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-on-leave">{stats.onLeave}</div>
              <p className="text-xs text-muted-foreground">
                অনুমোদিত ছুটি
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অনুপস্থিত</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-absent">{stats.absent}</div>
              <p className="text-xs text-muted-foreground">
                অনুপস্থিত শিক্ষার্থী
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>উপস্থিতি রেকর্ড</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="শিক্ষার্থী খুঁজুন..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="স্ট্যাটাস ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  <SelectItem value="present">উপস্থিত</SelectItem>
                  <SelectItem value="absent">অনুপস্থিত</SelectItem>
                  <SelectItem value="on_leave">ছুটিতে</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-room">
                  <SelectValue placeholder="রুম ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল রুম</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.room_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">লোড হচ্ছে...</div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                কোনো উপস্থিতি রেকর্ড পাওয়া যায়নি
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>শ্রেণী</TableHead>
                      <TableHead>রুম</TableHead>
                      <TableHead>চেক-ইন</TableHead>
                      <TableHead>চেক-আউট</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>ছুটির ধরন</TableHead>
                      <TableHead>নোট</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{record.students?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.students?.student_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.students?.class} - {record.students?.section}
                        </TableCell>
                        <TableCell>
                          {record.hostel_rooms?.room_number || '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_in_time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {record.check_in_time}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {record.check_out_time}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.leave_type ? (
                            <Badge variant="outline">{record.leave_type}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              if (confirm('আপনি কি নিশ্চিত এই রেকর্ডটি মুছে ফেলতে চান?')) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            data-testid={`button-delete-${record.id}`}
                          >
                            মুছুন
                          </Button>
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
