import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft,
  DollarSign,
  Download,
  TrendingUp,
  Calendar,
  CheckCircle2,
  FileText,
  Wallet,
  CreditCard,
  PieChart
} from "lucide-react";

interface PayrollRecord {
  id: number;
  staff_id: number;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  status: 'pending' | 'paid';
  school_id: number;
  created_at: string;
}

export default function StaffPayroll() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();

  // Get staff profile
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('schoolId', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  const staffId = staffProfile?.id;

  // Get payroll records
  const { data: payrollRecords, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ['staff-payroll', staffId, schoolId],
    queryFn: async () => {
      if (!staffId || !schoolId) return [];
      
      const { data, error } = await supabase
        .from('staff_payroll')
        .select('*')
        .eq('staff_id', staffId)
        .eq('school_id', schoolId)
        .order('month', { ascending: false });
      
      if (error) {
        console.log('No payroll records found');
        return [];
      }
      
      return data;
    },
    enabled: !!staffId && !!schoolId,
  });

  // Calculate yearly stats
  const currentYear = new Date().getFullYear();
  const yearlyRecords = payrollRecords?.filter(r => 
    new Date(r.month).getFullYear() === currentYear
  ) || [];

  const yearlyStats = {
    totalEarned: yearlyRecords.reduce((sum, r) => sum + r.net_salary, 0),
    totalBasic: yearlyRecords.reduce((sum, r) => sum + r.basic_salary, 0),
    totalAllowances: yearlyRecords.reduce((sum, r) => sum + r.allowances, 0),
    totalDeductions: yearlyRecords.reduce((sum, r) => sum + r.deductions, 0),
  };

  const getStatusColor = (status: string) => {
    return status === 'paid' ? 'bg-green-500' : 'bg-yellow-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-page-title">
                  Payroll / বেতন
                </h1>
              </div>
            </div>
            <Button variant="outline" size="sm" data-testid="button-download">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Salary Info */}
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-current-salary">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center" data-testid="text-salary-title">
                  <Wallet className="h-5 w-5 mr-2" />
                  Current Monthly Salary / বর্তমান মাসিক বেতন
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-100 mb-4">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-1" />
                      <span className="text-3xl font-bold text-green-600" data-testid="text-salary-amount">
                        ৳{staffProfile?.salary?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gross Monthly Salary / মোট মাসিক বেতন
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payroll History */}
            <Card className="shadow-xl" data-testid="card-payroll-history">
              <CardHeader>
                <CardTitle data-testid="text-history-title">
                  Payroll History / বেতন ইতিহাস
                </CardTitle>
                <CardDescription data-testid="text-history-description">
                  Your salary payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" data-testid="loading-spinner"></div>
                    </div>
                  ) : payrollRecords && payrollRecords.length === 0 ? (
                    <div className="text-center py-12" data-testid="empty-state">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No payroll records available
                      </p>
                    </div>
                  ) : (
                    payrollRecords?.map((record) => (
                      <div 
                        key={record.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                        data-testid={`payroll-${record.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="h-5 w-5 text-gray-600" />
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {format(parseISO(record.month), 'MMMM yyyy')}
                              </h3>
                              <Badge className={getStatusColor(record.status)}>
                                {record.status === 'paid' ? 'PAID / পরিশোধিত' : 'PENDING / অপেক্ষমাণ'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Basic Salary</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  ৳{record.basic_salary.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Allowances</p>
                                <p className="font-semibold text-green-600">
                                  +৳{record.allowances.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Deductions</p>
                                <p className="font-semibold text-red-600">
                                  -৳{record.deductions.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Net Salary</p>
                                <p className="font-bold text-lg text-green-600">
                                  ৳{record.net_salary.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {record.payment_date && (
                              <p className="text-xs text-gray-500 mt-3">
                                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-600" />
                                Paid on: {format(parseISO(record.payment_date), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" data-testid={`button-download-${record.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Yearly Summary */}
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-yearly-summary">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-yearly-title">
                  {currentYear} Summary / {currentYear} সারাংশ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Earned
                    </span>
                    <span className="font-bold text-green-600" data-testid="text-yearly-total">
                      ৳{yearlyStats.totalEarned.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span>
                    <span className="font-semibold" data-testid="text-yearly-basic">
                      ৳{yearlyStats.totalBasic.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Allowances</span>
                    <span className="font-semibold text-green-600" data-testid="text-yearly-allowances">
                      ৳{yearlyStats.totalAllowances.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600">Deductions</span>
                    <span className="font-semibold text-red-600" data-testid="text-yearly-deductions">
                      ৳{yearlyStats.totalDeductions.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <PieChart className="h-4 w-4 mr-2" />
                    <span>Payments received: {yearlyRecords.filter(r => r.status === 'paid').length} months</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-xl" data-testid="card-payment-methods">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-payment-title">
                  Payment Method / পেমেন্ট পদ্ধতি
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        Bank Transfer
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Direct deposit to your account
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-xl" data-testid="card-quick-stats">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-stats-title">
                  Quick Stats / দ্রুত পরিসংখ্যান
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Average</span>
                    <span className="font-semibold" data-testid="text-monthly-avg">
                      ৳{yearlyRecords.length > 0 
                        ? Math.round(yearlyStats.totalEarned / yearlyRecords.length).toLocaleString() 
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Highest Payment</span>
                    <span className="font-semibold text-green-600" data-testid="text-highest">
                      ৳{yearlyRecords.length > 0 
                        ? Math.max(...yearlyRecords.map(r => r.net_salary)).toLocaleString() 
                        : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
