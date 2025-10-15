import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail,
  Clock,
  Send,
  MessageCircle,
  Users,
  Globe,
  Star,
  Navigation
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const contactFormSchema = z.object({
  name: z.string().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  email: z.string().email("সঠিক ইমেইল ঠিকানা দিন"),
  phone: z.string().min(11, "সঠিক মোবাইল নম্বর দিন"),
  subject: z.string().min(5, "বিষয় কমপক্ষে ৫ অক্ষরের হতে হবে"),
  message: z.string().min(10, "বার্তা কমপক্ষে ১০ অক্ষরের হতে হবে"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface SchoolInfo {
  schoolName: string;
  schoolNameBn: string;
  address: string;
  addressBn: string;
  email: string;
  phone: string;
  website?: string;
  principalName: string;
  establishmentYear: number;
  description?: string;
  descriptionBn?: string;
  motto?: string;
  mottoBn?: string;
  logo?: string;
}

export default function ContactPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Migrate to direct Supabase: School info
  const { data: schoolInfo, isLoading } = useQuery<SchoolInfo>({
    queryKey: ["/api/public/school-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('school_name, school_name_bn, address, address_bn, email, phone, website, principal_name, establishment_year, description, description_bn, motto, motto_bn, logo')
        .limit(1)
        .single();
      
      if (error) throw error;
      
      return {
        schoolName: data?.school_name || "মডেল স্কুল অ্যান্ড কলেজ",
        schoolNameBn: data?.school_name_bn || "মডেল স্কুল অ্যান্ড কলেজ",
        address: data?.address || "ঢাকা, বাংলাদেশ",
        addressBn: data?.address_bn || "ঢাকা, বাংলাদেশ",
        email: data?.email || "info@modelschool.edu.bd",
        phone: data?.phone || "০১৭১২-৩৪৫৬৭৮",
        website: data?.website,
        principalName: data?.principal_name || "প্রধান শিক্ষক",
        establishmentYear: data?.establishment_year || 1985,
        description: data?.description,
        descriptionBn: data?.description_bn,
        motto: data?.motto,
        mottoBn: data?.motto_bn,
        logo: data?.logo
      };
    }
  });

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const { error } = await supabase
        .from("contact_messages")
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          message: data.message,
          school_id: 1,
          status: "pending",
        }]);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "বার্তা পাঠানো হয়েছে!",
        description: "আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "ত্রুটি!",
        description: "বার্তা পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    submitContactMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
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
              <Link href="/admissions" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">ভর্তি</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/contact" className="group relative py-2 px-4 rounded-lg bg-emerald-500 text-white font-semibold shadow-lg">
                <span className="relative z-10 font-medium">যোগাযোগ</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center text-white">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <MessageCircle className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium">আমাদের সাথে যোগাযোগ করুন</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">যোগাযোগ</span>
              <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                করুন
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              আপনার যেকোনো প্রশ্ন বা সহায়তার জন্য আমাদের সাথে যোগাযোগ করুন। আমরা সর্বদা আপনার সেবায় প্রস্তুত।
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 mr-2" />
              <span className="text-sm font-semibold">যোগাযোগের মাধ্যম</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              আমাদের সাথে যোগাযোগ
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              বিভিন্ন মাধ্যমে আমাদের সাথে যোগাযোগ করুন এবং তাৎক্ষণিক সহায়তা পান
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Phone Contact */}
            <Card className="group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 hover:shadow-2xl hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  ফোন
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                  সরাসরি কথা বলুন
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-emerald-600 mb-2">
                  {schoolInfo?.phone || "+৮৮০১৭১২৩৪৫৬৭৮"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  সকাল ৮:০০ - বিকাল ৫:০০
                </p>
              </CardContent>
            </Card>

            {/* Email Contact */}
            <Card className="group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-2xl hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  ইমেইল
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                  লিখিত যোগাযোগ
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-xl font-bold text-blue-600 mb-2 break-all">
                  {schoolInfo?.email || "info@dhakamodel.edu.bd"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ২৪ ঘন্টার মধ্যে উত্তর
                </p>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-2xl hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  ঠিকানা
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                  আমাদের অবস্থান
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold text-purple-600 mb-2">
                  {schoolInfo?.addressBn || "১২৩ মেইন স্ট্রিট, ঢাকা"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {schoolInfo?.address || "123 Main Street, Dhaka"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form and Additional Info */}
      <section className="py-20 px-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <div className="space-y-6 mb-8">
                <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full px-4 py-2">
                  <Send className="h-4 w-4 mr-2" />
                  <span className="text-sm font-semibold">বার্তা পাঠান</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
                  আমাদের একটি
                  <span className="block text-blue-600">বার্তা পাঠান</span>
                </h2>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  আপনার প্রশ্ন বা মতামত জানান। আমরা যত তাড়াতাড়ি সম্ভব আপনার সাথে যোগাযোগ করব।
                </p>
              </div>

              <Card className="border-blue-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">নাম *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="আপনার নাম লিখুন" 
                                  {...field} 
                                  className="border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                />
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
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">ইমেইল *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your@email.com" 
                                  {...field} 
                                  className="border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">মোবাইল নম্বর *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="০১৭xxxxxxxx" 
                                  {...field} 
                                  className="border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">বিষয় *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="বার্তার বিষয়" 
                                  {...field} 
                                  className="border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">বার্তা *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="আপনার বার্তা লিখুন..." 
                                rows={5} 
                                {...field} 
                                className="border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={submitContactMutation.isPending}
                      >
                        {submitContactMutation.isPending ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            পাঠানো হচ্ছে...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Send className="h-4 w-4 mr-2" />
                            বার্তা পাঠান
                          </div>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Additional Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  অফিস সময়
                </h3>
                <div className="space-y-4">
                  <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-emerald-600 mr-3" />
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">সপ্তাহের দিন</h4>
                            <p className="text-slate-600 dark:text-slate-400">রবিবার - বৃহস্পতিবার</p>
                          </div>
                        </div>
                        <p className="text-emerald-600 font-semibold">৮:০০ - ১৭:০০</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-blue-600 mr-3" />
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">শুক্রবার</h4>
                            <p className="text-slate-600 dark:text-slate-400">সীমিত সময়</p>
                          </div>
                        </div>
                        <p className="text-blue-600 font-semibold">৮:০০ - ১২:০০</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-orange-600 mr-3" />
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">শনিবার</h4>
                            <p className="text-slate-600 dark:text-slate-400">বন্ধ</p>
                          </div>
                        </div>
                        <p className="text-orange-600 font-semibold">বিশ্রামের দিন</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  দ্রুত যোগাযোগ
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">প্রধান শিক্ষক</h4>
                      <p className="text-slate-600 dark:text-slate-400">{schoolInfo?.principalName || "ড. আব্দুর রহমান"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">অ্যাপয়েন্টমেন্টের জন্য অফিসে যোগাযোগ করুন</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">জরুরি যোগাযোগ</h4>
                      <p className="text-slate-600 dark:text-slate-400">জরুরি প্রয়োজনে ২৪/৭ হটলাইন</p>
                      <p className="text-emerald-600 font-semibold">০১৯-xxxxxxxx</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              আরও জানতে চান?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              আমাদের স্কুল সম্পর্কে আরও তথ্য জানুন এবং আপনার সন্তানের উজ্জ্বল ভবিষ্যৎ গড়তে আমাদের সাথে যুক্ত হন
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/about">
                <Button className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  আমাদের সম্পর্কে জানুন
                </Button>
              </Link>
              <Link href="/admissions">
                <Button variant="outline" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-8 py-3 text-lg font-semibold transition-all duration-300">
                  ভর্তির আবেদন করুন
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}