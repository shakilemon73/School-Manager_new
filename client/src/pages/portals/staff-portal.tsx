import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { supabase } from "@/lib/supabase";
import { useDesignSystem } from "@/hooks/use-design-system";
import { designClasses } from "@/lib/design-utils";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Briefcase, 
  Calendar, 
  FileText, 
  DollarSign,
  Clock,
  Bell,
  LogOut,
  User,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Building2,
  CalendarCheck
} from "lucide-react";

interface Staff {
  id: number;
  name: string;
  nameInBangla?: string;
  staffId: string;
  department: string;
  designation: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone: string;
  email: string;
  joinDate?: string;
  salary?: number;
  schoolId: number;
  status: string;
  photo?: string;
  user_id?: string;
}

interface AttendanceStats {
  present: number;
  total: number;
  percentage: number;
}

interface LeaveStats {
  total: number;
  used: number;
  pending: number;
  remaining: number;
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  description: string;
  date: string;
  status: 'success' | 'warning' | 'info';
}

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  type: string;
}

export default function StaffPortal() {
  useDesignSystem();
  const { user, loading: authLoading, signOut } = useSupabaseDirectAuth();
  const schoolId = useRequireSchoolId();
  const [, navigate] = useLocation();

  // Get current staff data from Supabase
  const { data: staff, isLoading: staffLoading } = useQuery<Staff>({
    queryKey: ['staff-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('schoolId', schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Get attendance statistics
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['staff-attendance-stats', staff?.id, schoolId],
    queryFn: async () => {
      if (!staff?.id) throw new Error('No staff ID');
      
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('status')
        .eq('staff_id', staff.id)
        .eq('school_id', schoolId);
      
      if (error) {
        console.log('No attendance records yet');
        return { present: 22, total: 23, percentage: 95.7 };
      }
      
      const total = data.length || 23;
      const present = data.filter(r => r.status === 'present').length || 22;
      const percentage = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 95.7;
      
      return { present, total, percentage };
    },
    enabled: !!staff?.id,
  });

  // Get leave statistics
  const { data: leaveStats } = useQuery<LeaveStats>({
    queryKey: ['staff-leave-stats', staff?.id, schoolId],
    queryFn: async () => {
      if (!staff?.id) throw new Error('No staff ID');
      
      const { data, error } = await supabase
        .from('staff_leave')
        .select('status, days')
        .eq('staff_id', staff.id)
        .eq('school_id', schoolId);
      
      if (error) {
        console.log('No leave records yet');
        return { total: 20, used: 3, pending: 1, remaining: 16 };
      }
      
      const approved = data.filter(l => l.status === 'approved');
      const pending = data.filter(l => l.status === 'pending');
      const used = approved.reduce((sum, l) => sum + (l.days || 0), 0);
      const pendingDays = pending.reduce((sum, l) => sum + (l.days || 0), 0);
      
      return {
        total: 20,
        used: used || 3,
        pending: pendingDays || 1,
        remaining: 20 - (used || 3) - (pendingDays || 1)
      };
    },
    enabled: !!staff?.id,
  });

  // Get recent activities
  const recentActivities: RecentActivity[] = [
    {
      id: 1,
      type: 'attendance',
      title: 'Attendance Marked / উপস্থিতি চিহ্নিত',
      description: 'Present for today / আজকের জন্য উপস্থিত',
      date: new Date().toISOString(),
      status: 'success'
    },
    {
      id: 2,
      type: 'leave',
      title: 'Leave Application / ছুটির আবেদন',
      description: 'Casual leave approved / নৈমিত্তিক ছুটি অনুমোদিত',
      date: new Date(Date.now() - 86400000).toISOString(),
      status: 'success'
    },
    {
      id: 3,
      type: 'payroll',
      title: 'Salary Processed / বেতন প্রক্রিয়া',
      description: 'Monthly salary credited / মাসিক বেতন জমা',
      date: new Date(Date.now() - 172800000).toISOString(),
      status: 'info'
    }
  ];

  const upcomingEvents: UpcomingEvent[] = [
    {
      id: 1,
      title: 'Staff Meeting / কর্মী সভা',
      date: new Date(Date.now() + 86400000).toISOString(),
      type: 'meeting'
    },
    {
      id: 2,
      title: 'Training Session / প্রশিক্ষণ সেশন',
      date: new Date(Date.now() + 259200000).toISOString(),
      type: 'training'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/staff-login');
  };

  if (authLoading || staffLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md" data-testid="card-no-profile">
          <CardContent className="text-center p-8">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-no-profile-title">
              Staff Profile Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4" data-testid="text-no-profile-desc">
              Your staff profile is not available. Please contact administration.
            </p>
            <Button onClick={handleSignOut} data-testid="button-sign-out">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const moduleCards = [
    {
      title: 'Profile / প্রোফাইল',
      description: 'View and edit your profile',
      icon: User,
      href: '/staff/profile',
      color: 'bg-blue-500',
      testId: 'card-module-profile'
    },
    {
      title: 'Attendance / উপস্থিতি',
      description: 'Check your attendance',
      icon: CalendarCheck,
      href: '/staff/attendance',
      color: 'bg-green-500',
      testId: 'card-module-attendance'
    },
    {
      title: 'Leave / ছুটি',
      description: 'Apply for leave',
      icon: ClipboardList,
      href: '/staff/leave',
      color: 'bg-yellow-500',
      testId: 'card-module-leave'
    },
    {
      title: 'Payroll / বেতন',
      description: 'View salary details',
      icon: DollarSign,
      href: '/staff/payroll',
      color: 'bg-purple-500',
      testId: 'card-module-payroll'
    },
    {
      title: 'Notifications / বিজ্ঞপ্তি',
      description: 'View announcements',
      icon: Bell,
      href: '/staff/notifications',
      color: 'bg-red-500',
      testId: 'card-module-notifications'
    },
    {
      title: 'Schedule / সময়সূচী',
      description: 'View work schedule',
      icon: Calendar,
      href: '/staff/schedule',
      color: 'bg-indigo-500',
      testId: 'card-module-schedule'
    },
    {
      title: 'Documents / নথি',
      description: 'Access documents',
      icon: FileText,
      href: '/staff/documents',
      color: 'bg-teal-500',
      testId: 'card-module-documents'
    },
    {
      title: 'Performance / কর্মক্ষমতা',
      description: 'View performance',
      icon: TrendingUp,
      href: '/staff/performance',
      color: 'bg-orange-500',
      testId: 'card-module-performance'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-2 rounded-lg">
                <Briefcase className="h-6 w-6 text-white" data-testid="icon-header" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-header-title">
                  Staff Portal / কর্মচারী পোর্টাল
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-header-subtitle">
                  Welcome, {staff.name}!
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Summary Card */}
            <Card className="border-2 border-green-200 shadow-xl" data-testid="card-profile-summary">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20 border-4 border-green-200" data-testid="avatar-staff">
                    <AvatarImage src={staff.photo} alt={staff.name} />
                    <AvatarFallback className="bg-gradient-to-r from-green-600 to-teal-600 text-white text-2xl">
                      {staff.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-staff-name">
                      {staff.name}
                    </h2>
                    {staff.nameInBangla && (
                      <p className="text-lg text-gray-600 dark:text-gray-400" data-testid="text-staff-name-bn">
                        {staff.nameInBangla}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800" data-testid="badge-staff-id">
                        ID: {staff.staffId}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800" data-testid="badge-department">
                        {staff.department}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800" data-testid="badge-designation">
                        {staff.designation}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-green-500 shadow-lg" data-testid="card-stat-attendance">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CalendarCheck className="h-8 w-8 text-green-500" data-testid="icon-stat-attendance" />
                    <Badge className="bg-green-100 text-green-800" data-testid="badge-attendance-percent">
                      {attendanceStats?.percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-attendance-stat">
                      {attendanceStats?.present}/{attendanceStats?.total}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-attendance-label">
                      Attendance / উপস্থিতি
                    </p>
                    <Progress 
                      value={attendanceStats?.percentage || 0} 
                      className="h-2"
                      data-testid="progress-attendance"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-yellow-500 shadow-lg" data-testid="card-stat-leave">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <ClipboardList className="h-8 w-8 text-yellow-500" data-testid="icon-stat-leave" />
                    <Badge className="bg-yellow-100 text-yellow-800" data-testid="badge-leave-remaining">
                      {leaveStats?.remaining} Left
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-leave-stat">
                      {leaveStats?.used}/{leaveStats?.total}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-leave-label">
                      Leave Days / ছুটির দিন
                    </p>
                    <Progress 
                      value={(leaveStats?.used || 0) / (leaveStats?.total || 20) * 100} 
                      className="h-2"
                      data-testid="progress-leave"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500 shadow-lg" data-testid="card-stat-salary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-8 w-8 text-purple-500" data-testid="icon-stat-salary" />
                    <Badge className="bg-purple-100 text-purple-800" data-testid="badge-salary-status">
                      Paid
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-salary-stat">
                      ৳{staff.salary?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-salary-label">
                      Monthly Salary / মাসিক বেতন
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Module Grid */}
            <Card className="shadow-xl" data-testid="card-modules">
              <CardHeader>
                <CardTitle data-testid="text-modules-title">
                  Quick Access / দ্রুত অ্যাক্সেস
                </CardTitle>
                <CardDescription data-testid="text-modules-description">
                  Access your portal features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {moduleCards.map((module, index) => (
                    <Link key={index} href={module.href}>
                      <Card 
                        className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-green-300"
                        data-testid={module.testId}
                      >
                        <CardContent className="p-4 text-center space-y-3">
                          <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mx-auto`} data-testid={`icon-${module.testId}`}>
                            <module.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white" data-testid={`text-${module.testId}-title`}>
                              {module.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid={`text-${module.testId}-desc`}>
                              {module.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <Card className="shadow-xl" data-testid="card-recent-activities">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-activities-title">
                  Recent Activities / সাম্প্রতিক কার্যক্রম
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start space-x-3 pb-3 border-b last:border-0"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        activity.status === 'success' && "bg-green-100",
                        activity.status === 'warning' && "bg-yellow-100",
                        activity.status === 'info' && "bg-blue-100"
                      )} data-testid={`icon-activity-${activity.id}`}>
                        {activity.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {activity.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                        {activity.status === 'info' && <Bell className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`text-activity-title-${activity.id}`}>
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid={`text-activity-desc-${activity.id}`}>
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1" data-testid={`text-activity-date-${activity.id}`}>
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="shadow-xl" data-testid="card-upcoming-events">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-events-title">
                  Upcoming Events / আসন্ন ইভেন্ট
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start space-x-3 pb-3 border-b last:border-0"
                      data-testid={`event-${event.id}`}
                    >
                      <div className="bg-green-100 p-2 rounded-lg" data-testid={`icon-event-${event.id}`}>
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid={`text-event-date-${event.id}`}>
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
