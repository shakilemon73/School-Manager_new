import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { useLocation, Link } from "wouter";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  BarChart3, 
  FileText,
  Calendar,
  Bell,
  LogOut,
  Database,
  TrendingUp,
  Building2,
  UserCheck,
  DollarSign
} from "lucide-react";

interface SchoolStats {
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  totalClasses: number;
  totalBooks: number;
  totalRevenue: number;
  activeSchools: number;
}

export default function AdminPortal() {
  const { user, loading: authLoading } = useSupabaseDirectAuth();
  const [, navigate] = useLocation();

  // Get school statistics
  const { data: stats, isLoading: statsLoading } = useQuery<SchoolStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        studentsResult,
        teachersResult,
        staffResult,
        classesResult,
        booksResult,
        revenueResult,
        schoolsResult
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('staff').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('library_books').select('id', { count: 'exact', head: true }),
        supabase.from('fee_receipts').select('paid'),
        supabase.from('schools').select('id, status')
      ]);

      const totalRevenue = revenueResult.data?.reduce((sum, receipt) => sum + (receipt.paid || 0), 0) || 0;
      const activeSchools = schoolsResult.data?.filter(s => s.status === 'active').length || 0;

      return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalStaff: staffResult.count || 0,
        totalClasses: classesResult.count || 0,
        totalBooks: booksResult.count || 0,
        totalRevenue,
        activeSchools: activeSchools || 1
      };
    },
    enabled: !!user,
  });

  // Get recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching activities:', error);
        return [];
      }

      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const adminModules = [
    {
      title: "Student Management",
      titleBn: "শিক্ষার্থী ব্যবস্থাপনা",
      description: "Manage student records, admissions, and profiles",
      descriptionBn: "শিক্ষার্থী রেকর্ড, ভর্তি এবং প্রোফাইল পরিচালনা করুন",
      icon: Users,
      link: "/students",
      color: "bg-blue-500",
      count: stats?.totalStudents || 0,
    },
    {
      title: "Teacher Management",
      titleBn: "শিক্ষক ব্যবস্থাপনা",
      description: "Handle teacher profiles, assignments, and schedules",
      descriptionBn: "শিক্ষক প্রোফাইল, অ্যাসাইনমেন্ট এবং সময়সূচী পরিচালনা করুন",
      icon: GraduationCap,
      link: "/teachers",
      color: "bg-green-500",
      count: stats?.totalTeachers || 0,
    },
    {
      title: "Academic Management",
      titleBn: "একাডেমিক ব্যবস্থাপনা",
      description: "Classes, subjects, exams, and results",
      descriptionBn: "ক্লাস, বিষয়, পরীক্ষা এবং ফলাফল",
      icon: BookOpen,
      link: "/academic",
      color: "bg-purple-500",
      count: stats?.totalClasses || 0,
    },
    {
      title: "Financial Management",
      titleBn: "আর্থিক ব্যবস্থাপনা",
      description: "Fee collection, payments, and financial reports",
      descriptionBn: "ফি সংগ্রহ, পেমেন্ট এবং আর্থিক রিপোর্ট",
      icon: BarChart3,
      link: "/financial",
      color: "bg-yellow-500",
      count: stats ? Math.round(stats.totalRevenue / 1000) : 0,
    },
    {
      title: "Library System",
      titleBn: "লাইব্রেরি সিস্টেম",
      description: "Book inventory, issue/return tracking",
      descriptionBn: "বই ইনভেন্টরি, ইস্যু/রিটার্ন ট্র্যাকিং",
      icon: FileText,
      link: "/library",
      color: "bg-indigo-500",
      count: stats?.totalBooks || 0,
    },
    {
      title: "Transport Management",
      titleBn: "পরিবহন ব্যবস্থাপনা",
      description: "Vehicle tracking, route management",
      descriptionBn: "যানবাহন ট্র্যাকিং, রুট ব্যবস্থাপনা",
      icon: Calendar,
      link: "/transport",
      color: "bg-red-500",
      count: 0,
    },
    {
      title: "Notifications",
      titleBn: "বিজ্ঞপ্তি",
      description: "Send announcements and alerts",
      descriptionBn: "ঘোষণা এবং সতর্কতা পাঠান",
      icon: Bell,
      link: "/notifications",
      color: "bg-pink-500",
      count: 0,
    },
    {
      title: "System Settings",
      titleBn: "সিস্টেম সেটিংস",
      description: "School configuration and user management",
      descriptionBn: "স্কুল কনফিগারেশন এবং ব্যবহারকারী ব্যবস্থাপনা",
      icon: Settings,
      link: "/settings",
      color: "bg-gray-500",
      count: 0,
    },
    {
      title: "Supabase Admin",
      titleBn: "সুপাবেস অ্যাডমিন",
      description: "Manage separate Supabase instances for schools",
      descriptionBn: "স্কুলের জন্য পৃথক সুপাবেস ইনস্ট্যান্স পরিচালনা করুন",
      icon: Database,
      link: "/standalone-admin",
      color: "bg-orange-500",
      count: stats?.activeSchools || 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Admin Portal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  অ্যাডমিন পোর্টাল • School Management System
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  System Administrator
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-medium px-3 py-1">
                Admin
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-200 text-red-600 hover:bg-red-50">
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome back, Administrator! 🏫
                </h2>
                <p className="text-blue-100 text-lg">
                  Manage your school's operations from this central dashboard
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                  <Building2 className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.totalStudents || 0}</p>
                  <p className="text-sm text-blue-600 font-medium">Total Students</p>
                  <p className="text-xs text-gray-500 mt-1">Enrolled</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats?.totalTeachers || 0}</p>
                  <p className="text-sm text-green-600 font-medium">Total Teachers</p>
                  <p className="text-xs text-gray-500 mt-1">Active staff</p>
                </div>
                <div className="bg-green-500 p-3 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.totalClasses || 0}</p>
                  <p className="text-sm text-purple-600 font-medium">Total Classes</p>
                  <p className="text-xs text-gray-500 mt-1">Academic units</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-xl">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700">৳{stats ? Math.round(stats.totalRevenue / 1000) : 0}K</p>
                  <p className="text-sm text-yellow-600 font-medium">Total Revenue</p>
                  <p className="text-xs text-gray-500 mt-1">This period</p>
                </div>
                <div className="bg-yellow-500 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Management Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {adminModules.map((module, index) => {
              const IconComponent = module.icon;
              return (
                <Link key={index} href={module.link}>
                  <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`${module.color} p-3 rounded-xl shadow-md`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                            <p className="text-sm text-gray-500 font-medium">{module.titleBn}</p>
                          </div>
                        </div>
                        {module.count > 0 && (
                          <Badge variant="secondary" className="text-sm font-bold">
                            {module.count}
                          </Badge>
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

        {/* Recent Activities */}
        {recentActivities && recentActivities.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent System Activities</h3>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{activity.action || 'System Activity'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{activity.details || 'Activity performed'}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
