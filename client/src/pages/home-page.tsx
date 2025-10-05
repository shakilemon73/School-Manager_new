import { useEffect } from 'react';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  School, 
  Users, 
  BookOpen, 
  Calendar,
  FileText,
  Award,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const { user } = useSupabaseDirectAuth();
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16 space-y-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-5 rounded-2xl shadow-2xl">
                  <School className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                স্কুল ম্যানেজমেন্ট সিস্টেম
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                আধুনিক শিক্ষা প্রতিষ্ঠানের জন্য সম্পূর্ণ ডিজিটাল ব্যবস্থাপনা সমাধান
              </p>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  বাংলা ভাষায় সম্পূর্ণ সহায়তা
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <Button
                onClick={() => setLocation('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                data-testid="button-dashboard"
              >
                ড্যাশবোর্ডে যান
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => setLocation('/auth')}
                size="lg"
                variant="outline"
                className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold shadow-lg hover:shadow-xl transition-all"
                data-testid="button-login"
              >
                লগইন করুন
              </Button>
            </div>
          </div>

          {/* Main Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Users,
                title: "শিক্ষার্থী ব্যবস্থাপনা",
                description: "সম্পূর্ণ তথ্য, উপস্থিতি, ফলাফল এবং পারফরম্যান্স ট্র্যাকিং সিস্টেম",
                color: "from-blue-500 to-blue-600",
                link: "/management/students"
              },
              {
                icon: BookOpen,
                title: "একাডেমিক ব্যবস্থাপনা",
                description: "পরীক্ষা, গ্রেড, সিলেবাস এবং ক্লাস রুটিন পরিচালনা",
                color: "from-emerald-500 to-emerald-600",
                link: "/academic/subjects"
              },
              {
                icon: Calendar,
                title: "সময়সূচী ব্যবস্থাপনা",
                description: "ক্লাস রুটিন, পরীক্ষার সময়সূচী এবং ইভেন্ট ক্যালেন্ডার",
                color: "from-purple-500 to-purple-600",
                link: "/calendar"
              },
              {
                icon: FileText,
                title: "ডকুমেন্ট তৈরি",
                description: "এডমিট কার্ড, আইডি কার্ড, সার্টিফিকেট এবং অন্যান্য ডকুমেন্ট",
                color: "from-orange-500 to-orange-600",
                link: "/documents"
              },
              {
                icon: Award,
                title: "পরীক্ষা ও ফলাফল",
                description: "মার্ক এন্ট্রি, ফলাফল প্রকাশ এবং পারফরম্যান্স রিপোর্ট",
                color: "from-rose-500 to-rose-600",
                link: "/academic/gradebook"
              },
              {
                icon: MessageSquare,
                title: "যোগাযোগ ব্যবস্থা",
                description: "অভিভাবক, শিক্ষক এবং শিক্ষার্থীদের মধ্যে সরাসরি যোগাযোগ",
                color: "from-teal-500 to-teal-600",
                link: "/communication/announcements"
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="group cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                onClick={() => setLocation(feature.link)}
                data-testid={`card-feature-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-4 bg-gradient-to-br ${feature.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-2 transition-transform"
                    >
                      বিস্তারিত দেখুন
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Why Choose Us Section */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 md:p-12 mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                কেন আমাদের বেছে নেবেন?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                আমাদের সিস্টেমের অনন্য বৈশিষ্ট্যগুলি
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: CheckCircle,
                  title: "সম্পূর্ণ বাংলা",
                  description: "সম্পূর্ণ বাংলা ভাষায় সহায়তা এবং ইন্টারফেস",
                  color: "text-emerald-600"
                },
                {
                  icon: TrendingUp,
                  title: "সহজ ব্যবহার",
                  description: "সহজ এবং ব্যবহারবান্ধব ইন্টারফেস",
                  color: "text-blue-600"
                },
                {
                  icon: CheckCircle,
                  title: "নিরাপদ",
                  description: "সর্বোচ্চ নিরাপত্তা এবং ডেটা সুরক্ষা",
                  color: "text-purple-600"
                },
                {
                  icon: Sparkles,
                  title: "আধুনিক",
                  description: "সর্বশেষ প্রযুক্তি এবং ফিচার",
                  color: "text-orange-600"
                }
              ].map((item, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className={`inline-flex p-4 bg-slate-100 dark:bg-slate-700 rounded-xl ${item.color}`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Card className="inline-block bg-gradient-to-br from-emerald-600 to-blue-600 border-0 shadow-2xl">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  আজই শুরু করুন
                </h2>
                <p className="text-lg text-white/90 mb-6 max-w-2xl">
                  আধুনিক শিক্ষা ব্যবস্থাপনায় আপনার স্কুলকে এগিয়ে নিয়ে যান
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                    onClick={() => setLocation('/enroll')}
                    size="lg"
                    className="bg-white text-emerald-600 hover:bg-slate-100 font-bold shadow-lg hover:shadow-xl transition-all"
                    data-testid="button-enroll"
                  >
                    নতুন স্কুল নিবন্ধন
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => setLocation('/auth')}
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 font-bold"
                    data-testid="button-login-cta"
                  >
                    লগইন করুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
