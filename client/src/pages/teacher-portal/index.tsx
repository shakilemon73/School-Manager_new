import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useDesignSystem } from '@/hooks/use-design-system';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
  Award,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  LogOut
} from 'lucide-react';

// UX-Enhanced Components
const UXCard = ({ children, interactive = false, ...props }: any) => {
  const baseClasses = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200";
  const interactiveClasses = interactive ? "hover:scale-[1.02] cursor-pointer hover:border-slate-300 dark:hover:border-slate-600" : "";
  
  return (
    <Card className={cn(baseClasses, interactiveClasses)} {...props}>
      {children}
    </Card>
  );
};

const NavigationCard = ({ title, description, icon: Icon, href, color, badge }: any) => (
  <Link href={href}>
    <UXCard interactive>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
            color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
            color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
            color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
            color === "red" && "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
          )}>
            <Icon className="w-6 h-6" />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </CardContent>
    </UXCard>
  </Link>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <UXCard>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
          color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
          color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </UXCard>
);

export default function TeacherPortalHome() {
  // Initialize UX design system
  useDesignSystem();
  const { user } = useSupabaseDirectAuth();

  const navigationItems = [
    {
      title: "উপস্থিতি ব্যবস্থাপনা",
      description: "ছাত্রছাত্রীদের উপস্থিতি নিন ও রেকর্ড রাখুন",
      icon: Users,
      href: "/teacher/attendance",
      color: "green"
    },
    {
      title: "মার্ক এন্ট্রি",
      description: "পরীক্ষার ফলাফল ও মূল্যায়ন এন্ট্রি করুন",
      icon: Award,
      href: "/teacher/marks",
      color: "red"
    },
    {
      title: "ক্লাস রুটিন",
      description: "আপনার ক্লাসের সময়সূচী দেখুন",
      icon: Calendar,
      href: "/calendar",
      color: "blue"
    }
  ];

  const quickStats = [
    {
      title: "আজকের ক্লাস",
      value: "৬টি",
      subtitle: "৪টি সম্পন্ন, ২টি বাকি",
      icon: Calendar,
      color: "blue"
    },
    {
      title: "মোট ছাত্রছাত্রী",
      value: "১২৮ জন",
      subtitle: "৪টি শ্রেণীতে",
      icon: Users,
      color: "green"
    },
    {
      title: "চলমান অ্যাসাইনমেন্ট",
      value: "৮টি",
      subtitle: "৩টি নতুন জমা",
      icon: ClipboardList,
      color: "orange"
    },
    {
      title: "গড় উপস্থিতি",
      value: "৯২%",
      subtitle: "এই সপ্তাহে",
      icon: CheckCircle,
      color: "purple"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            শিক্ষক পোর্টাল
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            আপনার শিক্ষাদান কার্যক্রম পরিচালনার জন্য সম্পূর্ণ সমাধান
          </p>
          {user && (
            <p className="text-sm text-slate-500">
              স্বাগতম, {user.email}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Quick Access Message */}
        <UXCard>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900/20">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    দ্রুত প্রবেশ
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    নিচের কার্যক্রম থেকে আপনার প্রয়োজনীয় কাজটি বেছে নিন
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </UXCard>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationItems.map((item, index) => (
            <NavigationCard key={index} {...item} />
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UXCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                আজকের সূচি
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                আপনার আজকের ক্লাস এবং কার্যক্রম দেখুন
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/calendar">
                  সূচি দেখুন
                </Link>
              </Button>
            </CardContent>
          </UXCard>

          <UXCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                দ্রুত ক্রিয়া
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                গুরুত্বপূর্ণ কাজগুলো সম্পন্ন করুন
              </p>
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/teacher/attendance">
                    <Users className="w-4 h-4 mr-2" />
                    উপস্থিতি নিন
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/teacher/marks">
                    <Award className="w-4 h-4 mr-2" />
                    মার্ক এন্ট্রি করুন
                  </Link>
                </Button>
              </div>
            </CardContent>
          </UXCard>
        </div>
      </div>
    </div>
  );
}
