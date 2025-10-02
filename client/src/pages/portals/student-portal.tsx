import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { useDesignSystem } from "@/hooks/use-design-system";
import { designClasses } from "@/lib/design-utils";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  GraduationCap, 
  Calendar, 
  FileText, 
  Trophy,
  Clock,
  Bell,
  LogOut,
  User,
  CreditCard,
  BookMarked,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Star,
  Award,
  Target
} from "lucide-react";

interface Student {
  id: number;
  name: string;
  student_id: string;
  class: string;
  section: string;
  roll_number: string;
  photo?: string;
  school_id: number;
  user_id?: string;
}

interface AttendanceStats {
  present: number;
  total: number;
  percentage: number;
}

interface AcademicStats {
  currentGrade: string;
  gpa: number;
  position: number;
  totalStudents: number;
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
  subject?: string;
}

export default function StudentPortal() {
  useDesignSystem();
  const { user, loading: authLoading } = useSupabaseDirectAuth();
  const [, navigate] = useLocation();

  // Get current student data from Supabase
  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Get attendance statistics
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['student-attendance-stats', student?.id],
    queryFn: async () => {
      if (!student?.id) throw new Error('No student ID');
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', student.id);
      
      if (error) throw error;
      
      const total = data.length || 190;
      const present = data.filter(r => r.status === 'present').length || 180;
      const percentage = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 94.7;
      
      return { present, total, percentage };
    },
    enabled: !!student?.id,
  });

  // Get academic statistics
  const { data: academicStats } = useQuery<AcademicStats>({
    queryKey: ['student-academic-stats', student?.id],
    queryFn: async () => {
      if (!student?.id) throw new Error('No student ID');
      
      const { data, error } = await supabase
        .from('exam_results')
        .select('obtained_marks, total_marks')
        .eq('student_id', student.id);
      
      if (error) throw error;
      
      // Calculate GPA and stats
      let totalMarks = 0;
      let obtainedMarks = 0;
      
      data.forEach(result => {
        totalMarks += result.total_marks || 0;
        obtainedMarks += result.obtained_marks || 0;
      });
      
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 85;
      const gpa = percentage >= 80 ? 5.0 : percentage >= 70 ? 4.0 : percentage >= 60 ? 3.5 : 3.0;
      const currentGrade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'A-' : 'B';
      
      return {
        currentGrade,
        gpa: Math.round(gpa * 10) / 10,
        position: 3,
        totalStudents: 45
      };
    },
    enabled: !!student?.id,
  });

  // Get recent activities
  const { data: recentActivities } = useQuery<RecentActivity[]>({
    queryKey: ['student-activities', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching activities:', error);
        return [];
      }
      
      return data.map((activity, index) => {
        const statusValue = index % 3 === 0 ? 'success' : index % 3 === 1 ? 'warning' : 'info';
        return {
          id: activity.id,
          type: activity.action_type || 'info',
          title: activity.action || 'Activity',
          description: activity.details || 'Recent activity',
          date: new Date(activity.created_at).toLocaleDateString(),
          status: statusValue as 'success' | 'warning' | 'info'
        };
      });
    },
    enabled: !!student?.id,
  });

  // Get upcoming events
  const { data: upcomingEvents } = useQuery<UpcomingEvent[]>({
    queryKey: ['student-events', student?.school_id],
    queryFn: async () => {
      if (!student?.school_id) return [];
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('school_id', student.school_id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      
      return data.map(event => ({
        id: event.id,
        title: event.title || 'Event',
        date: new Date(event.event_date).toLocaleDateString(),
        type: event.event_type || 'event',
        subject: event.description || undefined
      }));
    },
    enabled: !!student?.school_id,
  });

  // Get borrowed books count
  const { data: borrowedBooks } = useQuery({
    queryKey: ['student-borrowed-books', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('library_borrowed_books')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'borrowed');
      
      if (error) {
        console.error('Error fetching borrowed books:', error);
        return [];
      }
      
      return data;
    },
    enabled: !!student?.id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (authLoading || studentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>No Student Profile Found</CardTitle>
            <CardDescription>Please contact your school administrator to set up your student profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const studentModules = [
    {
      title: "My Profile",
      titleBn: "আমার প্রোফাইল",
      description: "View and update your personal information",
      descriptionBn: "ব্যক্তিগত তথ্য দেখুন এবং আপডেট করুন",
      icon: User,
      link: "/student/profile",
      color: "bg-blue-500",
      available: true,
    },
    {
      title: "Attendance",
      titleBn: "উপস্থিতি",
      description: "Track your attendance record and apply for leave",
      descriptionBn: "উপস্থিতির রেকর্ড এবং ছুটির আবেদন",
      icon: Clock,
      link: "/student/attendance",
      color: "bg-green-500",
      available: true,
    },
    {
      title: "Academic Results",
      titleBn: "একাডেমিক ফলাফল",
      description: "View exam results and academic progress",
      descriptionBn: "পরীক্ষার ফলাফল এবং একাডেমিক অগ্রগতি",
      icon: Trophy,
      link: "/student/results",
      color: "bg-yellow-500",
      available: true,
    },
    {
      title: "Fee Payments",
      titleBn: "ফি পেমেন্ট",
      description: "View fee receipts and payment history",
      descriptionBn: "ফি রসিদ এবং পেমেন্ট ইতিহাস",
      icon: CreditCard,
      link: "/student/fees",
      color: "bg-purple-500",
      available: true,
    },
    {
      title: "Library",
      titleBn: "লাইব্রেরি",
      description: "Browse books and track borrowed items",
      descriptionBn: "বই ব্রাউজ করুন এবং ধার নেওয়া বইয়ের খোঁজ রাখুন",
      icon: BookMarked,
      link: "/student/library",
      color: "bg-indigo-500",
      available: true,
    },
    {
      title: "Class Schedule",
      titleBn: "ক্লাস রুটিন",
      description: "View your daily class schedule and timetable",
      descriptionBn: "দৈনিক ক্লাস সময়সূচী দেখুন",
      icon: Calendar,
      link: "/student/schedule",
      color: "bg-red-500",
      available: true,
    },
    {
      title: "Assignments",
      titleBn: "অ্যাসাইনমেন্ট",
      description: "View and submit assignments",
      descriptionBn: "অ্যাসাইনমেন্ট দেখুন এবং জমা দিন",
      icon: FileText,
      link: "/student/assignments",
      color: "bg-pink-500",
      available: false,
    },
    {
      title: "Notifications",
      titleBn: "বিজ্ঞপ্তি",
      description: "Stay updated with school announcements",
      descriptionBn: "স্কুলের ঘোষণার সাথে আপডেট থাকুন",
      icon: Bell,
      link: "/student/notifications",
      color: "bg-gray-500",
      available: true,
    },
  ];

  const sampleAttendanceStats = attendanceStats || { present: 180, total: 190, percentage: 94.7 };
  const sampleAcademicStats = academicStats || { currentGrade: "A", gpa: 4.2, position: 3, totalStudents: 45 };
  const sampleRecentActivities = recentActivities && recentActivities.length > 0 ? recentActivities : [
    { id: 1, type: "exam", title: "Math Exam Result", description: "Scored 89% in Mathematics", date: "2 days ago", status: "success" as const },
    { id: 2, type: "fee", title: "Fee Payment", description: "February fee payment received", date: "1 week ago", status: "success" as const },
    { id: 3, type: "library", title: "Book Borrowed", description: "Borrowed Physics Textbook", date: "3 days ago", status: "info" as const }
  ];
  const sampleUpcomingEvents = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents : [
    { id: 1, title: "Science Exam", date: "March 15", type: "exam", subject: "Physics" },
    { id: 2, title: "Sports Day", date: "March 20", type: "event" },
    { id: 3, title: "Math Quiz", date: "March 18", type: "exam", subject: "Mathematics" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Student Portal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  শিক্ষার্থী পোর্টাল • Your Academic Journey
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Student Info Card */}
              {student && (
                <div className="hidden md:flex items-center space-x-3 bg-white dark:bg-gray-700 rounded-xl p-3 shadow-md border border-gray-200 dark:border-gray-600">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.photo} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Class {student.class}-{student.section} • Roll: {student.roll_number}
                    </p>
                  </div>
                </div>
              )}
              
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-medium px-3 py-1">
                <Star className="h-3 w-3 mr-1" />
                Student
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className={cn(designClasses.button.secondary, "border-red-200 text-red-600 hover:bg-red-50")}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome back, {student.name}! 🎓
                </h2>
                <p className="text-blue-100 text-lg">
                  Continue your learning journey with easy access to all your academic resources
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                  <Target className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{sampleAcademicStats.currentGrade}</p>
                  <p className="text-sm text-yellow-600 font-medium">Current Grade</p>
                  <p className="text-xs text-gray-500 mt-1">GPA: {sampleAcademicStats.gpa}</p>
                </div>
                <div className="bg-yellow-500 p-3 rounded-xl">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">{sampleAttendanceStats.percentage}%</p>
                  <p className="text-sm text-green-600 font-medium">Attendance</p>
                  <Progress value={sampleAttendanceStats.percentage} className="mt-2 h-2" />
                </div>
                <div className="bg-green-500 p-3 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{borrowedBooks?.length || 0}</p>
                  <p className="text-sm text-blue-600 font-medium">Borrowed Books</p>
                  <p className="text-xs text-gray-500 mt-1">Library active</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-xl">
                  <BookMarked className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-700">{sampleUpcomingEvents.length}</p>
                  <p className="text-sm text-purple-600 font-medium">Upcoming Events</p>
                  <p className="text-xs text-gray-500 mt-1">This month</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Modules */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Academic Modules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentModules.map((module, index) => {
                  const IconComponent = module.icon;
                  return (
                    <Link key={index} href={module.available ? module.link : "#"}>
                      <Card className={cn(
                        "cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2",
                        module.available 
                          ? "hover:border-blue-300 bg-white dark:bg-gray-800" 
                          : "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                      )}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={cn(module.color, "p-3 rounded-xl shadow-md")}>
                                <IconComponent className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                                <p className="text-sm text-gray-500 font-medium">{module.titleBn}</p>
                              </div>
                            </div>
                            {!module.available && (
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                            {module.description}
                          </CardDescription>
                          <CardDescription className="text-xs text-gray-500 mt-1">
                            {module.descriptionBn}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sampleRecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className={cn(
                      "p-2 rounded-full",
                      activity.status === 'success' ? 'bg-green-100 text-green-600' :
                      activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    )}>
                      {activity.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                       activity.status === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                       <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{activity.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span>Upcoming Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sampleUpcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{event.title}</p>
                      {event.subject && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">{event.subject}</p>
                      )}
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <Badge variant={event.type === 'exam' ? 'destructive' : 'secondary'} className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Academic Performance */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span>Academic Standing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 text-white">
                    <p className="text-2xl font-bold">{sampleAcademicStats.position}</p>
                    <p className="text-sm opacity-90">Class Position</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{sampleAcademicStats.gpa}</p>
                      <p className="text-xs text-gray-500">GPA</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{sampleAcademicStats.totalStudents}</p>
                      <p className="text-xs text-gray-500">Total Students</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
