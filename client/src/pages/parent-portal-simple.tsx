import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageCircle, Calendar, CreditCard, TrendingUp, BookOpen, Award, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StudentData {
  id: number;
  name: string;
  class: string;
  section: string;
  rollNumber: string;
  photo?: string;
}

interface ProgressData {
  subject: string;
  attendancePercentage: number;
  behaviorScore: number;
  participationScore: number;
  homeworkCompletion: number;
  testScores: number[];
  teacherComments: string;
}

interface NotificationData {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export default function ParentPortalSimple() {
  const { user } = useSupabaseDirectAuth();

  // Mock data for demonstration
  const children: StudentData[] = [
    {
      id: 1,
      name: "আয়েশা খান",
      class: "Class 8",
      section: "A",
      rollNumber: "15",
      photo: undefined
    }
  ];

  const progress: ProgressData[] = [
    {
      subject: "গণিত (Mathematics)",
      attendancePercentage: 95,
      behaviorScore: 8,
      participationScore: 9,
      homeworkCompletion: 90,
      testScores: [85, 92, 88],
      teacherComments: "চমৎকার অগ্রগতি! Excellent progress in problem solving."
    },
    {
      subject: "বাংলা (Bengali)",
      attendancePercentage: 98,
      behaviorScore: 9,
      participationScore: 10,
      homeworkCompletion: 95,
      testScores: [90, 94, 89],
      teacherComments: "ভাষা দক্ষতায় উৎকর্ষতা। Outstanding language skills."
    }
  ];

  const notifications: NotificationData[] = [
    {
      id: 1,
      title: "জরুরি: আগামীকাল পরীক্ষা",
      message: "গণিত পরীক্ষা আগামীকাল সকাল ১০টায়",
      type: "exam",
      priority: "urgent",
      isRead: false,
      createdAt: "2025-05-23"
    }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Access Denied / প্রবেশ অস্বীকৃত
            </CardTitle>
            <CardDescription className="text-center">
              This area is for parents only / এই এলাকা শুধুমাত্র অভিভাবকদের জন্য
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const unreadNotifications = notifications?.filter(n => !n.isRead).length || 0;
  const urgentNotifications = notifications?.filter(n => n.priority === 'urgent').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            অভিভাবক পোর্টাল | Parent Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            স্বাগতম | Welcome back, {user.full_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                {unreadNotifications}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            বার্তা | Messages
          </Button>
        </div>
      </div>

      {/* Quick Alerts */}
      {urgentNotifications > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800 dark:text-red-200">
                জরুরি বিজ্ঞপ্তি | Urgent Notifications
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.filter(n => n.priority === 'urgent').map(notification => (
                <div key={notification.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-red-800 dark:text-red-200">{notification.title}</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">{notification.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children?.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-3">
                {child.photo ? (
                  <img src={child.photo} alt={child.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-blue-600 dark:text-blue-300">
                    {child.name.charAt(0)}
                  </span>
                )}
              </div>
              <CardTitle className="text-xl">{child.name}</CardTitle>
              <CardDescription>
                শ্রেণী | Class {child.class} - বিভাগ | Section {child.section}
                <br />
                রোল | Roll {child.rollNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">95%</div>
                  <div className="text-gray-600 dark:text-gray-400">উপস্থিতি | Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">8.5</div>
                  <div className="text-gray-600 dark:text-gray-400">গড় নম্বর | Avg Grade</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Progress */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            অগ্রগতি | Progress
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            উপস্থিতি | Attendance
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            ফি | Fees
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            অর্জন | Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>শিক্ষাগত অগ্রগতি | Academic Progress</CardTitle>
              <CardDescription>
                আপনার সন্তানের মাসিক অগ্রগতির সারসংক্ষেপ | Monthly progress overview for your child
              </CardDescription>
            </CardHeader>
            <CardContent>
              {progress?.map((subject, index) => (
                <div key={index} className="space-y-4 mb-6 last:mb-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{subject.subject}</h4>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        গড় স্কোর | Avg Score: {subject.testScores?.length ? 
                          (subject.testScores.reduce((a, b) => a + b, 0) / subject.testScores.length).toFixed(1) 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>উপস্থিতি | Attendance</span>
                        <span>{subject.attendancePercentage}%</span>
                      </div>
                      <Progress value={Number(subject.attendancePercentage)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>বাড়ির কাজ | Homework</span>
                        <span>{subject.homeworkCompletion}%</span>
                      </div>
                      <Progress value={Number(subject.homeworkCompletion)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>অংশগ্রহণ | Participation</span>
                        <span>{subject.participationScore}/10</span>
                      </div>
                      <Progress value={subject.participationScore * 10} className="h-2" />
                    </div>
                  </div>
                  
                  {subject.teacherComments && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        শিক্ষকের মন্তব্য | Teacher Comments:
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {subject.teacherComments}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>উপস্থিতির সারসংক্ষেপ | Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">95%</div>
                    <div className="text-sm text-green-700 dark:text-green-300">সামগ্রিক উপস্থিতি | Overall Attendance</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">18</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">উপস্থিত দিন | Present Days</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">1</div>
                    <div className="text-sm text-red-700 dark:text-red-300">অনুপস্থিত দিন | Absent Days</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>ফি স্ট্যাটাস | Fee Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div>
                    <div className="font-semibold text-green-800 dark:text-green-200">
                      মাসিক ফি | Monthly Fee - জানুয়ারি | January
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      পরিশোধিত | Paid on: 05/01/2025
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    পরিশোধিত | Paid
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div>
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                      মাসিক ফি | Monthly Fee - ফেব্রুয়ারি | February
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      শেষ তারিখ | Due date: 05/02/2025
                    </div>
                  </div>
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    এখনই পরিশোধ করুন | Pay Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>অর্জন ও পুরস্কার | Achievements & Awards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <Award className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                      চমৎকার উপস্থিতি | Excellent Attendance
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      জানুয়ারি | January 2025
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Award className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">
                      গণিত চ্যাম্পিয়ন | Math Champion
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      ডিসেম্বর | December 2024
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}