import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Send,
  Download
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const admissionFormSchema = z.object({
  studentName: z.string().min(2, "শিক্ষার্থীর নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  studentNameBn: z.string().min(2, "বাংলা নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  dateOfBirth: z.string().min(1, "জন্ম তারিখ প্রয়োজন"),
  gender: z.string().min(1, "লিঙ্গ নির্বাচন করুন"),
  class: z.string().min(1, "শ্রেণী নির্বাচন করুন"),
  fatherName: z.string().min(2, "পিতার নাম প্রয়োজন"),
  motherName: z.string().min(2, "মাতার নাম প্রয়োজন"),
  guardianPhone: z.string().min(11, "সঠিক মোবাইল নম্বর দিন"),
  address: z.string().min(10, "সম্পূর্ণ ঠিকানা প্রয়োজন"),
  previousSchool: z.string().optional(),
  email: z.string().email("সঠিক ইমেইল ঠিকানা দিন").optional().or(z.literal("")),
});

type AdmissionFormData = z.infer<typeof admissionFormSchema>;

interface SchoolInfo {
  schoolName: string;
  schoolNameBn: string;
  address: string;
  email: string;
  phone: string;
  principalName: string;
}

export default function AdmissionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schoolInfo, isLoading } = useQuery<SchoolInfo>({
    queryKey: ["/api/public/school-info"],
  });

  const form = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      studentName: "",
      studentNameBn: "",
      dateOfBirth: "",
      gender: "",
      class: "",
      fatherName: "",
      motherName: "",
      guardianPhone: "",
      address: "",
      previousSchool: "",
      email: "",
    },
  });

  const submitAdmissionMutation = useMutation({
    mutationFn: async (data: AdmissionFormData) => {
      const { error } = await supabase
        .from("admission_applications")
        .insert([{
          student_name: data.studentName,
          student_name_bn: data.studentNameBn,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          class: data.class,
          father_name: data.fatherName,
          mother_name: data.motherName,
          guardian_phone: data.guardianPhone,
          address: data.address,
          previous_school: data.previousSchool || null,
          email: data.email || null,
          school_id: 1,
          status: "pending",
        }]);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "আবেদন সফল!",
        description: "আপনার ভর্তির আবেদন সফলভাবে জমা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "ত্রুটি!",
        description: "আবেদন জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdmissionFormData) => {
    submitAdmissionMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Navigation Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-emerald-200/30 dark:border-slate-700/30 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and School Identity */}
            <div className="flex items-center space-x-4 group">
              <div className="relative">
                {schoolInfo?.logo ? (
                  <img 
                    src={schoolInfo.logo} 
                    alt="School Logo" 
                    className="h-14 w-14 rounded-full object-cover border-2 border-emerald-200 dark:border-slate-600 group-hover:border-emerald-400 transition-colors duration-300" 
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center border-2 border-emerald-200 dark:border-slate-600">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
              </div>
              <div className="transition-transform duration-300 group-hover:translate-x-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  {schoolInfo?.schoolName || "ঢাকা মডেল স্কুল"}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {schoolInfo?.schoolNameBn || "শিক্ষার আলোয় উজ্জ্বল ভবিষ্যৎ"}
                </p>
              </div>
            </div>

            {/* Enhanced Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link href="/" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">হোম</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/about" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">আমাদের সম্পর্কে</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/academics" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">একাডেমিক</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/admissions" className="group relative py-2 px-4 rounded-lg bg-emerald-500 text-white font-semibold shadow-lg">
                <span className="relative z-10 font-medium">ভর্তি</span>
              </Link>
              <Link href="/contact" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">যোগাযোগ</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/login" className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <span className="relative z-10">লগইন</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-600"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center text-white">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <GraduationCap className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium">শিক্ষার নতুন দিগন্ত</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">ভর্তির</span>
              <span className="block bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                আবেদন
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
              {schoolInfo?.schoolName || "ঢাকা মডেল স্কুলে"} আপনার সন্তানের উজ্জ্বল ভবিষ্যৎ গড়ার যাত্রা শুরু করুন
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                এখনই আবেদন করুন
              </Button>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-3 text-lg font-semibold transition-all duration-300">
                বিস্তারিত জানুন
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Admission Process */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              ভর্তি প্রক্রিয়া
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              সহজ ৪টি ধাপে ভর্তির আবেদন সম্পন্ন করুন
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center border-blue-200 dark:border-gray-700">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">১. আবেদন ফর্ম</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  অনলাইনে আবেদন ফর্ম পূরণ করুন
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center border-green-200 dark:border-gray-700">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">২. যাচাই</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  আবেদন যাচাই ও নিশ্চিতকরণ
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center border-purple-200 dark:border-gray-700">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">৩. সাক্ষাৎকার</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  অভিভাবক ও শিক্ষার্থীর সাক্ষাৎকার
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center border-orange-200 dark:border-gray-700">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">৪. ভর্তি</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ভর্তি নিশ্চিতকরণ ও ক্লাস শুরু
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Admission Requirements */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                ভর্তির যোগ্যতা
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">বয়স</h3>
                    <p className="text-gray-600 dark:text-gray-300">প্রথম শ্রেণীর জন্য ৫-৬ বছর, অন্যান্য শ্রেণীর জন্য উপযুক্ত বয়স</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">পূর্ববর্তী শিক্ষা</h3>
                    <p className="text-gray-600 dark:text-gray-300">প্রথম শ্রেণী ছাড়া অন্যান্য শ্রেণীর জন্য পূর্ববর্তী শ্রেণীর সনদ</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">প্রয়োজনীয় কাগজপত্র</h3>
                    <p className="text-gray-600 dark:text-gray-300">জন্ম নিবন্ধন সনদ, ছবি, পূর্ববর্তী স্কুলের TC (প্রযোজ্য ক্ষেত্রে)</p>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                ভর্তি ফি
              </h2>
              <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">প্রথম-পঞ্চম শ্রেণী</h4>
                    <p className="text-2xl font-bold text-blue-600">৳৫,০০০</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">ষষ্ঠ-দশম শ্রেণী</h4>
                    <p className="text-2xl font-bold text-green-600">৳৮,০০০</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
                  * ভর্তি ফিতে রেজিস্ট্রেশন, বই ও ইউনিফর্ম খরচ অন্তর্ভুক্ত
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                গুরুত্বপূর্ণ তারিখসমূহ
              </h2>
              <div className="space-y-4">
                <Card className="border-blue-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">আবেদনের শেষ তারিখ</h4>
                        <p className="text-gray-600 dark:text-gray-300">সকল শ্রেণীর জন্য</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">৩১ ডিসেম্বর, ২০২৫</p>
                        <p className="text-sm text-gray-500">রাত ১১:৫৯ পর্যন্ত</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">সাক্ষাৎকারের তারিখ</h4>
                        <p className="text-gray-600 dark:text-gray-300">নির্বাচিত আবেদনকারীদের জন্য</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">৫-১০ জানুয়ারি, ২০২৫</p>
                        <p className="text-sm text-gray-500">সময় SMS এ জানানো হবে</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">ক্লাস শুরু</h4>
                        <p className="text-gray-600 dark:text-gray-300">নতুন শিক্ষাবর্ষ</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">১ জানুয়ারি, ২০২৫</p>
                        <p className="text-sm text-gray-500">সকাল ৮:০০ টা</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              অনলাইন আবেদন ফর্ম
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              সকল তথ্য সঠিকভাবে পূরণ করুন
            </p>
          </div>

          <Card className="border-blue-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                ভর্তির আবেদন ফর্ম
              </CardTitle>
              <CardDescription>
                * চিহ্নিত ক্ষেত্রগুলো অবশ্যই পূরণ করতে হবে
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Student Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      শিক্ষার্থীর তথ্য
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="studentName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>শিক্ষার্থীর নাম (ইংরেজি) *</FormLabel>
                            <FormControl>
                              <Input placeholder="Aminul Islam" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="studentNameBn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>শিক্ষার্থীর নাম (বাংলা) *</FormLabel>
                            <FormControl>
                              <Input placeholder="আমিনুল ইসলাম" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>জন্ম তারিখ *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>লিঙ্গ *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="পুরুষ">পুরুষ</SelectItem>
                                <SelectItem value="মহিলা">মহিলা</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="class"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>যে শ্রেণীতে ভর্তি হতে চান *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="শ্রেণী নির্বাচন" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="প্রথম">প্রথম শ্রেণী</SelectItem>
                                <SelectItem value="দ্বিতীয়">দ্বিতীয় শ্রেণী</SelectItem>
                                <SelectItem value="তৃতীয়">তৃতীয় শ্রেণী</SelectItem>
                                <SelectItem value="চতুর্থ">চতুর্থ শ্রেণী</SelectItem>
                                <SelectItem value="পঞ্চম">পঞ্চম শ্রেণী</SelectItem>
                                <SelectItem value="ষষ্ঠ">ষষ্ঠ শ্রেণী</SelectItem>
                                <SelectItem value="সপ্তম">সপ্তম শ্রেণী</SelectItem>
                                <SelectItem value="অষ্টম">অষ্টম শ্রেণী</SelectItem>
                                <SelectItem value="নবম">নবম শ্রেণী</SelectItem>
                                <SelectItem value="দশম">দশম শ্রেণী</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Parent Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      অভিভাবকের তথ্য
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fatherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>পিতার নাম *</FormLabel>
                            <FormControl>
                              <Input placeholder="মোহাম্মদ আব্দুল করিম" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="motherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>মাতার নাম *</FormLabel>
                            <FormControl>
                              <Input placeholder="মোসাম্মৎ রোকেয়া বেগম" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="guardianPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>অভিভাবকের মোবাইল *</FormLabel>
                            <FormControl>
                              <Input placeholder="01712345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ইমেইল ঠিকানা (ঐচ্ছিক)</FormLabel>
                            <FormControl>
                              <Input placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Address & Other Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      ঠিকানা ও অন্যান্য তথ্য
                    </h3>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>বর্তমান ঠিকানা *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="গ্রাম/পাড়া, পোস্ট অফিস, থানা, জেলা"
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="previousSchool"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>পূর্ববর্তী শিক্ষা প্রতিষ্ঠান (ঐচ্ছিক)</FormLabel>
                          <FormControl>
                            <Input placeholder="পূর্বের স্কুলের নাম" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => form.reset()}
                    >
                      রিসেট করুন
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitAdmissionMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {submitAdmissionMutation.isPending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          জমা দেওয়া হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          আবেদন জমা দিন
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact for Help */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            সাহায্যের জন্য যোগাযোগ করুন
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            ভর্তি সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold mb-2">ফোনে যোগাযোগ</h3>
              <p>{schoolInfo?.phone || "০১৭১২-৩৪৫৬৭৮"}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold mb-2">ইমেইলে যোগাযোগ</h3>
              <p>{schoolInfo?.email || "admission@school.edu.bd"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">
                {schoolInfo?.schoolName || "স্কুলের নাম"}
              </h3>
              <p className="text-gray-300 text-sm">
                আমাদের স্কুল শিক্ষার মাধ্যমে উন্নত ভবিষ্যৎ গড়তে প্রতিশ্রুতিবদ্ধ।
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">দ্রুত লিঙ্ক</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/public" className="text-gray-300 hover:text-white">হোম</Link></li>
                <li><Link href="/public/about" className="text-gray-300 hover:text-white">আমাদের সম্পর্কে</Link></li>
                <li><Link href="/public/academics" className="text-gray-300 hover:text-white">একাডেমিক</Link></li>
                <li><Link href="/public/contact" className="text-gray-300 hover:text-white">যোগাযোগ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">ভর্তি</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/public/admissions" className="text-gray-300 hover:text-white">অনলাইন আবেদন</Link></li>
                <li><Link href="/public/admission-requirements" className="text-gray-300 hover:text-white">ভর্তির যোগ্যতা</Link></li>
                <li><Link href="/public/fees" className="text-gray-300 hover:text-white">ফি কাঠামো</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">যোগাযোগ</h4>
              <div className="space-y-2 text-sm text-gray-300">
                {schoolInfo?.address && <p>{schoolInfo.address}</p>}
                {schoolInfo?.phone && <p>ফোন: {schoolInfo.phone}</p>}
                {schoolInfo?.email && <p>ইমেইল: {schoolInfo.email}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {schoolInfo?.schoolName || "স্কুলের নাম"}। সমস্ত অধিকার সংরক্ষিত।</p>
          </div>
        </div>
      </footer>
    </div>
  );
}