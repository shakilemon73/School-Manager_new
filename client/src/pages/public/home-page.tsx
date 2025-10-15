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
  Calendar,
  Star,
  Award,
  Heart,
  Target
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

interface SchoolStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  establishmentYear: number;
}

export default function PublicHomePage() {
  // Migrate to direct Supabase: School info
  const { data: schoolInfo, isLoading: infoLoading } = useQuery<SchoolInfo>({
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

  // Migrate to direct Supabase: School stats
  const { data: stats, isLoading: statsLoading } = useQuery<SchoolStats>({
    queryKey: ["/api/public/school-stats"],
    queryFn: async () => {
      const [studentsCount, teachersCount, schoolData] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('school_settings').select('establishment_year').limit(1).single()
      ]);
      
      return {
        totalStudents: studentsCount.count || 0,
        totalTeachers: teachersCount.count || 0,
        totalClasses: 10,
        establishmentYear: schoolData.data?.establishment_year || 1985
      };
    }
  });

  // Migrate to direct Supabase: Upcoming events
  const { data: events } = useQuery({
    queryKey: ["/api/public/upcoming-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_date, end_date, type')
        .order('start_date', { ascending: true })
        .limit(5);
      
      if (error) return [];
      return data || [];
    }
  });

  // Migrate to direct Supabase: Latest news
  const { data: news } = useQuery({
    queryKey: ["/api/public/latest-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, title_bn, message, message_bn, type, created_at')
        .eq('is_live', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) return [];
      return data || [];
    }
  });

  if (infoLoading || statsLoading) {
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
      {/* Enhanced Navigation Header with Modern UX */}
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
              <Link href="/" className="group relative py-2 px-4 rounded-lg bg-emerald-500 text-white font-semibold shadow-lg">
                <span className="relative z-10 font-medium">হোম</span>
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
              <Link href="/contact" className="group relative py-2 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-slate-800">
                <span className="relative z-10 font-medium">যোগাযোগ</span>
                <div className="absolute inset-0 rounded-lg bg-emerald-100 dark:bg-slate-700 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
              </Link>
              <Link href="/" className="group relative py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-all duration-300">
                <span className="relative z-10 font-medium">ড্যাশবোর্ড</span>
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

      {/* Enhanced Hero Section with Modern UX */}
      <section className="relative py-24 lg:py-32 px-4 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white/90 to-blue-50/80 dark:from-slate-900/80 dark:via-slate-800/90 dark:to-slate-900/80"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Floating Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-emerald-100 dark:bg-slate-800 rounded-full text-emerald-800 dark:text-emerald-300 text-sm font-medium mb-8 shadow-lg backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
              {schoolInfo?.establishmentYear && `${new Date().getFullYear() - schoolInfo.establishmentYear}+ বছরের শিক্ষার ঐতিহ্য`}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent animate-gradient bg-300% bg-gradient-to-r">
                {schoolInfo?.schoolName || "ঢাকা মডেল স্কুল"}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-4 font-medium">
              {schoolInfo?.schoolNameBn || "শিক্ষার আলোয় উজ্জ্বল ভবিষ্যৎ"}
            </p>

            {/* Enhanced Motto Display */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-8 mb-10 border border-emerald-200/50 dark:border-slate-700/50 shadow-xl max-w-3xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-full mr-4"></div>
                <Star className="h-6 w-6 text-yellow-500 mr-2" />
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">আমাদের লক্ষ্য</span>
                <Star className="h-6 w-6 text-yellow-500 ml-2" />
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full ml-4"></div>
              </div>
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                "জ্ঞান, নৈতিকতা ও আধুনিক শিক্ষায় গড়ে তোলা প্রতিটি শিক্ষার্থীর উজ্জ্বল ভবিষ্যৎ"
              </p>
            </div>

            {/* Enhanced Call-to-Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/admissions" className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                <span className="relative z-10 flex items-center justify-center">
                  <GraduationCap className="mr-3 h-6 w-6" />
                  ভর্তির আবেদন করুন
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link href="/about" className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-emerald-200 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-slate-500 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="relative z-10 flex items-center justify-center">
                  <BookOpen className="mr-3 h-6 w-6" />
                  আরও জানুন
                </span>
                <div className="absolute inset-0 bg-emerald-50 dark:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="group cursor-pointer">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  {stats?.totalStudents || 0}+
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">সক্রিয় শিক্ষার্থী</div>
              </div>
              <div className="group cursor-pointer">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  {stats?.totalTeachers || 0}+
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">অভিজ্ঞ শিক্ষক</div>
              </div>
              <div className="group cursor-pointer">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  100%
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">সফলতার হার</div>
              </div>
              <div className="group cursor-pointer">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                  {schoolInfo?.establishmentYear && `${new Date().getFullYear() - schoolInfo.establishmentYear}+`}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">বছরের অভিজ্ঞতা</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="text-center border-blue-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalStudents || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  মোট শিক্ষার্থী
                </div>
              </CardContent>
            </Card>
            <Card className="text-center border-green-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <GraduationCap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalTeachers || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  মোট শিক্ষক
                </div>
              </CardContent>
            </Card>
            <Card className="text-center border-purple-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalClasses || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  মোট ক্লাস
                </div>
              </CardContent>
            </Card>
            <Card className="text-center border-orange-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <Trophy className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.establishmentYear ? new Date().getFullYear() - stats.establishmentYear : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  বছরের অভিজ্ঞতা
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              আমাদের বৈশিষ্ট্য
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              আধুনিক শিক্ষা ব্যবস্থা ও সুবিধাসমূহ
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Star className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>উন্নত শিক্ষা ব্যবস্থা</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  আধুনিক পাঠ্যক্রম ও অভিজ্ঞ শিক্ষকমণ্ডলীর মাধ্যমে মানসম্পন্ন শিক্ষা প্রদান
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Award className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>সহ-পাঠক্রমিক কার্যক্রম</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  খেলাধুলা, সাংস্কৃতিক অনুষ্ঠান ও বিভিন্ন প্রতিযোগিতার মাধ্যমে সার্বিক বিকাশ
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Heart className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>নিরাপদ পরিবেশ</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  শিক্ষার্থীদের জন্য নিরাপদ ও আনন্দদায়ক শিক্ষা পরিবেশ নিশ্চিতকরণ
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Latest News */}
            <Card className="border-blue-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  সাম্প্রতিক সংবাদ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {news && news.length > 0 ? (
                  <div className="space-y-4">
                    {news.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.title || item.titleBn}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {item.date || "আজ"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      কোন সাম্প্রতিক সংবাদ নেই
                    </p>
                  </div>
                )}
                <div className="mt-4">
                  <Link href="/public/news">
                    <Button variant="outline" size="sm" className="w-full">
                      সব সংবাদ দেখুন
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="border-green-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  আসন্ন অনুষ্ঠান
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events && events.length > 0 ? (
                  <div className="space-y-4">
                    {events.slice(0, 3).map((event: any, index: number) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {event.title || event.titleBn}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {event.date || "তারিখ নির্ধারিত হয়নি"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      কোন আসন্ন অনুষ্ঠান নেই
                    </p>
                  </div>
                )}
                <div className="mt-4">
                  <Link href="/events">
                    <Button variant="outline" size="sm" className="w-full">
                      সব অনুষ্ঠান দেখুন
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">যোগাযোগ করুন</h2>
                <p className="text-blue-100 mb-6">
                  আমাদের সাথে সরাসরি যোগাযোগ করুন যেকোনো তথ্যের জন্য
                </p>
                <div className="space-y-3">
                  {schoolInfo?.address && (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-3 text-blue-200" />
                      <span className="text-blue-100">{schoolInfo.address}</span>
                    </div>
                  )}
                  {schoolInfo?.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 mr-3 text-blue-200" />
                      <span className="text-blue-100">{schoolInfo.phone}</span>
                    </div>
                  )}
                  {schoolInfo?.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-3 text-blue-200" />
                      <span className="text-blue-100">{schoolInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center">
                <Link href="/public/contact">
                  <Button size="lg" variant="secondary" className="px-8">
                    সরাসরি যোগাযোগ করুন
                  </Button>
                </Link>
              </div>
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
                {schoolInfo?.description || schoolInfo?.descriptionBn || "আমাদের স্কুল শিক্ষার মাধ্যমে উন্নত ভবিষ্যৎ গড়তে প্রতিশ্রুতিবদ্ধ।"}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">দ্রুত লিঙ্ক</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-gray-300 hover:text-white">আমাদের সম্পর্কে</Link></li>
                <li><Link href="/academics" className="text-gray-300 hover:text-white">একাডেমিক</Link></li>
                <li><Link href="/admissions" className="text-gray-300 hover:text-white">ভর্তি</Link></li>
                <li><Link href="/contact" className="text-gray-300 hover:text-white">যোগাযোগ</Link></li>
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