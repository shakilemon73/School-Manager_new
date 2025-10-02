import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { User, Clock, BookOpen, CheckCircle, FileText, Users } from 'lucide-react';

export function TeacherActivityMonitor() {
  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: activities, isLoading } = useQuery({
    queryKey: ['teacher-activities-monitor'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, teachers(id, name, email)')
        .eq('school_id', schoolId)
        .eq('user_type', 'teacher')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'marks_entry':
        return <FileText className="w-4 h-4" />;
      case 'attendance_marked':
        return <CheckCircle className="w-4 h-4" />;
      case 'assignment_created':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'marks_entry':
        return 'bg-purple-100 text-purple-800';
      case 'attendance_marked':
        return 'bg-green-100 text-green-800';
      case 'assignment_created':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string, metadata: any) => {
    switch (action) {
      case 'marks_entry':
        return `${metadata?.student_count || 0} জন ছাত্রের মার্ক এন্ট্রি`;
      case 'attendance_marked':
        return `${metadata?.student_count || 0} জনের উপস্থিতি`;
      case 'assignment_created':
        return `নতুন এসাইনমেন্ট তৈরি`;
      default:
        return action;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'এখনই';
    if (diffInMinutes < 60) return `${diffInMinutes} মিনিট আগে`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ঘন্টা আগে`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} দিন আগে`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>শিক্ষক কার্যক্রম মনিটর</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">লোড হচ্ছে...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          শিক্ষক কার্যক্রম মনিটর
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                  {getActivityIcon(activity.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">
                      {activity.teachers?.name || 'Unknown Teacher'}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {activity.action === 'marks_entry' ? 'মার্ক এন্ট্রি' :
                       activity.action === 'attendance_marked' ? 'উপস্থিতি' :
                       activity.action === 'assignment_created' ? 'এসাইনমেন্ট' :
                       activity.action}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {activity.description || getActionText(activity.action, activity.metadata)}
                  </p>
                  
                  {activity.metadata && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {activity.metadata.class && (
                        <span>শ্রেণী: {activity.metadata.class}</span>
                      )}
                      {activity.metadata.subject_id && (
                        <span>বিষয়</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(activity.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>কোনো কার্যক্রম নেই</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
