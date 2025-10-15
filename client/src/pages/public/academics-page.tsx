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
  Lightbulb,
  Calendar,
  FileText,
  Globe,
  Microscope,
  Calculator,
  Palette
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

interface AcademicProgram {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  icon: any;
  color: string;
  subjects: string[];
}

export default function AcademicsPage() {
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

  const academicPrograms: AcademicProgram[] = [
    {
      id: "science",
      name: "Science",
      nameBn: "বিজ্ঞান",
      description: "Comprehensive science education with modern laboratory facilities",
      descriptionBn: "আধুনিক ল্যাবরেটরি সুবিধাসহ ব্যাপক বিজ্ঞান শিক্ষা",
      icon: Microscope,
      color: "emerald",
      subjects: ["পদার্থবিজ্ঞান", "রসায়ন", "গণিত", "জীববিজ্ঞান"]
    },
    {
      id: "business",
      name: "Business Studies",
      nameBn: "ব্যবসায় শিক্ষা",
      description: "Business and commerce education for future entrepreneurs",
      descriptionBn: "ভবিষ্যৎ উদ্যোক্তাদের জন্য ব্যবসা ও বাণিজ্য শিক্ষা",
      icon: Calculator,
      color: "blue",
      subjects: ["হিসাববিজ্ঞান", "ব্যবসায় নীতি", "অর্থনীতি", "ব্যাংকিং"]
    },
    {
      id: "humanities",
      name: "Humanities",
      nameBn: "মানবিক",
      description: "Liberal arts education fostering critical thinking",
      descriptionBn: "সমালোচনামূলক চিন্তাভাবনা বৃদ্ধির জন্য উদার শিল্প শিক্ষা",
      icon: Globe,
      color: "purple",
      subjects: ["ইতিহাস", "ভূগোল", "সমাজকর্ম", "রাষ্ট্রবিজ্ঞান"]
    }
  ];

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
              <Link href="/academics" className="group relative py-2 px-4 rounded-lg bg-emerald-500 text-white font-semibold shadow-lg">
                <span className="relative z-10 font-medium">একাডেমিক</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-emerald-600 to-purple-600"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center text-white">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <BookOpen className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium">শিক্ষার মান উৎকর্ষতা</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">একাডেমিক</span>
              <span className="block bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                কার্যক্রম
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              আধুনিক শিক্ষা পদ্ধতি ও বিশ্বমানের কারিকুলামের মাধ্যমে গড়ে তুলুন উজ্জ্বল ভবিষ্যৎ
            </p>
          </div>
        </div>
      </section>

      {/* Academic Programs Section */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 mr-2" />
              <span className="text-sm font-semibold">আমাদের শিক্ষা ধারা</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              একাডেমিক বিভাগসমূহ
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              তিনটি প্রধান শাখায় বিভক্ত আমাদের শিক্ষা কার্যক্রম শিক্ষার্থীদের স্বতন্ত্র আগ্রহ ও প্রতিভা অনুযায়ী শিক্ষার সুযোগ প্রদান করে
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {academicPrograms.map((program) => (
              <Card key={program.id} className={`group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 hover:border-${program.color}-300 dark:hover:border-${program.color}-600 transition-all duration-300 hover:shadow-2xl hover:scale-105`}>
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br from-${program.color}-500 to-${program.color}-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <program.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                    {program.nameBn}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                    {program.descriptionBn}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">প্রধান বিষয়সমূহ:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {program.subjects.map((subject, index) => (
                        <Badge 
                          key={index} 
                          className={`bg-${program.color}-100 text-${program.color}-800 dark:bg-${program.color}-900/30 dark:text-${program.color}-300 text-xs font-medium`}
                        >
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Features Section */}
      <section className="py-20 px-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full px-4 py-2">
                  <Award className="h-4 w-4 mr-2" />
                  <span className="text-sm font-semibold">শিক্ষার বৈশিষ্ট্য</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
                  আধুনিক শিক্ষা
                  <span className="block text-blue-600">ব্যবস্থাপনা</span>
                </h2>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  আমাদের শিক্ষা ব্যবস্থা আন্তর্জাতিক মানের কারিকুলাম, অভিজ্ঞ শিক্ষক মণ্ডলী এবং আধুনিক প্রযুক্তির সমন্বয়ে গঠিত।
                </p>
              </div>

              {/* Key Features */}
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">সুবিন্যস্ত ক্লাস রুটিন</h3>
                    <p className="text-slate-600 dark:text-slate-400">বিজ্ঞানভিত্তিক পদ্ধতিতে প্রস্তুতকৃত ক্লাস রুটিন যা শিক্ষার্থীদের সর্বোচ্চ শিখন নিশ্চিত করে।</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">নিয়মিত মূল্যায়ন</h3>
                    <p className="text-slate-600 dark:text-slate-400">ক্রমাগত মূল্যায়ন পদ্ধতির মাধ্যমে শিক্ষার্থীদের অগ্রগতি নিরীক্ষণ ও উন্নতির পথ নির্দেশনা।</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">সহশিক্ষা কার্যক্রম</h3>
                    <p className="text-slate-600 dark:text-slate-400">খেলাধুলা, সাংস্কৃতিক অনুষ্ঠান ও বিতর্ক প্রতিযোগিতার মাধ্যমে সর্বাঙ্গীণ বিকাশ।</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Section */}
            <div className="relative">
              <div className="relative bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-emerald-600 mb-2">৮০+</div>
                      <div className="text-emerald-800 dark:text-emerald-300 font-medium text-sm">বিশেষজ্ঞ শিক্ষক</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">৯৫%</div>
                      <div className="text-blue-800 dark:text-blue-300 font-medium text-sm">পাস রেট</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">৫০+</div>
                      <div className="text-purple-800 dark:text-purple-300 font-medium text-sm">ল্যাব সুবিধা</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">২৪/৭</div>
                      <div className="text-orange-800 dark:text-orange-300 font-medium text-sm">লাইব্রেরি</div>
                    </CardContent>
                  </Card>
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
              আজই যোগ দিন
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              আমাদের একাডেমিক কার্যক্রমে অংশগ্রহণ করে গড়ে তুলুন একটি উজ্জ্বল ভবিষ্যৎ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admissions">
                <Button className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  ভর্তির আবেদন করুন
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-8 py-3 text-lg font-semibold transition-all duration-300">
                  আরও জানুন
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}