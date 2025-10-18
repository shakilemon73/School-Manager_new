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
  DollarSign, 
  CreditCard, 
  TrendingUp,
  FileText,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Wallet,
  Calculator
} from 'lucide-react';
import { format } from 'date-fns';

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  name_in_bangla?: string;
  department?: string;
  designation?: string;
  salary?: number;
}

interface SalaryComponent {
  id: number;
  name: string;
  name_bn?: string;
  type: string;
  calculation_type?: string;
  default_amount?: string;
  percentage?: string;
  is_taxable?: boolean;
  is_active?: boolean;
}

interface PayrollRecord {
  id: number;
  staff_id: number;
  month: number;
  year: number;
  basic_salary: string;
  earnings?: any;
  deductions?: any;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  payment_date?: string;
  payment_method?: string;
  payment_status: string;
  notes?: string;
  staff?: StaffMember;
}

export default function PayrollSystemPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('payroll');
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [payrollData, setPayrollData] = useState({
    staff_id: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    basic_salary: '',
    earnings: {} as any,
    deductions: {} as any,
    payment_method: 'bank_transfer',
    payment_status: 'pending',
    notes: '',
  });

  const [componentData, setComponentData] = useState({
    name: '',
    name_bn: '',
    type: 'earning',
    calculation_type: 'fixed',
    default_amount: '',
    percentage: '',
    is_taxable: true,
    is_active: true,
  });

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery({
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

  // Fetch salary components
  const { data: salaryComponents = [] } = useQuery({
    queryKey: ['/api/salary-components', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('type', { ascending: true });
      
      if (error) throw error;
      return data as SalaryComponent[];
    }
  });

  // Fetch payroll records
  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['/api/payroll-records', schoolId, selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select(`
          *,
          staff:staff_id (
            id,
            staff_id,
            name,
            name_in_bangla,
            department,
            designation,
            salary
          )
        `)
        .eq('school_id', schoolId)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Create salary component mutation
  const createComponentMutation = useMutation({
    mutationFn: async (newComponent: any) => {
      const { data, error } = await supabase
        .from('salary_components')
        .insert([{ ...newComponent, school_id: schoolId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/salary-components'] });
      toast({ title: 'সফল', description: 'বেতন উপাদান যোগ করা হয়েছে' });
      setIsComponentDialogOpen(false);
      resetComponentForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async (payroll: any) => {
      // Calculate totals
      const earnings = salaryComponents
        .filter(c => c.type === 'earning' && payroll.earnings?.[c.id])
        .reduce((sum, c) => sum + parseFloat(payroll.earnings[c.id] || '0'), 0);
      
      const deductions = salaryComponents
        .filter(c => c.type === 'deduction' && payroll.deductions?.[c.id])
        .reduce((sum, c) => sum + parseFloat(payroll.deductions[c.id] || '0'), 0);
      
      const basicSalary = parseFloat(payroll.basic_salary);
      const grossSalary = basicSalary + earnings;
      const netSalary = grossSalary - deductions;

      // Check if payroll already exists
      const { data: existing } = await supabase
        .from('payroll_records')
        .select('id')
        .eq('staff_id', payroll.staff_id)
        .eq('month', payroll.month)
        .eq('year', payroll.year)
        .eq('school_id', schoolId)
        .single();

      const payrollRecord = {
        ...payroll,
        basic_salary: basicSalary.toString(),
        gross_salary: grossSalary.toString(),
        total_deductions: deductions.toString(),
        net_salary: netSalary.toString(),
        school_id: schoolId,
      };

      if (existing) {
        const { data, error } = await supabase
          .from('payroll_records')
          .update(payrollRecord)
          .eq('id', existing.id)
          .eq('school_id', schoolId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('payroll_records')
          .insert([payrollRecord])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({ title: 'সফল', description: 'বেতন প্রক্রিয়া করা হয়েছে' });
      setIsPayrollDialogOpen(false);
      resetPayrollForm();
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentDate }: { id: number; status: string; paymentDate?: string }) => {
      const { data, error } = await supabase
        .from('payroll_records')
        .update({ 
          payment_status: status,
          payment_date: paymentDate || null
        })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({ title: 'সফল', description: 'পেমেন্ট স্ট্যাটাস আপডেট হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  // Bulk process payroll mutation
  const bulkProcessMutation = useMutation({
    mutationFn: async () => {
      const promises = staffMembers.map(async (staff) => {
        const basicSalary = staff.salary || 0;
        const grossSalary = basicSalary;
        const netSalary = basicSalary;

        const payrollRecord = {
          staff_id: staff.id,
          month: selectedMonth,
          year: selectedYear,
          basic_salary: basicSalary.toString(),
          earnings: {},
          deductions: {},
          gross_salary: grossSalary.toString(),
          total_deductions: '0',
          net_salary: netSalary.toString(),
          payment_status: 'pending',
          school_id: schoolId,
        };

        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('staff_id', staff.id)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .eq('school_id', schoolId)
          .single();

        if (!existing) {
          return await supabase
            .from('payroll_records')
            .insert([payrollRecord])
            .select()
            .single();
        }
        return null;
      });

      const results = await Promise.all(promises);
      return results.filter(r => r !== null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({ title: 'সফল', description: 'সকল কর্মচারীর বেতন প্রক্রিয়া করা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
    }
  });

  const resetPayrollForm = () => {
    setPayrollData({
      staff_id: '',
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      basic_salary: '',
      earnings: {},
      deductions: {},
      payment_method: 'bank_transfer',
      payment_status: 'pending',
      notes: '',
    });
  };

  const resetComponentForm = () => {
    setComponentData({
      name: '',
      name_bn: '',
      type: 'earning',
      calculation_type: 'fixed',
      default_amount: '',
      percentage: '',
      is_taxable: true,
      is_active: true,
    });
  };

  const handlePayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPayrollMutation.mutate(payrollData);
  };

  const handleComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createComponentMutation.mutate(componentData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500" data-testid={`badge-status-paid`}><CheckCircle className="w-3 h-3 mr-1" />পরিশোধিত</Badge>;
      case 'processed': return <Badge className="bg-blue-500" data-testid={`badge-status-processed`}><Clock className="w-3 h-3 mr-1" />প্রক্রিয়াধীন</Badge>;
      case 'pending': return <Badge variant="outline" data-testid={`badge-status-pending`}><AlertCircle className="w-3 h-3 mr-1" />অপেক্ষমাণ</Badge>;
      case 'cancelled': return <Badge variant="destructive" data-testid={`badge-status-cancelled`}><XCircle className="w-3 h-3 mr-1" />বাতিল</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateStats = () => {
    const totalPayroll = payrollRecords.reduce((sum, r) => sum + parseFloat(r.net_salary || '0'), 0);
    const paidAmount = payrollRecords
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + parseFloat(r.net_salary || '0'), 0);
    const pendingAmount = payrollRecords
      .filter(r => r.payment_status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.net_salary || '0'), 0);
    const paidCount = payrollRecords.filter(r => r.payment_status === 'paid').length;

    return { totalPayroll, paidAmount, pendingAmount, paidCount, totalCount: payrollRecords.length };
  };

  const stats = calculateStats();

  const generatePayslip = (record: PayrollRecord) => {
    // Simple payslip preview
    const payslipContent = `
      =============================================
      বেতন স্লিপ
      =============================================
      
      কর্মচারী: ${record.staff?.name}
      পদবী: ${record.staff?.designation || 'N/A'}
      বিভাগ: ${record.staff?.department || 'N/A'}
      
      মাস: ${selectedMonth}/${selectedYear}
      
      ---------------------------------------------
      মূল বেতন:           ৳${parseFloat(record.basic_salary).toFixed(2)}
      মোট আয়:            ৳${parseFloat(record.gross_salary).toFixed(2)}
      মোট কর্তন:         ৳${parseFloat(record.total_deductions).toFixed(2)}
      ---------------------------------------------
      নিট বেতন:          ৳${parseFloat(record.net_salary).toFixed(2)}
      =============================================
      
      পেমেন্ট পদ্ধতি: ${record.payment_method || 'N/A'}
      পেমেন্ট স্ট্যাটাস: ${record.payment_status}
    `;

    const blob = new Blob([payslipContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${record.staff?.staff_id}-${selectedMonth}-${selectedYear}.txt`;
    a.click();
    
    toast({ title: 'সফল', description: 'পেস্লিপ ডাউনলোড হয়েছে' });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              বেতন ব্যবস্থাপনা
            </h1>
            <p className="text-muted-foreground mt-1">
              মাসিক বেতন প্রক্রিয়াকরণ এবং পেমেন্ট ট্র্যাকিং
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-process-payroll">
                  <Calculator className="w-4 h-4 mr-2" />
                  বেতন প্রক্রিয়া করুন
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>বেতন প্রক্রিয়াকরণ</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePayrollSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="staff_id">কর্মচারী *</Label>
                      <Select
                        value={payrollData.staff_id}
                        onValueChange={(value) => {
                          const staff = staffMembers.find(s => s.id.toString() === value);
                          setPayrollData({ 
                            ...payrollData, 
                            staff_id: value,
                            basic_salary: staff?.salary?.toString() || ''
                          });
                        }}
                      >
                        <SelectTrigger data-testid="select-staff-payroll">
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
                      <Label htmlFor="month">মাস *</Label>
                      <Select
                        value={payrollData.month.toString()}
                        onValueChange={(value) => setPayrollData({ ...payrollData, month: parseInt(value) })}
                      >
                        <SelectTrigger data-testid="select-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <SelectItem key={month} value={month.toString()}>
                              {format(new Date(2024, month - 1), 'MMMM')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="year">বছর *</Label>
                      <Input
                        type="number"
                        value={payrollData.year}
                        onChange={(e) => setPayrollData({ ...payrollData, year: parseInt(e.target.value) })}
                        data-testid="input-year"
                      />
                    </div>

                    <div>
                      <Label htmlFor="basic_salary">মূল বেতন *</Label>
                      <Input
                        type="number"
                        value={payrollData.basic_salary}
                        onChange={(e) => setPayrollData({ ...payrollData, basic_salary: e.target.value })}
                        placeholder="০"
                        data-testid="input-basic-salary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment_method">পেমেন্ট পদ্ধতি</Label>
                      <Select
                        value={payrollData.payment_method}
                        onValueChange={(value) => setPayrollData({ ...payrollData, payment_method: value })}
                      >
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">নগদ</SelectItem>
                          <SelectItem value="bank_transfer">ব্যাংক ট্রান্সফার</SelectItem>
                          <SelectItem value="cheque">চেক</SelectItem>
                          <SelectItem value="mobile_banking">মোবাইল ব্যাংকিং</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="payment_status">পেমেন্ট স্ট্যাটাস</Label>
                      <Select
                        value={payrollData.payment_status}
                        onValueChange={(value) => setPayrollData({ ...payrollData, payment_status: value })}
                      >
                        <SelectTrigger data-testid="select-payment-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">অপেক্ষমাণ</SelectItem>
                          <SelectItem value="processed">প্রক্রিয়াধীন</SelectItem>
                          <SelectItem value="paid">পরিশোধিত</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">আয়</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {salaryComponents
                        .filter(c => c.type === 'earning')
                        .map(component => (
                          <div key={component.id}>
                            <Label>{component.name} {component.name_bn && `(${component.name_bn})`}</Label>
                            <Input
                              type="number"
                              value={payrollData.earnings[component.id] || ''}
                              onChange={(e) => setPayrollData({
                                ...payrollData,
                                earnings: { ...payrollData.earnings, [component.id]: e.target.value }
                              })}
                              placeholder={component.default_amount || '0'}
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">কর্তন</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {salaryComponents
                        .filter(c => c.type === 'deduction')
                        .map(component => (
                          <div key={component.id}>
                            <Label>{component.name} {component.name_bn && `(${component.name_bn})`}</Label>
                            <Input
                              type="number"
                              value={payrollData.deductions[component.id] || ''}
                              onChange={(e) => setPayrollData({
                                ...payrollData,
                                deductions: { ...payrollData.deductions, [component.id]: e.target.value }
                              })}
                              placeholder={component.default_amount || '0'}
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">নোট</Label>
                    <Input
                      value={payrollData.notes}
                      onChange={(e) => setPayrollData({ ...payrollData, notes: e.target.value })}
                      placeholder="অতিরিক্ত তথ্য"
                      data-testid="input-notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button type="submit" disabled={processPayrollMutation.isPending} data-testid="button-submit-payroll">
                      {processPayrollMutation.isPending ? 'প্রক্রিয়া করা হচ্ছে...' : 'প্রক্রিয়া করুন'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              onClick={() => bulkProcessMutation.mutate()}
              disabled={bulkProcessMutation.isPending}
              data-testid="button-bulk-process"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              সকলের বেতন প্রক্রিয়া করুন
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">মোট বেতন</p>
                  <p className="text-2xl font-bold" data-testid="text-total-payroll">৳{stats.totalPayroll.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">পরিশোধিত</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-paid">৳{stats.paidAmount.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">বাকি</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-pending">৳{stats.pendingAmount.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">পরিশোধিত সংখ্যা</p>
                  <p className="text-2xl font-bold" data-testid="text-paid-count">{stats.paidCount}/{stats.totalCount}</p>
                </div>
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="payroll" data-testid="tab-payroll">বেতন রেকর্ড</TabsTrigger>
            <TabsTrigger value="components" data-testid="tab-components">বেতন উপাদান</TabsTrigger>
          </TabsList>

          {/* Payroll Records */}
          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <CardTitle>বেতন রেকর্ড</CardTitle>
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                      <SelectTrigger className="w-32" data-testid="select-filter-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {format(new Date(2024, month - 1), 'MMM')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-24"
                      data-testid="input-filter-year"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী</TableHead>
                        <TableHead>মাস/বছর</TableHead>
                        <TableHead>মূল বেতন</TableHead>
                        <TableHead>মোট আয়</TableHead>
                        <TableHead>কর্তন</TableHead>
                        <TableHead>নিট বেতন</TableHead>
                        <TableHead>পদ্ধতি</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            লোড হচ্ছে...
                          </TableCell>
                        </TableRow>
                      ) : payrollRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">কোনো বেতন রেকর্ড নেই</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        payrollRecords.map((record) => (
                          <TableRow key={record.id} data-testid={`row-payroll-${record.id}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{record.staff?.name}</div>
                                <div className="text-sm text-muted-foreground">{record.staff?.staff_id}</div>
                              </div>
                            </TableCell>
                            <TableCell>{record.month}/{record.year}</TableCell>
                            <TableCell>৳{parseFloat(record.basic_salary).toLocaleString()}</TableCell>
                            <TableCell>৳{parseFloat(record.gross_salary).toLocaleString()}</TableCell>
                            <TableCell>৳{parseFloat(record.total_deductions).toLocaleString()}</TableCell>
                            <TableCell className="font-bold">৳{parseFloat(record.net_salary).toLocaleString()}</TableCell>
                            <TableCell>{record.payment_method || '-'}</TableCell>
                            <TableCell>{getStatusBadge(record.payment_status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generatePayslip(record)}
                                  data-testid={`button-payslip-${record.id}`}
                                >
                                  <FileText className="w-3 h-3" />
                                </Button>
                                {record.payment_status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updatePaymentStatusMutation.mutate({ 
                                      id: record.id, 
                                      status: 'paid',
                                      paymentDate: format(new Date(), 'yyyy-MM-dd')
                                    })}
                                    data-testid={`button-mark-paid-${record.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
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

          {/* Salary Components */}
          <TabsContent value="components" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>বেতন উপাদান</CardTitle>
                  <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-component">
                        <Plus className="w-4 h-4 mr-2" />
                        নতুন উপাদান
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>নতুন বেতন উপাদান</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleComponentSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">নাম *</Label>
                            <Input
                              value={componentData.name}
                              onChange={(e) => setComponentData({ ...componentData, name: e.target.value })}
                              required
                              data-testid="input-component-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="name_bn">বাংলা নাম</Label>
                            <Input
                              value={componentData.name_bn}
                              onChange={(e) => setComponentData({ ...componentData, name_bn: e.target.value })}
                              data-testid="input-component-name-bn"
                            />
                          </div>
                          <div>
                            <Label htmlFor="type">ধরন *</Label>
                            <Select
                              value={componentData.type}
                              onValueChange={(value) => setComponentData({ ...componentData, type: value })}
                            >
                              <SelectTrigger data-testid="select-component-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="earning">আয়</SelectItem>
                                <SelectItem value="deduction">কর্তন</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="calculation_type">গণনা ধরন</Label>
                            <Select
                              value={componentData.calculation_type}
                              onValueChange={(value) => setComponentData({ ...componentData, calculation_type: value })}
                            >
                              <SelectTrigger data-testid="select-calculation-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">নির্দিষ্ট</SelectItem>
                                <SelectItem value="percentage">শতাংশ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="default_amount">ডিফল্ট পরিমাণ</Label>
                            <Input
                              type="number"
                              value={componentData.default_amount}
                              onChange={(e) => setComponentData({ ...componentData, default_amount: e.target.value })}
                              data-testid="input-default-amount"
                            />
                          </div>
                          <div>
                            <Label htmlFor="percentage">শতাংশ</Label>
                            <Input
                              type="number"
                              value={componentData.percentage}
                              onChange={(e) => setComponentData({ ...componentData, percentage: e.target.value })}
                              data-testid="input-percentage"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsComponentDialogOpen(false)}>
                            বাতিল
                          </Button>
                          <Button type="submit" disabled={createComponentMutation.isPending} data-testid="button-submit-component">
                            {createComponentMutation.isPending ? 'যোগ করা হচ্ছে...' : 'যোগ করুন'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-3 text-green-700">আয়</h3>
                    <div className="space-y-2">
                      {salaryComponents
                        .filter(c => c.type === 'earning')
                        .map(component => (
                          <div key={component.id} className="p-3 border rounded-lg" data-testid={`component-${component.id}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{component.name}</div>
                                {component.name_bn && (
                                  <div className="text-sm text-muted-foreground">{component.name_bn}</div>
                                )}
                              </div>
                              <Badge variant="outline">
                                {component.calculation_type === 'fixed' 
                                  ? `৳${component.default_amount}` 
                                  : `${component.percentage}%`}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-red-700">কর্তন</h3>
                    <div className="space-y-2">
                      {salaryComponents
                        .filter(c => c.type === 'deduction')
                        .map(component => (
                          <div key={component.id} className="p-3 border rounded-lg" data-testid={`component-${component.id}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{component.name}</div>
                                {component.name_bn && (
                                  <div className="text-sm text-muted-foreground">{component.name_bn}</div>
                                )}
                              </div>
                              <Badge variant="outline">
                                {component.calculation_type === 'fixed' 
                                  ? `৳${component.default_amount}` 
                                  : `${component.percentage}%`}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
