import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { Activity, Clock, TrendingUp, Users } from 'lucide-react';

export function RealtimeActivityFeed() {
  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: todayActivities } = useQuery({
    queryKey: ['today-activities'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('school_id', schoolId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000
  });

  const { data: last24Hours } = useQuery({
    queryKey: ['last-24-hours-activities'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('school_id', schoolId)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000
  });

  const getActivityStats = (activities: any[]) => {
    const stats = {
      marksEntry: 0,
      attendance: 0,
      assignments: 0,
      others: 0
    };

    activities?.forEach((activity) => {
      if (activity.action === 'marks_entry') stats.marksEntry++;
      else if (activity.action === 'attendance_marked') stats.attendance++;
      else if (activity.action === 'assignment_created') stats.assignments++;
      else stats.others++;
    });

    return stats;
  };

  const todayStats = getActivityStats(todayActivities || []);
  const last24Stats = getActivityStats(last24Hours || []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            লাইভ কার্যক্রম ফিড
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            সরাসরি আপডেট
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">
              আজ ({todayActivities?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="24hours">
              শেষ ২৪ ঘণ্টা ({last24Hours?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{todayStats.marksEntry}</p>
                <p className="text-xs text-purple-700">মার্ক এন্ট্রি</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{todayStats.attendance}</p>
                <p className="text-xs text-green-700">উপস্থিতি</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{todayStats.assignments}</p>
                <p className="text-xs text-blue-700">এসাইনমেন্ট</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{todayStats.others}</p>
                <p className="text-xs text-orange-700">অন্যান্য</p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todayActivities && todayActivities.length > 0 ? (
                todayActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {activity.user_type} - {activity.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  আজ কোনো কার্যক্রম নেই
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="24hours" className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{last24Stats.marksEntry}</p>
                <p className="text-xs text-purple-700">মার্ক এন্ট্রি</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{last24Stats.attendance}</p>
                <p className="text-xs text-green-700">উপস্থিতি</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{last24Stats.assignments}</p>
                <p className="text-xs text-blue-700">এসাইনমেন্ট</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{last24Stats.others}</p>
                <p className="text-xs text-orange-700">অন্যান্য</p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {last24Hours && last24Hours.length > 0 ? (
                last24Hours.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {activity.user_type} - {activity.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  শেষ ২৪ ঘণ্টায় কোনো কার্যক্রম নেই
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
