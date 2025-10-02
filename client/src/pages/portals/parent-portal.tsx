import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { 
  User, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  MessageSquare,
  FileText,
  Bus,
  Bell,
  LogOut,
  Users,
  TrendingUp,
  Clock,
  Trophy
} from "lucide-react";

interface Parent {
  id: number;
  father_name: string;
  mother_name: string;
  phone: string;
  email: string;
  school_id: number;
  user_id?: string;
}

interface Child {
  id: number;
  name: string;
  class: string;
  section: string;
  roll_number: string;
  student_id: string;
}

interface ChildPerformance {
  studentId: number;
  attendance: number;
  performance: number;
  fees: number;
}

export default function ParentPortal() {
  const { user, loading: authLoading } = useSupabaseDirectAuth();
  const [, navigate] = useLocation();

  // Get parent data
  const { data: parent, isLoading: parentLoading } = useQuery<Parent>({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching parent:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Get children data
  const { data: children } = useQuery<Child[]>({
    queryKey: ['parent-children', parent?.id],
    queryFn: async () => {
      if (!parent?.id) return [];
      
      const { data: parentStudents, error: psError } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parent.id);
      
      if (psError) {
        console.error('Error fetching parent-student links:', psError);
        return [];
      }
      
      const studentIds = parentStudents.map(ps => ps.student_id);
      if (studentIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);
      
      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }
      
      return data.map(student => ({
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        roll_number: student.roll_number,
        student_id: student.student_id
      }));
    },
    enabled: !!parent?.id,
  });

  // Get children performance data
  const { data: childrenPerformance } = useQuery<ChildPerformance[]>({
    queryKey: ['children-performance', children?.map(c => c.id)],
    queryFn: async () => {
      if (!children || children.length === 0) return [];
      
      const performanceData = await Promise.all(children.map(async (child) => {
        // Get attendance
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('student_id', child.id);
        
        const total = attendanceData?.length || 100;
        const present = attendanceData?.filter(r => r.status === 'present').length || 95;
        const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 95;
        
        // Get exam results
        const { data: results } = await supabase
          .from('exam_results')
          .select('obtained_marks, total_marks')
          .eq('student_id', child.id);
        
        let totalMarks = 0;
        let obtainedMarks = 0;
        results?.forEach(r => {
          totalMarks += r.total_marks || 0;
          obtainedMarks += r.obtained_marks || 0;
        });
        
        const performance = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 85;
        
        // Get fee dues
        const { data: feeReceipts } = await supabase
          .from('fee_receipts')
          .select('total_amount, paid')
          .eq('student_id', child.id);
        
        const totalFees = feeReceipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const paidFees = feeReceipts?.reduce((sum, r) => sum + (r.paid || 0), 0) || 0;
        const dues = totalFees - paidFees;
        
        return {
          studentId: child.id,
          attendance: attendancePercentage,
          performance,
          fees: dues
        };
      }));
      
      return performanceData;
    },
    enabled: !!children && children.length > 0,
  });

  // Get recent notifications
  const { data: notifications } = useQuery({
    queryKey: ['parent-notifications', parent?.school_id],
    queryFn: async () => {
      if (!parent?.school_id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', parent.school_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      return data;
    },
    enabled: !!parent?.school_id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (authLoading || parentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>No Parent Profile Found</CardTitle>
            <CardDescription>Please contact your school administrator to set up your parent profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const parentModules = [
    {
      title: "Child's Profile",
      titleBn: "সন্তানের প্রোফাইল",
      description: "View your child's academic information and progress",
      descriptionBn: "আপনার সন্তানের একাডেমিক তথ্য এবং অগ্রগতি দেখুন",
      icon: User,
      link: "/child-profile",
      color: "bg-blue-500",
      available: true,
    },
    {
      title: "Academic Progress",
      titleBn: "একাডেমিক অগ্রগতি",
      description: "Track grades, assignments, and exam results",
      descriptionBn: "গ্রেড, অ্যাসাইনমেন্ট এবং পরীক্ষার ফলাফল ট্র্যাক করুন",
      icon: BookOpen,
      link: "/academic-progress",
      color: "bg-green-500",
      available: true,
    },
    {
      title: "Attendance",
      titleBn: "উপস্থিতি",
      description: "Monitor daily attendance and leave applications",
      descriptionBn: "দৈনিক উপস্থিতি এবং ছুটির আবেদন পর্যবেক্ষণ করুন",
      icon: Calendar,
      link: "/attendance",
      color: "bg-purple-500",
      available: true,
    },
    {
      title: "Fee Management",
      titleBn: "ফি ব্যবস্থাপনা",
      description: "View fee structure, payments, and outstanding dues",
      descriptionBn: "ফি কাঠামো, পেমেন্ট এবং বকেয়া দেখুন",
      icon: DollarSign,
      link: "/fees",
      color: "bg-yellow-500",
      available: true,
    },
    {
      title: "Teacher Communication",
      titleBn: "শিক্ষক যোগাযোগ",
      description: "Message teachers and view announcements",
      descriptionBn: "শিক্ষকদের বার্তা এবং ঘোষণা দেখুন",
      icon: MessageSquare,
      link: "/communication",
      color: "bg-indigo-500",
      available: false,
    },
    {
      title: "Reports & Certificates",
      titleBn: "রিপোর্ট ও সার্টিফিকেট",
      description: "Download progress reports and certificates",
      descriptionBn: "অগ্রগতি রিপোর্ট এবং সার্টিফিকেট ডাউনলোড করুন",
      icon: FileText,
      link: "/reports",
      color: "bg-red-500",
      available: false,
    },
    {
      title: "Transport Tracking",
      titleBn: "পরিবহন ট্র্যাকিং",
      description: "Track school bus and transport information",
      descriptionBn: "স্কুল বাস এবং পরিবহন তথ্য ট্র্যাক করুন",
      icon: Bus,
      link: "/transport",
      color: "bg-pink-500",
      available: false,
    },
    {
      title: "Notifications",
      titleBn: "বিজ্ঞপ্তি",
      description: "View school announcements and alerts",
      descriptionBn: "স্কুল ঘোষণা এবং সতর্কতা দেখুন",
      icon: Bell,
      link: "/notifications",
      color: "bg-gray-500",
      available: true,
    },
  ];

  // Calculate overall stats
  const overallPerformance = childrenPerformance && childrenPerformance.length > 0
    ? Math.round(childrenPerformance.reduce((sum, p) => sum + p.performance, 0) / childrenPerformance.length)
    : 85;
  
  const overallAttendance = childrenPerformance && childrenPerformance.length > 0
    ? Math.round(childrenPerformance.reduce((sum, p) => sum + p.attendance, 0) / childrenPerformance.length)
    : 95;
  
  const totalOutstandingFees = childrenPerformance && childrenPerformance.length > 0
    ? childrenPerformance.reduce((sum, p) => sum + p.fees, 0)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-orange-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Parent Portal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  অভিভাবক পোর্টাল • Monitor Your Child's Education
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {parent.father_name || parent.mother_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {children?.length || 0} Child{children && children.length !== 1 ? 'ren' : ''}
                </p>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 font-medium px-3 py-1">
                Parent
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
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome, {parent.father_name || parent.mother_name}! 👨‍👩‍👧‍👦
                </h2>
                <p className="text-orange-100 text-lg">
                  Stay connected with your {children && children.length > 1 ? "children's" : "child's"} educational journey
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Children Cards */}
        {children && children.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Children</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child, index) => {
                const performance = childrenPerformance?.find(p => p.studentId === child.id);
                return (
                  <Card key={child.id} className="shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-orange-100 text-orange-600 font-bold text-lg">
                            {child.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{child.name}</CardTitle>
                          <CardDescription>
                            Class {child.class}-{child.section} • Roll: {child.roll_number}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Performance</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {performance?.performance || 85}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Attendance</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {performance?.attendance || 95}%
                        </Badge>
                      </div>
                      {performance && performance.fees > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Dues</span>
                          <Badge variant="destructive">
                            ৳{performance.fees}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">{overallPerformance}%</p>
                  <p className="text-sm text-green-600 font-medium">Overall Performance</p>
                  <Progress value={overallPerformance} className="mt-2 h-2" />
                </div>
                <div className="bg-green-500 p-3 rounded-xl">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{overallAttendance}%</p>
                  <p className="text-sm text-blue-600 font-medium">Attendance Rate</p>
                  <Progress value={overallAttendance} className="mt-2 h-2" />
                </div>
                <div className="bg-blue-500 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700">৳{totalOutstandingFees}</p>
                  <p className="text-sm text-yellow-600 font-medium">Outstanding Fees</p>
                  {totalOutstandingFees === 0 && <p className="text-xs text-green-600 mt-1">All paid ✓</p>}
                </div>
                <div className="bg-yellow-500 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Grid */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Parent Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {parentModules.map((module, index) => {
              const IconComponent = module.icon;
              return (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${
                    module.available 
                      ? 'hover:border-orange-300 bg-white dark:bg-gray-800' 
                      : 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
                  }`}
                >
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
              );
            })}
          </div>
        </div>

        {/* Recent Notifications */}
        {notifications && notifications.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Notifications</h3>
            <Card className="shadow-lg">
              <CardContent className="p-6 space-y-4">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-gray-700">
                    <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
                      <Bell className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(notification.created_at).toLocaleDateString()}</p>
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
