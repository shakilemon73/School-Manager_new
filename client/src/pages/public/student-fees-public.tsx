import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublicFees } from "@/hooks/use-public-fees";
import { LanguageText } from "@/components/ui/language-text";
import { CreditCard, LogOut, Clock, DollarSign, Download, FileText } from "lucide-react";
import { format } from "date-fns";

export default function PublicFeesPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);

  useEffect(() => {
    const accessToken = sessionStorage.getItem('public_access_token');
    const name = sessionStorage.getItem('student_name');
    const id = sessionStorage.getItem('student_id');
    const expiry = sessionStorage.getItem('token_expiry');

    if (!accessToken || !expiry || Date.now() > Number(expiry)) {
      setLocation('/public/student-portal');
      return;
    }

    setToken(accessToken);
    setStudentName(name || 'Student');
    setStudentId(id ? Number(id) : null);

    const remaining = Math.floor((Number(expiry) - Date.now()) / 1000);
    setTimeRemaining(remaining);
  }, [setLocation]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      handleLogout();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const { data: feeReceipts, isLoading } = usePublicFees(token, studentId);

  const handleLogout = () => {
    sessionStorage.clear();
    setLocation('/public/student-portal');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            <LanguageText en="Loading fee information..." bn="ফি তথ্য লোড হচ্ছে..." ar="تحميل معلومات الرسوم..." />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                <LanguageText en={`Fee Information - ${studentName}`} bn={`ফি তথ্য - ${studentName}`} ar={`معلومات الرسوم - ${studentName}`} />
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <LanguageText en="Payment History & Due Amounts" bn="পেমেন্ট ইতিহাস এবং বকেয়া" ar="تاريخ الدفع والمبالغ المستحقة" />
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Session: {formatTime(timeRemaining)}</span>
              </div>

              <Button variant="outline" size="sm" onClick={() => setLocation('/public/results')}>
                <LanguageText en="View Results" bn="ফলাফল দেখুন" ar="عرض النتائج" />
              </Button>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <LanguageText en="Logout" bn="লগআউট" ar="تسجيل الخروج" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Fee Content */}
      <div className="container mx-auto px-4 py-8">
        {!feeReceipts || feeReceipts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                <LanguageText en="No Fee Records" bn="কোনো ফি রেকর্ড নেই" ar="لا توجد سجلات رسوم" />
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                <LanguageText en="No fee records found." bn="কোনো ফি রেকর্ড পাওয়া যায়নি।" ar="لم يتم العثور على سجلات رسوم." />
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {feeReceipts.map((receipt) => (
              <Card key={receipt.id} data-testid={`card-receipt-${receipt.id}`}>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        <LanguageText en="Receipt" bn="রসিদ" ar="إيصال" /> #{receipt.receiptNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {receipt.month} {receipt.academicYear}
                      </p>
                    </div>
                    <Badge className={getStatusColor(receipt.status)}>
                      <LanguageText 
                        en={receipt.status} 
                        bn={receipt.status === 'paid' ? 'পরিশোধিত' : receipt.status === 'pending' ? 'বিচারাধীন' : 'বকেয়া'}
                        ar={receipt.status === 'paid' ? 'مدفوع' : receipt.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                      />
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Total Amount" bn="মোট পরিমাণ" ar="المبلغ الإجمالي" />
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{receipt.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Paid Amount" bn="পরিশোধিত পরিমাণ" ar="المبلغ المدفوع" />
                      </p>
                      <p className="text-2xl font-bold text-green-600">৳{receipt.paidAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Due Amount" bn="বকেয়া পরিমাণ" ar="المبلغ المستحق" />
                      </p>
                      <p className="text-2xl font-bold text-red-600">৳{receipt.dueAmount}</p>
                    </div>
                  </div>

                  {receipt.items && receipt.items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <LanguageText en="Fee Items" bn="ফি আইটেম" ar="عناصر الرسوم" />
                      </h4>
                      <div className="space-y-2">
                        {receipt.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="text-sm">{item.itemName}</span>
                            <span className="text-sm font-semibold">৳{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-download-${receipt.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      <LanguageText en="Download Receipt" bn="রসিদ ডাউনলোড" ar="تحميل الإيصال" />
                    </Button>
                    {receipt.status !== 'paid' && (
                      <Button size="sm" data-testid={`button-pay-${receipt.id}`}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        <LanguageText en="Pay Now" bn="এখনই পেমেন্ট করুন" ar="ادفع الآن" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
