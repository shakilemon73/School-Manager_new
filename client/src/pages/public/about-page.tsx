import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Trophy, 
  MapPin, 
  Phone, 
  Mail,
  Star,
  Award,
  Heart,
  Target,
  Clock,
  Shield,
  Lightbulb
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

export default function AboutPage() {
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

  // Migrate to direct Supabase: Faculty information
  const { data: faculty } = useQuery({
    queryKey: ["/api/public/faculty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, qualification, subject, photo')
        .eq('status', 'active')
        .limit(10);
      
      if (error) return [];
      return data || [];
    }
  });

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
              <Link href="/about" className="group relative py-2 px-4 rounded-lg bg-emerald-500 text-white font-semibold shadow-lg">
                <span className="relative z-10 font-medium">আমাদের সম্পর্কে</span>
              </Link>
              <Link href="/academics" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">একাডেমিক</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/admissions" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">ভর্তি</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
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
              <Heart className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium">গর্বের সাথে পরিচয় করিয়ে দিচ্ছি</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">আমাদের</span>
              <span className="block bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                প্রতিষ্ঠান
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              {schoolInfo?.schoolName || "ঢাকা মডেল স্কুল"} - শিক্ষার আলোয় উজ্জ্বল ভবিষ্যৎ গড়ার অগ্রযাত্রায়
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced School Overview */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full px-4 py-2">
                  <Star className="h-4 w-4 mr-2" />
                  <span className="text-sm font-semibold">আমাদের গর্বের ইতিহাস</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
                  শিক্ষার
                  <span className="block text-emerald-600">মান উৎকর্ষতা</span>
                </h2>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  {schoolInfo?.description || schoolInfo?.descriptionBn || 
                   "আমাদের প্রতিষ্ঠান একটি আধুনিক ও প্রগতিশীল শিক্ষা কেন্দ্র যা গুণগত শিক্ষা প্রদানে অগ্রণী ভূমিকা পালন করে আসছে। আমরা প্রতিটি শিক্ষার্থীর সম্ভাবনাকে পূর্ণভাবে বিকশিত করতে প্রতিশ্রুতিবদ্ধ।"}
                </p>
              </div>

              {/* Achievement Stats */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">
                      {schoolInfo?.establishmentYear || "১৯৮৫"}
                    </div>
                    <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                      প্রতিষ্ঠার বছর
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {schoolInfo?.establishmentYear ? new Date().getFullYear() - schoolInfo.establishmentYear : "৩৯"}+
                    </div>
                    <div className="text-blue-800 dark:text-blue-300 font-medium">
                      বছরের অভিজ্ঞতা
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">আধুনিক শিক্ষা পদ্ধতি ও কারিকুলাম</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">নিরাপদ ও স্বাস্থ্যকর শিক্ষা পরিবেশ</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">সৃজনশীল ও গবেষণামূলক শিক্ষা</span>
                </div>
              </div>
            </div>

            {/* Enhanced Visual Section */}
            <div className="relative">
              <div className="relative bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                {schoolInfo?.logo ? (
                  <img 
                    src={schoolInfo.logo} 
                    alt="School Building" 
                    className="w-full h-80 object-cover rounded-2xl mb-6 shadow-lg"
                  />
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <GraduationCap className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {schoolInfo?.schoolName || "ঢাকা মডেল স্কুল"}
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {schoolInfo?.schoolName || "ঢাকা মডেল স্কুল"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    আধুনিক শিক্ষা ব্যবস্থা ও অত্যাধুনিক সুবিধাদি
                  </p>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    স্বীকৃত শিক্ষা প্রতিষ্ঠান
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              আমাদের লক্ষ্য ও উদ্দেশ্য
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-blue-200 dark:border-gray-700">
              <CardHeader>
                <Target className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>আমাদের লক্ষ্য (Mission)</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {schoolInfo?.motto || 
                   "শিক্ষার মাধ্যমে চরিত্র গঠন এবং জ্ঞান অর্জনের মাধ্যমে শিক্ষার্থীদের একজন আদর্শ নাগরিক হিসেবে গড়ে তোলা। আমরা প্রতিটি শিক্ষার্থীর মধ্যে নৈতিক মূল্যবোধ, সৃজনশীলতা এবং দায়িত্বশীলতা বিকশিত করতে প্রতিশ্রুতিবদ্ধ।"}
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-gray-700">
              <CardHeader>
                <Lightbulb className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>আমাদের দৃষ্টিভঙ্গি (Vision)</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  একবিংশ শতাব্দীর চ্যালেঞ্জ মোকাবেলায় সক্ষম, দক্ষ এবং যোগ্য মানব সম্পদ তৈরি করা। আমাদের স্বপ্ন হলো এমন একটি শিক্ষা প্রতিষ্ঠান গড়ে তোলা যেখানে প্রতিটি শিক্ষার্থী তার সর্বোচ্চ সম্ভাবনা বিকশিত করতে পারে।
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              আমাদের মূল মূল্যবোধ
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              যে মূল্যবোধগুলো আমাদের শিক্ষা ব্যবস্থার ভিত্তি
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Star className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>উৎকর্ষতা</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  শিক্ষা ও শেখানোর প্রতিটি ক্ষেত্রে সর্বোচ্চ মান বজায় রাখা এবং ক্রমাগত উন্নতির জন্য প্রচেষ্টা চালানো
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Heart className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>মমতা ও যত্ন</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  প্রতিটি শিক্ষার্থীর প্রতি ব্যক্তিগত যত্ন এবং তাদের সামগ্রিক কল্যাণের জন্য দায়বদ্ধতা
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>সততা ও নৈতিকতা</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  সকল কার্যক্রমে স্বচ্ছতা, জবাবদিহিতা এবং নৈতিক মূল্যবোধের চর্চা
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Principal's Message */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="border-blue-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">প্রধান শিক্ষকের বাণী</CardTitle>
                    <CardDescription className="text-lg">
                      {schoolInfo?.principalName || "প্রধান শিক্ষক"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-lg text-gray-600 dark:text-gray-300 italic border-l-4 border-blue-500 pl-6">
                  "শিক্ষা হচ্ছে সেই শক্তি যা একটি জাতির ভবিষ্যৎ নির্ধারণ করে। আমাদের {schoolInfo?.schoolName || "স্কুলে"} আমরা 
                  প্রতিটি শিক্ষার্থীকে শুধু পাঠ্যবই পড়ানো নয়, বরং জীবনের জন্য প্রস্তুত করে তুলি। আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী 
                  ও আধুনিক শিক্ষা পদ্ধতির মাধ্যমে আমরা নিশ্চিত করি যে প্রতিটি শিক্ষার্থী তার সম্পূর্ণ সম্ভাবনা বিকশিত করতে পারে।"
                </blockquote>
                <div className="mt-6 text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {schoolInfo?.principalName || "প্রধান শিক্ষক"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    প্রধান শিক্ষক, {schoolInfo?.schoolName || "স্কুলের নাম"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              আমাদের বিশেষ বৈশিষ্ট্য
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 dark:bg-gray-700 p-3 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  আধুনিক পাঠ্যক্রম
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  জাতীয় পাঠ্যক্রমের পাশাপাশি আধুনিক শিক্ষা পদ্ধতি ও প্রযুক্তির ব্যবহার
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-gray-700 p-3 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  অভিজ্ঞ শিক্ষকমণ্ডলী
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  উচ্চ শিক্ষিত ও অভিজ্ঞ শিক্ষকদের নিয়ে গঠিত শিক্ষকমণ্ডলী
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 dark:bg-gray-700 p-3 rounded-full">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  সহ-পাঠক্রমিক কার্যক্রম
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  খেলাধুলা, সাংস্কৃতিক অনুষ্ঠান ও বিভিন্ন প্রতিযোগিতার আয়োজন
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 dark:bg-gray-700 p-3 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  নমনীয় সময়সূচী
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  শিক্ষার্থীদের সুবিধার জন্য নমনীয় ক্লাসের সময়সূচী
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-pink-100 dark:bg-gray-700 p-3 rounded-full">
                <Shield className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  নিরাপদ পরিবেশ
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  শিক্ষার্থীদের জন্য সম্পূর্ণ নিরাপদ ও স্বাস্থ্যকর পরিবেশ
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 dark:bg-gray-700 p-3 rounded-full">
                <Award className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  পুরস্কার ও সনদ
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  মেধাবী শিক্ষার্থীদের জন্য বিভিন্ন পুরস্কার ও সম্মাননা
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            আমাদের সাথে যুক্ত হন
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            আপনার সন্তানের উজ্জ্বল ভবিষ্যতের জন্য আজই ভর্তির আবেদন করুন
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/public/admissions">
              <Button size="lg" variant="secondary" className="px-8">
                <GraduationCap className="mr-2 h-5 w-5" />
                ভর্তির আবেদন
              </Button>
            </Link>
            <Link href="/public/contact">
              <Button size="lg" variant="outline" className="px-8 border-white text-white hover:bg-white hover:text-blue-600">
                যোগাযোগ করুন
              </Button>
            </Link>
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
                {schoolInfo?.description || schoolInfo?.descriptionBn || "আমাদের স্কুল শিক্ষার মাধ্যমে উন্নত ভবিষ্যৎ গড়তে প্রতিশ্রুতিবদ্ধ।"}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">দ্রুত লিঙ্ক</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/public" className="text-gray-300 hover:text-white">হোম</Link></li>
                <li><Link href="/public/about" className="text-gray-300 hover:text-white">আমাদের সম্পর্কে</Link></li>
                <li><Link href="/public/academics" className="text-gray-300 hover:text-white">একাডেমিক</Link></li>
                <li><Link href="/public/admissions" className="text-gray-300 hover:text-white">ভর্তি</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">শিক্ষা</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/public/curriculum" className="text-gray-300 hover:text-white">পাঠ্যক্রম</Link></li>
                <li><Link href="/public/faculty" className="text-gray-300 hover:text-white">শিক্ষকমণ্ডলী</Link></li>
                <li><Link href="/public/facilities" className="text-gray-300 hover:text-white">সুবিধাসমূহ</Link></li>
                <li><Link href="/public/results" className="text-gray-300 hover:text-white">পরীক্ষার ফলাফল</Link></li>
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