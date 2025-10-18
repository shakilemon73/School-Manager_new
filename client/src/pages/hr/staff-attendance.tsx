import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
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
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Search, 
  Users,
  Download,
  UserCheck,
  UserX,
  Timer,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  name_in_bangla?: string;
  department?: string;
  designation?: string;
  phone?: string;
}

interface AttendanceRecord {
  id: number;
  staff_id: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  late_minutes?: number;
  overtime_minutes?: number;
  notes?: string;
  staff?: StaffMember;
}

interface AttendanceSummary {
  id: number;
  staff_id: number;
  month: number;
  year: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  attendance_percentage?: string;
}

export default function StaffAttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isMarkDialogOpen, setIsMarkDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState({
    staff_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '',
    check_out_time: '',
    status: 'present',
    late_minutes: 0,
    overtime_minutes: 0,
    notes: '',
  });

  // Fetch staff members
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/staff', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data as StaffMember[];
    }
  });

  // Fetch attendance records for selected date
  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['/api/staff-attendance', schoolId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select(`
          *,
          staff:staff_id (
            id,
            staff_id,
            name,
            name_in_bangla,
            department,
            designation
          )
        `)
        .eq('school_id', schoolId)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('check_in_time');
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch attendance summary for current month
  const { data: summaryData = [] } = useQuery({
    queryKey: ['/api/attendance-summary', schoolId, selectedDate.getMonth() + 1, selectedDate.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_summary')
        .select('*')
        .eq('school_id', schoolId)
        .eq('month', selectedDate.getMonth() + 1)
        .eq('year', selectedDate.getFullYear());
      
      if (error) throw error;
      return data as AttendanceSummary[];
    }
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (newAttendance: any) => {
      // Check if attendance already exists
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('staff_id', newAttendance.staff_id)
        .eq('date', newAttendance.date)
        .eq('school_id', schoolId)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('staff_attendance')
          .update(newAttendance)
          .eq('id', existing.id)
          .eq('school_id', schoolId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('staff_attendance')
          .insert([{ ...newAttendance, school_id: schoolId }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-attendance'] });
      toast({ title: 'সফল', description: 'উপস্থিতি রেকর্ড করা হয়েছে' });
      setIsMarkDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Bulk mark attendance mutation
  const bulkMarkMutation = useMutation({
    mutationFn: async ({ staffIds, status }: { staffIds: number[]; status: string }) => {
      const date = format(selectedDate, 'yyyy-MM-dd');
      
      const records = staffIds.map(staffId => ({
        staff_id: staffId,
        date,
        status,
        school_id: schoolId,
      }));

      const { data, error } = await supabase
        .from('staff_attendance')
        .upsert(records, { onConflict: 'staff_id,date,school_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-attendance'] });
      toast({ title: 'সফল', description: 'সকল কর্মচারীর উপস্থিতি রেকর্ড করা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setAttendanceData({
      staff_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      check_in_time: '',
      check_out_time: '',
      status: 'present',
      late_minutes: 0,
      overtime_minutes: 0,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markAttendanceMutation.mutate(attendanceData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-green-500" data-testid={`badge-status-present`}>উপস্থিত</Badge>;
      case 'absent': return <Badge variant="destructive" data-testid={`badge-status-absent`}>অনুপস্থিত</Badge>;
      case 'late': return <Badge className="bg-orange-500" data-testid={`badge-status-late`}>বিলম্বে</Badge>;
      case 'half-day': return <Badge className="bg-blue-500" data-testid={`badge-status-half-day`}>অর্ধদিবস</Badge>;
      case 'leave': return <Badge variant="outline" data-testid={`badge-status-leave`}>ছুটি</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const onLeave = attendanceRecords.filter(r => r.status === 'leave').length;

    return { total, present, absent, late, onLeave };
  };

  const stats = calculateStats();

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = searchText === '' || 
      staff.name.toLowerCase().includes(searchText.toLowerCase()) ||
      staff.staff_id.toLowerCase().includes(searchText.toLowerCase()) ||
      (staff.name_in_bangla && staff.name_in_bangla.includes(searchText));
    
    return matchesSearch;
  });

  const exportAttendance = () => {
    const csvContent = [
      ['Staff ID', 'Name', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Late Minutes', 'Overtime'],
      ...attendanceRecords.map(record => [
        record.staff?.staff_id || '',
        record.staff?.name || '',
        record.staff?.department || '',
        record.date,
        record.status,
        record.check_in_time || '',
        record.check_out_time || '',
        record.late_minutes || 0,
        record.overtime_minutes || 0,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast({ title: 'সফল', description: 'রিপোর্ট ডাউনলোড হয়েছে' });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              কর্মচারী উপস্থিতি ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              দৈনিক উপস্থিতি রেকর্ড এবং প্রতিবেদন পরিচালনা করুন
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isMarkDialogOpen} onOpenChange={setIsMarkDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-mark-attendance">
                  <Plus className="w-4 h-4 mr-2" />
                  উপস্থিতি চিহ্নিত করুন
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>উপস্থিতি রেকর্ড করুন</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="staff_id">কর্মচারী *</Label>
                      <Select
                        value={attendanceData.staff_id}
                        onValueChange={(value) => setAttendanceData({ ...attendanceData, staff_id: value })}
                      >
                        <SelectTrigger data-testid="select-staff">
                          <SelectValue placeholder="কর্মচারী নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers.map(staff => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name} ({staff.staff_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="date">তারিখ *</Label>
                      <Input
                        type="date"
                        value={attendanceData.date}
                        onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                        data-testid="input-date"
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">অবস্থা *</Label>
                      <Select
                        value={attendanceData.status}
                        onValueChange={(value) => setAttendanceData({ ...attendanceData, status: value })}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">উপস্থিত</SelectItem>
                          <SelectItem value="absent">অনুপস্থিত</SelectItem>
                          <SelectItem value="late">বিলম্বে</SelectItem>
                          <SelectItem value="half-day">অর্ধদিবস</SelectItem>
                          <SelectItem value="leave">ছুটি</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="check_in_time">প্রবেশ সময়</Label>
                      <Input
                        type="time"
                        value={attendanceData.check_in_time}
                        onChange={(e) => setAttendanceData({ ...attendanceData, check_in_time: e.target.value })}
                        data-testid="input-check-in"
                      />
                    </div>

                    <div>
                      <Label htmlFor="check_out_time">প্রস্থান সময়</Label>
                      <Input
                        type="time"
                        value={attendanceData.check_out_time}
                        onChange={(e) => setAttendanceData({ ...attendanceData, check_out_time: e.target.value })}
                        data-testid="input-check-out"
                      />
                    </div>

                    <div>
                      <Label htmlFor="late_minutes">বিলম্ব (মিনিট)</Label>
                      <Input
                        type="number"
                        value={attendanceData.late_minutes}
                        onChange={(e) => setAttendanceData({ ...attendanceData, late_minutes: parseInt(e.target.value) || 0 })}
                        data-testid="input-late-minutes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="overtime_minutes">অতিরিক্ত সময় (মিনিট)</Label>
                      <Input
                        type="number"
                        value={attendanceData.overtime_minutes}
                        onChange={(e) => setAttendanceData({ ...attendanceData, overtime_minutes: parseInt(e.target.value) || 0 })}
                        data-testid="input-overtime"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="notes">নোট</Label>
                      <Input
                        value={attendanceData.notes}
                        onChange={(e) => setAttendanceData({ ...attendanceData, notes: e.target.value })}
                        placeholder="অতিরিক্ত তথ্য"
                        data-testid="input-notes"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsMarkDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={markAttendanceMutation.isPending} data-testid="button-submit-attendance">
                      {markAttendanceMutation.isPending ? 'রেকর্ড করা হচ্ছে...' : 'রেকর্ড করুন'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportAttendance} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              রিপোর্ট ডাউনলোড
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">মোট কর্মচারী</p>
                  <p className="text-2xl font-bold" data-testid="text-total-staff">{staffMembers.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">উপস্থিত</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-present">{stats.present}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">অনুপস্থিত</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="text-absent">{stats.absent}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">বিলম্ব</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-late">{stats.late}</p>
                </div>
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ছুটি</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-leave">{stats.onLeave}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="daily" data-testid="tab-daily">দৈনিক উপস্থিতি</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">মাসিক সারাংশ</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">ক্যালেন্ডার দৃশ্য</TabsTrigger>
          </TabsList>

          {/* Daily Attendance */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(selectedDate, 'MMMM dd, yyyy')} - উপস্থিতি
                  </CardTitle>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="w-auto"
                      data-testid="input-select-date"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => bulkMarkMutation.mutate({ 
                        staffIds: staffMembers.map(s => s.id), 
                        status: 'present' 
                      })}
                      data-testid="button-mark-all-present"
                    >
                      সকলকে উপস্থিত চিহ্নিত করুন
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী আইডি</TableHead>
                        <TableHead>নাম</TableHead>
                        <TableHead>বিভাগ</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead>প্রবেশ</TableHead>
                        <TableHead>প্রস্থান</TableHead>
                        <TableHead>বিলম্ব</TableHead>
                        <TableHead>অতিরিক্ত</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAttendance ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            লোড হচ্ছে...
                          </TableCell>
                        </TableRow>
                      ) : attendanceRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">এই তারিখের জন্য কোনো উপস্থিতি রেকর্ড নেই</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendanceRecords.map((record) => (
                          <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                            <TableCell>{record.staff?.staff_id}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{record.staff?.name}</div>
                                {record.staff?.name_in_bangla && (
                                  <div className="text-sm text-muted-foreground">{record.staff?.name_in_bangla}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{record.staff?.department || '-'}</TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>{record.check_in_time || '-'}</TableCell>
                            <TableCell>{record.check_out_time || '-'}</TableCell>
                            <TableCell>
                              {record.late_minutes ? (
                                <span className="text-orange-600">{record.late_minutes} মি</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {record.overtime_minutes ? (
                                <span className="text-green-600">{record.overtime_minutes} মি</span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Summary */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  মাসিক উপস্থিতি সারাংশ - {format(selectedDate, 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী</TableHead>
                        <TableHead>মোট দিন</TableHead>
                        <TableHead>উপস্থিত</TableHead>
                        <TableHead>অনুপস্থিত</TableHead>
                        <TableHead>বিলম্ব</TableHead>
                        <TableHead>অর্ধদিবস</TableHead>
                        <TableHead>ছুটি</TableHead>
                        <TableHead>শতাংশ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">এই মাসের জন্য কোনো সারাংশ নেই</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        summaryData.map((summary) => {
                          const staff = staffMembers.find(s => s.id === summary.staff_id);
                          return (
                            <TableRow key={summary.id} data-testid={`row-summary-${summary.id}`}>
                              <TableCell>
                                {staff ? (
                                  <div>
                                    <div className="font-medium">{staff.name}</div>
                                    <div className="text-sm text-muted-foreground">{staff.staff_id}</div>
                                  </div>
                                ) : `Staff #${summary.staff_id}`}
                              </TableCell>
                              <TableCell>{summary.total_days}</TableCell>
                              <TableCell className="text-green-600 font-medium">{summary.present_days}</TableCell>
                              <TableCell className="text-red-600 font-medium">{summary.absent_days}</TableCell>
                              <TableCell className="text-orange-600">{summary.late_days}</TableCell>
                              <TableCell className="text-blue-600">{summary.half_days}</TableCell>
                              <TableCell>{summary.leave_days}</TableCell>
                              <TableCell>
                                <Badge variant={parseFloat(summary.attendance_percentage || '0') >= 90 ? 'default' : 'destructive'}>
                                  {parseFloat(summary.attendance_percentage || '0').toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>উপস্থিতি ক্যালেন্ডার</CardTitle>
                  <Select value={selectedStaff?.toString() || ''} onValueChange={(value) => setSelectedStaff(parseInt(value))}>
                    <SelectTrigger className="w-64" data-testid="select-staff-calendar">
                      <SelectValue placeholder="কর্মচারী নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffMembers.map(staff => (
                        <SelectItem key={staff.id} value={staff.id.toString()}>
                          {staff.name} ({staff.staff_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    data-testid="calendar-view"
                  />
                </div>
                {selectedStaff && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">নির্বাচিত দিনের উপস্থিতি</h3>
                    {attendanceRecords
                      .filter(r => r.staff_id === selectedStaff)
                      .map(record => (
                        <div key={record.id} className="flex justify-between items-center">
                          <span>{format(new Date(record.date), 'MMMM dd, yyyy')}</span>
                          {getStatusBadge(record.status)}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
