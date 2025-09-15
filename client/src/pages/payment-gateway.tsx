import { useState } from "react";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, CreditCard, Smartphone, Building } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

interface PaymentMethod {
  id: string;
  name: string;
  nameBn: string;
  icon: React.ReactNode;
  description: string;
  descriptionBn: string;
  fees: string;
  feesBn: string;
}

interface FeeItem {
  id: number;
  description: string;
  descriptionBn: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export default function PaymentGateway() {
  const { user } = useSupabaseDirectAuth();
  const [selectedMethod, setSelectedMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedFees, setSelectedFees] = useState<number[]>([]);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "bkash",
      name: "bKash",
      nameBn: "বিকাশ",
      icon: <Smartphone className="h-6 w-6 text-pink-600" />,
      description: "Pay with bKash mobile banking",
      descriptionBn: "বিকাশ মোবাইল ব্যাংকিং দিয়ে পেমেন্ট করুন",
      fees: "Transaction fee: 1.85%",
      feesBn: "লেনদেন ফি: ১.৮৫%"
    },
    {
      id: "nagad",
      name: "Nagad",
      nameBn: "নগদ",
      icon: <Smartphone className="h-6 w-6 text-orange-600" />,
      description: "Pay with Nagad mobile banking",
      descriptionBn: "নগদ মোবাইল ব্যাংকিং দিয়ে পেমেন্ট করুন",
      fees: "Transaction fee: 1.99%",
      feesBn: "লেনদেন ফি: ১.৯৯%"
    },
    {
      id: "rocket",
      name: "Rocket",
      nameBn: "রকেট",
      icon: <Smartphone className="h-6 w-6 text-purple-600" />,
      description: "Pay with Dutch-Bangla Rocket",
      descriptionBn: "ডাচ-বাংলা রকেট দিয়ে পেমেন্ট করুন",
      fees: "Transaction fee: 1.80%",
      feesBn: "লেনদেন ফি: ১.৮০%"
    },
    {
      id: "bank",
      name: "Bank Transfer",
      nameBn: "ব্যাংক ট্রান্সফার",
      icon: <Building className="h-6 w-6 text-blue-600" />,
      description: "Direct bank account transfer",
      descriptionBn: "সরাসরি ব্যাংক অ্যাকাউন্ট ট্রান্সফার",
      fees: "No transaction fee",
      feesBn: "কোন লেনদেন ফি নেই"
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      nameBn: "ক্রেডিট/ডেবিট কার্ড",
      icon: <CreditCard className="h-6 w-6 text-green-600" />,
      description: "Pay with Visa/Mastercard",
      descriptionBn: "ভিসা/মাস্টারকার্ড দিয়ে পেমেন্ট করুন",
      fees: "Transaction fee: 2.9%",
      feesBn: "লেনদেন ফি: ২.৯%"
    }
  ];

  // Mock data for demonstration
  const pendingFees: FeeItem[] = [
    {
      id: 1,
      description: "Monthly Tuition Fee - February 2025",
      descriptionBn: "মাসিক বেতন - ফেব্রুয়ারি ২০২৫",
      amount: 3500,
      dueDate: "2025-02-05",
      status: "pending"
    },
    {
      id: 2,
      description: "Transportation Fee - February 2025",
      descriptionBn: "পরিবহন ফি - ফেব্রুয়ারি ২০২৫",
      amount: 800,
      dueDate: "2025-02-05",
      status: "pending"
    },
    {
      id: 3,
      description: "Laboratory Fee - Semester 1",
      descriptionBn: "গবেষণাগার ফি - ১ম সেমিস্টার",
      amount: 1200,
      dueDate: "2025-02-15",
      status: "pending"
    }
  ];

  const totalSelectedAmount = selectedFees.reduce((total, feeId) => {
    const fee = pendingFees.find(f => f.id === feeId);
    return total + (fee?.amount || 0);
  }, 0);

  const handleFeeSelection = (feeId: number, checked: boolean) => {
    if (checked) {
      setSelectedFees([...selectedFees, feeId]);
    } else {
      setSelectedFees(selectedFees.filter(id => id !== feeId));
    }
  };

  const paymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error('Payment failed');
      return response.json();
    },
    onSuccess: () => {
      alert('পেমেন্ট সফল হয়েছে! Payment successful!');
      setSelectedFees([]);
      setPaymentAmount("");
      setPhoneNumber("");
    },
    onError: (error) => {
      alert('পেমেন্ট ব্যর্থ! Payment failed: ' + error.message);
    }
  });

  const handlePayment = () => {
    if (!selectedMethod || selectedFees.length === 0) {
      alert('অনুগ্রহ করে পেমেন্ট পদ্ধতি এবং ফি নির্বাচন করুন। Please select payment method and fees.');
      return;
    }

    if ((selectedMethod === 'bkash' || selectedMethod === 'nagad' || selectedMethod === 'rocket') && !phoneNumber) {
      alert('অনুগ্রহ করে ফোন নম্বর দিন। Please enter phone number.');
      return;
    }

    const paymentData = {
      method: selectedMethod,
      amount: totalSelectedAmount,
      phoneNumber: phoneNumber,
      feeIds: selectedFees,
      userId: user?.id
    };

    paymentMutation.mutate(paymentData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Access Denied / প্রবেশ অস্বীকৃত
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          পেমেন্ট গেটওয়ে | Payment Gateway
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          নিরাপদ এবং দ্রুত পেমেন্ট সিস্টেম | Secure and fast payment system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              বকেয়া ফি | Pending Fees
            </CardTitle>
            <CardDescription>
              পরিশোধের জন্য ফি নির্বাচন করুন | Select fees to pay
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingFees.map((fee) => (
              <div key={fee.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`fee-${fee.id}`}
                  checked={selectedFees.includes(fee.id)}
                  onChange={(e) => handleFeeSelection(fee.id, e.target.checked)}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">{fee.descriptionBn}</div>
                  <div className="text-sm text-gray-600">{fee.description}</div>
                  <div className="text-xs text-gray-500">
                    শেষ তারিখ | Due: {new Date(fee.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">৳{fee.amount}</div>
                  <Badge variant={fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                    {fee.status === 'pending' ? 'বকেয়া | Pending' : 
                     fee.status === 'overdue' ? 'মেয়াদোত্তীর্ণ | Overdue' : 'পরিশোধিত | Paid'}
                  </Badge>
                </div>
              </div>
            ))}
            
            {selectedFees.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>মোট পরিমাণ | Total Amount:</span>
                  <span className="text-blue-600">৳{totalSelectedAmount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              পেমেন্ট পদ্ধতি | Payment Method
            </CardTitle>
            <CardDescription>
              আপনার পছন্দের পেমেন্ট পদ্ধতি নির্বাচন করুন | Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <div className="flex items-center gap-3 flex-1">
                    {method.icon}
                    <div>
                      <div className="font-medium">{method.nameBn} | {method.name}</div>
                      <div className="text-sm text-gray-600">{method.descriptionBn}</div>
                      <div className="text-xs text-gray-500">{method.feesBn}</div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Phone Number Input for Mobile Banking */}
            {(selectedMethod === 'bkash' || selectedMethod === 'nagad' || selectedMethod === 'rocket') && (
              <div className="space-y-2">
                <Label htmlFor="phone">মোবাইল নম্বর | Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {/* Payment Button */}
            <Button 
              onClick={handlePayment}
              disabled={selectedFees.length === 0 || !selectedMethod || paymentMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {paymentMutation.isPending 
                ? 'প্রক্রিয়াকরণ... | Processing...' 
                : `পেমেন্ট করুন | Pay ৳${totalSelectedAmount}`}
            </Button>

            {/* Security Notice */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="text-sm">
                <div className="font-medium text-green-800 dark:text-green-200">
                  নিরাপদ পেমেন্ট | Secure Payment
                </div>
                <div className="text-green-600 dark:text-green-400">
                  আপনার পেমেন্ট SSL এনক্রিপশন দিয়ে সুরক্ষিত | Your payment is protected with SSL encryption
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>সাম্প্রতিক লেনদেন | Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">মাসিক বেতন - জানুয়ারি ২০২৫ | Monthly Tuition - January 2025</div>
                <div className="text-sm text-gray-600">২৩ জানুয়ারি, ২০২৫ | January 23, 2025</div>
              </div>
              <div className="text-right">
                <div className="font-bold">৳৩,৫০০</div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  সফল | Success
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">পরিবহন ফি - জানুয়ারি ২০২৫ | Transport Fee - January 2025</div>
                <div className="text-sm text-gray-600">২০ জানুয়ারি, ২০২৫ | January 20, 2025</div>
              </div>
              <div className="text-right">
                <div className="font-bold">৳৮০০</div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  সফল | Success
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}