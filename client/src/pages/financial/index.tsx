import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { db } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CreditCard,
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Download,
  Upload,
  Search,
  Plus,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Banknote,
  Receipt,
  PieChart,
  BarChart3,
  Users,
  Building,
  Phone,
  Mail,
  Globe,
  Shield,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryBn: string;
  description: string;
  descriptionBn: string;
  paymentMethod: string;
  paymentMethodBn: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  studentName?: string;
  className?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  nameBn: string;
  type: 'mobile' | 'bank' | 'cash' | 'card';
  icon: string;
  isActive: boolean;
  fee: number;
  processingTime: string;
  description: string;
  descriptionBn: string;
}

interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  monthlyGrowth: number;
  todayTransactions: number;
  pendingPayments: number;
}

export default function FinancialPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, schoolId } = useSupabaseDirectAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Enhanced payment methods following Don Norman's visibility principle
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'bkash',
      name: 'bKash',
      nameBn: 'বিকাশ',
      type: 'mobile',
      icon: 'Phone',
      isActive: true,
      fee: 1.5,
      processingTime: 'তাৎক্ষণিক',
      description: 'Mobile banking payment',
      descriptionBn: 'মোবাইল ব্যাংকিং পেমেন্ট'
    },
    {
      id: 'nagad',
      name: 'Nagad',
      nameBn: 'নগদ',
      type: 'mobile',
      icon: 'Phone',
      isActive: true,
      fee: 1.2,
      processingTime: 'তাৎক্ষণিক',
      description: 'Digital financial service',
      descriptionBn: 'ডিজিটাল আর্থিক সেবা'
    },
    {
      id: 'rocket',
      name: 'Rocket',
      nameBn: 'রকেট',
      type: 'mobile',
      icon: 'Phone',
      isActive: true,
      fee: 1.8,
      processingTime: 'তাৎক্ষণিক',
      description: 'Mobile financial service',
      descriptionBn: 'মোবাইল আর্থিক সেবা'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      nameBn: 'ব্যাংক ট্রান্সফার',
      type: 'bank',
      icon: 'Building',
      isActive: true,
      fee: 0,
      processingTime: '১-২ ঘন্টা',
      description: 'Direct bank transfer',
      descriptionBn: 'সরাসরি ব্যাংক ট্রান্সফার'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      nameBn: 'ক্রেডিট/ডেবিট কার্ড',
      type: 'card',
      icon: 'CreditCard',
      isActive: true,
      fee: 2.5,
      processingTime: 'তাৎক্ষণিক',
      description: 'Visa, Mastercard payment',
      descriptionBn: 'ভিসা, মাস্টারকার্ড পেমেন্ট'
    },
    {
      id: 'cash',
      name: 'Cash',
      nameBn: 'নগদ',
      type: 'cash',
      icon: 'Banknote',
      isActive: true,
      fee: 0,
      processingTime: 'তাৎক্ষণিক',
      description: 'Cash payment',
      descriptionBn: 'নগদ পেমেন্ট'
    }
  ];

  // Sample transactions with enhanced structure
  const transactions: Transaction[] = [
    {
      id: 'txn_001',
      date: '2025-06-03',
      amount: 15000,
      type: 'income',
      category: 'tuition_fee',
      categoryBn: 'বেতন',
      description: 'Monthly tuition fee - Class 10',
      descriptionBn: 'মাসিক বেতন - দশম শ্রেণী',
      paymentMethod: 'bkash',
      paymentMethodBn: 'বিকাশ',
      reference: 'BK20250603001',
      status: 'completed',
      studentName: 'আয়েশা রহমান',
      className: 'দশম শ্রেণী'
    },
    {
      id: 'txn_002',
      date: '2025-06-03',
      amount: 25000,
      type: 'expense',
      category: 'teacher_salary',
      categoryBn: 'শিক্ষক বেতন',
      description: 'Monthly salary - Mathematics Teacher',
      descriptionBn: 'মাসিক বেতন - গণিত শিক্ষক',
      paymentMethod: 'bank_transfer',
      paymentMethodBn: 'ব্যাংক ট্রান্সফার',
      reference: 'BT20250603002',
      status: 'completed'
    },
    {
      id: 'txn_003',
      date: '2025-06-02',
      amount: 5000,
      type: 'income',
      category: 'admission_fee',
      categoryBn: 'ভর্তি ফি',
      description: 'New student admission fee',
      descriptionBn: 'নতুন ছাত্রের ভর্তি ফি',
      paymentMethod: 'nagad',
      paymentMethodBn: 'নগদ',
      reference: 'NG20250602001',
      status: 'pending',
      studentName: 'রফিক উল্লাহ',
      className: 'নবম শ্রেণী'
    },
    {
      id: 'txn_004',
      date: '2025-06-02',
      amount: 8000,
      type: 'expense',
      category: 'utility_bill',
      categoryBn: 'ইউটিলিটি বিল',
      description: 'Electricity bill for May 2025',
      descriptionBn: 'মে ২০২৫ এর বিদ্যুৎ বিল',
      paymentMethod: 'cash',
      paymentMethodBn: 'নগদ',
      reference: 'CASH20250602001',
      status: 'completed'
    },
    {
      id: 'txn_005',
      date: '2025-06-01',
      amount: 12000,
      type: 'income',
      category: 'exam_fee',
      categoryBn: 'পরীক্ষার ফি',
      description: 'Final examination fee',
      descriptionBn: 'চূড়ান্ত পরীক্ষার ফি',
      paymentMethod: 'rocket',
      paymentMethodBn: 'রকেট',
      reference: 'RK20250601001',
      status: 'failed',
      studentName: 'ফাতেমা খাতুন',
      className: 'একাদশ শ্রেণী'
    }
  ];

  // Calculate financial stats
  const financialStats: FinancialStats = {
    totalIncome: transactions.filter(t => t.type === 'income' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
    totalExpense: transactions.filter(t => t.type === 'expense' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
    netBalance: 0,
    monthlyGrowth: 15.2,
    todayTransactions: transactions.filter(t => t.date === '2025-06-03').length,
    pendingPayments: transactions.filter(t => t.status === 'pending').length
  };

  financialStats.netBalance = financialStats.totalIncome - financialStats.totalExpense;

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    if (searchQuery && !transaction.descriptionBn.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !transaction.studentName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Payment processing mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error('Payment processing failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "পেমেন্ট সফল",
        description: "আপনার পেমেন্ট সফলভাবে প্রক্রিয়া করা হয়েছে",
      });
      setPaymentAmount('');
      setPaymentDescription('');
      setSelectedPaymentMethod('');
    },
    onError: () => {
      toast({
        title: "পেমেন্ট ব্যর্থ",
        description: "পেমেন্ট প্রক্রিয়া করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Get status style
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'completed': return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'pending': return { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock };
      case 'failed': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle };
      default: return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Clock };
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'সম্পন্ন';
      case 'pending': return 'অপেক্ষমান';
      case 'failed': return 'ব্যর্থ';
      default: return 'অজানা';
    }
  };

  // Payment method card component
  const PaymentMethodCard = ({ method }: { method: PaymentMethod }) => {
    const IconComponent = method.icon === 'Phone' ? Phone : 
                         method.icon === 'Building' ? Building :
                         method.icon === 'CreditCard' ? CreditCard : Banknote;

    return (
      <Card className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selectedPaymentMethod === method.id ? "ring-2 ring-blue-500 border-blue-500" : "",
        !method.isActive && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => method.isActive && setSelectedPaymentMethod(method.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              method.type === 'mobile' ? "bg-green-100 text-green-600" :
              method.type === 'bank' ? "bg-blue-100 text-blue-600" :
              method.type === 'card' ? "bg-purple-100 text-purple-600" :
              "bg-gray-100 text-gray-600"
            )}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{method.nameBn}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{method.descriptionBn}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span>ফি: {method.fee}%</span>
                <span>সময়: {method.processingTime}</span>
              </div>
            </div>
            {selectedPaymentMethod === method.id && (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell>
      <ResponsivePageLayout
        title="পেমেন্ট গেটওয়ে ও আর্থিক ব্যবস্থাপনা"
        description="নিরাপদ পেমেন্ট প্রক্রিয়া এবং আর্থিক লেনদেন পরিচালনা করুন"
      >
        <div className="space-y-6">
          {/* Enhanced financial overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">মোট আয়</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {showBalance ? `৳${financialStats.totalIncome.toLocaleString()}` : '৳****'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{financialStats.monthlyGrowth}% এই মাসে
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">মোট খরচ</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {showBalance ? `৳${financialStats.totalExpense.toLocaleString()}` : '৳****'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      -5.2% এই মাসে
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                    <ArrowDownLeft className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">নেট ব্যালেন্স</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      financialStats.netBalance >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"
                    )}>
                      {showBalance ? `৳${financialStats.netBalance.toLocaleString()}` : '৳****'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {financialStats.netBalance >= 0 ? 'লাভ' : 'ক্ষতি'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">আজকের লেনদেন</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {financialStats.todayTransactions}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {financialStats.pendingPayments} টি অপেক্ষমান
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full lg:w-fit grid-cols-4">
                <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
                <TabsTrigger value="payment">পেমেন্ট</TabsTrigger>
                <TabsTrigger value="transactions">লেনদেন</TabsTrigger>
                <TabsTrigger value="reports">রিপোর্ট</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showBalance ? 'লুকান' : 'দেখান'}
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  রিপোর্ট
                </Button>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  সেটিংস
                </Button>
              </div>
            </div>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick payment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      দ্রুত পেমেন্ট
                    </CardTitle>
                    <CardDescription>
                      ছাত্রদের ফি এবং অন্যান্য পেমেন্ট গ্রহণ করুন
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="amount">পরিমাণ (৳)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="০"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="text-lg font-semibold"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">বিবরণ</Label>
                      <Input
                        id="description"
                        placeholder="যেমন: মাসিক বেতন, ভর্তি ফি"
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      disabled={!paymentAmount || !paymentDescription}
                      onClick={() => {
                        processPaymentMutation.mutate({
                          amount: parseFloat(paymentAmount),
                          description: paymentDescription,
                          method: selectedPaymentMethod || 'cash'
                        });
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      পেমেন্ট গ্রহণ করুন
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      সাম্প্রতিক লেনদেন
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction) => {
                        const statusStyle = getStatusStyle(transaction.status);
                        const StatusIcon = statusStyle.icon;
                        
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                transaction.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                              )}>
                                {transaction.type === 'income' ? 
                                  <ArrowUpRight className="h-4 w-4" /> : 
                                  <ArrowDownLeft className="h-4 w-4" />
                                }
                              </div>
                              <div>
                                <p className="font-medium text-sm">{transaction.descriptionBn}</p>
                                <p className="text-xs text-gray-500">
                                  {transaction.studentName && `${transaction.studentName} • `}
                                  {transaction.paymentMethodBn}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-semibold",
                                transaction.type === 'income' ? "text-green-600" : "text-red-600"
                              )}>
                                {transaction.type === 'income' ? '+' : '-'}৳{transaction.amount.toLocaleString()}
                              </p>
                              <Badge className={cn("text-xs", statusStyle.bg)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {getStatusLabel(transaction.status)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>পেমেন্ট পদ্ধতি</CardTitle>
                  <CardDescription>
                    আপনার পছন্দের পেমেন্ট পদ্ধতি নির্বাচন করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
                      <PaymentMethodCard key={method.id} method={method} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              {/* Enhanced transaction filters */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="লেনদেন খুঁজুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="ধরন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">সকল ধরন</SelectItem>
                          <SelectItem value="income">আয়</SelectItem>
                          <SelectItem value="expense">খরচ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        এক্সপোর্ট
                      </Button>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        নতুন
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced transaction table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>বিবরণ</TableHead>
                        <TableHead>ধরন</TableHead>
                        <TableHead>পেমেন্ট পদ্ধতি</TableHead>
                        <TableHead>পরিমাণ</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => {
                        const statusStyle = getStatusStyle(transaction.status);
                        const StatusIcon = statusStyle.icon;
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy') : 'তারিখ নেই'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{transaction.descriptionBn}</p>
                                {transaction.studentName && (
                                  <p className="text-sm text-gray-500">
                                    {transaction.studentName} • {transaction.className}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                                {transaction.type === 'income' ? 'আয়' : 'খরচ'}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.paymentMethodBn}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-semibold",
                                transaction.type === 'income' ? "text-green-600" : "text-red-600"
                              )}>
                                {transaction.type === 'income' ? '+' : '-'}৳{transaction.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusStyle.bg}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {getStatusLabel(transaction.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      আয়ের বিভাগ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">বেতন</span>
                        <span className="font-semibold">৬৫%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">ভর্তি ফি</span>
                        <span className="font-semibold">২৫%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">পরীক্ষার ফি</span>
                        <span className="font-semibold">১০%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      খরচের বিভাগ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">শিক্ষক বেতন</span>
                        <span className="font-semibold">৭০%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">ইউটিলিটি বিল</span>
                        <span className="font-semibold">২০%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">রক্ষণাবেক্ষণ</span>
                        <span className="font-semibold">১০%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}