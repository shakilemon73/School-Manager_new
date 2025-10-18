import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicVerification } from "@/hooks/use-public-verification";
import { LanguageText } from "@/components/ui/language-text";
import { GraduationCap, Calendar, Loader2, Shield, FileText, CreditCard } from "lucide-react";

export default function PublicStudentPortal() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [attempts, setAttempts] = useState(0);

  const verification = usePublicVerification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: max 3 attempts per session
    if (attempts >= 3) {
      alert("Too many failed attempts. Please refresh the page and try again after 15 minutes.");
      return;
    }

    const result = await verification.mutateAsync({
      studentId,
      dateOfBirth,
      schoolId: 1, // Get from environment or context
    });

    if (result.success && result.token) {
      // Store session data
      sessionStorage.setItem('public_access_token', result.token);
      sessionStorage.setItem('student_name', result.studentName || '');
      sessionStorage.setItem('student_id', String(result.studentInternalId || ''));
      sessionStorage.setItem('token_expiry', String(Date.now() + 30 * 60 * 1000));

      // Redirect to results dashboard
      setLocation(`/public/results`);
    } else {
      setAttempts(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
              <GraduationCap className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            <LanguageText
              en="Student Portal"
              bn="শিক্ষার্থী পোর্টাল"
              ar="بوابة الطالب"
            />
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            <LanguageText
              en="View Results, Download Documents & Pay Fees"
              bn="ফলাফল দেখুন, ডকুমেন্ট ডাউনলোড করুন এবং ফি প্রদান করুন"
              ar="عرض النتائج وتحميل المستندات ودفع الرسوم"
            />
          </p>
        </div>

        {/* Verification Card */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                <LanguageText
                  en="Access Your Information"
                  bn="আপনার তথ্য অ্যাক্সেস করুন"
                  ar="الوصول إلى معلوماتك"
                />
              </CardTitle>
              <CardDescription>
                <LanguageText
                  en="Enter your Student ID and Date of Birth to continue"
                  bn="চালিয়ে যেতে আপনার শিক্ষার্থী আইডি এবং জন্ম তারিখ লিখুন"
                  ar="أدخل معرف الطالب وتاريخ الميلاد للمتابعة"
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">
                    <LanguageText
                      en="Student ID"
                      bn="শিক্ষার্থী আইডি"
                      ar="معرف الطالب"
                    />
                  </Label>
                  <Input
                    id="studentId"
                    data-testid="input-student-id"
                    type="text"
                    placeholder="e.g., STU2024001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    <LanguageText
                      en="Date of Birth"
                      bn="জন্ম তারিখ"
                      ar="تاريخ الميلاد"
                    />
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateOfBirth"
                      data-testid="input-date-of-birth"
                      type="date"
                      className="pl-10"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="button-verify"
                  className="w-full"
                  disabled={verification.isPending || !studentId || !dateOfBirth}
                >
                  {verification.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <LanguageText
                        en="Verifying..."
                        bn="যাচাই করা হচ্ছে..."
                        ar="التحقق..."
                      />
                    </>
                  ) : (
                    <LanguageText
                      en="Access Portal"
                      bn="পোর্টাল অ্যাক্সেস করুন"
                      ar="الوصول إلى البوابة"
                    />
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <LanguageText
                      en="Your session will automatically expire after 30 minutes for security."
                      bn="নিরাপত্তার জন্য আপনার সেশন স্বয়ংক্রিয়ভাবে ৩০ মিনিট পরে মেয়াদ শেষ হবে।"
                      ar="ستنتهي صلاحية جلستك تلقائيًا بعد 30 دقيقة للأمان."
                    />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <LanguageText
                  en="View Results"
                  bn="ফলাফল দেখুন"
                  ar="عرض النتائج"
                />
              </p>
            </div>
            <div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <LanguageText
                  en="Download Docs"
                  bn="ডকুমেন্ট ডাউনলোড"
                  ar="تحميل المستندات"
                />
              </p>
            </div>
            <div>
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <LanguageText
                  en="Pay Fees"
                  bn="ফি প্রদান"
                  ar="دفع الرسوم"
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
