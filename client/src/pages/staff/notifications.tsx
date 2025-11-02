import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
  FileText,
  Megaphone,
  Award,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
  school_id: number;
}

export default function StaffNotifications() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();

  // Get notifications
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['staff-notifications', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .in('target_role', ['all', 'staff'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.log('No notifications found');
        return [];
      }
      
      return data;
    },
    enabled: !!schoolId,
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const todayNotifications = notifications?.filter(n => {
    const notifDate = new Date(n.created_at);
    const today = new Date();
    return notifDate.toDateString() === today.toDateString();
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="h-5 w-5 text-blue-600" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'announcement': return <Megaphone className="h-5 w-5 text-purple-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 dark:bg-blue-900/20';
      case 'success': return 'bg-green-100 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'announcement': return 'bg-purple-100 dark:bg-purple-900/20';
      default: return 'bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  };

  const renderNotificationCard = (notification: Notification) => (
    <div 
      key={notification.id}
      className={cn(
        "border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
        !notification.is_read && "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
      )}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
          {getTypeIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {notification.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.is_read && (
                <Badge className="bg-green-500" data-testid={`badge-unread-${notification.id}`}>
                  New
                </Badge>
              )}
              <Badge className={getPriorityBadge(notification.priority)} data-testid={`badge-priority-${notification.id}`}>
                {notification.priority}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {format(parseISO(notification.created_at), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-page-title">
                  Notifications / বিজ্ঞপ্তি
                </h1>
              </div>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-green-500" data-testid="badge-unread-count">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl" data-testid="card-notifications">
              <CardHeader>
                <CardTitle data-testid="text-notifications-title">
                  All Notifications / সমস্ত বিজ্ঞপ্তি
                </CardTitle>
                <CardDescription data-testid="text-notifications-description">
                  Stay updated with announcements and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
                    <TabsTrigger value="all" data-testid="tab-all">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="unread" data-testid="tab-unread">
                      Unread ({unreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="today" data-testid="tab-today">
                      Today ({todayNotifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="important" data-testid="tab-important">
                      Important
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4 mt-6" data-testid="content-all">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" data-testid="loading-spinner"></div>
                      </div>
                    ) : notifications && notifications.length === 0 ? (
                      <div className="text-center py-12" data-testid="empty-state">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications?.map(renderNotificationCard)
                    )}
                  </TabsContent>

                  <TabsContent value="unread" className="space-y-4 mt-6" data-testid="content-unread">
                    {notifications?.filter(n => !n.is_read).length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          All caught up! No unread notifications.
                        </p>
                      </div>
                    ) : (
                      notifications?.filter(n => !n.is_read).map(renderNotificationCard)
                    )}
                  </TabsContent>

                  <TabsContent value="today" className="space-y-4 mt-6" data-testid="content-today">
                    {todayNotifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No notifications today
                        </p>
                      </div>
                    ) : (
                      todayNotifications.map(renderNotificationCard)
                    )}
                  </TabsContent>

                  <TabsContent value="important" className="space-y-4 mt-6" data-testid="content-important">
                    {notifications?.filter(n => n.priority === 'high').length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No important notifications
                        </p>
                      </div>
                    ) : (
                      notifications?.filter(n => n.priority === 'high').map(renderNotificationCard)
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-stats-title">
                  Notification Stats / বিজ্ঞপ্তি পরিসংখ্যান
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-semibold" data-testid="text-total-count">
                    {notifications?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Unread</span>
                  <span className="font-semibold text-green-600" data-testid="text-unread-stat">
                    {unreadCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Today</span>
                  <span className="font-semibold text-blue-600" data-testid="text-today-stat">
                    {todayNotifications.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Important</span>
                  <span className="font-semibold text-red-600" data-testid="text-important-stat">
                    {notifications?.filter(n => n.priority === 'high').length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notification Types */}
            <Card className="shadow-xl" data-testid="card-types">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-types-title">
                  By Type / ধরন অনুযায়ী
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Information</span>
                  </div>
                  <span className="font-semibold" data-testid="text-info-count">
                    {notifications?.filter(n => n.type === 'info').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Megaphone className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Announcements</span>
                  </div>
                  <span className="font-semibold" data-testid="text-announcement-count">
                    {notifications?.filter(n => n.type === 'announcement').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">Warnings</span>
                  </div>
                  <span className="font-semibold" data-testid="text-warning-count">
                    {notifications?.filter(n => n.type === 'warning').length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
