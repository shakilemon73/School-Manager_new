import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";
import { Link } from "wouter";
import { useState } from "react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { 
  ArrowLeft,
  Bell,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  BookOpen,
  CreditCard,
  Users,
  Settings
} from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'academic' | 'fee' | 'attendance' | 'exam' | 'general';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export default function StudentNotifications() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // First get student profile to get student database ID
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      return await db.getStudentProfile(user.id, schoolId);
    },
    enabled: !!user?.id && !!schoolId,
  });

  const studentId = studentProfile?.id;

  const { data: notifications, isLoading } = useQuery<any[]>({
    queryKey: ['student-notifications', studentId, schoolId],
    queryFn: async () => {
      if (!studentId || !schoolId) return [];
      return await db.getStudentNotifications(studentId, schoolId);
    },
    enabled: !!studentId && !!schoolId,
  });

  // Filter notifications
  const filteredNotifications = notifications?.filter(notification => {
    const matchesSearch = !searchTerm || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || notification.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  }) || [];

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const date = parseISO(notification.createdAt);
    let dateKey: string;
    
    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMMM d, yyyy');
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  // Sort notifications within each group by time (newest first)
  Object.keys(groupedNotifications).forEach(dateKey => {
    groupedNotifications[dateKey].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic': return <BookOpen className="h-4 w-4" />;
      case 'fee': return <CreditCard className="h-4 w-4" />;
      case 'attendance': return <Calendar className="h-4 w-4" />;
      case 'exam': return <Bell className="h-4 w-4" />;
      case 'general': return <Users className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      default: return 'border-l-4 border-l-blue-500';
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white">
                      {unreadCount} new
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  বিজ্ঞপ্তি • Stay updated with important announcements
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Notifications List */}
          <div className="lg:col-span-3">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-blue-600" />
                      <span>All Notifications</span>
                    </CardTitle>
                    <CardDescription>
                      Recent updates and important information
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                    
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Categories</option>
                      <option value="academic">Academic</option>
                      <option value="fee">Fee</option>
                      <option value="attendance">Attendance</option>
                      <option value="exam">Exam</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
                    <div key={dateKey}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-gray-800 py-2">
                        {dateKey}
                      </h3>
                      
                      <div className="space-y-3">
                        {dateNotifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 ${getPriorityColor(notification.priority)} ${
                              !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 mt-1">
                                {getTypeIcon(notification.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className={`text-lg font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {notification.title}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge className={getTypeColor(notification.type)}>
                                        {notification.type}
                                      </Badge>
                                      <Badge variant="outline" className="flex items-center space-x-1">
                                        {getCategoryIcon(notification.category)}
                                        <span className="capitalize">{notification.category}</span>
                                      </Badge>
                                      {notification.priority === 'high' && (
                                        <Badge className="bg-red-100 text-red-800 border-red-200">
                                          High Priority
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {format(parseISO(notification.createdAt), 'h:mm a')}
                                    </p>
                                    {!notification.isRead && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-auto"></div>
                                    )}
                                  </div>
                                </div>
                                
                                <p className={`text-sm ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'} mb-3`}>
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {!notification.isRead && (
                                      <Button variant="outline" size="sm">
                                        Mark as Read
                                      </Button>
                                    )}
                                    {notification.actionUrl && (
                                      <Button size="sm">
                                        Take Action
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-12">
                      <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Notifications Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || typeFilter !== 'all' || categoryFilter !== 'all'
                          ? 'No notifications match your search criteria.' 
                          : 'You\'re all caught up! No new notifications.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <span>Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">
                      {notifications?.length || 0}
                    </p>
                    <p className="text-sm text-blue-600">Total</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">
                      {unreadCount}
                    </p>
                    <p className="text-sm text-red-600">Unread</p>
                  </div>
                </div>
                
                <Button className="w-full" size="sm">
                  Mark All as Read
                </Button>
              </CardContent>
            </Card>

            {/* Notification Categories */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['academic', 'fee', 'attendance', 'exam', 'general'].map((category) => {
                    const count = notifications?.filter(n => n.category === category).length || 0;
                    const unreadInCategory = notifications?.filter(n => n.category === category && !n.isRead).length || 0;
                    
                    return (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(category)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                          {unreadInCategory > 0 && (
                            <Badge className="text-xs bg-red-500 text-white">
                              {unreadInCategory}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Notification Settings
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Manage Filters
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}