import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  Wallet, 
  CreditCard, 
  History, 
  TrendingUp, 
  ArrowRight,
  Shield,
  BarChart3,
  Check,
  Crown,
  Star,
  Zap,
  Calendar,
  DollarSign,
  Plus,
  ChevronRight,
  Award,
  Target,
  Activity,
  ArrowUpRight,
  Sparkles,
  Gift,
  Clock,
  Users,
  FileText,
  PieChart,
  TrendingDown,
  RefreshCw,
  Bell,
  Settings,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  thisMonthUsage: number;
  efficiency?: number;
}

interface DocumentCost {
  id: number;
  name: string;
  nameBn: string;
  requiredCredits: number;
  category: string;
  description?: string;
}

export default function SupabaseDashboard() {
  const [_, setLocation] = useLocation();
  const isMobile = useMobile();
  const { user: supabaseUser, loading: authLoading } = useSupabaseDirectAuth();
  const user = supabaseUser;
  const queryClient = useQueryClient();
  
  // Fetch real-time data from Supabase
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/credit-packages"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/credit-transactions"],
  });

  const { data: usageLogs, isLoading: usageLoading } = useQuery({
    queryKey: ["/api/credit-usage"],
  });

  // Fetch credit balance directly from working endpoint
  const { data: userCreditBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/simple-credit-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/simple-credit-balance/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  const creditStats: CreditStats = {
    currentBalance: userCreditBalance?.currentCredits || 0,
    totalPurchased: userCreditBalance?.bonusCredits || 0,
    totalUsed: userCreditBalance?.usedCredits || 0,
    thisMonthUsage: 0,
    efficiency: 100
  };
  const statsLoading = balanceLoading;

  const { data: documentCosts, isLoading: costsLoading } = useQuery<DocumentCost[]>({
    queryKey: ["/api/document-costs"],
  });

  // Credit purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: { packageId: number; paymentMethod: string; amount: number }) => {
      return apiRequest("/api/credit-purchase", {
        method: "POST",
        body: JSON.stringify(purchaseData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ক্রেডিট ক্রয় সফল",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "ক্রেডিট ক্রয় ব্যর্থ",
        description: error.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন",
        variant: "destructive",
      });
    },
  });

  // Document generation mutation with credit tracking
  const generateDocumentMutation = useMutation({
    mutationFn: async (documentData: { 
      documentType: string; 
      templateId: number; 
      studentIds: number[];
      metadata?: any;
    }) => {
      return apiRequest("/api/document-generate", {
        method: "POST",
        body: JSON.stringify(documentData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ডকুমেন্ট তৈরি সফল",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-usage"] });
    },
    onError: (error: any) => {
      toast({
        title: "ডকুমেন্ট তৈরি ব্যর্থ",
        description: error.error || "পর্যাপ্ত ক্রেডিট নেই বা সিস্টেম এরর",
        variant: "destructive",
      });
    },
  });

  const isLoading = authLoading || packagesLoading || transactionsLoading || usageLoading || statsLoading || costsLoading;

  // Get balance status for alerts
  const getBalanceStatus = () => {
    const balance = creditStats?.currentBalance || 0;
    if (balance < 10) return { color: "bg-red-500", text: "অত্যন্ত কম", urgency: "high" };
    if (balance < 25) return { color: "bg-orange-500", text: "কম", urgency: "medium" };
    if (balance < 50) return { color: "bg-yellow-500", text: "মাঝামাঝি", urgency: "low" };
    return { color: "bg-green-500", text: "পর্যাপ্ত", urgency: "none" };
  };

  const balanceStatus = getBalanceStatus();
  const activePackages = Array.isArray(packages) ? packages.filter(pkg => pkg.isActive) : [];
  const recentTransactions = Array.isArray(transactions) ? transactions.slice(0, 3) : [];
  const topDocumentCosts = Array.isArray(documentCosts) ? documentCosts.slice(0, 4) : [];

  if (isLoading) {
    return (
      <AppShell>
        <ResponsivePageLayout title="ক্রেডিট ড্যাশবোর্ড">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto mt-2 ml-2"></div>
                </div>
                <p className="text-lg font-medium text-slate-700">তথ্য লোড হচ্ছে...</p>
                <p className="text-sm text-slate-500">অনুগ্রহ করে অপেক্ষা করুন</p>
              </div>
            </div>
          </div>
        </ResponsivePageLayout>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ResponsivePageLayout title="ক্রেডিট ও বিলিং ড্যাশবোর্ড">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 -m-6 p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    ক্রেডিট ও বিলিং
                  </h1>
                </div>
                <p className="text-lg text-slate-600 max-w-2xl">
                  আপনার প্রতিষ্ঠানের সব ধরনের ডকুমেন্ট সহজেই তৈরি করুন।
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 hover:bg-slate-50 border-slate-200"
                  onClick={() => setLocation('/credits/transactions')}
                >
                  <History className="h-4 w-4" />
                  লেনদেনের ইতিহাস
                </Button>
                <Button 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                  onClick={() => setLocation('/credits/buy')}
                  disabled={purchaseMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {purchaseMutation.isPending ? "প্রক্রিয়াকরণ..." : "ক্রেডিট কিনুন"}
                </Button>
              </div>
            </div>

            {/* Real-time Balance Alert */}
            {balanceStatus.urgency !== "none" && (
              <div className={`p-4 rounded-xl border-l-4 ${
                balanceStatus.urgency === "high" ? "bg-red-50 border-red-500 text-red-800" :
                balanceStatus.urgency === "medium" ? "bg-orange-50 border-orange-500 text-orange-800" :
                "bg-yellow-50 border-yellow-500 text-yellow-800"
              } flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">ক্রেডিট সতর্কতা</p>
                    <p className="text-sm opacity-90">
                      আপনার ক্রেডিট ব্যালেন্স {balanceStatus.text}। আরও ডকুমেন্ট তৈরি করতে ক্রেডিট কিনুন।
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setLocation('/credits/buy')}>
                  এখনই কিনুন
                </Button>
              </div>
            )}
          </div>

          {/* Real-time Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Live Balance */}
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-blue-500/10 bg-gradient-to-br from-blue-600 to-indigo-700">
              <CardContent className="p-6 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <Wallet className="h-8 w-8 text-blue-200" />
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                        লাইভ
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-blue-100 text-sm font-medium">উপলব্ধ ব্যালেন্স</p>
                    <p className="text-4xl font-bold">{creditStats?.currentBalance?.toLocaleString() || 0}</p>
                    <p className="text-blue-200 text-sm">ক্রেডিট</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Purchased */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-green-700 font-medium">মোট কেনা</p>
                  <p className="text-3xl font-bold text-green-800">{creditStats?.totalPurchased?.toLocaleString() || 0}</p>
                  <p className="text-green-600 text-sm">সর্বমোট</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Used */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-orange-100 bg-gradient-to-br from-orange-50 to-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-500 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-orange-700 border-orange-300">
                    {creditStats?.efficiency || 0}% দক্ষতা
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-orange-700 font-medium">মোট ব্যবহার</p>
                  <p className="text-3xl font-bold text-orange-800">{creditStats?.totalUsed?.toLocaleString() || 0}</p>
                  <Progress 
                    value={creditStats?.totalPurchased ? (creditStats.totalUsed / creditStats.totalPurchased) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* This Month Usage */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500 rounded-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                    চলমান
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-purple-700 font-medium">এই মাসে</p>
                  <p className="text-3xl font-bold text-purple-800">{creditStats?.thisMonthUsage?.toLocaleString() || 0}</p>
                  <p className="text-purple-600 text-sm">ব্যবহৃত ক্রেডিট</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Packages & Document Costs */}
            <div className="xl:col-span-2 space-y-8">
              {/* Credit Packages */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Gift className="h-6 w-6 text-blue-600" />
                      ক্রেডিট প্যাকেজ
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setLocation('/credits/buy')}>
                      সব দেখুন <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePackages.slice(0, 4).map((pkg: any) => {
                      const isPopular = pkg.name.includes("জনপ্রিয়") || pkg.name.includes("স্ট্যান্ডার্ড");
                      const isFree = pkg.price === "0.00";
                      
                      return (
                        <Card key={pkg.id} className={`relative border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                          isPopular ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50' : 
                          isFree ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50' :
                          'border-slate-200 hover:border-slate-300'
                        }`}>
                          {isPopular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-blue-600 text-white border-0 px-3 py-1">
                                <Star className="h-3 w-3 mr-1" />
                                জনপ্রিয়
                              </Badge>
                            </div>
                          )}
                          
                          <CardContent className="p-6 pt-8">
                            <div className="text-center space-y-3">
                              <h3 className="font-bold text-lg text-slate-800">{pkg.name}</h3>
                              <div className="space-y-1">
                                <p className="text-3xl font-bold text-slate-900">
                                  ৳{parseFloat(pkg.price.toString()).toLocaleString()}
                                </p>
                                <p className="text-sm text-slate-600">{pkg.credits.toLocaleString()} ক্রেডিট</p>
                              </div>
                              
                              <Button 
                                className={`w-full ${
                                  isPopular ? 'bg-blue-600 hover:bg-blue-700' : 
                                  isFree ? 'bg-green-600 hover:bg-green-700' :
                                  'bg-slate-800 hover:bg-slate-900'
                                }`}
                                onClick={() => {
                                  if (isFree) {
                                    // Free package - direct claim
                                    purchaseMutation.mutate({
                                      packageId: pkg.id,
                                      paymentMethod: 'cash',
                                      amount: 0
                                    });
                                  } else {
                                    // Paid package - redirect to payment page
                                    window.location.href = `/credits/payment/${pkg.id}`;
                                  }
                                }}
                                disabled={purchaseMutation.isPending}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                {isFree ? "শুরু করুন" : "এখনই কিনুন"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Document Generation Costs */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-6 w-6 text-purple-600" />
                      ডকুমেন্ট তৈরি করুন
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setLocation('/documents')}>
                      ডকুমেন্ট তৈরি করুন <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <p className="text-slate-600">সহজেই আপনার প্রয়োজনীয় ডকুমেন্ট তৈরি করুন</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topDocumentCosts.map((doc: DocumentCost) => (
                      <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-slate-50 hover:bg-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-slate-800">{doc.nameBn || doc.name}</h4>
                          <Badge variant="outline" className="bg-white">
                            {doc.requiredCredits} ক্রেডিট
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">{doc.category}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => generateDocumentMutation.mutate({
                            documentType: doc.category,
                            templateId: doc.id,
                            studentIds: [1], // Demo student ID
                          })}
                          disabled={generateDocumentMutation.isPending || (creditStats?.currentBalance || 0) < doc.requiredCredits}
                        >
                          {(creditStats?.currentBalance || 0) < doc.requiredCredits ? "ক্রেডিট প্রয়োজন" : "এখনই তৈরি করুন"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Activity & Quick Actions */}
            <div className="space-y-6">
              {/* Recent Transactions */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="h-6 w-6 text-purple-600" />
                    সাম্প্রতিক কার্যক্রম
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {recentTransactions.map((transaction: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className={`p-3 rounded-lg ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {transaction.type === 'purchase' ? <DollarSign className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">
                              {transaction.type === 'purchase' ? 'ক্রেডিট ক্রয়' : 'ডকুমেন্ট তৈরি'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {new Date(transaction.createdAt).toLocaleDateString('bn-BD')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              transaction.type === 'purchase' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {transaction.type === 'purchase' ? '+' : '-'}{transaction.credits} ক্রেডিট
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">কোন সাম্প্রতিক কার্যক্রম নেই</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-600" />
                    প্রয়োজনীয় কাজ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-white hover:bg-indigo-50 border-indigo-200"
                    onClick={() => setLocation('/credits/buy')}
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    আরো ক্রেডিট কিনুন
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-white hover:bg-purple-50 border-purple-200"
                    onClick={() => setLocation('/credits/transactions')}
                  >
                    <History className="h-4 w-4 mr-3" />
                    লেনদেনের ইতিহাস
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200"
                    onClick={() => setLocation('/documents')}
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    ডকুমেন্ট তৈরি
                  </Button>
                </CardContent>
              </Card>

              {/* Real-time Support */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                  <h3 className="font-bold text-lg mb-2">সর্বদা সাহায্যের জন্য প্রস্তুত</h3>
                  <p className="text-blue-100 text-sm mb-4">
                    উন্নত প্রযুক্তি দিয়ে তৈরি। যেকোনো সমস্যায় তাৎক্ষণিক সমাধান পাবেন।
                  </p>
                  <Button variant="secondary" size="sm" className="bg-white text-blue-700 hover:bg-blue-50">
                    সাহায্য নিন
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}