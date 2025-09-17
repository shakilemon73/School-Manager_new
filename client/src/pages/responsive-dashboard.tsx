import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useMobile } from '@/hooks/use-mobile';
import { db } from '@/lib/supabase';
import { dashboardAdapter, notificationsAdapter, calendarAdapter, documentTemplatesAdapter, logFeatureFlags } from '@/lib/data-adapter';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap,
  TrendingUp,
  Calendar,
  FileText,
  DollarSign,
  Bell,
  Settings,
  Plus,
  Eye,
  Download,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Bus,
  Building,
  CreditCard
} from 'lucide-react';

// Types for API responses
interface DashboardStats {
  students: number;
  teachers: number;
  books: number;
  inventory: number;
  monthlyIncome?: number;
  classes?: number;
  events?: number;
  documents?: number;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  read: boolean;
}

interface DocumentTemplate {
  id: number;
  name: string;
  nameBn: string;
  category: string;
  icon: string;
  usageCount: number;
  isActive: boolean;
}

interface CalendarEvent {
  id: number;
  title: string;
  titleBn: string;
  date: string;
  type: string;
  description?: string;
}

export default function ResponsiveDashboard() {
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for live dashboard feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Log feature flags on mount
  useEffect(() => {
    logFeatureFlags();
  }, []);

  // Fetch dashboard stats using data adapter
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', { schoolId: 1 }],
    queryFn: async () => {
      const stats = await dashboardAdapter.getStats();
      return {
        students: stats.students,
        teachers: stats.teachers, 
        books: stats.books,
        inventory: stats.inventory_items || 0,
        monthlyIncome: stats.total_revenue || 0,
        events: stats.upcoming_events || 0,
        documents: stats.active_notifications || 0
      };
    },
    enabled: !!user,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', { schoolId: 1 }],
    queryFn: async () => {
      const notifs = await notificationsAdapter.getNotifications();
      return notifs?.map((n: any) => ({
        id: n.id!,
        title: n.title!,
        message: n.message!,
        type: (n.type || 'info') as 'info' | 'success' | 'warning' | 'error',
        created_at: n.created_at!,
        read: n.is_read || false
      })) || [];
    },
    enabled: !!user,
    retry: 2,
  });

  const { data: documentTemplates, isLoading: documentsLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['document-templates'],
    queryFn: async () => {
      console.log('🔄 Fetching document templates directly from Supabase...');
      const templates = await db.getDocumentTemplates(1);
      console.log('✅ Document templates from Supabase:', templates?.length || 0);
      return templates?.map(t => ({
        id: t.id!,
        name: t.name!,
        nameBn: t.name_bn || t.name!,
        category: t.category!,
        icon: t.icon || 'FileText',
        usageCount: t.usage_count || 0,
        isActive: t.is_active || false
      })) || [];
    },
    enabled: !!user,
    retry: 2,
  });

  const { data: calendarEvents, isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', { schoolId: 1 }],
    queryFn: async () => {
      console.log('🔄 Fetching calendar events directly from Supabase...');
      const events = await db.getCalendarEvents(1);
      console.log('✅ Calendar events from Supabase:', events?.length || 0);
      return events?.map(e => ({
        id: e.id!,
        title: e.title!,
        titleBn: e.title_bn || e.title!,
        date: e.start_date!,
        type: e.event_type!,
        description: e.description || undefined
      })) || [];
    },
    enabled: !!user,
    retry: 2,
  });

  // Format numbers for display
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('bn-BD').format(num);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'সুপ্রভাত';
    if (hour < 17) return 'শুভ দুপুর';
    if (hour < 20) return 'শুভ সন্ধ্যা';
    return 'শুভ রাত্রি';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const showToast = (title: string, description?: string) => {
    toast({
      title,
      description: description || 'কার্যক্রম সম্পন্ন হচ্ছে...',
    });
  };

  // Generate statistics cards with real data
  const statsCards = [
    {
      title: 'মোট শিক্ষার্থী',
      value: dashboardStats?.students || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      trend: '+৮%',
      description: 'গত মাসের তুলনায়'
    },
    {
      title: 'মোট শিক্ষক',
      value: dashboardStats?.teachers || 0,
      icon: GraduationCap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      textColor: 'text-green-600 dark:text-green-400',
      trend: '+৩%',
      description: 'নতুন নিয়োগ'
    },
    {
      title: 'লাইব্রেরি বই',
      value: dashboardStats?.books || 0,
      icon: BookOpen,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      trend: '+১২%',
      description: 'নতুন সংযোজন'
    },
    {
      title: 'ইনভেন্টরি আইটেম',
      value: dashboardStats?.inventory || 0,
      icon: Package,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      trend: '+৫%',
      description: 'স্টক আপডেট'
    }
  ];

  return (
    <AppShell>
      <ResponsivePageLayout
        title="ড্যাশবোর্ড"
        description="স্কুল ম্যানেজমেন্ট সিস্টেম"
        primaryAction={{
          icon: "plus",
          label: "নতুন ডকুমেন্ট",
          onClick: () => navigateTo('/documents'),
        }}
      >
        {/* Hero Section - Welcome & System Status */}
        <div className="mb-8">
          <Card className="border-0 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 dark:from-blue-950/50 dark:via-indigo-950/40 dark:to-purple-950/50">
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {getGreeting()}, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'প্রশাসক'}!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base">
                      {currentTime.toLocaleDateString('bn-BD', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>

                  {/* System Status */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-100/80 dark:bg-green-900/30 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 dark:text-green-400 font-medium">সিস্টেম সক্রিয়</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>সর্বশেষ আপডেট: এখনই</span>
                    </div>
                  </div>
                </div>
                
                {!isMobile && (
                  <div className="relative">
                    <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
                মূল পরিসংখ্যান
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                রিয়েল-টাইম ডেটা ও পারফরম্যান্স মেট্রিক্স
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateTo('/analytics')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              বিস্তারিত
            </Button>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : statsError ? (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                  ডেটা লোড করতে সমস্যা
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                  পরিসংখ্যান লোড করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।
                </p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  পুনরায় চেষ্টা করুন
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <IconComponent className={`w-6 h-6 ${stat.textColor}`} />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-green-600 font-medium">{stat.trend}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {formatNumber(stat.value)}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {stat.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {stat.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
              দ্রুত কার্যাবলী
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              সবচেয়ে ব্যবহৃত ফিচার
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Students Management */}
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigateTo('/management/students')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  শিক্ষার্থী ব্যবস্থাপনা
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  ভর্তি, তথ্য আপডেট ও রেকর্ড রক্ষণাবেক্ষণ
                </p>
                <Badge variant="secondary">{formatNumber(dashboardStats?.students || 0)} জন</Badge>
              </CardContent>
            </Card>

            {/* Teachers Management */}
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigateTo('/management/teachers')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  শিক্ষক ব্যবস্থাপনা
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  নিয়োগ, পদোন্নতি ও কর্মক্ষেত্র ব্যবস্থাপনা
                </p>
                <Badge variant="secondary">{formatNumber(dashboardStats?.teachers || 0)} জন</Badge>
              </CardContent>
            </Card>

            {/* Document Generation */}
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigateTo('/documents')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  ডকুমেন্ট জেনারেটর
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  সার্টিফিকেট, রিপোর্ট ও প্রশাসনিক কাগজপত্র
                </p>
                <Badge variant="secondary">{documentTemplates?.length || 0}+ টেমপ্লেট</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Grid - Activities & Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  সাম্প্রতিক কার্যক্রম
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('/notifications')}>
                  সব দেখুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                        notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                         notification.type === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-600" /> :
                         notification.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                         <Bell className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString('bn-BD')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    কোন নতুন কার্যক্রম নেই
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  আসন্ন ইভেন্ট
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('/calendar')}>
                  ক্যালেন্ডার
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : calendarEvents && calendarEvents.length > 0 ? (
                <div className="space-y-4">
                  {calendarEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          {event.titleBn || event.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(event.date).toLocaleDateString('bn-BD')}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    কোন আসন্ন ইভেন্ট নেই
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => navigateTo('/calendar')}>
                    <Plus className="w-4 h-4 mr-2" />
                    নতুন ইভেন্ট যোগ করুন
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Only Additional Features */}
        {isMobile && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              অতিরিক্ত ফিচার
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer" onClick={() => navigateTo('/management/library')}>
                <CardContent className="p-4 text-center">
                  <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">লাইব্রেরি</h3>
                  <p className="text-xs text-slate-500">বই ব্যবস্থাপনা</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer" onClick={() => navigateTo('/management/inventory')}>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">ইনভেন্টরি</h3>
                  <p className="text-xs text-slate-500">সম্পদ তালিকা</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer" onClick={() => navigateTo('/management/transport')}>
                <CardContent className="p-4 text-center">
                  <Bus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">ট্রান্সপোর্ট</h3>
                  <p className="text-xs text-slate-500">যাতায়াত</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer" onClick={() => navigateTo('/settings')}>
                <CardContent className="p-4 text-center">
                  <Settings className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">সেটিংস</h3>
                  <p className="text-xs text-slate-500">কনফিগারেশন</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Popular Document Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                জনপ্রিয় ডকুমেন্ট টেমপ্লেট
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('/documents')}>
                সব দেখুন
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : documentTemplates && documentTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {documentTemplates.slice(0, 6).map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigateTo(`/documents/generate/${template.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 group-hover:text-green-600 transition-colors">
                          {template.nameBn || template.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {template.category} • ব্যবহার: {formatNumber(template.usageCount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  কোন ডকুমেন্ট টেমপ্লেট উপলব্ধ নেই
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </ResponsivePageLayout>
    </AppShell>
  );
}