import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Shield, 
  CheckCircle,
  Loader2
} from "lucide-react";

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
  paymentNumber?: string;
  transactionId?: string;
}

interface SSLCommerzPaymentForm {
  packageId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export default function PaymentOptions() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/credits/payment/:packageId");
  const packageId = params?.packageId ? parseInt(params.packageId) : null;
  
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, schoolId } = useSupabaseDirectAuth();

  // Fetch credit packages (system-wide)
  const { data: packages = [] } = useQuery<CreditPackage[]>({
    queryKey: ["credit-packages"],
    queryFn: () => db.getCreditPackages(),
  });

  const selectedPackage = packages.find(pkg => pkg.id === packageId);

  // SSLCommerz payment mutation
  const sslcommerzMutation = useMutation({
    mutationFn: async (paymentData: SSLCommerzPaymentForm) => {
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "পেমেন্ট শুরু করতে ব্যর্থ");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "পেমেন্ট ব্যর্থ",
        description: error.message || "পেমেন্ট গেটওয়ে সমস্যা",
        variant: "destructive",
      });
    },
  });

  // Manual payment mutation using direct Supabase
  const manualPaymentMutation = useMutation({
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
        title: "পেমেন্ট জমা দেওয়া হয়েছে",
        description: "আপনার অ্যাকাউন্টে ক্রেডিট যোগ করা হবে যাচাইয়ের পর",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      
      // Redirect back to credits page
      setLocation("/credits");
    },
    onError: (error: any) => {
      toast({
        title: "পেমেন্ট ব্যর্থ",
        description: error.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    if (!selectedPackage || !paymentMethod) {
      toast({
        title: "তথ্য অসম্পূর্ণ",
        description: "পেমেন্ট পদ্ধতি নির্বাচন করুন",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "sslcommerz") {
      // SSLCommerz payment gateway
      if (!customerName || !customerEmail || !customerPhone) {
        toast({
          title: "গ্রাহক তথ্য প্রয়োজন",
          description: "নাম, ইমেইল ও ফোন নম্বর দিন",
          variant: "destructive",
        });
        return;
      }

      sslcommerzMutation.mutate({
        packageId: selectedPackage.id,
        customerName,
        customerEmail,
        customerPhone,
      });
    } else {
      // Manual payment methods
      if (!paymentNumber || !transactionId) {
        toast({
          title: "পেমেন্ট তথ্য প্রয়োজন",
          description: "পেমেন্ট নম্বর ও ট্রানজেকশন আইডি দিন",
          variant: "destructive",
        });
        return;
      }

      manualPaymentMutation.mutate({
        packageId: selectedPackage.id,
        paymentMethod,
        paymentNumber,
        transactionId,
      });
    }
  };

  if (!selectedPackage) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-4">প্যাকেজ পাওয়া যায়নি</h2>
            <Button onClick={() => setLocation("/credits/buy")}>
              ক্রেডিট পৃষ্ঠায় ফিরে যান
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/credits/buy")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ফিরে যান
          </Button>
          <div>
            <h1 className="text-2xl font-bold">পেমেন্ট অপশন</h1>
            <p className="text-muted-foreground">আপনার সুবিধামতো পেমেন্ট পদ্ধতি নির্বাচন করুন</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>নির্বাচিত প্যাকেজ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPackage.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ক্রেডিট:</span>
                    <span className="font-medium">{selectedPackage.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>প্রতি ক্রেডিট:</span>
                    <span className="font-medium">৳{(parseFloat(selectedPackage.price) / selectedPackage.credits).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>মোট মূল্য:</span>
                    <span className="text-primary">৳{selectedPackage.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>পেমেন্ট পদ্ধতি নির্বাচন করুন</CardTitle>
                <CardDescription>
                  নিরাপদ ও সুবিধাজনক পেমেন্ট করার জন্য আপনার পছন্দের পদ্ধতি বেছে নিন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  {/* SSLCommerz Gateway */}
                  <div className="flex items-center space-x-3 p-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:bg-blue-100 transition-colors">
                    <RadioGroupItem value="sslcommerz" id="sslcommerz" />
                    <Label htmlFor="sslcommerz" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-800">SSLCommerz গেটওয়ে</div>
                        <div className="text-sm text-blue-600">নিরাপদ অনলাইন পেমেন্ট - সকল কার্ড ও মোবাইল ব্যাংকিং</div>
                      </div>
                      <Badge className="bg-blue-500 text-white">সুপারিশকৃত</Badge>
                    </Label>
                  </div>

                  {/* Manual Payment Methods */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">অথবা ম্যানুয়াল পেমেন্ট:</div>
                    
                    {/* bKash */}
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="bkash" id="bkash" />
                      <Label htmlFor="bkash" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">bKash</div>
                          <div className="text-sm text-muted-foreground">ম্যানুয়াল পেমেন্ট</div>
                        </div>
                      </Label>
                    </div>

                    {/* Nagad */}
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="nagad" id="nagad" />
                      <Label htmlFor="nagad" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">Nagad</div>
                          <div className="text-sm text-muted-foreground">ম্যানুয়াল পেমেন্ট</div>
                        </div>
                      </Label>
                    </div>

                    {/* Rocket */}
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="rocket" id="rocket" />
                      <Label htmlFor="rocket" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">Rocket</div>
                          <div className="text-sm text-muted-foreground">ম্যানুয়াল পেমেন্ট</div>
                        </div>
                      </Label>
                    </div>

                    {/* Bank Transfer */}
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">ব্যাংক ট্রান্সফার</div>
                          <div className="text-sm text-muted-foreground">সরাসরি ব্যাংক একাউন্টে</div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {/* SSLCommerz Customer Information */}
                {paymentMethod === "sslcommerz" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-800">গ্রাহক তথ্য</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName" className="text-sm font-medium">
                          পূর্ণ নাম *
                        </Label>
                        <Input
                          id="customerName"
                          placeholder="যেমন: মোহাম্মদ রহমান"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="customerPhone" className="text-sm font-medium">
                          মোবাইল নম্বর *
                        </Label>
                        <Input
                          id="customerPhone"
                          placeholder="যেমন: 01XXXXXXXXX"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="customerEmail" className="text-sm font-medium">
                          ইমেইল ঠিকানা *
                        </Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          placeholder="যেমন: example@gmail.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-blue-600 mt-3">
                      এই তথ্যগুলি নিরাপদ পেমেন্ট প্রক্রিয়ার জন্য প্রয়োজন
                    </div>
                  </motion.div>
                )}

                {/* Manual Payment Information */}
                {paymentMethod && paymentMethod !== "sslcommerz" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    <h4 className="font-medium">পেমেন্ট তথ্য</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paymentNumber" className="text-sm font-medium">
                          পেমেন্ট নম্বর *
                        </Label>
                        <Input
                          id="paymentNumber"
                          placeholder="যেমন: 01XXXXXXXXX"
                          value={paymentNumber}
                          onChange={(e) => setPaymentNumber(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="transactionId" className="text-sm font-medium">
                          ট্রানজেকশন আইডি *
                        </Label>
                        <Input
                          id="transactionId"
                          placeholder="যেমন: ABC123456789"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      পেমেন্ট সম্পন্ন করার পর প্রাপ্ত রিসিট থেকে তথ্য দিন। আপনার পেমেন্ট যাচাই করে ক্রেডিট যোগ করা হবে।
                    </div>
                  </motion.div>
                )}
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={handlePayment}
                  disabled={!paymentMethod || sslcommerzMutation.isPending || manualPaymentMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {sslcommerzMutation.isPending || manualPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      প্রক্রিয়াকরণ...
                    </>
                  ) : paymentMethod === "sslcommerz" ? (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      নিরাপদ পেমেন্ট করুন
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      পেমেন্ট জমা দিন
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}