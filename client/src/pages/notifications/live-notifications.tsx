import { useState, useEffect } from "react";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsivePageLayout } from "@/components/layout/responsive-page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  BellRing, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  X,
  Settings,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Send,
  Plus,
  Filter,
  Search,
  Clock,
  Users,
  Zap,
  Star,
  Archive
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LiveNotification {
  id: number;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  category: string;
  categoryBn: string;
  sender: string;
  isLive: boolean;
  actionRequired?: boolean;
  expiresAt?: string;
}

interface NotificationSettings {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  emailEnabled: boolean;
  autoMarkRead: boolean;
  priorityFilter: string;
}

export default function LiveNotifications() {
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("live");
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notification settings state
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    desktopEnabled: true,
    emailEnabled: false,
    autoMarkRead: false,
    priorityFilter: "medium"
  });

  // Fetch live notifications
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ['notifications', 'live'],
    queryFn: async () => {
      const { notificationsAdapter } = await import('@/lib/data-adapter');
      return notificationsAdapter.getNotifications();
    },
    refetchInterval: 3000, // Refetch every 3 seconds for live updates
  });

  // Extract notifications array from response
  const notifications = Array.isArray(notificationsResponse) 
    ? notificationsResponse 
    : (notificationsResponse as any)?.data || [];

  // Live notification stats
  const notificationStats = {
    total: notifications.length,
    unread: notifications.filter((n: LiveNotification) => !n.isRead).length,
    urgent: notifications.filter((n: LiveNotification) => n.priority === 'urgent').length,
    live: notifications.filter((n: LiveNotification) => n.isLive).length
  };

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const { notificationsAdapter } = await import('@/lib/data-adapter');
      return notificationsAdapter.markAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'live'] });
    },
  });

  // Send new notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      const { notificationsAdapter } = await import('@/lib/data-adapter');
      return notificationsAdapter.sendNotification(notificationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'live'] });
      toast({
        title: "নোটিফিকেশন পাঠানো হয়েছে",
        description: "লাইভ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে",
      });
    },
  });

  // Filter notifications based on search and priority
  const filteredNotifications = notifications.filter((notification: LiveNotification) => {
    const matchesSearch = notification.titleBn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.messageBn?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || notification.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Group notifications by type for live tab
  const liveNotifications = filteredNotifications.filter((n: LiveNotification) => n.isLive);
  const urgentNotifications = filteredNotifications.filter((n: LiveNotification) => n.priority === 'urgent');
  const recentNotifications = filteredNotifications.slice(0, 10);

  // Notification sound effect
  useEffect(() => {
    if (settings.soundEnabled && notifications.length > 0) {
      // Play notification sound (would integrate with browser API)
      console.log("Playing notification sound");
    }
  }, [notifications.length, settings.soundEnabled]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <X className="h-5 w-5 text-red-500" />;
      case 'urgent': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AppShell>
      <ResponsivePageLayout title="Live Notifications">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                লাইভ নোটিফিকেশন
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                রিয়েল-টাইম আপডেট এবং গুরুত্বপূর্ণ বিজ্ঞপ্তি
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              >
                <Settings className="h-4 w-4 mr-2" />
                সেটিংস
              </Button>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                নতুন নোটিফিকেশন
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">মোট নোটিফিকেশন</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{notificationStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">লাইভ</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{notificationStats.live}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">জরুরি</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{notificationStats.urgent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">অপঠিত</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{notificationStats.unread}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="নোটিফিকেশন খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="অগ্রাধিকার ফিল্টার" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সবগুলো</SelectItem>
                    <SelectItem value="urgent">জরুরি</SelectItem>
                    <SelectItem value="high">উচ্চ</SelectItem>
                    <SelectItem value="medium">মাঝারি</SelectItem>
                    <SelectItem value="low">কম</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  ফিল্টার
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="live">লাইভ</TabsTrigger>
              <TabsTrigger value="urgent">জরুরি</TabsTrigger>
              <TabsTrigger value="recent">সাম্প্রতিক</TabsTrigger>
              <TabsTrigger value="send">পাঠান</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-4">
              {liveNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      কোনো লাইভ নোটিফিকেশন নেই
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      এই মুহূর্তে কোনো সক্রিয় লাইভ নোটিফিকেশন নেই
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {liveNotifications.map((notification: LiveNotification) => (
                    <Card key={notification.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {notification.titleBn}
                              </h4>
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority === 'urgent' ? 'জরুরি' : 
                                 notification.priority === 'high' ? 'উচ্চ' :
                                 notification.priority === 'medium' ? 'মাঝারি' : 'কম'}
                              </Badge>
                              {notification.isLive && (
                                <Badge className="bg-green-500 text-white animate-pulse">
                                  <div className="w-2 h-2 bg-white rounded-full mr-1" />
                                  লাইভ
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {notification.messageBn}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(notification.createdAt).toLocaleString('bn-BD')}
                              </span>
                              <span>{notification.sender}</span>
                              <span>{notification.categoryBn}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!notification.isRead && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                পড়া হয়েছে
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="urgent" className="space-y-4">
              <div className="space-y-3">
                {urgentNotifications.map((notification: LiveNotification) => (
                  <Card key={notification.id} className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                            {notification.titleBn}
                          </h4>
                          <p className="text-red-700 dark:text-red-200 text-sm mb-2">
                            {notification.messageBn}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-red-600 dark:text-red-300">
                              {new Date(notification.createdAt).toLocaleString('bn-BD')}
                            </span>
                            <Button size="sm" variant="destructive">
                              তাৎক্ষণিক ব্যবস্থা নিন
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <div className="space-y-3">
                {recentNotifications.map((notification: LiveNotification) => (
                  <Card key={notification.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {notification.titleBn}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {notification.messageBn}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString('bn-BD')}
                            </span>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Star className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="send" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>নতুন লাইভ নোটিফিকেশন পাঠান</CardTitle>
                  <CardDescription>
                    সকল ব্যবহারকারীদের কাছে তাৎক্ষণিক বিজ্ঞপ্তি পাঠান
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notification-title">শিরোনাম</Label>
                        <Input id="notification-title" placeholder="নোটিফিকেশনের শিরোনাম" />
                      </div>
                      
                      <div>
                        <Label htmlFor="notification-type">ধরন</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="নোটিফিকেশনের ধরন নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">তথ্য</SelectItem>
                            <SelectItem value="success">সফল</SelectItem>
                            <SelectItem value="warning">সতর্কতা</SelectItem>
                            <SelectItem value="error">ত্রুটি</SelectItem>
                            <SelectItem value="urgent">জরুরি</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority">অগ্রাধিকার</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="অগ্রাধিকার নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">কম</SelectItem>
                            <SelectItem value="medium">মাঝারি</SelectItem>
                            <SelectItem value="high">উচ্চ</SelectItem>
                            <SelectItem value="urgent">জরুরি</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="target-audience">লক্ষ্য দর্শক</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="কাদের কাছে পাঠাবেন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">সবাই</SelectItem>
                            <SelectItem value="students">শিক্ষার্থী</SelectItem>
                            <SelectItem value="teachers">শিক্ষক</SelectItem>
                            <SelectItem value="parents">অভিভাবক</SelectItem>
                            <SelectItem value="staff">কর্মচারী</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch id="is-live" />
                          <Label htmlFor="is-live">লাইভ নোটিফিকেশন</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch id="send-email" />
                          <Label htmlFor="send-email">ইমেইল পাঠান</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch id="send-sms" />
                          <Label htmlFor="send-sms">SMS পাঠান</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">বার্তা</Label>
                    <Textarea 
                      id="message" 
                      placeholder="আপনার বার্তা লিখুন..."
                      rows={4}
                    />
                  </div>

                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Send className="h-4 w-4 mr-2" />
                    নোটিফিকেশন পাঠান
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Settings Panel */}
          {isSettingsOpen && (
            <Card>
              <CardHeader>
                <CardTitle>নোটিফিকেশন সেটিংস</CardTitle>
                <CardDescription>
                  আপনার নোটিফিকেশন পছন্দ কনফিগার করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-enabled">সাউন্ড সক্ষম</Label>
                      <Switch 
                        id="sound-enabled"
                        checked={settings.soundEnabled}
                        onCheckedChange={(checked) => setSettings({...settings, soundEnabled: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="desktop-enabled">ডেস্কটপ নোটিফিকেশন</Label>
                      <Switch 
                        id="desktop-enabled"
                        checked={settings.desktopEnabled}
                        onCheckedChange={(checked) => setSettings({...settings, desktopEnabled: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-enabled">ইমেইল নোটিফিকেশন</Label>
                      <Switch 
                        id="email-enabled"
                        checked={settings.emailEnabled}
                        onCheckedChange={(checked) => setSettings({...settings, emailEnabled: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-mark-read">স্বয়ংক্রিয় পড়া হয়েছে</Label>
                      <Switch 
                        id="auto-mark-read"
                        checked={settings.autoMarkRead}
                        onCheckedChange={(checked) => setSettings({...settings, autoMarkRead: checked})}
                      />
                    </div>
                  </div>
                </div>
                
                <Button className="w-full mt-6">
                  সেটিংস সংরক্ষণ করুন
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}