import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, Zap, Shield, ArrowRight, Star, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";

interface CreditPackage {
  id: number;
  name: string;
  description: string;
  credits: number;
  price: string;
  isActive: boolean;
  createdAt: string;
}

interface PaymentForm {
  packageId: number;
  paymentMethod: string;
}

export default function BuyCreditsClean() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, schoolId } = useSupabaseDirectAuth();

  // Fetch credit packages using direct Supabase
  // Note: Packages are system-wide, same for all schools
  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["credit-packages"],
    queryFn: () => db.getCreditPackages(),
    enabled: !!user
  });

  // Credit purchase mutation using direct Supabase
  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: PaymentForm) => {
      if (!user?.id || !schoolId) throw new Error('Authentication required');
      
      const selectedPackage = packages.find(p => p.id === purchaseData.packageId);
      if (!selectedPackage) throw new Error('Invalid package selected');

      return await db.purchaseCredits({
        packageId: purchaseData.packageId,
        paymentMethod: purchaseData.paymentMethod,
        amount: selectedPackage.credits,
        userId: user.id,
        schoolId: schoolId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ক্রেডিট সফলভাবে ক্রয় হয়েছে!",
        description: "আপনার অ্যাকাউন্টে ক্রেডিট যোগ করা হয়েছে",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "ক্রেডিট ক্রয় ব্যর্থ",
        description: error.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন",
        variant: "destructive",
      });
    },
  });

  const handlePackageClick = (pkg: CreditPackage) => {
    const packagePrice = parseFloat(pkg.price);
    
    if (packagePrice === 0) {
      // Free package - direct claim via API
      purchaseMutation.mutate({
        packageId: pkg.id,
        paymentMethod: "cash",
      });
    } else {
      // Paid package - navigate to payment page using wouter
      console.log("Navigating to payment page for package:", pkg.id);
      setLocation(`/credits/payment/${pkg.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ক্রেডিট প্যাকেজ নির্বাচন করুন
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজ বেছে নিন
            </p>
          </motion.div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Instructions Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  সহজ ক্রেডিট ক্রয় প্রক্রিয়া
                </CardTitle>
                <CardDescription>
                  আপনার সুবিধামতো ক্রেডিট ক্রয় করুন
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">১</div>
                    <div>
                      <h4 className="font-medium text-green-800">ফ্রি প্যাকেজ</h4>
                      <p className="text-sm text-green-600">সরাসরি "ফ্রি নিন" বাটনে ক্লিক করুন</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">২</div>
                    <div>
                      <h4 className="font-medium text-blue-800">পেইড প্যাকেজ</h4>
                      <p className="text-sm text-blue-600">"এখনই কিনুন" ক্লিক করে পেমেন্ট পেজে যান</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">৩</div>
                    <div>
                      <h4 className="font-medium text-purple-800">পেমেন্ট অপশন</h4>
                      <p className="text-sm text-purple-600">SSLCommerz অথবা ম্যানুয়াল পেমেন্ট নির্বাচন করুন</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Package Cards */}
          {packages.map((pkg, index) => {
            const isFree = parseFloat(pkg.price) === 0;
            const isPopular = pkg.id === 2; // Basic plan is popular
            const valuePerCredit = parseFloat(pkg.price) / pkg.credits;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative"
              >
                <Card className={`h-full transition-all duration-300 hover:shadow-xl ${
                  isFree 
                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
                    : isPopular
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                    : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
                }`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        জনপ্রিয়
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center space-y-3">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                      isFree 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : isPopular
                        ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                        : 'bg-gradient-to-r from-purple-400 to-pink-500'
                    }`}>
                      {isFree ? (
                        <CheckCircle className="h-8 w-8 text-white" />
                      ) : isPopular ? (
                        <Zap className="h-8 w-8 text-white" />
                      ) : (
                        <TrendingUp className="h-8 w-8 text-white" />
                      )}
                    </div>
                    
                    <div>
                      <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      <CardDescription className="text-sm">{pkg.description}</CardDescription>
                    </div>

                    <div className="space-y-2">
                      <div className={`text-4xl font-bold ${
                        isFree ? 'text-green-600' : isPopular ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {isFree ? 'ফ্রি' : `৳${pkg.price}`}
                      </div>
                      {!isFree && (
                        <div className="text-sm text-muted-foreground">
                          প্রতি ক্রেডিট ৳{valuePerCredit.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{pkg.credits}</div>
                      <div className="text-sm text-muted-foreground">ক্রেডিট</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>ডকুমেন্ট জেনারেট:</span>
                        <span className="font-medium">{pkg.credits} টি</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>এক্সেস:</span>
                        <span className="font-medium">সকল টেমপ্লেট</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>সাপোর্ট:</span>
                        <span className="font-medium">২৪/৭</span>
                      </div>
                      {isFree && (
                        <div className="flex items-center justify-between text-sm">
                          <span>সীমাবদ্ধতা:</span>
                          <span className="font-medium text-orange-600">মাসে একবার</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Button clicked for package:", pkg.name, "Price:", pkg.price);
                        handlePackageClick(pkg);
                      }}
                      disabled={purchaseMutation.isPending}
                      className={`w-full ${
                        isFree 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                          : isPopular
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                      }`}
                      size="lg"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          প্রক্রিয়াকরণ...
                        </>
                      ) : (
                        <>
                          {isFree ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              ফ্রি নিন
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              এখনই কিনুন
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              সকল পেমেন্ট SSL এনক্রিপশন দিয়ে সুরক্ষিত। আপনার তথ্য সম্পূর্ণ নিরাপদ।
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}