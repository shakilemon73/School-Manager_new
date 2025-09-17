import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellRing,
  Check,
  Settings,
  Filter,
  Search,
  Trash2,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Plus,
  Calendar,
  Clock,
  Users,
  BookOpen,
  CreditCard,
  Award,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Zap,
  Star,
  TrendingUp,
  Activity,
  MoreHorizontal,
  Archive,
  Bookmark,
  Share2
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'urgent' | 'academic' | 'financial' | 'meeting' | 'sports' | 'holiday';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  isStarred: boolean;
  time: string;
  category: string;
  categoryBn: string;
  relatedTo?: string;
  actionRequired?: boolean;
  sender?: string;
  attachments?: number;
}

interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  todayCount: number;
  weeklyGrowth: number;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: true,
    push: true,
    inApp: true,
    sound: true,
    vibration: true
  });

  // Real-time notifications from Supabase directly with RLS
  const { data: notificationsResponse, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      console.log('🔔 Fetching notifications with direct Supabase calls');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Notifications fetch error:', error);
        throw error;
      }
      
      console.log('Notifications fetched:', data?.length || 0);
      return data || [];
    },
    refetchInterval: 3000, // Real-time updates every 3 seconds
    staleTime: 1000,
  });

  // Transform API response to match component interface
  const transformApiNotification = (apiNotification: any): Notification => {
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} মিনিট আগে`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} ঘন্টা আগে`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} দিন আগে`;
      }
    };

    return {
      id: apiNotification.id,
      title: apiNotification.title || '',
      titleBn: apiNotification.titleBn || apiNotification.title_bn || apiNotification.title || '',
      description: apiNotification.message || '',
      descriptionBn: apiNotification.messageBn || apiNotification.message_bn || apiNotification.message || '',
      type: apiNotification.type || 'info',
      priority: apiNotification.priority || 'medium',
      isRead: apiNotification.isRead || apiNotification.is_read || false,
      isStarred: false, // API doesn't have this field yet
      time: formatTime(apiNotification.createdAt || apiNotification.created_at),
      category: apiNotification.category || 'General',
      categoryBn: apiNotification.categoryBn || apiNotification.category_bn || apiNotification.category || 'সাধারণ',
      actionRequired: apiNotification.actionRequired || apiNotification.action_required || false,
      sender: apiNotification.sender || 'System',
      attachments: 0 // API doesn't have this field yet
    };
  };

  // Extract and transform notifications array from API response
  const notifications: Notification[] = Array.isArray(notificationsResponse) 
    ? notificationsResponse.map(transformApiNotification)
    : [];

  // Enhanced mock data following Don Norman's visibility principle
  const mockNotifications: Notification[] = [
    {
      id: 1,
      title: "Fee Payment Reminder",
      titleBn: "ফি পরিশোধের অনুস্মারক",
      description: "Monthly tuition fee payment is due tomorrow",
      descriptionBn: "আগামীকাল মাসিক বেতন পরিশোধের সময়",
      type: "warning",
      priority: "high",
      isRead: false,
      isStarred: true,
      time: "২ ঘন্টা আগে",
      category: "Financial",
      categoryBn: "আর্থিক",
      actionRequired: true,
      sender: "অ্যাকাউন্টিং বিভাগ",
      attachments: 1
    },
    {
      id: 2,
      title: "Exam Schedule Published",
      titleBn: "পরীক্ষার সময়সূচী প্রকাশিত",
      description: "Final exam schedule for December 2025 is now available",
      descriptionBn: "ডিসেম্বর ২০২৫ এর চূড়ান্ত পরীক্ষার সময়সূচী এখন উপলব্ধ",
      type: "academic",
      priority: "high",
      isRead: false,
      isStarred: false,
      time: "৪ ঘন্টা আগে",
      category: "Academic",
      categoryBn: "শিক্ষাগত",
      actionRequired: false,
      sender: "পরীক্ষা নিয়ন্ত্রক",
      attachments: 2
    },
    {
      id: 3,
      title: "Parent-Teacher Meeting",
      titleBn: "অভিভাবক-শিক্ষক সভা",
      description: "Quarterly PTM scheduled for next Friday at 2:00 PM",
      descriptionBn: "আগামী শুক্রবার দুপুর ২টায় ত্রৈমাসিক PTM নির্ধারিত",
      type: "meeting",
      priority: "medium",
      isRead: true,
      isStarred: false,
      time: "১ দিন আগে",
      category: "Meeting",
      categoryBn: "সভা",
      actionRequired: true,
      sender: "প্রধান শিক্ষক",
      attachments: 0
    },
    {
      id: 4,
      title: "Excellent Performance",
      titleBn: "চমৎকার পারফরমেন্স",
      description: "Your child scored 95% in Mathematics test",
      descriptionBn: "আপনার সন্তান গণিত পরীক্ষায় ৯৫% নম্বর পেয়েছে",
      type: "success",
      priority: "medium",
      isRead: true,
      isStarred: true,
      time: "২ দিন আগে",
      category: "Achievement",
      categoryBn: "অর্জন",
      actionRequired: false,
      sender: "গণিত শিক্ষক",
      attachments: 1
    },
    {
      id: 5,
      title: "System Maintenance",
      titleBn: "সিস্টেম রক্ষণাবেক্ষণ",
      description: "Scheduled maintenance tonight from 12 AM to 2 AM",
      descriptionBn: "আজ রাত ১২টা থেকে ২টা পর্যন্ত নির্ধারিত রক্ষণাবেক্ষণ",
      type: "info",
      priority: "low",
      isRead: false,
      isStarred: false,
      time: "৬ ঘন্টা আগে",
      category: "System",
      categoryBn: "সিস্টেম",
      actionRequired: false,
      sender: "IT বিভাগ",
      attachments: 0
    }
  ];

  // Use real notifications from Supabase API
  const displayNotifications = notifications;

  // Enhanced stats calculation
  const notificationStats: NotificationStats = {
    total: displayNotifications.length,
    unread: displayNotifications.filter(n => !n.isRead).length,
    urgent: displayNotifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length,
    todayCount: displayNotifications.filter(n => n.time && (n.time.includes('ঘন্টা') || n.time.includes('মিনিট'))).length,
    weeklyGrowth: 15.5
  };

  // Filter notifications based on tab, search, and filters
  const filteredNotifications = displayNotifications.filter(notification => {
    // Tab filter
    if (activeTab === 'unread' && notification.isRead) return false;
    if (activeTab === 'starred' && !notification.isStarred) return false;
    if (activeTab === 'urgent' && notification.priority !== 'urgent' && notification.priority !== 'high') return false;

    // Search filter
    if (searchQuery && !notification.titleBn?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !notification.descriptionBn?.toLowerCase()?.includes(searchQuery.toLowerCase())) return false;

    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    // Priority filter
    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false;

    return true;
  });

  // Enhanced mutations using direct Supabase
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      console.log('Marking notifications as read:', notificationIds);
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .select();
      
      if (error) {
        console.error('Mark as read error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications([]);
      toast({
        title: "নোটিফিকেশন আপডেট হয়েছে",
        description: "নির্বাচিত নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে",
      });
    },
    onError: (error: any) => {
      console.error('Mark as read failed:', error);
      toast({
        title: "ত্রুটি",
        description: "নোটিফিকেশন আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      console.log('Deleting notifications:', notificationIds);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      
      if (error) {
        console.error('Delete notifications error:', error);
        throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications([]);
      toast({
        title: "নোটিফিকেশন মুছে ফেলা হয়েছে",
        description: "নির্বাচিত নোটিফিকেশন সফলভাবে মুছে ফেলা হয়েছে",
      });
    },
    onError: (error: any) => {
      console.error('Delete notifications failed:', error);
      toast({
        title: "ত্রুটি",
        description: "নোটিফিকেশন মুছতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    },
  });

  // Get notification type style and icon
  const getNotificationTypeStyle = (type: string) => {
    switch(type) {
      case 'success': return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'warning': return { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: AlertTriangle };
      case 'error': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: X };
      case 'urgent': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Zap };
      case 'academic': return { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: BookOpen };
      case 'financial': return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CreditCard };
      case 'meeting': return { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: Users };
      case 'sports': return { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Award };
      case 'holiday': return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Calendar };
      default: return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Info };
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch(priority) {
      case 'urgent': return { color: 'bg-red-500', pulse: 'animate-pulse' };
      case 'high': return { color: 'bg-orange-500', pulse: '' };
      case 'medium': return { color: 'bg-yellow-500', pulse: '' };
      case 'low': return { color: 'bg-gray-400', pulse: '' };
      default: return { color: 'bg-gray-400', pulse: '' };
    }
  };

  // Enhanced notification card component following Julie Zhuo's user-centered design
  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const typeStyle = getNotificationTypeStyle(notification.type);
    const priorityIndicator = getPriorityIndicator(notification.priority);
    const IconComponent = typeStyle.icon;

    return (
      <Card className={cn(
        "group hover:shadow-md transition-all duration-200 border-l-4",
        notification.isRead ? "bg-gray-50 dark:bg-gray-900 border-l-gray-300" : "bg-white dark:bg-gray-800 border-l-blue-500",
        notification.priority === 'urgent' && "border-l-red-500 bg-red-50 dark:bg-red-950"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedNotifications.includes(notification.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedNotifications([...selectedNotifications, notification.id]);
                } else {
                  setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                }
              }}
              className="mt-1"
            />

            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              typeStyle.bg
            )}>
              <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "font-semibold text-sm",
                      notification.isRead ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"
                    )}>
                      {notification.titleBn}
                    </h3>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      priorityIndicator.color,
                      priorityIndicator.pulse
                    )} />
                    {notification.isStarred && (
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mb-2",
                    notification.isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-700 dark:text-gray-300"
                  )}>
                    {notification.descriptionBn}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {notification.time}
                    </span>
                    <span>{notification.categoryBn}</span>
                    {notification.sender && (
                      <span>পাঠক: {notification.sender}</span>
                    )}
                    {notification.attachments && notification.attachments > 0 && (
                      <span className="flex items-center gap-1">
                        <Bookmark className="h-3 w-3" />
                        {notification.attachments} সংযুক্তি
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {notification.actionRequired && (
                    <Badge variant="outline" className="text-xs">
                      ব্যবস্থা প্রয়োজন
                    </Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {notification.actionRequired && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button size="sm" className="h-7 text-xs">
                    ব্যবস্থা নিন
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    বিস্তারিত দেখুন
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell>
      <ResponsivePageLayout
        title="লাইভ নোটিফিকেশন"
        description="রিয়েল-টাইম আপডেট এবং গুরুত্বপূর্ণ বার্তা পরিচালনা করুন"
      >
        <div className="space-y-6">
          {/* Enhanced stats overview following Susan Weinschenk's psychology principles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">মোট নোটিফিকেশন</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {notificationStats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center relative">
                    <BellRing className="h-5 w-5 text-white" />
                    {notificationStats.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">অপঠিত</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {notificationStats.unread}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">জরুরি</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {notificationStats.urgent}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">আজকের</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {notificationStats.todayCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced controls following Steve Krug's "don't make me think" */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-3xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="নোটিফিকেশন খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="ধরন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ধরন</SelectItem>
                      <SelectItem value="academic">শিক্ষাগত</SelectItem>
                      <SelectItem value="financial">আর্থিক</SelectItem>
                      <SelectItem value="meeting">সভা</SelectItem>
                      <SelectItem value="success">সফলতা</SelectItem>
                      <SelectItem value="warning">সতর্কতা</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="গুরুত্ব" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল গুরুত্ব</SelectItem>
                      <SelectItem value="urgent">জরুরি</SelectItem>
                      <SelectItem value="high">উচ্চ</SelectItem>
                      <SelectItem value="medium">মধ্যম</SelectItem>
                      <SelectItem value="low">নিম্ন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedNotifications.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedNotifications.length} নির্বাচিত
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(selectedNotifications)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        পঠিত
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteNotificationsMutation.mutate(selectedNotifications)}
                        disabled={deleteNotificationsMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        মুছুন
                      </Button>
                    </div>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    সেটিংস
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced tabs following Farai Madzima's progressive disclosure */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                সকল ({notificationStats.total})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                অপঠিত ({notificationStats.unread})
              </TabsTrigger>
              <TabsTrigger value="starred" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                তারকাচিহ্নিত
              </TabsTrigger>
              <TabsTrigger value="urgent" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                জরুরি ({notificationStats.urgent})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">নোটিফিকেশন লোড হচ্ছে...</span>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      কোনো নোটিফিকেশন নেই
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {activeTab === 'unread' ? 'সকল নোটিফিকেশন পঠিত' : 
                       activeTab === 'starred' ? 'কোনো তারকাচিহ্নিত নোটিফিকেশন নেই' :
                       activeTab === 'urgent' ? 'কোনো জরুরি নোটিফিকেশন নেই' : 
                       'আপনার কোনো নোটিফিকেশন নেই'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                  
                  {/* Results summary */}
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-4">
                    {filteredNotifications.length} টি নোটিফিকেশন দেখানো হচ্ছে
                    {searchQuery && ` "${searchQuery}" এর জন্য`}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}