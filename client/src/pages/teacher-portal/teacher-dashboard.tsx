import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useDesignSystem } from '@/hooks/use-design-system';
import { designClasses } from '@/lib/design-utils';
import { cn } from '@/lib/utils';
import {
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  TrendingUp,
  Clock,
  Bell,
  Award,
  FileText,
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  BarChart3,
  GraduationCap,
  MessageSquare,
  Video,
  Download,
  Plus,
  Eye
} from 'lucide-react';

// UX-Enhanced Components following world-class design principles
const UXCard = ({ children, variant = "default", interactive = false, ...props }: any) => {
  const baseClasses = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200";
  const interactiveClasses = interactive ? "hover:scale-[1.02] cursor-pointer hover:border-slate-300 dark:hover:border-slate-600" : "";
  
  return (
    <Card className={cn(baseClasses, interactiveClasses)} {...props}>
      {children}
    </Card>
  );
};

const UXButton = ({ children, variant = "primary", size = "default", ...props }: any) => {
  const validVariants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
  const safeVariant = (validVariants.includes(variant as any) ? variant : 'primary') as 'primary' | 'secondary' | 'ghost' | 'destructive';
  const variantClass = designClasses.button[safeVariant];
  const sizeClasses = size === "sm" ? "px-3 py-2 text-sm min-h-[40px]" : "px-4 py-2.5 min-h-[44px]";
  
  return (
    <Button className={cn(variantClass, sizeClasses)} {...props}>
      {children}
    </Button>
  );
};

const StatCard = ({ title, value, change, icon: Icon, color = "blue", trend = "up" }: any) => (
  <UXCard interactive>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {change && (
            <div className={cn(
              "flex items-center text-sm",
              trend === "up" ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change}
            </div>
          )}
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

const QuickAction = ({ title, description, icon: Icon, color, onClick }: any) => (
  <UXCard interactive onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
          color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
          color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{title}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{description}</p>
        </div>
      </div>
    </CardContent>
  </UXCard>
);

export default function TeacherDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  
  // Initialize UX design system
  useDesignSystem();
  
  // Fetch teacher data
  const { data: teacherData, isLoading } = useQuery({
    queryKey: ['/api/teachers/dashboard'],
    staleTime: 30000,
  });

  // Fetch teacher stats
  const { data: stats } = useQuery({
    queryKey: ['/api/teachers/stats'],
    staleTime: 60000,
  });

  // Fetch today's schedule
  const { data: schedule } = useQuery({
    queryKey: ['/api/teachers/schedule', selectedPeriod],
    staleTime: 300000,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['/api/teachers/notifications'],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">শিক্ষক ড্যাশবোর্ড লোড হচ্ছে...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const quickActions = [
    {
      title: "নতুন পাঠ পরিকল্পনা",
      description: "আজকের ক্লাসের জন্য পাঠ পরিকল্পনা তৈরি করুন",
      icon: BookOpen,
      color: "blue",
      onClick: () => window.location.href = "/teacher/lesson-plans/create"
    },
    {
      title: "উপস্থিতি নিন",
      description: "ছাত্রছাত্রীদের উপস্থিতি রেকর্ড করুন",
      icon: Users,
      color: "green",
      onClick: () => window.location.href = "/teacher/attendance"
    },
    {
      title: "নতুন অ্যাসাইনমেন্ট",
      description: "ছাত্রছাত্রীদের জন্য নতুন কাজ দিন",
      icon: ClipboardList,
      color: "orange",
      onClick: () => window.location.href = "/teacher/assignments/create"
    },
    {
      title: "মার্ক এন্ট্রি",
      description: "পরীক্ষার ফলাফল এন্ট্রি করুন",
      icon: Award,
      color: "purple",
      onClick: () => window.location.href = "/teacher/marks"
    }
  ];

  const todaysClasses = [
    { time: "৮:০০ - ৮:৪৫", subject: "বাংলা", class: "ষষ্ঠ 'ক'", room: "১০১", status: "completed" },
    { time: "৮:৪৫ - ৯:৩০", subject: "বাংলা", class: "সপ্তম 'খ'", room: "২০২", status: "current" },
    { time: "১০:১৫ - ১১:০০", subject: "বাংলা", class: "অষ্টম 'গ'", room: "৩০৩", status: "upcoming" },
    { time: "১১:০০ - ১১:৪৫", subject: "বাংলা", class: "নবম 'ক'", room: "৪০১", status: "upcoming" },
  ];

  const recentActivities = [
    { type: "attendance", title: "উপস্থিতি নেওয়া হয়েছে", subtitle: "ষষ্ঠ 'ক' - বাংলা", time: "৩০ মিনিট আগে" },
    { type: "assignment", title: "নতুন অ্যাসাইনমেন্ট দেওয়া হয়েছে", subtitle: "সপ্তম 'খ' - গদ্য পাঠ", time: "১ ঘন্টা আগে" },
    { type: "marks", title: "মার্ক এন্ট্রি সম্পন্ন", subtitle: "অষ্টম 'গ' - সাপ্তাহিক পরীক্ষা", time: "২ ঘন্টা আগে" },
  ];

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              শিক্ষক ড্যাশবোর্ড
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              স্বাগতম! আজকের সকল কার্যক্রম এখানে দেখুন
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UXButton variant="secondary" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              বিজ্ঞপ্তি
            </UXButton>
            <UXButton variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              নতুন ক্লাস
            </UXButton>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="আজকের ক্লাস"
            value="৬টি"
            change="+২ গতকালের তুলনায়"
            icon={Calendar}
            color="blue"
            trend="up"
          />
          <StatCard
            title="মোট ছাত্রছাত্রী"
            value="১২৮ জন"
            change="+৫ নতুন ভর্তি"
            icon={Users}
            color="green"
            trend="up"
          />
          <StatCard
            title="অসম্পূর্ণ কাজ"
            value="৩টি"
            change="-২ গতকালের তুলনায়"
            icon={ClipboardList}
            color="orange"
            trend="down"
          />
          <StatCard
            title="গড় উপস্থিতি"
            value="৯২%"
            change="+ৃ% এই মাসে"
            icon={TrendingUp}
            color="purple"
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  দ্রুত কাজ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <QuickAction key={index} {...action} />
                  ))}
                </div>
              </CardContent>
            </UXCard>

            {/* Today's Schedule */}
            <UXCard>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    আজকের ক্লাস রুটিন
                  </CardTitle>
                  <UXButton variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    সব দেখুন
                  </UXButton>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysClasses.map((classItem, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          classItem.status === "completed" && "bg-green-500",
                          classItem.status === "current" && "bg-blue-500 animate-pulse",
                          classItem.status === "upcoming" && "bg-slate-300 dark:bg-slate-600"
                        )} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {classItem.subject} - {classItem.class}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            কক্ষ: {classItem.room}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {classItem.time}
                        </p>
                        <Badge 
                          variant={
                            classItem.status === "completed" ? "default" :
                            classItem.status === "current" ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {classItem.status === "completed" ? "সম্পন্ন" :
                           classItem.status === "current" ? "চলমান" : "আসছে"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UXCard>

            {/* Performance Analytics */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  শিক্ষাদান পরিসংখ্যান
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ক্লাস সম্পূর্ণতা</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">৯৫%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">অ্যাসাইনমেন্ট জমা</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">৮৮%</span>
                  </div>
                  <Progress value={88} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ছাত্র সন্তুষ্টি</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">৯৬%</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
              </CardContent>
            </UXCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  সাম্প্রতিক কার্যক্রম
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        activity.type === "attendance" && "bg-green-500",
                        activity.type === "assignment" && "bg-blue-500",
                        activity.type === "marks" && "bg-purple-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {activity.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {activity.subtitle}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UXCard>

            {/* Upcoming Deadlines */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  আসন্ন সময়সীমা
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        মাসিক পরীক্ষার প্রশ্ন
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        সপ্তম শ্রেণী - বাংলা
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      ২ দিন
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        মার্ক এন্ট্রি সময়সীমা
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        অষ্টম শ্রেণী - সাপ্তাহিক পরীক্ষা
                      </p>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      ১ দিন
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </UXCard>

            {/* Resource Center */}
            <UXCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  রিসোর্স সেন্টার
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <UXButton variant="ghost" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-3" />
                    পাঠ পরিকল্পনা টেমপ্লেট
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-3" />
                    পাঠ্যক্রম গাইড
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start">
                    <Video className="w-4 h-4 mr-3" />
                    প্রশিক্ষণ ভিডিও
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-3" />
                    শিক্ষক ফোরাম
                  </UXButton>
                </div>
              </CardContent>
            </UXCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}