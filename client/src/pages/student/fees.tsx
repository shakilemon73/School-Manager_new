import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft,
  CreditCard,
  Receipt,
  Download,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter
} from "lucide-react";

interface FeeReceipt {
  id: number;
  studentId: number;
  receiptNumber: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  paymentMethod: string;
  paymentDate: string;
  academicYear: string;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
  createdAt: string;
}

interface FeeItem {
  id: number;
  receiptId: number;
  itemName: string;
  amount: string;
  description?: string;
}

interface PaymentSummary {
  totalPaid: number;
  totalDue: number;
  monthlyAverage: number;
  lastPaymentDate: string;
}

export default function StudentFees() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  // First get student profile to get student database ID
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      return await db.getStudentProfile(user.id, schoolId);
    },
    enabled: !!user?.id && !!schoolId,
  });

  const studentId = studentProfile?.id;

  const { data: feeReceipts, isLoading } = useQuery<any[]>({
    queryKey: ['student-fee-receipts', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return [];
      return await db.getStudentFeeReceipts(studentId, schoolId);
    },
    enabled: !!studentId && !!schoolId,
  });

  const { data: paymentSummary } = useQuery<any>({
    queryKey: ['student-fee-summary', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return null;
      return await db.getStudentFeeSummary(studentId, schoolId);
    },
    enabled: !!studentId && !!schoolId,
  });

  // Extract fee items from receipts
  const feeItems = feeReceipts?.flatMap(receipt => receipt.fee_items || []) || [];

  // Filter receipts based on search and status
  const filteredReceipts = feeReceipts?.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.academicYear.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getReceiptItems = (receiptId: number) => {
    return feeItems?.filter(item => item.receiptId === receiptId) || [];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-purple-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Fee Payments
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ফি পেমেন্ট • Payment history and receipts
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    ৳{paymentSummary?.totalPaid?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-green-600 font-medium">Total Paid</p>
                </div>
                <div className="bg-green-500 p-3 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-700">
                    ৳{paymentSummary?.totalDue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-red-600 font-medium">Total Due</p>
                </div>
                <div className="bg-red-500 p-3 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ৳{paymentSummary?.monthlyAverage?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Monthly Average</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {paymentSummary?.lastPaymentDate ? 
                      format(parseISO(paymentSummary.lastPaymentDate), 'MMM d, yyyy') : 
                      'No recent payments'
                    }
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Last Payment</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Fee Receipts List */}
          <div className="lg:col-span-3">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <span>Fee Receipts</span>
                    </CardTitle>
                    <CardDescription>
                      Complete payment history with downloadable receipts
                    </CardDescription>
                  </div>
                  
                  {/* Search and Filter */}
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search receipts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredReceipts.map((receipt) => {
                    const items = getReceiptItems(receipt.id);
                    return (
                      <div key={receipt.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Receipt #{receipt.receiptNumber}
                              </h3>
                              <Badge className={getStatusColor(receipt.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(receipt.status)}
                                  <span className="capitalize">{receipt.status}</span>
                                </div>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Academic Year</p>
                                <p className="font-medium text-gray-900 dark:text-white">{receipt.academicYear}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Month</p>
                                <p className="font-medium text-gray-900 dark:text-white">{receipt.month}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Payment Date</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {format(parseISO(receipt.paymentDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Payment Method</p>
                                <p className="font-medium text-gray-900 dark:text-white">{receipt.paymentMethod}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="mb-2">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ৳{parseFloat(receipt.totalAmount).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">Total Amount</p>
                            </div>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>

                        {/* Fee Breakdown */}
                        {items.length > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Fee Breakdown:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items.map((item) => (
                                <div key={item.id} className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{item.itemName}</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    ৳{parseFloat(item.amount).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Payment Details */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Paid Amount:</span>
                            <span className="font-medium text-green-600">
                              ৳{parseFloat(receipt.paidAmount).toLocaleString()}
                            </span>
                          </div>
                          {parseFloat(receipt.dueAmount) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Due Amount:</span>
                              <span className="font-medium text-red-600">
                                ৳{parseFloat(receipt.dueAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Status:</span>
                            <span className={`font-medium capitalize ${
                              receipt.status === 'paid' ? 'text-green-600' :
                              receipt.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {receipt.status}
                            </span>
                          </div>
                        </div>

                        {receipt.notes && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              <strong>Note:</strong> {receipt.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredReceipts.length === 0 && (
                    <div className="text-center py-12">
                      <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Fee Receipts Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No receipts match your search criteria.' 
                          : 'No fee receipts available yet.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Fees Online
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Receipts
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Receipt className="h-4 w-4 mr-2" />
                  Fee Structure
                </Button>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-1">Online Payment</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Pay securely using bKash, Nagad, or credit card
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Bank Transfer</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Direct bank transfer to school account
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Cash Payment</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Pay directly at the school office
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredReceipts.slice(0, 3).map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {receipt.month} {receipt.academicYear}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(parseISO(receipt.paymentDate), 'MMM d')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          ৳{parseFloat(receipt.paidAmount).toLocaleString()}
                        </p>
                        <Badge size="sm" className={getStatusColor(receipt.status)}>
                          {receipt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}