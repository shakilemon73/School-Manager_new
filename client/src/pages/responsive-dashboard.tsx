import { useState, useEffect, useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  Plus,
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
  X,
  ArrowUpRight,
  Lightbulb,
  UserCheck
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

interface InsightItem {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
  action: string;
  actionPath: string;
  icon: any;
}

// Animation variants - Optimized with reduced motion support
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }
};

const fabVariants = {
  closed: { rotate: 0, scale: 1 },
  open: { rotate: 135, scale: 1.05 }
};

const fabMenuVariants = {
  closed: { opacity: 0, scale: 0.8 },
  open: {
    opacity: 1,
    scale: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.08 }
  }
};

const fabItemVariants = {
  closed: { opacity: 0, y: 16, scale: 0.9 },
  open: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 26 }
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close FAB on route change or outside click
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

  // Fetch notifications
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
        .limit(5);
      
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

  // Fetch today's activity stats
  const { data: todayStats } = useQuery({
    queryKey: ['today-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [marksToday, attendanceRate, activeExams, pendingCount] = await Promise.all([
        supabase.from('exam_results').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
        supabase.from('attendance').select('status', { count: 'estimated' })
          .eq('school_id', schoolId).eq('date', today.toISOString().split('T')[0]),
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

  // Fetch attendance overview - Today's attendance statistics
  const { data: attendanceOverview, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-overview', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const today = new Date().toISOString().split('T')[0];
      
      const [totalStudents, todayAttendance] = await Promise.all([
        supabase.from('students').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('attendance').select('status')
          .eq('school_id', schoolId).eq('date', today)
      ]);
      
      const total = totalStudents.count || 0;
      const marked = todayAttendance.data?.length || 0;
      const present = todayAttendance.data?.filter((a: any) => a.status === 'present').length || 0;
      const absent = todayAttendance.data?.filter((a: any) => a.status === 'absent').length || 0;
      const late = todayAttendance.data?.filter((a: any) => a.status === 'late').length || 0;
      
      const presentPercent = marked > 0 ? Math.round((present / marked) * 100) : 0;
      
      return {
        totalStudents: total,
        markedAttendance: marked,
        unmarkedAttendance: total - marked,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        presentPercentage: presentPercent
      };
    },
    enabled: authReady && !!schoolId && !academicYearLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });

  // Fetch fee collection summary - Financial overview
  const { data: feeOverview, isLoading: feeLoading } = useQuery({
    queryKey: ['fee-overview', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const [todayFees, monthFees, pendingFees] = await Promise.all([
        supabase.from('fee_receipts').select('paid_amount')
          .eq('school_id', schoolId).eq('payment_date', today),
        supabase.from('fee_receipts').select('paid_amount, due_amount')
          .eq('school_id', schoolId).gte('payment_date', firstDayOfMonth),
        supabase.from('fee_receipts').select('due_amount, student_id')
          .eq('school_id', schoolId).gt('due_amount', 0)
      ]);
      
      const todayTotal = todayFees.data?.reduce((sum: number, r: any) => 
        sum + (parseFloat(r.paid_amount) || 0), 0) || 0;
      
      const monthTotal = monthFees.data?.reduce((sum: number, r: any) => 
        sum + (parseFloat(r.paid_amount) || 0), 0) || 0;
      
      const pendingTotal = pendingFees.data?.reduce((sum: number, r: any) => 
        sum + (parseFloat(r.due_amount) || 0), 0) || 0;
      
      const uniquePendingStudents = new Set(pendingFees.data?.map((r: any) => r.student_id) || []).size;
      
      return {
        todayCollection: todayTotal,
        monthCollection: monthTotal,
        pendingAmount: pendingTotal,
        pendingStudentsCount: uniquePendingStudents,
        todayTransactions: todayFees.data?.length || 0
      };
    },
    enabled: authReady && !!schoolId && !academicYearLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });

  // Fetch pending actions - Alerts and actionable items
  const { data: pendingActions, isLoading: actionsLoading } = useQuery({
    queryKey: ['pending-actions', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not available');
      
      const today = new Date().toISOString().split('T')[0];
      
      const [overdueBooks, pendingResults, lowAttendance] = await Promise.all([
        supabase.from('library_borrowed_books').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).eq('status', 'active').lt('due_date', today),
        supabase.from('exam_results').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).is('verified_by', null),
        supabase.from('students').select('id', { count: 'estimated', head: true })
          .eq('school_id', schoolId).eq('status', 'active')
      ]);
      
      return {
        overdueBooks: overdueBooks.count || 0,
        pendingApprovals: pendingResults.count || 0,
        lowAttendanceStudents: 0
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

  // PRIMARY STATS - Reduced to 4 key metrics (Don Norman: Visibility & Clear Signifiers)
  const primaryStats = useMemo(() => [
    {
      id: 'students',
      title: 'মোট শিক্ষার্থী',
      subtitle: 'সক্রিয় ভর্তিকৃত',
      value: dashboardStats?.students || 0,
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: '+৮%',
      trendUp: true,
      path: '/management/students',
      action: 'বিস্তারিত দেখুন'
    },
    {
      id: 'teachers',
      title: 'মোট শিক্ষক',
      subtitle: 'নিয়োজিত শিক্ষক',
      value: dashboardStats?.teachers || 0,
      icon: GraduationCap,
      iconBg: 'bg-green-50 dark:bg-green-950/30',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: '+৩%',
      trendUp: true,
      path: '/management/teachers',
      action: 'পরিচালনা করুন'
    },
    {
      id: 'books',
      title: 'লাইব্রেরি বই',
      subtitle: 'মোট সংগ্রহ',
      value: dashboardStats?.books || 0,
      icon: BookOpen,
      iconBg: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      trend: '+১২%',
      trendUp: true,
      path: '/library',
      action: 'লাইব্রেরি দেখুন'
    },
    {
      id: 'inventory',
      title: 'ইনভেন্টরি',
      subtitle: 'মজুদ সরঞ্জাম',
      value: dashboardStats?.inventory || 0,
      icon: Package,
      iconBg: 'bg-orange-50 dark:bg-orange-950/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: '+৫%',
      trendUp: true,
      path: '/inventory',
      action: 'সরঞ্জাম দেখুন'
    },
  ], [dashboardStats]);

  // CONTEXTUAL QUICK ACTIONS - Change based on time of day
  const quickActions = useMemo(() => {
    const hour = currentTime.getHours();
    const isMorning = hour >= 6 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;
    
    // Morning: Focus on attendance and daily preparation
    if (isMorning) {
      return [
        {
          id: 'attendance',
          title: 'হাজিরা নিন',
          description: 'আজকের উপস্থিতি',
          icon: CheckCircle,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          path: '/attendance'
        },
        {
          id: 'new-student',
          title: 'নতুন শিক্ষার্থী',
          description: 'ভর্তি যোগ করুন',
          icon: UserPlus,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          path: '/management/students'
        },
        {
          id: 'timetable',
          title: 'ক্লাস রুটিন',
          description: 'আজকের সময়সূচী',
          icon: Calendar,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          path: '/timetable'
        },
        {
          id: 'documents',
          title: 'ডকুমেন্ট',
          description: 'তৈরি ও ডাউনলোড',
          icon: FilePlus,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          path: '/documents'
        },
      ];
    }
    
    // Afternoon: Focus on academic tasks
    if (isAfternoon) {
      return [
        {
          id: 'marks-entry',
          title: 'মার্কস এন্ট্রি',
          description: 'ফলাফল যোগ করুন',
          icon: Award,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          path: '/exams/results'
        },
        {
          id: 'assignments',
          title: 'এসাইনমেন্ট',
          description: 'নতুন কাজ দিন',
          icon: FileText,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          path: '/assignments'
        },
        {
          id: 'library',
          title: 'লাইব্রেরি',
          description: 'বই ইস্যু করুন',
          icon: BookOpen,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          path: '/library'
        },
        {
          id: 'finances',
          title: 'ফি সংগ্রহ',
          description: 'পেমেন্ট রেকর্ড',
          icon: DollarSign,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          path: '/management/finances'
        },
      ];
    }
    
    // Evening/Night: Focus on reports and planning
    return [
      {
        id: 'reports',
        title: 'রিপোর্ট',
        description: 'দৈনিক সারসংক্ষেপ',
        icon: BarChart3,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        path: '/reports'
      },
      {
        id: 'calendar',
        title: 'আগামীকাল',
        description: 'পরিকল্পনা করুন',
        icon: Calendar,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        path: '/calendar'
      },
      {
        id: 'documents',
        title: 'ডকুমেন্ট',
        description: 'তৈরি ও ডাউনলোড',
        icon: FilePlus,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        path: '/documents'
      },
      {
        id: 'notices',
        title: 'নোটিশ',
        description: 'বিজ্ঞপ্তি পাঠান',
        icon: Bell,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        path: '/notices'
      },
    ];
  }, [currentTime]);

  // CONTEXT-BASED INSIGHTS - Enhanced AI-Powered Recommendations
  const todayInsights = useMemo<InsightItem[]>(() => {
    const insights: InsightItem[] = [];
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay(); // 0=Sunday, 1=Monday, etc.
    
    if (todayStats) {
      // Morning-specific insights
      if (hour >= 6 && hour < 12) {
        if (todayStats.attendanceRate < 85 && todayStats.attendanceRate > 0) {
          insights.push({
            id: 'attendance-low',
            title: 'হাজিরা কম',
            description: `এখন পর্যন্ত ${todayStats.attendanceRate}%, লক্ষ্য ৮৫%+`,
            type: 'warning',
            action: 'হাজিরা সম্পূর্ণ করুন',
            actionPath: '/attendance',
            icon: AlertCircle
          });
        } else if (todayStats.attendanceRate === 0) {
          insights.push({
            id: 'attendance-pending',
            title: 'হাজিরা নেওয়া হয়নি',
            description: 'আজকের হাজিরা এখনও নেওয়া হয়নি',
            type: 'warning',
            action: 'হাজিরা শুরু করুন',
            actionPath: '/attendance',
            icon: Clock
          });
        }
      }
      
      // Afternoon-specific insights
      if (hour >= 12 && hour < 17) {
        if (todayStats.marksEnteredToday > 0) {
          insights.push({
            id: 'marks-progress',
            title: 'দুর্দান্ত কাজ',
            description: `আজ ${todayStats.marksEnteredToday}টি ফলাফল এন্ট্রি হয়েছে`,
            type: 'success',
            action: 'চালিয়ে যান',
            actionPath: '/exams/results',
            icon: Award
          });
        }
        
        if (todayStats.pendingApprovals > 5) {
          insights.push({
            id: 'pending-high',
            title: 'অনুমোদন প্রয়োজন',
            description: `${todayStats.pendingApprovals}টি ফলাফল যাচাইয়ের জন্য অপেক্ষমাণ`,
            type: 'warning',
            action: 'এখনই যাচাই করুন',
            actionPath: '/exams/results',
            icon: FileText
          });
        }
      }
      
      // Evening insights - Summary and planning
      if (hour >= 17) {
        if (todayStats.attendanceRate >= 90) {
          insights.push({
            id: 'excellent-attendance',
            title: 'চমৎকার হাজিরা',
            description: `আজ ${todayStats.attendanceRate}% হাজিরা রেকর্ড হয়েছে`,
            type: 'success',
            action: 'রিপোর্ট দেখুন',
            actionPath: '/reports',
            icon: CheckCircle
          });
        }
        
        // Weekend reminder
        if (dayOfWeek === 5) { // Friday
          insights.push({
            id: 'weekend-planning',
            title: 'সপ্তাহান্তের পরিকল্পনা',
            description: 'আগামী সপ্তাহের জন্য প্রস্তুতি নিন',
            type: 'info',
            action: 'ক্যালেন্ডার দেখুন',
            actionPath: '/calendar',
            icon: Calendar
          });
        }
      }
      
      // Always show if there are pending approvals
      if (todayStats.pendingApprovals > 0 && insights.length < 3) {
        insights.push({
          id: 'pending-approvals',
          title: 'অনুমোদন অপেক্ষমাণ',
          description: `${todayStats.pendingApprovals}টি ফলাফল যাচাই করুন`,
          type: 'info',
          action: 'যাচাই করুন',
          actionPath: '/exams/results',
          icon: FileText
        });
      }
      
      // Active exams notification
      if (todayStats.activeExams > 0 && insights.length < 3) {
        insights.push({
          id: 'active-exams',
          title: 'চলমান পরীক্ষা',
          description: `${todayStats.activeExams}টি পরীক্ষা সক্রিয় আছে`,
          type: 'info',
          action: 'পরীক্ষা দেখুন',
          actionPath: '/exams',
          icon: FileText
        });
      }
    }
    
    // Context-based default insights
    if (insights.length === 0) {
      if (hour >= 6 && hour < 12) {
        insights.push({
          id: 'morning-ready',
          title: 'শুভ সকাল',
          description: 'আজকের কার্যক্রম শুরু করুন',
          type: 'success',
          action: 'হাজিরা নিন',
          actionPath: '/attendance',
          icon: CheckCircle
        });
      } else if (hour >= 17) {
        insights.push({
          id: 'evening-summary',
          title: 'দিন সমাপ্ত',
          description: 'আজকের রিপোর্ট দেখুন',
          type: 'success',
          action: 'রিপোর্ট',
          actionPath: '/reports',
          icon: BarChart3
        });
      } else {
        insights.push({
          id: 'all-good',
          title: 'সবকিছু ঠিক আছে',
          description: 'কোনো জরুরি কাজ নেই',
          type: 'success',
          action: 'ড্যাশবোর্ড',
          actionPath: '/dashboard',
          icon: CheckCircle
        });
      }
    }
    
    return insights.slice(0, 3); // Max 3 insights
  }, [todayStats, currentTime]);

  // Multi-action FAB - Reduced to 4 primary actions
  const fabActions: FABAction[] = useMemo(() => [
    {
      id: 'add-student',
      label: 'নতুন শিক্ষার্থী',
      icon: UserPlus,
      bgColor: 'bg-blue-600',
      color: 'text-white',
      path: '/management/students'
    },
    {
      id: 'create-document',
      label: 'ডকুমেন্ট তৈরি',
      icon: FilePlus,
      bgColor: 'bg-purple-600',
      color: 'text-white',
      path: '/documents'
    },
    {
      id: 'add-event',
      label: 'ইভেন্ট যোগ করুন',
      icon: CalendarPlus,
      bgColor: 'bg-green-600',
      color: 'text-white',
      path: '/calendar'
    },
    {
      id: 'teacher-portal',
      label: 'শিক্ষক পোর্টাল',
      icon: GraduationCap,
      bgColor: 'bg-indigo-600',
      color: 'text-white',
      path: '/teacher-portal'
    },
  ], []);

  const handleFABAction = (path: string) => {
    setFabOpen(false);
    navigate(path);
  };

  const unreadNotifications = notifications?.filter(n => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch(type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-orange-600 dark:text-orange-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  // Loading skeleton
  if (!authReady || statsLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        {/* Max-width container with proper spacing (White Space Best Practice: 24-32px outer padding) */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-24">
          
          {/* SECTION 1: Hero Welcome Banner - F-Pattern: Top Priority */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="hero-welcome-section"
          >
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate mb-1" data-testid="greeting-text">
                    {getGreeting()}, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'প্রশাসক'}!
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium" data-testid="school-name">{schoolName}</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span>{currentAcademicYear?.name || 'শিক্ষাবর্ষ'}</span>
                    <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{currentTime.toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                </div>
                
                {/* Compact notification button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotificationSheet(true)}
                  className="relative h-9 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 gap-2"
                  data-testid="button-notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">বিজ্ঞপ্তি</span>
                  {unreadNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.section>

          {/* SECTION 2: Primary Stats - Action-Driven Design (with CTAs) */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="primary-stats-section"
          >
            {/* Typography Hierarchy: H2 (18-20px semibold) */}
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 px-1">
              প্রধান পরিসংখ্যান
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {primaryStats.map((stat) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;
                return (
                  <motion.div key={stat.id} variants={itemVariants}>
                    <Card 
                      className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group rounded-xl h-full bg-white dark:bg-slate-900"
                      data-testid={`card-stat-${stat.id}`}
                      onClick={() => navigate(stat.path)}
                    >
                      {/* White Space: 20px inside large cards */}
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-start justify-between mb-4">
                          {/* Iconography: 24px consistent size */}
                          <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-6 h-6 ${stat.iconColor}`} strokeWidth={2} />
                          </div>
                          
                          {/* Don Norman: Feedback - Show trend */}
                          <Badge variant="secondary" className="gap-1">
                            <TrendIcon className="w-3 h-3" />
                            <span className="text-xs">{stat.trend}</span>
                          </Badge>
                        </div>
                        
                        {/* Typography: 14px regular subtitle */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {stat.subtitle}
                        </p>
                        
                        {/* Typography: 32px bold for key metrics (Visual Hierarchy: Size) */}
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                          {formatNumber(stat.value)}
                        </h3>
                        
                        {/* Typography: 16px semibold title */}
                        <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          {stat.title}
                        </p>
                        
                        {/* Action-Driven Design: CTA Button (2025 Best Practice) */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between group/btn hover:bg-slate-100 dark:hover:bg-slate-800"
                          data-testid={`button-action-${stat.id}`}
                        >
                          <span className="text-sm">{stat.action}</span>
                          <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* SECTION 3: Today's Insights - AI-Powered (2025 Best Practice) */}
          {todayInsights.length > 0 && (
            <motion.section
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              data-testid="insights-section"
            >
              <div className="flex items-center gap-2 mb-4 px-1">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  আজকের অন্তর্দৃষ্টি
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {todayInsights.map((insight) => {
                  const Icon = insight.icon;
                  const bgColor = insight.type === 'success' ? 'bg-green-50 dark:bg-green-950/30' :
                                 insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-950/30' :
                                 'bg-blue-50 dark:bg-blue-950/30';
                  const iconColor = insight.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                   insight.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                                   'text-blue-600 dark:text-blue-400';
                  
                  return (
                    <motion.div key={insight.id} variants={itemVariants}>
                      <Card 
                        className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group rounded-xl bg-white dark:bg-slate-900"
                        onClick={() => navigate(insight.actionPath)}
                        data-testid={`card-insight-${insight.id}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                                {insight.title}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                {insight.description}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs -ml-2 group/btn"
                                data-testid={`button-insight-${insight.id}`}
                              >
                                {insight.action}
                                <ChevronRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* SECTION 4: Quick Actions - Reduced to 4 (Limit Distractions) */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="quick-actions-section"
          >
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 px-1">
              দ্রুত কাজ
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div key={action.id} variants={itemVariants}>
                    <Link href={action.path}>
                      <Card 
                        className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full rounded-lg bg-white dark:bg-slate-900"
                        data-testid={`card-action-${action.id}`}
                      >
                        {/* White Space: 8px inside small cards */}
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                          <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-6 h-6 ${action.color}`} strokeWidth={2} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                              {action.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {action.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* SECTION 5: Critical Dashboard Widgets - UX Priority Features */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="dashboard-widgets-section"
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
          >
            {/* Widget 1: Attendance Overview - Most Time-Sensitive */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span>আজকের হাজিরা</span>
                    </CardTitle>
                    <Link href="/academic/attendance-management">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" data-testid="button-goto-attendance">
                        বিস্তারিত →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : attendanceOverview ? (
                    <div className="space-y-4">
                      {/* Main Attendance Percentage */}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">উপস্থিতির হার</p>
                          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {attendanceOverview.presentPercentage}%
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">চিহ্নিত</p>
                          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {formatNumber(attendanceOverview.markedAttendance)}/{formatNumber(attendanceOverview.totalStudents)}
                          </p>
                        </div>
                      </div>

                      {/* Attendance Breakdown - Mobile Optimized */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(attendanceOverview.presentCount)}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">উপস্থিত</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <X className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(attendanceOverview.absentCount)}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">অনুপস্থিত</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(attendanceOverview.lateCount)}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">বিলম্বিত</p>
                        </div>
                      </div>

                      {/* Action Alert */}
                      {attendanceOverview.unmarkedAttendance > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {formatNumber(attendanceOverview.unmarkedAttendance)} জন শিক্ষার্থীর হাজিরা এখনও নেওয়া হয়নি
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">ডেটা লোড হচ্ছে...</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Widget 2: Fee Collection Summary - Financial Priority */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>ফি সংগ্রহ</span>
                    </CardTitle>
                    <Link href="/management/finances">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" data-testid="button-goto-fees">
                        বিস্তারিত →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {feeLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : feeOverview ? (
                    <div className="space-y-4">
                      {/* Today's Collection */}
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">আজকের সংগ্রহ</p>
                        <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                          ৳ {formatNumber(feeOverview.todayCollection)}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatNumber(feeOverview.todayTransactions)} টি লেনদেন
                        </p>
                      </div>

                      {/* Month & Pending - Mobile Optimized Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">এই মাস</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            ৳ {formatNumber(feeOverview.monthCollection)}
                          </p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">বকেয়া</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            ৳ {formatNumber(feeOverview.pendingAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Pending Students Alert */}
                      {feeOverview.pendingStudentsCount > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-0.5">
                              {formatNumber(feeOverview.pendingStudentsCount)} জন শিক্ষার্থীর ফি বকেয়া
                            </p>
                            <Link href="/management/finances">
                              <Button variant="ghost" size="sm" className="h-7 text-xs -ml-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30">
                                তালিকা দেখুন →
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">ডেটা লোড হচ্ছে...</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Widget 3: Pending Actions - Action-Oriented Priority */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span>জরুরি কাজ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {actionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : pendingActions ? (
                    <div className="space-y-3">
                      {/* Overdue Library Books */}
                      <Link href="/management/library">
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer group" data-testid="action-overdue-books">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">বই ফেরত দিতে হবে</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">মেয়াদোত্তীর্ণ বই</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-base px-2.5 py-0.5">
                              {formatNumber(pendingActions.overdueBooks)}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>

                      {/* Pending Result Approvals */}
                      <Link href="/admin/marks-approval">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer group" data-testid="action-pending-results">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">ফলাফল যাচাই করুন</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">অনুমোদন অপেক্ষমাণ</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-base px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              {formatNumber(pendingActions.pendingApprovals)}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>

                      {/* Quick Action Button */}
                      <div className="pt-2">
                        <Link href="/reports">
                          <Button variant="outline" className="w-full justify-between group" data-testid="button-view-all-tasks">
                            <span>সব কাজ দেখুন</span>
                            <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">ডেটা লোড হচ্ছে...</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* SECTION 6: Recent Notifications - Progressive Disclosure */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            data-testid="notifications-section"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                সাম্প্রতিক বিজ্ঞপ্তি
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNotificationSheet(true)}
                data-testid="button-view-all-notifications"
              >
                সব দেখুন
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                {notificationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : notifications && notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const iconColor = getNotificationColor(notification.type);
                      
                      return (
                        <div 
                          key={notification.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          data-testid={`notification-${notification.id}`}
                        >
                          <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">কোনো নতুন বিজ্ঞপ্তি নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>

        </div>

        {/* Floating Action Button (FAB) - Enhanced with Microinteractions */}
        <div className="fixed bottom-6 right-6 z-50">
          {/* Backdrop overlay */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFabOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                style={{ bottom: 0, right: 0, left: 0, top: 0, zIndex: -1 }}
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
                className="absolute bottom-20 right-0 space-y-3"
              >
                {fabActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.id}
                      variants={fabItemVariants}
                      className="flex items-center gap-3 justify-end"
                    >
                      {/* Glass-morphism label */}
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
                        <Icon className="w-6 h-6 relative z-10" strokeWidth={2} />
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
            className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white flex items-center justify-center transition-all relative overflow-hidden group"
            data-testid="fab-main"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Animated pulse effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <Plus className="w-7 h-7 relative z-10" strokeWidth={2.5} />
            
            {/* Ripple on hover */}
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden"
                data-testid="notification-sheet"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      সব বিজ্ঞপ্তি
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNotificationSheet(false)}
                      data-testid="button-close-sheet"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[calc(80vh-100px)] space-y-2">
                    {notifications && notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        const iconColor = getNotificationColor(notification.type);
                        
                        return (
                          <div 
                            key={notification.id}
                            className="flex items-start gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            data-testid={`sheet-notification-${notification.id}`}
                          >
                            <div className="flex-shrink-0">
                              <Icon className={`w-5 h-5 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                                {notification.title}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                {new Date(notification.created_at).toLocaleString('bn-BD')}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>কোনো বিজ্ঞপ্তি নেই</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
