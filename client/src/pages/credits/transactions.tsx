import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";

interface Transaction {
  id: number;
  date?: Date;
  createdAt: string;
  created_at?: string;
  type: "purchase" | "usage";
  amount?: number;
  credits: number;
  paymentMethod?: string;
  payment_method?: string;
  status: "completed" | "pending" | "failed";
  description: string;
}

export default function TransactionsPage() {
  const [_, setLocation] = useLocation();
  const isMobile = useMobile();
  const { user, schoolId } = useSupabaseDirectAuth();
  
  // Fetch transaction data using direct Supabase with proper school isolation
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["credit-transactions", user?.id, schoolId],
    queryFn: () => db.getCreditTransactions(user?.id || '', schoolId || 1),
    enabled: !!user?.id && !!schoolId
  });

  // Group transactions by month
  const groupedTransactions = Array.isArray(transactions) ? transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
    const dateStr = transaction.created_at || transaction.createdAt;
    const date = new Date(dateStr);
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>) : {};

  if (isLoading) {
    return (
      <AppShell>
        <ResponsivePageLayout title="লেনদেনের ইতিহাস">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">লেনদেন লোড হচ্ছে...</p>
            </div>
          </div>
        </ResponsivePageLayout>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ResponsivePageLayout title="লেনদেনের ইতিহাস">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">লেনদেনের ইতিহাস</h1>
              <p className="text-muted-foreground">আপনার সমস্ত ক্রেডিট লেনদেন দেখুন</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/credits")}
              className="w-full sm:w-auto"
            >
              ← ক্রেডিট ড্যাশবোর্ড
            </Button>
          </div>

          {/* Transactions List */}
          {Array.isArray(transactions) && transactions.length > 0 ? (
            <div className="space-y-6">
              {isMobile ? (
                // Mobile view - Card layout
                <div className="space-y-4">
                  {Object.entries(groupedTransactions)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([monthYear, monthTransactions]) => (
                      <div key={monthYear} className="space-y-3">
                        <h3 className="font-semibold text-lg sticky top-0 bg-background/95 backdrop-blur py-2">
                          {new Date(monthYear).toLocaleDateString('bn-BD', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </h3>
                        {monthTransactions
                          .sort((a, b) => {
                            const dateA = new Date(a.created_at || a.createdAt).getTime();
                            const dateB = new Date(b.created_at || b.createdAt).getTime();
                            return dateB - dateA;
                          })
                          .map((transaction) => {
                            const paymentMethod = transaction.payment_method || transaction.paymentMethod || '';
                            return (
                              <Card key={transaction.id} className="border-l-4 border-l-primary/20">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{transaction.description}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(transaction.created_at || transaction.createdAt).toLocaleDateString('bn-BD')} • 
                                        {transaction.type === "purchase" ? 
                                          ` ${paymentMethod === "bkash" ? "বিকাশ" : 
                                            paymentMethod === "nagad" ? "নগদ" : 
                                            paymentMethod === "rocket" ? "রকেট" :
                                            paymentMethod === "bank" ? "ব্যাংক" : "অন্যান্য"}` : 
                                          " ক্রেডিট ব্যবহার"
                                        }
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-semibold ${transaction.type === "purchase" ? "text-green-600" : "text-red-500"}`}>
                                        {transaction.type === "purchase" ? "+" : "-"}{transaction.credits || 0} ক্রেডিট
                                      </p>
                                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                        transaction.status === "completed" ? "bg-green-100 text-green-800" :
                                        transaction.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                        "bg-red-100 text-red-800"
                                      }`}>
                                        {transaction.status === "completed" ? "সম্পন্ন" :
                                         transaction.status === "pending" ? "অপেক্ষমান" : "ব্যর্থ"}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    ))}
                </div>
              ) : (
                // Desktop view - Table layout
                <div className="bg-card rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-3 text-left font-medium">তারিখ</th>
                          <th className="px-4 py-3 text-left font-medium">বিবরণ</th>
                          <th className="px-4 py-3 text-left font-medium">ধরন</th>
                          <th className="px-4 py-3 text-right font-medium">ক্রেডিট</th>
                          <th className="px-4 py-3 text-center font-medium">অবস্থা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((transaction: Transaction) => {
                          const paymentMethod = transaction.payment_method || transaction.paymentMethod || '';
                          return (
                            <tr key={transaction.id} className="hover:bg-muted/30">
                              <td className="whitespace-nowrap px-4 py-3 text-sm">
                                {new Date(transaction.created_at || transaction.createdAt).toLocaleDateString('bn-BD')}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {transaction.description}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {transaction.type === "purchase" ? 
                                  `ক্রেডিট ক্রয় (${paymentMethod === "bkash" ? "বিকাশ" : 
                                    paymentMethod === "nagad" ? "নগদ" : 
                                    paymentMethod === "rocket" ? "রকেট" :
                                    paymentMethod === "bank" ? "ব্যাংক" : "অন্যান্য"})` : 
                                  "ক্রেডিট ব্যবহার"
                                }
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <span className={`font-semibold ${transaction.type === "purchase" ? "text-green-600" : "text-red-500"}`}>
                                  {transaction.type === "purchase" ? "+" : "-"}{transaction.credits || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "completed" ? "bg-green-100 text-green-800" :
                                  transaction.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {transaction.status === "completed" ? "সম্পন্ন" :
                                   transaction.status === "pending" ? "অপেক্ষমান" : "ব্যর্থ"}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">কোনো লেনদেন পাওয়া যায়নি</h3>
                <p className="text-muted-foreground mb-4">আপনার এখনো কোনো ক্রেডিট লেনদেন হয়নি।</p>
                <Button onClick={() => setLocation("/credits")}>
                  ক্রেডিট কিনুন
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}