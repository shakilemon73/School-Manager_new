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
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { supabase } from '@/lib/supabase';
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

const StatCard = ({ title, value, change, icon: Icon, color = "blue", trend = "up" }: any) => {
  const statKey = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <UXCard interactive data-testid={`card-stat-${statKey}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400" data-testid={`text-stat-label-${statKey}`}>{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid={`text-stat-value-${statKey}`}>{value}</p>
            {change && (
              <div className={cn(
                "flex items-center text-sm",
                trend === "up" ? "text-green-600" : "text-red-600"
              )} data-testid={`text-stat-change-${statKey}`}>
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
          )} data-testid={`icon-stat-${statKey}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </UXCard>
  );
};

const QuickAction = ({ title, description, icon: Icon, color, onClick }: any) => {
  const actionKey = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <UXCard interactive onClick={onClick} data-testid={`card-quick-action-${actionKey}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
            color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
            color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
            color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
          )} data-testid={`icon-action-${actionKey}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate" data-testid={`text-action-title-${actionKey}`}>{title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate" data-testid={`text-action-desc-${actionKey}`}>{description}</p>
          </div>
        </div>
      </CardContent>
    </UXCard>
  );
};

export default function TeacherDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  
  // Initialize UX design system
  useDesignSystem();
  
  // Get authentication state and school ID
  const { user } = useSupabaseDirectAuth();
  const schoolId = useRequireSchoolId();
  
  // Fetch current teacher profile
  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', user.email)
        .eq('school_id', schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching teacher profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id && !!schoolId,
    staleTime: 30000,
  });

  // Fetch teacher stats
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats', teacherData?.id, schoolId],
    queryFn: async () => {
      if (!teacherData?.id) return null;
      
      // Count assigned classes from routine_periods
      const { count: classesCount } = await supabase
        .from('routine_periods')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherData.id);
      
      // For today's classes, filter by current day of week
      const today = new Date();
      const dayOfWeek = (today.getDay() + 1) % 7; // Convert to 0=Saturday format
      
      const { count: todayClassesCount } = await supabase
        .from('routine_periods')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek);
      
      return {
        totalClasses: classesCount || 0,
        todayClasses: todayClassesCount || 0,
        totalStudents: 128, // Placeholder - would need to join with classes/students
        pendingTasks: 3, // Placeholder - would need assignments table
        avgAttendance: 92, // Placeholder - would need attendance table
      };
    },
    enabled: !!teacherData?.id,
    staleTime: 60000,
  });

  // Fetch today's schedule from routine_periods
  const { data: schedule } = useQuery({
    queryKey: ['teacher-schedule', teacherData?.id, selectedPeriod],
    queryFn: async () => {
      if (!teacherData?.id) return [];
      
      const today = new Date();
      const dayOfWeek = (today.getDay() + 1) % 7; // Convert to 0=Saturday format
      
      const { data, error } = await supabase
        .from('routine_periods')
        .select(`
          *,
          class_routines (
            class_name,
            section
          )
        `)
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!teacherData?.id,
    staleTime: 300000,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['teacher-notifications', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .or(`recipient_id.eq.${user.id},recipient_type.eq.public`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id && !!schoolId,
    staleTime: 30000,
  });

  const isLoading = teacherLoading;

  if (isLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8" data-testid="loading-container">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" data-testid="loading-spinner"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400" data-testid="text-loading">শিক্ষক ড্যাশবোর্ড লোড হচ্ছে...</p>
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

  // Transform schedule data to display format with status
  const todaysClasses = (schedule || []).map((period: any, index: number) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Parse start and end times
    const [startHour, startMin] = (period.start_time || '00:00').split(':').map(Number);
    const [endHour, endMin] = (period.end_time || '00:00').split(':').map(Number);
    const periodStart = startHour * 60 + startMin;
    const periodEnd = endHour * 60 + endMin;
    
    // Determine status
    let status = 'upcoming';
    if (currentTime > periodEnd) {
      status = 'completed';
    } else if (currentTime >= periodStart && currentTime <= periodEnd) {
      status = 'current';
    }
    
    return {
      time: `${period.start_time} - ${period.end_time}`,
      subject: period.subject_bn || period.subject || 'বিষয়',
      class: period.class_routines ? `${period.class_routines.class_name} '${period.class_routines.section}'` : 'শ্রেণী',
      room: period.room_number || 'N/A',
      status,
    };
  });

  // Transform notifications to recent activities format
  const recentActivities = (notifications || []).slice(0, 3).map((notif: any) => ({
    type: notif.category || 'notification',
    title: notif.title_bn || notif.title || 'বিজ্ঞপ্তি',
    subtitle: notif.message_bn || notif.message || '',
    time: formatTimeAgo(new Date(notif.created_at)),
  }));

  // Helper function to format time ago
  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    return `${diffDays} দিন আগে`;
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" data-testid="header-teacher-dashboard">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-dashboard-title">
              শিক্ষক ড্যাশবোর্ড
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2" data-testid="text-dashboard-subtitle">
              স্বাগতম! আজকের সকল কার্যক্রম এখানে দেখুন
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UXButton variant="secondary" size="sm" data-testid="button-notifications">
              <Bell className="w-4 h-4 mr-2" />
              বিজ্ঞপ্তি
              {notifications && notifications.filter((n: any) => !n.is_read).length > 0 && (
                <Badge className="ml-2" variant="destructive" data-testid="badge-unread-count">
                  {notifications.filter((n: any) => !n.is_read).length}
                </Badge>
              )}
            </UXButton>
            <UXButton variant="primary" size="sm" data-testid="button-new-class">
              <Plus className="w-4 h-4 mr-2" />
              নতুন ক্লাস
            </UXButton>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="আজকের ক্লাস"
            value={`${stats?.todayClasses || 0}টি`}
            change={stats?.todayClasses && stats.todayClasses > 0 ? `${stats.todayClasses} টি ক্লাস আজ` : 'কোনো ক্লাস নেই'}
            icon={Calendar}
            color="blue"
            trend="up"
          />
          <StatCard
            title="মোট ছাত্রছাত্রী"
            value={`${stats?.totalStudents || 0} জন`}
            change="সব শ্রেণী মিলিয়ে"
            icon={Users}
            color="green"
            trend="up"
          />
          <StatCard
            title="অসম্পূর্ণ কাজ"
            value={`${stats?.pendingTasks || 0}টি`}
            change="এই সপ্তাহে"
            icon={ClipboardList}
            color="orange"
            trend="down"
          />
          <StatCard
            title="গড় উপস্থিতি"
            value={`${stats?.avgAttendance || 0}%`}
            change="এই মাসে"
            icon={TrendingUp}
            color="purple"
            trend="up"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <UXCard data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-quick-actions-title">
                  দ্রুত কাজ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <div key={index} data-testid={`quick-action-${index}`}>
                      <QuickAction {...action} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </UXCard>

            {/* Today's Schedule */}
            <UXCard data-testid="card-todays-schedule">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-schedule-title">
                    আজকের ক্লাস রুটিন
                  </CardTitle>
                  <UXButton variant="ghost" size="sm" data-testid="button-view-all-classes">
                    <Eye className="w-4 h-4 mr-2" />
                    সব দেখুন
                  </UXButton>
                </div>
              </CardHeader>
              <CardContent>
                {todaysClasses.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400" data-testid="empty-schedule">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" data-testid="icon-empty-schedule" />
                    <p data-testid="text-no-classes">আজ কোনো ক্লাস নেই</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysClasses.map((classItem, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                        data-testid={`class-item-${index}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            classItem.status === "completed" && "bg-green-500",
                            classItem.status === "current" && "bg-blue-500 animate-pulse",
                            classItem.status === "upcoming" && "bg-slate-300 dark:bg-slate-600"
                          )} data-testid={`icon-class-status-${index}`} />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100" data-testid={`text-class-subject-${index}`}>
                              {classItem.subject} - {classItem.class}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400" data-testid={`text-class-room-${index}`}>
                              কক্ষ: {classItem.room}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid={`text-class-time-${index}`}>
                            {classItem.time}
                          </p>
                          <Badge 
                            variant={
                              classItem.status === "completed" ? "default" :
                              classItem.status === "current" ? "destructive" : "secondary"
                            }
                            className="text-xs"
                            data-testid={`badge-class-status-${index}`}
                          >
                            {classItem.status === "completed" ? "সম্পন্ন" :
                             classItem.status === "current" ? "চলমান" : "আসছে"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </UXCard>

            {/* Performance Analytics */}
            <UXCard data-testid="card-performance-analytics">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-analytics-title">
                  শিক্ষাদান পরিসংখ্যান
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-metric-class-completion-label">ক্লাস সম্পূর্ণতা</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400" data-testid="text-metric-class-completion-value">৯৫%</span>
                  </div>
                  <Progress value={95} className="h-2" data-testid="progress-class-completion" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-metric-assignment-submission-label">অ্যাসাইনমেন্ট জমা</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400" data-testid="text-metric-assignment-submission-value">৮৮%</span>
                  </div>
                  <Progress value={88} className="h-2" data-testid="progress-assignment-submission" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-metric-student-satisfaction-label">ছাত্র সন্তুষ্টি</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400" data-testid="text-metric-student-satisfaction-value">৯৬%</span>
                  </div>
                  <Progress value={96} className="h-2" data-testid="progress-student-satisfaction" />
                </div>
              </CardContent>
            </UXCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <UXCard data-testid="card-recent-activities">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-activities-title">
                  সাম্প্রতিক কার্যক্রম
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400" data-testid="empty-activities">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" data-testid="icon-empty-activities" />
                    <p className="text-sm" data-testid="text-no-activities">কোনো সাম্প্রতিক কার্যক্রম নেই</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3" data-testid={`activity-item-${index}`}>
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2",
                          activity.type === "attendance" && "bg-green-500",
                          activity.type === "assignment" && "bg-blue-500",
                          activity.type === "marks" && "bg-purple-500",
                          "bg-slate-400"
                        )} data-testid={`icon-activity-type-${index}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid={`text-activity-title-${index}`}>
                            {activity.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400" data-testid={`text-activity-subtitle-${index}`}>
                            {activity.subtitle}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1" data-testid={`text-activity-time-${index}`}>
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </UXCard>

            {/* Upcoming Deadlines */}
            <UXCard data-testid="card-upcoming-deadlines">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-deadlines-title">
                  আসন্ন সময়সীমা
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20" data-testid="deadline-item-0">
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100" data-testid="text-deadline-title-0">
                        মাসিক পরীক্ষার প্রশ্ন
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300" data-testid="text-deadline-desc-0">
                        সপ্তম শ্রেণী - বাংলা
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600" data-testid="badge-deadline-days-0">
                      ২ দিন
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20" data-testid="deadline-item-1">
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100" data-testid="text-deadline-title-1">
                        মার্ক এন্ট্রি সময়সীমা
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300" data-testid="text-deadline-desc-1">
                        অষ্টম শ্রেণী - সাপ্তাহিক পরীক্ষা
                      </p>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-600" data-testid="badge-deadline-days-1">
                      ১ দিন
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </UXCard>

            {/* Resource Center */}
            <UXCard data-testid="card-resource-center">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-resources-title">
                  রিসোর্স সেন্টার
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <UXButton variant="ghost" className="w-full justify-start" data-testid="button-lesson-template">
                    <FileText className="w-4 h-4 mr-3" />
                    পাঠ পরিকল্পনা টেমপ্লেট
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start" data-testid="button-curriculum-guide">
                    <Download className="w-4 h-4 mr-3" />
                    পাঠ্যক্রম গাইড
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start" data-testid="button-training-videos">
                    <Video className="w-4 h-4 mr-3" />
                    প্রশিক্ষণ ভিডিও
                  </UXButton>
                  <UXButton variant="ghost" className="w-full justify-start" data-testid="button-teacher-forum">
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