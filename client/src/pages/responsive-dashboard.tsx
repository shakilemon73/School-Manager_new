import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useSchoolBranding, useCurrentAcademicYear } from '@/hooks/use-school-context';
import { useMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  ChevronRight,
  Zap,
  TrendingDown,
  Award,
  Target,
  UserPlus,
  FilePlus,
  CalendarPlus,
  CreditCard,
  X
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

// Types
interface DashboardStats {
  students: number;
  teachers: number;
  books: number;
  inventory: number;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  read: boolean;
}

interface FABAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  path: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
};

const fabVariants = {
  closed: { rotate: 0 },
  open: { rotate: 45 }
};

const fabMenuVariants = {
  closed: { opacity: 0, scale: 0 },
  open: {
    opacity: 1,
    scale: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const fabItemVariants = {
  closed: { opacity: 0, y: 20, scale: 0 },
  open: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export default function ResponsiveDashboard() {
  const { user, schoolId, authReady } = useSupabaseDirectAuth();
  const { schoolName } = useSchoolBranding();
  const { currentAcademicYear, loading: academicYearLoading } = useCurrentAcademicYear();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fabOpen, setFabOpen] = useState(false);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close FAB on route change
  useEffect(() => {
    setFabOpen(false);
  }, [navigate]);

  // Fetch dashboard stats with optimized queries
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', schoolId, currentAcademicYear?.id],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const [studentsCount, teachersCount, booksCount, inventoryCount] = await Promise.all([
        supabase.from('students').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('library_books').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('inventory_items').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId)
      ]);

      return {
        students: studentsCount.count || 0,
        teachers: teachersCount.count || 0, 
        books: booksCount.count || 0,
        inventory: inventoryCount.count || 0,
      };
    },
    enabled: authReady && !!schoolId && !academicYearLoading,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });

  // Fetch notifications with virtualization support
  const { data: notifications, isLoading: notificationsLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) return [];
      
      return (data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: (n.type || 'info') as 'info' | 'success' | 'warning' | 'error',
        created_at: n.created_at,
        read: n.is_read || false
      }));
    },
    enabled: authReady && !!schoolId && !academicYearLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });

  // Fetch admin stats
  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [marksToday, attendanceRate, activeExams, pendingCount] = await Promise.all([
        supabase.from('exam_results').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
        supabase.from('attendance_records').select('status', { count: 'estimated' })
          .eq('school_id', schoolId).gte('date', today.toISOString().split('T')[0]),
        supabase.from('exams').select('id', { count: 'estimated', head: true }).eq('school_id', schoolId),
        supabase.from('exam_results').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).is('verified_by', null)
      ]);
      
      const presentCount = attendanceRate.data?.filter((r: any) => r.status === 'present').length || 0;
      const totalAttendance = attendanceRate.data?.length || 0;
      const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      
      return {
        marksEnteredToday: marksToday.count || 0,
        attendanceRate: attendancePercentage,
        activeExams: activeExams.count || 0,
        pendingApprovals: pendingCount.count || 0
      };
    },
    enabled: authReady && !!schoolId && !academicYearLoading,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });

  const formatNumber = (num: number) => new Intl.NumberFormat('bn-BD').format(num);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'সুপ্রভাত';
    if (hour < 17) return 'শুভ দুপুর';
    if (hour < 20) return 'শুভ সন্ধ্যা';
    return 'শুভ রাত্রি';
  };

  // Context-based primary stats
  const primaryStats = useMemo(() => [
    {
      id: 'students',
      title: 'মোট শিক্ষার্থী',
      subtitle: 'সক্রিয় ভর্তিকৃত',
      value: dashboardStats?.students || 0,
      icon: Users,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: '+৮%',
      trendUp: true,
      path: '/management/students'
    },
    {
      id: 'teachers',
      title: 'মোট শিক্ষক',
      subtitle: 'নিয়োজিত শিক্ষক',
      value: dashboardStats?.teachers || 0,
      icon: GraduationCap,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: '+৩%',
      trendUp: true,
      path: '/management/teachers'
    },
    {
      id: 'books',
      title: 'লাইব্রেরি বই',
      subtitle: 'মোট সংগ্রহ',
      value: dashboardStats?.books || 0,
      icon: BookOpen,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      trend: '+১২%',
      trendUp: true,
      path: '/library'
    },
    {
      id: 'inventory',
      title: 'ইনভেন্টরি আইটেম',
      subtitle: 'মজুদ সরঞ্জাম',
      value: dashboardStats?.inventory || 0,
      icon: Package,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: '+৫%',
      trendUp: true,
      path: '/inventory'
    },
  ], [dashboardStats]);

  // Context-based quick actions
  const quickActions = useMemo(() => [
    {
      id: 'documents',
      title: 'ডকুমেন্ট তৈরি',
      description: 'সার্টিফিকেট ও রিপোর্ট',
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
      path: '/documents'
    },
    {
      id: 'admit-card',
      title: 'প্রবেশপত্র',
      description: 'পরীক্ষার প্রবেশপত্র',
      icon: CreditCard,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
      path: '/admit-card'
    },
    {
      id: 'finances',
      title: 'আর্থিক হিসাব',
      description: 'ফি ও লেনদেন',
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      path: '/management/finances'
    },
    {
      id: 'calendar',
      title: 'ক্যালেন্ডার',
      description: 'ইভেন্ট ও সময়সূচী',
      icon: Calendar,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10',
      path: '/calendar'
    },
    {
      id: 'settings',
      title: 'স্কুল সেটিংস',
      description: 'কনফিগারেশন',
      icon: Settings,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-500/10',
      path: '/settings/school'
    },
    {
      id: 'reports',
      title: 'রিপোর্ট ও বিশ্লেষণ',
      description: 'পারফরম্যান্স ডেটা',
      icon: BarChart3,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      path: '/reports'
    },
  ], []);

  // Multi-action FAB items - Context-based main tasks
  const fabActions: FABAction[] = useMemo(() => [
    {
      id: 'add-student',
      label: 'শিক্ষার্থী যোগ করুন',
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      path: '/management/students'
    },
    {
      id: 'create-document',
      label: 'ডকুমেন্ট তৈরি করুন',
      icon: FilePlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      path: '/documents'
    },
    {
      id: 'add-event',
      label: 'ইভেন্ট যোগ করুন',
      icon: CalendarPlus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      path: '/calendar'
    },
    {
      id: 'teacher-portal',
      label: 'শিক্ষক পোর্টাল',
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      path: '/teacher'
    },
  ], []);

  // Activity metrics
  const activityMetrics = useMemo(() => [
    {
      label: 'মার্ক এন্ট্রি',
      value: adminStats?.marksEnteredToday || 0,
      icon: CheckCircle,
      color: 'text-cyan-600 dark:text-cyan-400',
      badge: 'আজ'
    },
    {
      label: 'উপস্থিতি',
      value: adminStats?.attendanceRate || 0,
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400',
      badge: '%'
    },
    {
      label: 'পরীক্ষা',
      value: adminStats?.activeExams || 0,
      icon: Award,
      color: 'text-violet-600 dark:text-violet-400',
      badge: 'সক্রিয়'
    },
    {
      label: 'অনুমোদন',
      value: adminStats?.pendingApprovals || 0,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      badge: 'অপেক্ষমাণ'
    },
  ], [adminStats]);

  const handleFABAction = (path: string) => {
    setFabOpen(false);
    navigate(path);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
          
          {/* Hero Status Section - Compact */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="hero-status-section"
          >
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-0.5 truncate" data-testid="greeting-text">
                        {getGreeting()}, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'প্রশাসক'}!
                      </h1>
                      <p className="text-xs text-slate-600 dark:text-slate-400" data-testid="current-date">
                        {currentTime.toLocaleDateString('bn-BD', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-full" data-testid="system-status">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">সিস্টেম সক্রিয়</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>এখনই</span>
                        </div>
                      </div>
                    </div>
                    
                    {!isMobile && (
                      <div className="relative">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* Stats Summary - Responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="stats-summary-section"
          >
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                মূল পরিসংখ্যান
              </h2>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className="h-9 gap-2" data-testid="button-view-analytics">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">বিস্তারিত</span>
                </Button>
              </Link>
            </motion.div>

            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {primaryStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.id} variants={itemVariants}>
                      <Link href={stat.path}>
                        <Card 
                          className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full rounded-xl"
                          data-testid={`card-stat-${stat.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                              </div>
                              <div className="flex items-center gap-1">
                                {stat.trendUp ? (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                                <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                                  {stat.trend}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100" data-testid={`stat-value-${stat.id}`}>
                                {formatNumber(stat.value)}
                              </div>
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {stat.title}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Quick Actions - Responsive: 2 col mobile, 3 col tablet, 6 col desktop */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="quick-actions-section"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                দ্রুত কার্যাবলী
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div key={action.id} variants={itemVariants}>
                    <Link href={action.path}>
                      <Card 
                        className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full rounded-lg"
                        data-testid={`card-action-${action.id}`}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                          <div className={`w-12 h-12 ${action.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-6 h-6 ${action.color}`} />
                          </div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {action.title}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Activity Stack - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Activity Metrics */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="lg:col-span-2"
              data-testid="activity-metrics-section"
            >
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      আজকের শিক্ষা কার্যক্রম
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {activityMetrics.map((metric, index) => {
                        const Icon = metric.icon;
                        return (
                          <div key={index} className="text-center" data-testid={`metric-${index}`}>
                            <Icon className={`w-8 h-8 ${metric.color} mx-auto mb-2`} />
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {formatNumber(metric.value)}{metric.badge === '%' ? metric.badge : ''}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {metric.label}
                            </div>
                            {metric.badge !== '%' && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {metric.badge}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Notifications */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              data-testid="notifications-section"
            >
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-500" />
                        সাম্প্রতিক বিজ্ঞপ্তি
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNotificationSheet(true)}
                        data-testid="button-view-all-notifications"
                      >
                        সব দেখুন
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
                        ))}
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.slice(0, 5).map((notif) => (
                          <div 
                            key={notif.id} 
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            data-testid={`notification-${notif.id}`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notif.type === 'success' ? 'bg-green-500' :
                              notif.type === 'warning' ? 'bg-yellow-500' :
                              notif.type === 'error' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {notif.title}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                                {notif.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">কোনো বিজ্ঞপ্তি নেই</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

        </div>

        {/* Multi-Action Floating Action Button (FAB) */}
        <div className="fixed bottom-6 right-6 z-50">
          {/* Backdrop overlay when FAB is open */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFabOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                style={{ bottom: 0, right: 0, left: 0, top: 0 }}
              />
            )}
          </AnimatePresence>

          {/* FAB Action Menu */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                variants={fabMenuVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="absolute bottom-20 right-0 space-y-4"
              >
                {fabActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.id}
                      variants={fabItemVariants}
                      className="flex items-center gap-3 justify-end"
                      custom={index}
                    >
                      {/* Label with backdrop blur */}
                      <motion.div 
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-slate-100 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                        whileHover={{ scale: 1.05, x: -4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        {action.label}
                      </motion.div>
                      
                      {/* Action button */}
                      <motion.button
                        onClick={() => handleFABAction(action.path)}
                        className={`${action.bgColor} hover:opacity-90 text-white h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all relative overflow-hidden`}
                        data-testid={`fab-action-${action.id}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                        <Icon className="w-6 h-6 relative z-10" />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB Button */}
          <motion.button
            variants={fabVariants}
            animate={fabOpen ? 'open' : 'closed'}
            onClick={() => setFabOpen(!fabOpen)}
            className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white flex items-center justify-center transition-all relative overflow-hidden group"
            data-testid="fab-main"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Plus icon with rotation */}
            <motion.div
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative z-10"
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </motion.div>
            
            {/* Ripple effect on hover */}
            <motion.div
              className="absolute inset-0 bg-white/30 rounded-full"
              initial={{ scale: 0, opacity: 0.5 }}
              whileHover={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </motion.button>
        </div>

        {/* Bottom Sheet for Notifications */}
        <AnimatePresence>
          {showNotificationSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotificationSheet(false)}
                className="fixed inset-0 bg-black/50 z-50"
                data-testid="notification-sheet-overlay"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-50 max-h-[80vh] overflow-hidden"
                data-testid="notification-sheet"
              >
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      সকল বিজ্ঞপ্তি
                    </h3>
                    <button
                      onClick={() => setShowNotificationSheet(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      data-testid="button-close-notification-sheet"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(80vh - 64px)' }}>
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.type === 'success' ? 'bg-green-500' :
                          notif.type === 'warning' ? 'bg-yellow-500' :
                          notif.type === 'error' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {notif.title}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {notif.message}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                            {new Date(notif.created_at).toLocaleDateString('bn-BD')}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>কোনো বিজ্ঞপ্তি নেই</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
